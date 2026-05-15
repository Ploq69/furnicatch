/**
 * TerrainMesh — stable SDF-backed diggable terrain.
 *
 * The density field remains the gameplay truth, but v1 renders it as exposed
 * solid/air cell faces. This trades some smoothness for closed caves, fast
 * rebuilds, and predictable collision.
 */

import * as THREE from 'three';
import { getTerrainTileIndex, buildAtlasRectArray } from './KenneyAtlas.js';
import { UnifiedTerrainRenderer } from './UnifiedTerrainRenderer.js';
import { getBlockProperties } from './BlockProperties.js';

const ISO_LEVEL = 0;
const CHUNK_SIZE = 8;
const TERRAIN_MIN_Y = -150;
const TERRAIN_MAX_Y = 10;
const SURFACE_Y = 2;
const CELL_SIZE = 1;
const MAX_REBUILDS_PER_FRAME = 4;
const REBUILD_TIME_BUDGET_MS = 2.5;
const STREAM_BUILD_LIMIT_PER_FRAME = 6;
const LIVE_CHUNK_CAP = 520;
const CHUNK_UNLOAD_IDLE_MS = 6000;
const ISO_VISIBLE_CHUNK_BUDGET = 80;
const FP_VISIBLE_CHUNK_BUDGET = 260;
const FP_HOT_CHUNK_BUDGET = 320;
const TP_CHUNK_RADIUS = 7;
const VISIBILITY_MIN_INTERVAL_MS = 180;
const TP_VISIBILITY_MIN_INTERVAL_MS = 260;
const MAX_TEXTURE_TILE_SPAN = 8;
const WATER_FALL_DEPTH = 28;
const CHUNK_RADIUS = Math.sqrt(3) * CHUNK_SIZE * 0.5;
const FACE_KEY_MULTIPLIER = 4;
const UNIFIED_VERTEX_STRIDE_FLOATS = 14;
const FACE_KIND = {
  top: 0,
  side: 1,
  bottom: 2,
};
const TERRAIN_COLORS = {
  surface: new THREE.Color(0x009959),
  dirt: new THREE.Color(0xaa684d),
  stone: new THREE.Color(0x9ca8ae),
  deep: new THREE.Color(0x4a5054),
};

const TERRAIN_MATERIAL_IDS = {
  grass: 0,
  dirt: 1,
  stone: 2,
  stone_dark: 3,
  lava: 4,
  coal: 5,
  brick: 6,
  ice: 7,
  snow: 8,
  water: 9,
  sand_A: 10,
  sand_B: 11,
  prototype: 12,
  metal: 13,
  gravel: 14,
  wood: 15,
  bricks_A: 16,
  bricks_B: 17,
};

const ZONE_SURFACE_PROFILES = {
  forest: { base: 1.2, amplitude: 3.8, roughness: 1.4, terrace: 1.0, ridge: 0.8, basin: 1.0 },
  fire: { base: 0.8, amplitude: 4.8, roughness: 2.2, terrace: 1.0, ridge: 1.8, basin: 1.2 },
  ice: { base: 1.4, amplitude: 5.2, roughness: 1.5, terrace: 1.0, ridge: 2.4, basin: 0.7 },
  desert: { base: 0.7, amplitude: 4.2, roughness: 1.9, terrace: 0.5, ridge: 0.4, basin: 0.8 },
  steelworks: { base: 1.0, amplitude: 2.2, roughness: 1.0, terrace: 1.0, ridge: 0.6, basin: 0.4 },
  mire: { base: 0.3, amplitude: 2.8, roughness: 1.2, terrace: 0.5, ridge: 0.5, basin: 1.4 },
  citadel: { base: 1.0, amplitude: 2.0, roughness: 0.8, terrace: 1.0, ridge: 0.5, basin: 0.3 },
};

// Atlas UV regions extracted from KayKit BlockBits gltf models
// x=u, y=v, z=width, w=height

function zoneContains(zone, x, z) {
  const b = zone.bounds;
  return x >= b.minX && x < b.maxX && z >= b.minZ && z < b.maxZ;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hashNoise(x, z, seed) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.0001) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hashNoise(x0, z0, seed);
  const b = hashNoise(x0 + 1, z0, seed);
  const c = hashNoise(x0, z0 + 1, seed);
  const d = hashNoise(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz;
}

function fbmNoise(x, z, seed, octaves = 4) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    value += (smoothNoise(x * frequency, z * frequency, seed + i * 1013) - 0.5) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total > 0 ? value / total : 0;
}

export class TerrainMesh {
  constructor(scene, renderer = null) {
    this.scene = scene;
    this.renderer = renderer;
    this.unifiedRenderer = null;
    this.tileAtlas = null;
    this.atlasRects = null;
    this.collisionMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.zones = new Map();
    this.chunks = new Map();
    this.emptyChunkKeys = new Set();
    this.dirtyChunks = [];
    this.dirtyChunkSet = new Set();
    this.modifiedDensities = new Map();
    this.modifiedBlockTypes = new Map();
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
    this.revision = 0;
    this.visibleChunkKeys = new Set();
    this.hotChunkKeys = new Set();
    this.visibilityStats = { visible: 0, hot: 0, live: 0, dirty: 0, rebuilt: 0, rebuildMs: 0, streamed: 0 };
    this.perfStats = { visibilityMs: 0, rebuildMs: 0, raycasts: 0, raycastMs: 0, visibilityRecomputed: 0 };
    this._streamBuildsThisFrame = 0;
    this._lastShaderTimeStep = -1;
    this._lastVisibilityAt = 0;
    this._lastVisibilityChunkKey = null;
    this._lastVisibilityMode = null;
    this._lastVisibilityForward = new THREE.Vector3(0, 0, -1);
    this._lastPlayerPos = new THREE.Vector3();
    this._frustum = new THREE.Frustum();
    this._projScreenMatrix = new THREE.Matrix4();
    this._cameraForward = new THREE.Vector3(0, 0, -1);
    this._tmpCenter = new THREE.Vector3();
    this._tmpSphere = new THREE.Sphere(new THREE.Vector3(), CHUNK_RADIUS);
    this.cutaway = {
      center: new THREE.Vector3(),
      forward: new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2),
      radius: 9,
      reach: 0,
      ceilingY: 2,
      amount: 0,
    };
    this._columnBounds = new Map(); // key -> { minY, maxY }
    this._fallingCells = new Set();
  }

  async preloadTypes() {
    if (this.unifiedRenderer) return;
    const loader = new THREE.TextureLoader();
    this.tileAtlas = loader.load('assets/textures/kenney_tiles.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestMipmapNearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      if (this.unifiedRenderer) {
        this.unifiedRenderer.setAtlasTexture(tex);
      }
    });
    this.atlasRects = buildAtlasRectArray();

    if (!this.renderer) {
      throw new Error('[TerrainMesh] Unified terrain renderer requires the THREE.WebGLRenderer instance.');
    }

    const gl = this.renderer.getContext();
    if (!gl || typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) {
      throw new Error('[TerrainMesh] Unified terrain renderer requires WebGL2.');
    }

    this.unifiedRenderer = new UnifiedTerrainRenderer(this.renderer);
    this.unifiedRenderer.setAtlasTexture(this.tileAtlas);
    this.unifiedRenderer.setAtlasRects(this.atlasRects);
    this.unifiedRenderer.setLightDir(0.35, 0.85, 0.32);
  }

  addZone(zone, seed = 1) {
    this.zones.set(zone.id, { zone, seed });
    const sp = zone.spawnPoint;
    this.protectedPoints.push({ x: sp.x, y: SURFACE_Y, z: sp.z, radius: 3.0, zoneId: zone.id });
    if (zone.exitGateway) {
      this.protectedPoints.push({
        x: zone.exitGateway.x,
        y: SURFACE_Y,
        z: zone.exitGateway.z,
        radius: 3.0,
        zoneId: zone.id,
      });
    }
  }

  rebuildAll() {
    this._clearChunks();
    this.dirtyChunks = [];
    this.dirtyChunkSet.clear();
    for (const { zone } of this.zones.values()) {
      const b = zone.bounds;
      const cx0 = Math.floor(b.minX / CHUNK_SIZE);
      const cx1 = Math.floor((b.maxX - 1) / CHUNK_SIZE);
      const cz0 = Math.floor(b.minZ / CHUNK_SIZE);
      const cz1 = Math.floor((b.maxZ - 1) / CHUNK_SIZE);
      const cy = Math.floor(0 / CHUNK_SIZE);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          this._rebuildChunk(cx, cy, cz);
        }
      }
    }
    this._refreshStats();
  }

  generateFromOccupancyGrid() {
    this.rebuildAll();
  }

  update(options = {}) {
    const now = this._nowMs();
    const start = now;
    const playerPos = options.playerPos || this._lastPlayerPos;
    this._processQueuedFallingBlocks(playerPos);
    let rebuilt = 0;
    if (this.dirtyChunks.length > 1) {
      this._prioritizeDirtyChunks(playerPos);
    }

    while (rebuilt < MAX_REBUILDS_PER_FRAME && this.dirtyChunks.length > 0) {
      if (rebuilt > 0 && this._nowMs() - start >= REBUILD_TIME_BUDGET_MS) break;
      const key = this.dirtyChunks.shift();
      this.dirtyChunkSet.delete(key);
      const [cx, cy, cz] = key.split(',').map(Number);
      this._rebuildChunk(cx, cy, cz);
      rebuilt++;
    }
    if (rebuilt > 0) this._refreshStats();
    this.visibilityStats.rebuilt = rebuilt;
    this.visibilityStats.rebuildMs = this._nowMs() - start;
    this.perfStats.rebuildMs = this.visibilityStats.rebuildMs;
  }

  queueDirtyChunks(chunkKeys) {
    for (const key of chunkKeys) {
      this.emptyChunkKeys.delete(key);
      if (this.dirtyChunkSet.has(key)) continue;
      this.dirtyChunkSet.add(key);
      this.dirtyChunks.push(key);
    }
  }

  raycast(raycaster, origin = null, radius = 42) {
    const start = this._nowMs();
    this.perfStats.raycasts++;
    const meshes = this.getNearbyMeshes(origin || raycaster.ray.origin, radius);
    if (meshes.length === 0) {
      this.perfStats.raycastMs += this._nowMs() - start;
      return null;
    }
    const hits = raycaster.intersectObjects(meshes, false);
    this.perfStats.raycastMs += this._nowMs() - start;
    return hits.length > 0 ? hits[0] : null;
  }

  resetPerfStats() {
    this.perfStats.visibilityMs = 0;
    this.perfStats.rebuildMs = 0;
    this.perfStats.raycastMs = 0;
    this.perfStats.raycasts = 0;
    this.perfStats.visibilityRecomputed = 0;
  }

  setRenderMode(cameraMode = 'iso', quality = 1) {
    if (!this.unifiedRenderer) return;
    this.unifiedRenderer.setRenderMode(cameraMode);
    this.unifiedRenderer.setShaderQuality(clamp(quality, 0.5, 1));
  }

  setFog(options = {}) {
    this.unifiedRenderer?.setFog(options);
  }

  render(camera) {
    if (!this.unifiedRenderer) return;
    this.unifiedRenderer.setTime(performance.now() * 0.001);
    this.unifiedRenderer.render(camera, this.visibleChunkKeys);
  }

  getNearbyMeshes(position, radius = 42) {
    const out = [];
    const r2 = radius * radius;
    for (const chunk of this.chunks.values()) {
      if (!chunk.raycastMesh) continue;
      const dx = chunk.centerX - position.x;
      const dy = chunk.centerY - position.y;
      const dz = chunk.centerZ - position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const visible = chunk.hot || distSq < 12 * 12 || this.visibleChunkKeys.has(this._chunkKey(chunk.cx, chunk.cy, chunk.cz));
      if (distSq <= r2 && visible) {
        out.push(chunk.raycastMesh);
      }
    }
    return out;
  }

  updateVisibility(position, options = {}) {
    const now = this._nowMs();
    const start = now;
    const cameraMode = options.cameraMode || 'iso';
    const camera = options.camera || null;
    const budget = cameraMode === 'thirdPerson' ? FP_VISIBLE_CHUNK_BUDGET : ISO_VISIBLE_CHUNK_BUDGET;
    const minInterval = cameraMode === 'thirdPerson' ? TP_VISIBILITY_MIN_INTERVAL_MS : VISIBILITY_MIN_INTERVAL_MS;
    this._lastPlayerPos.copy(position);
    this._streamBuildsThisFrame = 0;

    this._prepareCameraCulling(camera);
    const currentChunkKey = this._chunkKeyForPoint(position);
    const forwardStable = this._cameraForward.dot(this._lastVisibilityForward) > (cameraMode === 'thirdPerson' ? 0.94 : 0.965);
    const cacheValid = this.visibleChunkKeys.size > 0
      && this._lastVisibilityChunkKey === currentChunkKey
      && this._lastVisibilityMode === cameraMode
      && forwardStable
      && now - this._lastVisibilityAt < minInterval;

    if (!cacheValid) {
      const result = this._computeVisibleChunkKeys(position, cameraMode, budget);
      this.visibleChunkKeys = result.visibleKeys;
      this.hotChunkKeys = result.hotKeys;
      this._lastVisibilityAt = now;
      this._lastVisibilityChunkKey = currentChunkKey;
      this._lastVisibilityMode = cameraMode;
      this._lastVisibilityForward.copy(this._cameraForward);
      this.perfStats.visibilityRecomputed++;
    }

    let visibleLive = 0;
    for (const key of this.visibleChunkKeys) {
      const chunk = this.ensureChunkMesh(key, now);
      if (!chunk?.raycastMesh) continue;
      chunk.lastVisibleAt = now;
      chunk.hot = this.hotChunkKeys.has(key);
      visibleLive++;
    }

    for (const [key, chunk] of this.chunks) {
      if (!chunk.raycastMesh) continue;
      if (this.visibleChunkKeys.has(key)) continue;
      chunk.hot = this.hotChunkKeys.has(key);
    }

    this.unloadColdChunks(now);
    this.visibilityStats.visible = this.visibleChunkKeys.size;
    this.visibilityStats.hot = this.hotChunkKeys.size;
    this.visibilityStats.live = this.chunks.size;
    this.visibilityStats.dirty = this.dirtyChunks.length;
    this.visibilityStats.streamed = this._streamBuildsThisFrame;
    this.visibilityStats.visibleLive = visibleLive;
    this.perfStats.visibilityMs = this._nowMs() - start;
    return this.visibilityStats;
  }

  ensureChunkMesh(key, now = this._nowMs()) {
    const existing = this.chunks.get(key);
    if (existing?.raycastMesh) {
      this._ensureUnifiedSlotForChunk(existing);
      existing.lastTouchedAt = now;
      return existing;
    }
    if (this.emptyChunkKeys.has(key)) return null;
    if (this._streamBuildsThisFrame >= STREAM_BUILD_LIMIT_PER_FRAME && !this.hotChunkKeys.has(key)) return null;
    const coords = this._parseChunkKey(key);
    if (!coords || !this._chunkWithinTerrainBounds(coords.cx, coords.cy, coords.cz)) return null;
    this._rebuildChunk(coords.cx, coords.cy, coords.cz);
    this._streamBuildsThisFrame++;
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.lastVisibleAt = now;
      chunk.lastTouchedAt = now;
    }
    return chunk || null;
  }

  getChunkKeyForPoint(position) {
    return this._chunkKeyForPoint(position);
  }

  unloadColdChunks(now = this._nowMs()) {
    const removable = [];
    for (const [key, chunk] of this.chunks) {
      if (!chunk?.raycastMesh || this.visibleChunkKeys.has(key) || chunk.hot) continue;
      const idleMs = now - (chunk.lastVisibleAt || 0);
      if (idleMs >= CHUNK_UNLOAD_IDLE_MS || this.chunks.size > LIVE_CHUNK_CAP) {
        removable.push({ key, idleMs, distSq: this._chunkDistanceSqToPoint(key, this._lastPlayerPos) });
      }
    }
    removable.sort((a, b) => (b.idleMs - a.idleMs) || (b.distSq - a.distSq));
    const targetRemovals = Math.max(0, this.chunks.size - LIVE_CHUNK_CAP);
    const maxRemovals = targetRemovals > 0 ? removable.length : Math.min(8, removable.length);
    for (let i = 0; i < maxRemovals; i++) {
      if (targetRemovals <= 0 && removable[i].idleMs < CHUNK_UNLOAD_IDLE_MS) break;
      this._disposeChunkMesh(removable[i].key);
    }
  }

  setCutaway(center, amount = 0, radius = 9, ceilingY = 2, options = {}) {
    this.cutaway.center.copy(center);
    this.cutaway.amount = clamp(amount, 0, 1);
    this.cutaway.radius = Math.max(0.1, radius);
    this.cutaway.reach = Math.max(0, options.reach || 0);
    this.cutaway.ceilingY = ceilingY;
    if (options.forward) {
      this.cutaway.forward.set(options.forward.x, options.forward.z ?? options.forward.y ?? 0);
      if (this.cutaway.forward.lengthSq() > 0.0001) {
        this.cutaway.forward.normalize();
      } else {
        this.cutaway.forward.set(Math.SQRT1_2, Math.SQRT1_2);
      }
    }
    if (this.unifiedRenderer) {
      this.unifiedRenderer.setCutaway(
        this.cutaway.center,
        this.cutaway.forward,
        this.cutaway.radius,
        this.cutaway.reach,
        this.cutaway.ceilingY,
        this.cutaway.amount
      );
    }
  }

  _computeVisibleChunkKeys(position, cameraMode, budget) {
    if (cameraMode !== 'thirdPerson') {
      return this._computeIsoVisibleChunkKeys(position, budget);
    }
    return this._computeThirdPersonVisibleChunkKeys(position, budget);
  }

  _computeThirdPersonVisibleChunkKeys(position, budget) {
    const startKey = this._chunkKeyForPoint(position);
    const center = this._parseChunkKey(startKey);
    const visibleKeys = new Set();
    const hotKeys = new Set();
    const candidates = [];
    const radiusChunks = TP_CHUNK_RADIUS;

    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dy = -2; dy <= 1; dy++) {
        for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
          const cx = center.cx + dx;
          const cy = center.cy + dy;
          const cz = center.cz + dz;
          if (!this._chunkWithinTerrainBounds(cx, cy, cz)) continue;
          const key = this._chunkKey(cx, cy, cz);
          if (!this._chunkCanMatter(key, position, 'thirdPerson')) continue;
          candidates.push(key);
        }
      }
    }

    const forcedKeys = new Set([startKey]);
    for (const n of this._neighborChunkKeys(startKey)) {
      if (this._chunkWithinTerrainBounds(n.cx, n.cy, n.cz)) forcedKeys.add(n.key);
    }

    for (const key of forcedKeys) visibleKeys.add(key);
    candidates.sort((a, b) => this._chunkVisibilityScore(a, position, 'thirdPerson') - this._chunkVisibilityScore(b, position, 'thirdPerson'));
    for (const key of candidates) {
      if (visibleKeys.size >= budget) break;
      visibleKeys.add(key);
    }
    for (const key of candidates) {
      if (hotKeys.size >= FP_HOT_CHUNK_BUDGET) break;
      hotKeys.add(key);
    }
    for (const key of visibleKeys) hotKeys.add(key);

    return { visibleKeys, hotKeys };
  }

  _computeIsoVisibleChunkKeys(position, budget) {
    const center = this._parseChunkKey(this._chunkKeyForPoint(position));
    const visibleKeys = new Set();
    const candidates = [];
    const radiusChunks = 3;
    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dy = -2; dy <= 1; dy++) {
        for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
          const cx = center.cx + dx;
          const cy = center.cy + dy;
          const cz = center.cz + dz;
          if (!this._chunkWithinTerrainBounds(cx, cy, cz)) continue;
          const key = this._chunkKey(cx, cy, cz);
          if (!this._chunkCanMatter(key, position, 'iso')) continue;
          candidates.push(key);
        }
      }
    }

    candidates.sort((a, b) => this._chunkVisibilityScore(a, position, 'iso') - this._chunkVisibilityScore(b, position, 'iso'));
    for (const key of candidates) {
      if (visibleKeys.size >= budget) break;
      visibleKeys.add(key);
    }
    const startKey = this._chunkKeyForPoint(position);
    visibleKeys.add(startKey);
    for (const n of this._neighborChunkKeys(startKey)) {
      if (this._chunkWithinTerrainBounds(n.cx, n.cy, n.cz)) visibleKeys.add(n.key);
    }
    return { visibleKeys, hotKeys: new Set(visibleKeys) };
  }

  _prepareCameraCulling(camera) {
    if (!camera) return;
    camera.updateMatrixWorld?.();
    camera.updateProjectionMatrix?.();
    this._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);
    camera.getWorldDirection(this._cameraForward).normalize();
  }

  _chunkCanMatter(key, position, cameraMode) {
    const distSq = this._chunkDistanceSqToPoint(key, position);
    if (distSq < CHUNK_SIZE * CHUNK_SIZE * 4) return true;
    if (this._chunkIntersectsFrustum(key)) return true;
    if (cameraMode === 'thirdPerson') return this._chunkInLookCorridor(key, 7.5, 90);
    return this._chunkInCutawayCorridor(key) || distSq < 34 * 34;
  }

  _chunkVisibilityScore(key, position, cameraMode) {
    this._getChunkCenter(key, this._tmpCenter);
    const distSq = this._tmpCenter.distanceToSquared(position);
    let score = distSq;
    if (this._chunkIntersectsFrustum(key)) score -= 900;
    if (cameraMode === 'thirdPerson') {
      const tx = this._tmpCenter.x - position.x;
      const ty = this._tmpCenter.y - position.y;
      const tz = this._tmpCenter.z - position.z;
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
      const forward = len > 0.0001
        ? (tx * this._cameraForward.x + ty * this._cameraForward.y + tz * this._cameraForward.z) / len
        : 1;
      score -= Math.max(0, forward) * 700;
      if (this._chunkInLookCorridor(key, 7.5, 90)) score -= 1200;
    } else if (this._chunkInCutawayCorridor(key)) {
      score -= 900;
    }
    return score;
  }

  _chunkIntersectsFrustum(key) {
    this._getChunkCenter(key, this._tmpSphere.center);
    return this._frustum.intersectsSphere(this._tmpSphere);
  }

  _chunkInLookCorridor(key, radius, maxReach) {
    this._getChunkCenter(key, this._tmpCenter);
    const tx = this._tmpCenter.x - this._lastPlayerPos.x;
    const ty = this._tmpCenter.y - this._lastPlayerPos.y;
    const tz = this._tmpCenter.z - this._lastPlayerPos.z;
    const t = tx * this._cameraForward.x + ty * this._cameraForward.y + tz * this._cameraForward.z;
    if (t < -CHUNK_SIZE || t > maxReach) return false;
    const clampedT = Math.max(0, t);
    const cx = this._lastPlayerPos.x + this._cameraForward.x * clampedT;
    const cy = this._lastPlayerPos.y + this._cameraForward.y * clampedT;
    const cz = this._lastPlayerPos.z + this._cameraForward.z * clampedT;
    return (this._tmpCenter.x - cx) ** 2 + (this._tmpCenter.y - cy) ** 2 + (this._tmpCenter.z - cz) ** 2 <= radius * radius;
  }

  _chunkInCutawayCorridor(key) {
    if (this.cutaway.amount <= 0.01) return false;
    this._getChunkCenter(key, this._tmpCenter);
    const dx = this._tmpCenter.x - this.cutaway.center.x;
    const dz = this._tmpCenter.z - this.cutaway.center.z;
    const t = clamp(dx * this.cutaway.forward.x + dz * this.cutaway.forward.y, 0, this.cutaway.reach || 0);
    const nx = this.cutaway.center.x + this.cutaway.forward.x * t;
    const nz = this.cutaway.center.z + this.cutaway.forward.y * t;
    const radius = this.cutaway.radius + 2.5;
    return (this._tmpCenter.x - nx) ** 2 + (this._tmpCenter.z - nz) ** 2 <= radius * radius;
  }

  _chunkBoundaryOpen(aKey, bKey) {
    const a = this._parseChunkKey(aKey);
    const b = this._parseChunkKey(bKey);
    if (!a || !b) return false;
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const dz = b.cz - a.cz;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) !== 1) return false;

    const ax0 = a.cx * CHUNK_SIZE;
    const ay0 = a.cy * CHUNK_SIZE;
    const az0 = a.cz * CHUNK_SIZE;
    const bx0 = b.cx * CHUNK_SIZE;
    const by0 = b.cy * CHUNK_SIZE;
    const bz0 = b.cz * CHUNK_SIZE;
    const midX = Math.floor(Math.max(ax0, bx0) + CHUNK_SIZE * 0.5);
    const midY = Math.floor(clamp(Math.max(ay0, by0) + CHUNK_SIZE * 0.5, TERRAIN_MIN_Y, TERRAIN_MAX_Y));
    const midZ = Math.floor(Math.max(az0, bz0) + CHUNK_SIZE * 0.5);
    const samples = [
      [0, 0],
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    if (dx !== 0) {
      const ax = dx > 0 ? ax0 + CHUNK_SIZE - 1 : ax0;
      const bx = dx > 0 ? bx0 : bx0 + CHUNK_SIZE - 1;
      for (const [oy, oz] of samples) {
        const y = clamp(midY + oy, TERRAIN_MIN_Y, TERRAIN_MAX_Y);
        const z = midZ + oz;
        if (!this.isCellSolid(ax, y, z) && !this.isCellSolid(bx, y, z)) return true;
      }
      return false;
    }

    if (dy !== 0) {
      const ay = dy > 0 ? ay0 + CHUNK_SIZE - 1 : ay0;
      const by = dy > 0 ? by0 : by0 + CHUNK_SIZE - 1;
      for (const [ox, oz] of samples) {
        const x = midX + ox;
        const z = midZ + oz;
        if (!this.isCellSolid(x, ay, z) && !this.isCellSolid(x, by, z)) return true;
      }
      return false;
    }

    const az = dz > 0 ? az0 + CHUNK_SIZE - 1 : az0;
    const bz = dz > 0 ? bz0 : bz0 + CHUNK_SIZE - 1;
    for (const [ox, oy] of samples) {
      const x = midX + ox;
      const y = clamp(midY + oy, TERRAIN_MIN_Y, TERRAIN_MAX_Y);
      if (!this.isCellSolid(x, y, az) && !this.isCellSolid(x, y, bz)) return true;
    }
    return false;
  }

  _neighborChunkKeys(key) {
    const c = this._parseChunkKey(key);
    if (!c) return [];
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    return dirs.map(([dx, dy, dz]) => {
      const cx = c.cx + dx;
      const cy = c.cy + dy;
      const cz = c.cz + dz;
      return { key: this._chunkKey(cx, cy, cz), cx, cy, cz };
    });
  }

  _chunkKeyForPoint(position) {
    return this._chunkKey(
      Math.floor(position.x / CHUNK_SIZE),
      Math.floor(position.y / CHUNK_SIZE),
      Math.floor(position.z / CHUNK_SIZE)
    );
  }

  _parseChunkKey(key) {
    const parts = String(key).split(',').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    return { cx: parts[0], cy: parts[1], cz: parts[2] };
  }

  _chunkWithinTerrainBounds(cx, cy, cz) {
    const y0 = cy * CHUNK_SIZE;
    if (y0 > TERRAIN_MAX_Y || y0 + CHUNK_SIZE < TERRAIN_MIN_Y) return false;
    const centerX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    const centerZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
    return !!this._findZoneEntry(centerX, centerZ);
  }

  _getChunkCenter(key, target = new THREE.Vector3()) {
    const c = this._parseChunkKey(key);
    if (!c) return target.set(0, 0, 0);
    return target.set(
      c.cx * CHUNK_SIZE + CHUNK_SIZE / 2,
      c.cy * CHUNK_SIZE + CHUNK_SIZE / 2,
      c.cz * CHUNK_SIZE + CHUNK_SIZE / 2
    );
  }

  _chunkDistanceSqToPoint(key, point) {
    this._getChunkCenter(key, this._tmpCenter);
    return this._tmpCenter.distanceToSquared(point);
  }

  applyDigBrush(center, radius, strength = 1, zoneId = null, options = {}) {
    const zoneEntry = zoneId ? this.zones.get(zoneId) : this._findZoneEntry(center.x, center.z);
    if (!zoneEntry) {
      return { meaningful: false, removedVolume: 0, removedCells: 0, touchedChunks: [], center, radius, zoneId: null, depth: 0 };
    }

    const brushRadius = Math.max(0.45, radius * Math.max(0.25, strength));
    const minX = Math.floor(center.x - brushRadius - 1);
    const maxX = Math.ceil(center.x + brushRadius + 1);
    const minY = Math.floor(center.y - brushRadius - 1);
    const maxY = Math.ceil(center.y + brushRadius + 1);
    const minZ = Math.floor(center.z - brushRadius - 1);
    const maxZ = Math.ceil(center.z + brushRadius + 1);
    const touched = new Set();
    const maxCells = Math.max(0, options.maxCells || 0);
    const candidates = maxCells > 0 ? [] : null;
    let removedCells = 0;
    let removedVolume = 0;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) continue;
        for (let z = minZ; z <= maxZ; z++) {
          if (!zoneContains(zoneEntry.zone, x, z)) continue;
          if (this._isProtected(x, y, z, zoneEntry.zone.id)) continue;

          const cx = x + 0.5;
          const cy = y + 0.5;
          const cz = z + 0.5;
          const dx = cx - center.x;
          const dy = cy - center.y;
          const dz = cz - center.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > brushRadius * brushRadius) continue;

          const cellState = this.getCellState(x, y, z);
          if (!cellState.renderable || !cellState.properties.mineable) continue;
          const oldDensity = this.sampleDensity(cx, cy, cz);
          if (oldDensity <= ISO_LEVEL) continue;

          const dist = Math.sqrt(distSq);
          const newDensity = Math.min(oldDensity, dist - brushRadius - 0.15);
          if (candidates) {
            candidates.push({ x, y, z, distSq, oldDensity, newDensity });
            continue;
          }
          this._setDensity(x, y, z, newDensity);
          this._setBlockType(x, y, z, 'air');
          this._queueFallingCheck(x, y + 1, z);
          removedCells++;
          removedVolume += Math.max(0.2, Math.min(oldDensity, oldDensity - Math.max(newDensity, ISO_LEVEL)));
          this._collectTouchedChunks(x, y, z, touched);
        }
      }
    }

    if (candidates) {
      candidates.sort((a, b) => a.distSq - b.distSq);
      const count = Math.min(maxCells, candidates.length);
      for (let i = 0; i < count; i++) {
        const c = candidates[i];
        this._setDensity(c.x, c.y, c.z, c.newDensity);
        this._setBlockType(c.x, c.y, c.z, 'air');
        this._queueFallingCheck(c.x, c.y + 1, c.z);
        removedCells++;
        removedVolume += Math.max(0.2, Math.min(c.oldDensity, c.oldDensity - Math.max(c.newDensity, ISO_LEVEL)));
        this._collectTouchedChunks(c.x, c.y, c.z, touched);
      }
    }

    if (removedCells > 0) {
      this.revision++;
      this.queueDirtyChunks(touched);
      // Invalidate column bounds for touched chunks
      for (const key of touched) {
        const c = this._parseChunkKey(key);
        if (c) this._columnBounds.delete(this._columnBoundsKey(c.cx, c.cz));
      }
    }

    return {
      meaningful: removedCells > 0,
      removedCells,
      removedVolume,
      touchedChunks: [...touched],
      center: center.clone ? center.clone() : new THREE.Vector3(center.x, center.y, center.z),
      radius: brushRadius,
      zoneId: zoneEntry.zone.id,
      depth: Math.max(0, SURFACE_Y - center.y),
    };
  }

  getColumnTop(x, z, fromY = TERRAIN_MAX_Y) {
    const zoneEntry = this._findZoneEntry(x, z);
    if (!zoneEntry) return -999;

    const cellX = Math.floor(x);
    const cellZ = Math.floor(z);
    const startY = Math.floor(clamp(fromY + 1, TERRAIN_MIN_Y, TERRAIN_MAX_Y));
    for (let y = startY; y >= TERRAIN_MIN_Y; y--) {
      if (this.isCellSolid(cellX, y, cellZ)) return y + 1;
    }
    return -999;
  }

  findFloorBelow(x, z, footY, maxDistance = 0.25) {
    const zoneEntry = this._findZoneEntry(x, z);
    if (!zoneEntry) return -999;

    const cellX = Math.floor(x);
    const cellZ = Math.floor(z);
    const minFloorY = footY - Math.max(0.01, maxDistance);
    const maxFloorY = footY + 2.5;
    const startY = Math.floor(clamp(maxFloorY, TERRAIN_MIN_Y, TERRAIN_MAX_Y));
    const endY = Math.floor(clamp(minFloorY - 3, TERRAIN_MIN_Y, TERRAIN_MAX_Y));

    for (let y = startY; y >= endY; y--) {
      if (!this.isCellSolid(cellX, y, cellZ)) continue;
      const floorY = y + 1;
      if (floorY <= maxFloorY && floorY >= minFloorY) return floorY;
    }
    return -999;
  }

  isSolidAt(x, y, z) {
    return this.isCellSolid(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  isCapsuleBlockedAt(x, y, z, radius = 0.28, height = 1.45) {
    const r = radius;
    const h0 = y + 0.20;
    const h1 = y + height * 0.50;
    const h2 = y + height;
    const samples = [
      // core vertical line
      [x, h0, z],
      [x, h1, z],
      [x, h2, z],
      // mid-ring
      [x + r, h1, z],
      [x - r, h1, z],
      [x, h1, z + r],
      [x, h1, z - r],
      // foot-ring
      [x + r, h0, z],
      [x - r, h0, z],
      [x, h0, z + r],
      [x, h0, z - r],
      // head-ring
      [x + r, h2, z],
      [x - r, h2, z],
      [x, h2, z + r],
      [x, h2, z - r],
      // corners at mid height
      [x + r * 0.7, h1, z + r * 0.7],
      [x + r * 0.7, h1, z - r * 0.7],
      [x - r * 0.7, h1, z + r * 0.7],
      [x - r * 0.7, h1, z - r * 0.7],
    ];
    return samples.some(([sx, sy, sz]) => this.isSolidAt(sx, sy, sz));
  }

  isCellSolid(x, y, z) {
    if (y < TERRAIN_MIN_Y) return true;
    if (y > TERRAIN_MAX_Y) return false;
    return this.getCellState(x, y, z).solid;
  }

  isCellRenderable(x, y, z) {
    return this.getCellState(x, y, z).renderable;
  }

  getCellState(x, y, z) {
    const type = this.getCellBlockType(x, y, z);
    const properties = getBlockProperties(type);
    const renderable = type !== 'air' && properties.renderLayer !== 'none';
    return {
      type,
      properties,
      renderable,
      solid: renderable && !!properties.solid,
      fluid: renderable ? properties.fluid : null,
      hazard: renderable ? properties.hazard : null,
    };
  }

  getCellBlockType(x, y, z) {
    if (y < TERRAIN_MIN_Y) return 'stone_dark';
    if (y > TERRAIN_MAX_Y) return 'air';
    const key = this._sampleKey(x, y, z);
    if (this.modifiedBlockTypes.has(key)) return this.modifiedBlockTypes.get(key);
    const zoneEntry = this._findZoneEntry(x + 0.5, z + 0.5);
    if (!zoneEntry) return 'air';
    const density = this.sampleDensity(x + 0.5, y + 0.5, z + 0.5);
    if (density <= ISO_LEVEL) {
      const fluid = this._fluidBodyForCell(x, y, z, zoneEntry);
      return fluid ? fluid.type : 'air';
    }
    return this._baseBlockTypeForCell(x, y, z, null, zoneEntry);
  }

  getFluidStateAt(position) {
    if (!position) return null;
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const z = Math.floor(position.z);
    const zoneEntry = this._findZoneEntry(position.x, position.z);
    const body = zoneEntry ? this._fluidBodyForPoint(position.x, position.z, zoneEntry) : null;
    const cellBody = body && zoneEntry ? this._fluidBodyForCell(x, y, z, zoneEntry) : null;
    if (cellBody) {
      const surfaceY = cellBody.surfaceY ?? 1.15;
      const bottomY = this._fluidRenderableBottomY(cellBody);
      if (position.y <= surfaceY + 0.45 && position.y >= bottomY - 0.75) {
        const properties = getBlockProperties(cellBody.type);
        return {
          type: cellBody.type,
          surfaceY,
          bottomY,
          depth: Math.max(0, surfaceY - Math.max(position.y, bottomY)),
          properties,
          hazard: properties.hazard,
        };
      }
    }
    const state = this.getCellState(x, y, z);
    if (!state.fluid) return null;
    const surfaceY = y + 1;
    const bottomY = y;
    if (position.y > surfaceY + 0.45 || position.y < bottomY - 0.75) return null;
    return {
      type: state.fluid.type,
      surfaceY,
      bottomY,
      depth: Math.max(0, surfaceY - Math.max(position.y, bottomY)),
      properties: state.properties,
      hazard: state.hazard,
    };
  }

  getSurfaceStateAt(position) {
    if (!position) return null;
    const x = Math.floor(position.x);
    const z = Math.floor(position.z);
    const startY = Math.floor(clamp(position.y - 0.06, TERRAIN_MIN_Y, TERRAIN_MAX_Y));
    for (let y = startY; y >= Math.max(TERRAIN_MIN_Y, startY - 2); y--) {
      const state = this.getCellState(x, y, z);
      if (state.solid) {
        return {
          ...state,
          x,
          y,
          z,
          topY: y + 1,
        };
      }
    }
    return null;
  }

  sampleDensity(x, y, z) {
    const key = this._sampleKey(Math.floor(x), Math.floor(y), Math.floor(z));
    if (this.modifiedDensities.has(key)) return this.modifiedDensities.get(key);
    const zoneEntry = this._findZoneEntry(x, z);
    if (!zoneEntry) return -2;
    return this._initialDensity(x, y, z, zoneEntry);
  }

  hasBlock(x, y, z) {
    return this.isCellSolid(x, y, z);
  }

  isBlockSolid(x, y, z) {
    return this.hasBlock(x, y, z);
  }

  getBlockCenter(x, y, z) {
    return new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
  }

  destroyBlock(x, y, z) {
    return this.applyDigBrush(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 0.9, 1).meaningful;
  }

  displaceBlock(x, y, z) {
    return this.applyDigBrush(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 0.35, 0.35).meaningful;
  }

  restoreBlock() {
    return false;
  }

  clear() {
    this._clearChunks();
    this.zones.clear();
    this.dirtyChunks = [];
    this.dirtyChunkSet.clear();
    this.emptyChunkKeys.clear();
    this.modifiedDensities.clear();
    this.modifiedBlockTypes.clear();
    this._fallingCells.clear();
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
    this.revision = 0;
    this.visibleChunkKeys.clear();
    this.hotChunkKeys.clear();
    this.visibilityStats = { visible: 0, hot: 0, live: 0, dirty: 0, rebuilt: 0, rebuildMs: 0, streamed: 0 };
    this.setCutaway(new THREE.Vector3(), 0, this.cutaway.radius, this.cutaway.ceilingY, { reach: this.cutaway.reach });
  }

  getStats() {
    const ustats = this.unifiedRenderer ? this.unifiedRenderer.stats : null;
    return {
      blocks: this.modifiedDensities.size,
      chunks: this.stats.chunks,
      triangles: this.stats.triangles,
      samples: this.modifiedDensities.size,
      dirtyChunks: this.dirtyChunks.length,
      visibleChunks: this.visibilityStats.visible || 0,
      hotChunks: this.visibilityStats.hot || 0,
      liveChunks: this.visibilityStats.live || this.chunks.size,
      rebuildMs: this.visibilityStats.rebuildMs || 0,
      streamedChunks: this.visibilityStats.streamed || 0,
      unifiedDrawCalls: ustats?.drawCalls ?? 0,
      unifiedVisibleChunks: ustats?.visibleChunks ?? 0,
      unifiedSlotUtilization: ustats?.slotUtilization ?? 0,
    };
  }

  _initialDensity(x, y, z, zoneEntry) {
    const { zone, seed } = zoneEntry;
    if (!zoneContains(zone, x, z)) return -2;
    if (y < TERRAIN_MIN_Y) return 2;
    if (y > TERRAIN_MAX_Y) return -2;

    const b = zone.bounds;
    const edge = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
    const edgeWall = clamp(edge, -1, 1);
    const surface = this._surfaceHeightAt(x, z, zoneEntry);
    return Math.min(surface - y, edgeWall + 0.25);
  }

  _surfaceHeightAt(x, z, zoneEntry) {
    const { zone, seed } = zoneEntry;
    const profile = ZONE_SURFACE_PROFILES[zone.id] || ZONE_SURFACE_PROFILES.forest;
    const broad = fbmNoise(x * 0.035, z * 0.035, seed, 4);
    const medium = fbmNoise(x * 0.095 + 41.7, z * 0.095 - 22.4, seed + 991, 3);
    const ridgeRaw = smoothNoise(x * 0.055 - 18.5, z * 0.055 + 9.25, seed + 2077);
    const ridge = Math.max(0, 1 - Math.abs(ridgeRaw * 2 - 1) * 1.45);
    const basin = Math.max(0, smoothNoise(x * 0.07 + 113.2, z * 0.07 - 81.6, seed + 6151) - 0.62);
    let height = profile.base
      + broad * profile.amplitude
      + medium * profile.roughness
      + ridge * profile.ridge
      - basin * profile.basin * 3.2;

    if (profile.terrace > 0) {
      height = Math.round(height / profile.terrace) * profile.terrace;
    }

    for (const fluid of zone.fluidBodies || []) {
      const radiusX = Math.max(0.1, fluid.radiusX || 1);
      const radiusZ = Math.max(0.1, fluid.radiusZ || 1);
      const dx = (x - fluid.x) / radiusX;
      const dz = (z - fluid.z) / radiusZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 1.12) continue;

      // Carve a deterministic walk-in bowl: deepest in the middle, with a
      // shallow shelf near shore so the player can enter/exit without snagging.
      const shelfY = (fluid.surfaceY ?? 1.15) - 0.42;
      const bottomY = fluid.bottomY ?? -1.8;
      const bowlT = smoothstep(0.18, 0.92, dist);
      const targetHeight = bottomY + (shelfY - bottomY) * bowlT;
      const edgeBlend = 1 - smoothstep(0.92, 1.12, dist);
      height = height * (1 - edgeBlend) + Math.min(height, targetHeight) * edgeBlend;
    }

    const spawn = zone.spawnPoint;
    if (spawn) {
      const dist = Math.hypot(x - spawn.x, z - spawn.z);
      const flat = 1 - smoothstep(4.0, 8.5, dist);
      height = height * (1 - flat) + SURFACE_Y * flat;
    }
    if (zone.exitGateway) {
      const dist = Math.hypot(x - zone.exitGateway.x, z - zone.exitGateway.z);
      const flat = 1 - smoothstep(3.0, 6.0, dist);
      height = height * (1 - flat) + SURFACE_Y * flat;
    }

    return clamp(height, -2.5, TERRAIN_MAX_Y - 0.2);
  }

  _setDensity(x, y, z, density) {
    this.modifiedDensities.set(this._sampleKey(x, y, z), density);
  }

  _setBlockType(x, y, z, type) {
    this.modifiedBlockTypes.set(this._sampleKey(x, y, z), type);
  }

  _fluidBodyForCell(x, y, z, zoneEntry) {
    const body = this._fluidBodyForPoint(x + 0.5, z + 0.5, zoneEntry);
    if (!body) return null;
    const cy = y + 0.5;
    const surfaceY = body.surfaceY ?? 1.15;
    const bottomY = body.bottomY ?? -1.8;
    const renderBottomY = this._fluidRenderableBottomY(body);
    if (cy > surfaceY || cy < renderBottomY) return null;
    if (cy < bottomY) {
      const aboveDensity = this.sampleDensity(x + 0.5, y + 1.5, z + 0.5);
      if (aboveDensity > ISO_LEVEL) return null;
    }
    return body;
  }

  _fluidRenderableBottomY(body) {
    const bottomY = body?.bottomY ?? -1.8;
    const fallDepth = Math.max(0, body?.flowDepth ?? WATER_FALL_DEPTH);
    return Math.max(TERRAIN_MIN_Y, body?.flowBottomY ?? bottomY - fallDepth);
  }

  _fluidBodyForPoint(x, z, zoneEntry) {
    const bodies = zoneEntry?.zone?.fluidBodies || [];
    for (const body of bodies) {
      const radiusX = Math.max(0.1, body.radiusX || 1);
      const radiusZ = Math.max(0.1, body.radiusZ || 1);
      const nx = (x - body.x) / radiusX;
      const nz = (z - body.z) / radiusZ;
      if (nx * nx + nz * nz <= 1) return body;
    }
    return null;
  }

  _queueFallingCheck(x, y, z) {
    if (y < TERRAIN_MIN_Y + 1 || y > TERRAIN_MAX_Y) return;
    this._fallingCells.add(this._sampleKey(x, y, z));
  }

  _processQueuedFallingBlocks(playerPos) {
    if (!this._fallingCells.size) return;
    const touched = new Set();
    let moved = 0;
    const maxChecks = 48;
    for (const key of [...this._fallingCells].slice(0, maxChecks)) {
      this._fallingCells.delete(key);
      const [x, y, z] = key.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (playerPos && Math.abs(playerPos.x - (x + 0.5)) < 1.1 && Math.abs(playerPos.z - (z + 0.5)) < 1.1 && Math.abs(playerPos.y - (y + 0.5)) < 2.2) {
        this._fallingCells.add(key);
        continue;
      }
      const state = this.getCellState(x, y, z);
      if (!state.renderable || !state.properties.falling) continue;
      if (this.getCellState(x, y - 1, z).renderable) continue;
      this._moveFallingCell(x, y, z, state.type, touched);
      moved++;
    }
    if (moved <= 0) return;
    this.revision++;
    this.queueDirtyChunks(touched);
    for (const key of touched) {
      const c = this._parseChunkKey(key);
      if (c) this._columnBounds.delete(this._columnBoundsKey(c.cx, c.cz));
    }
  }

  _moveFallingCell(x, y, z, type, touched) {
    this._setDensity(x, y, z, -2);
    this._setBlockType(x, y, z, 'air');
    this._setDensity(x, y - 1, z, 1.2);
    this._setBlockType(x, y - 1, z, type);
    this._queueFallingCheck(x, y - 1, z);
    this._queueFallingCheck(x, y + 1, z);
    this._collectTouchedChunks(x, y, z, touched);
    this._collectTouchedChunks(x, y - 1, z, touched);
  }

  _findZoneEntry(x, z) {
    for (const entry of this.zones.values()) {
      if (zoneContains(entry.zone, x, z)) return entry;
    }
    return null;
  }

  _isProtected(x, y, z, zoneId) {
    for (const p of this.protectedPoints) {
      if (p.zoneId !== zoneId) continue;
      const dx = x + 0.5 - p.x;
      const dy = y + 0.5 - p.y;
      const dz = z + 0.5 - p.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= p.radius) return true;
    }
    return false;
  }

  _sampleKey(x, y, z) {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  _chunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  _columnBoundsKey(cx, cz) {
    return `${cx},${cz}`;
  }

  _nowMs() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  _prioritizeDirtyChunks(playerPos) {
    this.dirtyChunks.sort((a, b) => {
      const ah = this.hotChunkKeys.has(a) || this.visibleChunkKeys.has(a) ? 0 : 1;
      const bh = this.hotChunkKeys.has(b) || this.visibleChunkKeys.has(b) ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return this._chunkDistanceSqToPoint(a, playerPos) - this._chunkDistanceSqToPoint(b, playerPos);
    });
  }

  _collectTouchedChunks(x, y, z, out) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);

    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const xOffsets = [0];
    const yOffsets = [0];
    const zOffsets = [0];
    if (localX === 0) xOffsets.push(-1);
    if (localX === CHUNK_SIZE - 1) xOffsets.push(1);
    if (localY === 0) yOffsets.push(-1);
    if (localY === CHUNK_SIZE - 1) yOffsets.push(1);
    if (localZ === 0) zOffsets.push(-1);
    if (localZ === CHUNK_SIZE - 1) zOffsets.push(1);

    for (const dx of xOffsets) {
      for (const dy of yOffsets) {
        for (const dz of zOffsets) {
          const ccx = cx + dx;
          const ccy = cy + dy;
          const ccz = cz + dz;
          const y0 = ccy * CHUNK_SIZE;
          if (y0 > TERRAIN_MAX_Y || y0 + CHUNK_SIZE < TERRAIN_MIN_Y) continue;
          out.add(this._chunkKey(ccx, ccy, ccz));
        }
      }
    }
  }

  _rebuildChunk(cx, cy, cz) {
    const key = this._chunkKey(cx, cy, cz);
    this._disposeChunkMesh(key);

    const geometry = this._buildChunkGeometry(cx, cy, cz);
    if (!geometry) {
      this.emptyChunkKeys.add(key);
      return;
    }
    this.emptyChunkKeys.delete(key);

    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const now = this._nowMs();

    this._uploadChunkGeometryToUnifiedRenderer(cx, cy, cz, geometry);

    const raycastMesh = new THREE.Mesh(geometry, this.collisionMaterial);
    raycastMesh.name = `terrain_chunk_${key}`;
    raycastMesh.castShadow = false;
    raycastMesh.receiveShadow = false;
    raycastMesh.visible = true;
    this.scene.add(raycastMesh);

    this.chunks.set(key, {
      cx,
      cy,
      cz,
      centerX: x0 + CHUNK_SIZE / 2,
      centerY: y0 + CHUNK_SIZE / 2,
      centerZ: z0 + CHUNK_SIZE / 2,
      lastVisibleAt: now,
      lastTouchedAt: now,
      hot: false,
      raycastMesh,
    });
  }

  _ensureUnifiedSlotForChunk(chunk) {
    if (!this.unifiedRenderer || !chunk?.raycastMesh?.geometry) return;
    if (this.unifiedRenderer.hasReadySlot(chunk.cx, chunk.cy, chunk.cz)) return;
    this._uploadChunkGeometryToUnifiedRenderer(chunk.cx, chunk.cy, chunk.cz, chunk.raycastMesh.geometry);
  }

  _uploadChunkGeometryToUnifiedRenderer(cx, cy, cz, geometry) {
    if (!this.unifiedRenderer || !geometry) return false;
    const slotIndex = this.unifiedRenderer.acquireSlot(cx, cy, cz);
    if (slotIndex < 0) return false;

    const indices = geometry.index ? geometry.index.array : null;
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    const norm = geometry.attributes.normal.array;
    const uv = geometry.attributes.uv.array;
    const matId = geometry.attributes.materialId.array;
    const face = geometry.attributes.faceKind.array;
    const tile = geometry.attributes.tileIndex.array;
    const triCount = indices ? indices.length : pos.length / 3;
    const packed = new Float32Array(triCount * UNIFIED_VERTEX_STRIDE_FLOATS);
    for (let i = 0; i < triCount; i++) {
      const vi = indices ? indices[i] : i;
      const dst = i * UNIFIED_VERTEX_STRIDE_FLOATS;
      packed[dst + 0] = pos[vi * 3 + 0];
      packed[dst + 1] = pos[vi * 3 + 1];
      packed[dst + 2] = pos[vi * 3 + 2];
      packed[dst + 3] = col[vi * 3 + 0];
      packed[dst + 4] = col[vi * 3 + 1];
      packed[dst + 5] = col[vi * 3 + 2];
      packed[dst + 6] = norm[vi * 3 + 0];
      packed[dst + 7] = norm[vi * 3 + 1];
      packed[dst + 8] = norm[vi * 3 + 2];
      packed[dst + 9] = uv[vi * 2 + 0];
      packed[dst + 10] = uv[vi * 2 + 1];
      packed[dst + 11] = matId[vi];
      packed[dst + 12] = face[vi];
      packed[dst + 13] = tile[vi];
    }
    this.unifiedRenderer.uploadSlot(slotIndex, packed);
    return true;
  }

  _buildChunkGeometry(cx, cy, cz) {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const x1 = x0 + CHUNK_SIZE;
    const y1 = y0 + CHUNK_SIZE;
    const z1 = z0 + CHUNK_SIZE;

    // Column bounds: skip empty vertical slices without assuming the first
    // rebuilt y-slice represents the whole column.
    const boundsKey = this._columnBoundsKey(cx, cz);
    let bounds = this._columnBounds.get(boundsKey);
    if (!bounds) {
      let minY = TERRAIN_MAX_Y;
      let maxY = TERRAIN_MIN_Y;
      for (let x = x0; x < x1; x++) {
        for (let z = z0; z < z1; z++) {
          for (let y = TERRAIN_MIN_Y; y <= TERRAIN_MAX_Y; y++) {
            if (this.isCellRenderable(x, y, z)) {
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }
      bounds = { minY, maxY };
      this._columnBounds.set(boundsKey, bounds);
    }
    const effectiveY0 = Math.max(y0, bounds.minY);
    const effectiveY1 = Math.min(y1, bounds.maxY + 1);
    if (effectiveY0 >= effectiveY1) return null;

    const positions = [];
    const colors = [];
    const normals = [];
    const uvs = [];
    const materialIds = [];
    const faceKinds = [];
    const tileIndices = [];
    const indices = [];

    this._buildGreedyFaces('px', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
    this._buildGreedyFaces('nx', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
    this._buildGreedyFaces('py', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
    this._buildGreedyFaces('ny', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
    this._buildGreedyFaces('pz', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
    this._buildGreedyFaces('nz', x0, effectiveY0, z0, x1, effectiveY1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('materialId', new THREE.Float32BufferAttribute(materialIds, 1));
    geometry.setAttribute('faceKind', new THREE.Float32BufferAttribute(faceKinds, 1));
    geometry.setAttribute('tileIndex', new THREE.Float32BufferAttribute(tileIndices, 1));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  _buildGreedyFaces(dir, x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices) {
    if (dir === 'px' || dir === 'nx') {
      const width = z1 - z0;
      const height = y1 - y0;
      const mask = new Int16Array(width * height);
      for (let x = x0; x < x1; x++) {
        mask.fill(-1);
        for (let y = y0; y < y1; y++) {
          if (y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) continue;
          for (let z = z0; z < z1; z++) {
            const solid = this.isCellRenderable(x, y, z);
            if (!solid) continue;
            const visible = dir === 'px'
              ? this._isFaceVisible(x, y, z, x + 1, y, z)
              : this._isFaceVisible(x, y, z, x - 1, y, z);
            if (visible) mask[(y - y0) * width + (z - z0)] = this._faceKeyForCell(x, y, z, dir);
          }
        }
        this._greedyMask(mask, width, height, (u, v, w, h, faceKey) => {
          const zA = z0 + u;
          const zB = zA + w;
          const yA = y0 + v;
          const yB = yA + h;
          this._pushGreedyQuad(dir, dir === 'px' ? x + 1 : x, yA, zA, dir === 'px' ? x + 1 : x, yB, zB, faceKey, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
        });
      }
      return;
    }

    if (dir === 'py' || dir === 'ny') {
      const width = x1 - x0;
      const height = z1 - z0;
      const mask = new Int16Array(width * height);
      for (let y = y0; y < y1; y++) {
        if (y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) continue;
        mask.fill(-1);
        for (let z = z0; z < z1; z++) {
          for (let x = x0; x < x1; x++) {
            const solid = this.isCellRenderable(x, y, z);
            if (!solid) continue;
            const visible = dir === 'py'
              ? this._isFaceVisible(x, y, z, x, y + 1, z)
              : this._isFaceVisible(x, y, z, x, y - 1, z);
            if (visible) mask[(z - z0) * width + (x - x0)] = this._faceKeyForCell(x, y, z, dir);
          }
        }
        this._greedyMask(mask, width, height, (u, v, w, h, faceKey) => {
          const xA = x0 + u;
          const xB = xA + w;
          const zA = z0 + v;
          const zB = zA + h;
          this._pushGreedyQuad(dir, xA, dir === 'py' ? y + 1 : y, zA, xB, dir === 'py' ? y + 1 : y, zB, faceKey, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
        });
      }
      return;
    }

    const width = x1 - x0;
    const height = y1 - y0;
    const mask = new Int16Array(width * height);
    for (let z = z0; z < z1; z++) {
      mask.fill(-1);
      for (let y = y0; y < y1; y++) {
        if (y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) continue;
        for (let x = x0; x < x1; x++) {
          const solid = this.isCellRenderable(x, y, z);
          if (!solid) continue;
          const visible = dir === 'pz'
            ? this._isFaceVisible(x, y, z, x, y, z + 1)
            : this._isFaceVisible(x, y, z, x, y, z - 1);
          if (visible) mask[(y - y0) * width + (x - x0)] = this._faceKeyForCell(x, y, z, dir);
        }
      }
      this._greedyMask(mask, width, height, (u, v, w, h, faceKey) => {
        const xA = x0 + u;
        const xB = xA + w;
        const yA = y0 + v;
        const yB = yA + h;
        this._pushGreedyQuad(dir, xA, yA, dir === 'pz' ? z + 1 : z, xB, yB, dir === 'pz' ? z + 1 : z, faceKey, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices);
      });
    }
  }

  _greedyMask(mask, width, height, emit) {
    for (let v = 0; v < height; v++) {
      for (let u = 0; u < width; u++) {
        const band = mask[v * width + u];
        if (band < 0) continue;

        let w = 1;
        while (u + w < width && w < MAX_TEXTURE_TILE_SPAN && mask[v * width + u + w] === band) w++;

        let h = 1;
        outer:
        while (v + h < height && h < MAX_TEXTURE_TILE_SPAN) {
          for (let i = 0; i < w; i++) {
            if (mask[(v + h) * width + u + i] !== band) break outer;
          }
          h++;
        }

        emit(u, v, w, h, band);
        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            mask[(v + yy) * width + u + xx] = -1;
          }
        }
      }
    }
  }

  _isFaceVisible(x, y, z, nx, ny, nz) {
    const cell = this.getCellState(x, y, z);
    if (!cell.renderable) return false;

    const neighbor = this.getCellState(nx, ny, nz);
    if (!neighbor.renderable) return true;

    const cellLayer = cell.properties.renderLayer;
    const neighborLayer = neighbor.properties.renderLayer;

    if (cellLayer === 'transparent') {
      // Hide internal water/glass faces, but show water against air or another
      // transparent material type. Faces buried against solid terrain stay hidden.
      if (neighbor.type === cell.type) return false;
      return neighborLayer === 'transparent';
    }

    // Opaque block faces beside water/glass must still exist so transparent
    // fluid can reveal the shore, bottom, and cave walls behind it.
    return neighborLayer === 'transparent';
  }

  _pushGreedyQuad(dir, x0, y0, z0, x1, y1, z1, faceKey, positions, colors, normals, uvs, materialIds, faceKinds, tileIndices, indices) {
    const base = positions.length / 3;
    const materialId = Math.floor(faceKey / FACE_KEY_MULTIPLIER);
    const faceKind = faceKey % FACE_KEY_MULTIPLIER;
    const tileIndex = getTerrainTileIndex(materialId, faceKind);
    const color = this._colorForMaterialId(materialId);
    let normal;
    let corners;
    switch (dir) {
      case 'px':
        normal = [1, 0, 0];
        corners = [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]];
        break;
      case 'nx':
        normal = [-1, 0, 0];
        corners = [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]];
        break;
      case 'py':
        normal = [0, 1, 0];
        corners = [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]];
        break;
      case 'ny':
        normal = [0, -1, 0];
        corners = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
        break;
      case 'pz':
        normal = [0, 0, 1];
        corners = [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]];
        break;
      default:
        normal = [0, 0, -1];
        corners = [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]];
        break;
    }

    for (const c of corners) {
      positions.push(c[0] * CELL_SIZE, c[1] * CELL_SIZE, c[2] * CELL_SIZE);
      colors.push(color.r, color.g, color.b);
      normals.push(normal[0], normal[1], normal[2]);
      let u, v;
      switch (dir) {
        case 'px':
        case 'nx':
          u = c[2];
          v = c[1];
          break;
        case 'py':
        case 'ny':
          u = c[0];
          v = c[2];
          break;
        case 'pz':
        case 'nz':
          u = c[0];
          v = c[1];
          break;
      }
      uvs.push(u, v);
      materialIds.push(materialId);
      faceKinds.push(faceKind);
      tileIndices.push(tileIndex);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  _faceKeyForCell(x, y, z, dir) {
    const materialId = this._materialIdForCell(x, y, z, dir);
    let faceKind = FACE_KIND.side;
    if (dir === 'py') faceKind = FACE_KIND.top;
    else if (dir === 'ny') faceKind = FACE_KIND.bottom;
    return materialId * FACE_KEY_MULTIPLIER + faceKind;
  }

  _materialIdForCell(x, y, z, dir) {
    const cellType = this.getCellBlockType(x, y, z);
    if (cellType !== 'air') return TERRAIN_MATERIAL_IDS[cellType] ?? TERRAIN_MATERIAL_IDS.dirt;
    return TERRAIN_MATERIAL_IDS.dirt;
  }

  _baseBlockTypeForCell(x, y, z, dir, knownZoneEntry = null) {
    const zoneEntry = knownZoneEntry || this._findZoneEntry(x + 0.5, z + 0.5);
    if (!zoneEntry) return 'stone';

    const { zone } = zoneEntry;
    const types = zone.blockTypes || [];
    const surface = this._surfaceHeightAt(x + 0.5, z + 0.5, zoneEntry);
    const depth = Math.max(0, surface - (y + 0.5));
    let typeKey;

    if (dir === 'py' || depth < 1.25) {
      typeKey = types[0] || 'grass';
    } else if (depth < 4.5) {
      typeKey = types[1] || types[0] || 'dirt';
    } else if (depth < 14) {
      typeKey = types[2] || 'stone';
    } else {
      typeKey = types[3] || 'stone_dark';
    }

    return typeKey || 'dirt';
  }

  _colorForMaterialId(materialId) {
    if (materialId === TERRAIN_MATERIAL_IDS.grass) return TERRAIN_COLORS.surface;
    if (materialId === TERRAIN_MATERIAL_IDS.dirt) return TERRAIN_COLORS.dirt;
    if (materialId === TERRAIN_MATERIAL_IDS.stone) return TERRAIN_COLORS.stone;
    if (materialId === TERRAIN_MATERIAL_IDS.stone_dark) return TERRAIN_COLORS.deep;
    if (materialId === TERRAIN_MATERIAL_IDS.lava) return new THREE.Color(0xff3a10);
    if (materialId === TERRAIN_MATERIAL_IDS.ice) return new THREE.Color(0xa3e5ff);
    if (materialId === TERRAIN_MATERIAL_IDS.snow) return new THREE.Color(0xf0f8ff);
    if (materialId === TERRAIN_MATERIAL_IDS.sand_A) return new THREE.Color(0xd1a25d);
    if (materialId === TERRAIN_MATERIAL_IDS.sand_B) return new THREE.Color(0xb4783e);
    if (materialId === TERRAIN_MATERIAL_IDS.metal || materialId === TERRAIN_MATERIAL_IDS.prototype) return new THREE.Color(0x7d8e98);
    if (materialId === TERRAIN_MATERIAL_IDS.wood) return new THREE.Color(0x794724);
    if (materialId === TERRAIN_MATERIAL_IDS.brick || materialId === TERRAIN_MATERIAL_IDS.bricks_A || materialId === TERRAIN_MATERIAL_IDS.bricks_B) return new THREE.Color(0x9f4f45);
    return TERRAIN_COLORS.dirt;
  }

  _clearChunks() {
    for (const chunk of this.chunks.values()) {
      if (chunk.raycastMesh) {
        this.scene.remove(chunk.raycastMesh);
        if (chunk.raycastMesh.geometry) chunk.raycastMesh.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.emptyChunkKeys.clear();
    this._columnBounds.clear();
    if (this.unifiedRenderer) {
      this.unifiedRenderer.clear();
    }
  }

  _disposeChunkMesh(key) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    if (chunk.raycastMesh) {
      this.scene.remove(chunk.raycastMesh);
      if (chunk.raycastMesh.geometry) chunk.raycastMesh.geometry.dispose();
    }
    if (this.unifiedRenderer) {
      const c = this._parseChunkKey(key);
      if (c) this.unifiedRenderer.releaseSlotByChunk(c.cx, c.cy, c.cz);
    }
    this.chunks.delete(key);
  }

  _refreshStats() {
    let triangles = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.raycastMesh?.geometry?.index) {
        triangles += Math.floor(chunk.raycastMesh.geometry.index.count / 3);
      }
    }
    this.stats = {
      chunks: this.chunks.size,
      triangles,
      samples: this.modifiedDensities.size,
    };
  }

}
