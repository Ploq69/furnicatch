/**
 * TerrainMesh — stable SDF-backed diggable terrain.
 *
 * The density field remains the gameplay truth, but v1 renders it as exposed
 * solid/air cell faces. This trades some smoothness for closed caves, fast
 * rebuilds, and predictable collision.
 */

import * as THREE from 'three';

const ISO_LEVEL = 0;
const CHUNK_SIZE = 8;
const TERRAIN_MIN_Y = -48;
const TERRAIN_MAX_Y = 2;
const SURFACE_Y = 1;
const CELL_SIZE = 1;
const MAX_REBUILDS_PER_FRAME = 2;
const REBUILD_TIME_BUDGET_MS = 2.5;
const STREAM_BUILD_LIMIT_PER_FRAME = 2;
const LIVE_CHUNK_CAP = 220;
const CHUNK_UNLOAD_IDLE_MS = 4500;
const ISO_VISIBLE_CHUNK_BUDGET = 72;
const FP_VISIBLE_CHUNK_BUDGET = 64;
const VISIBILITY_SEARCH_MULTIPLIER = 2;
const VISIBILITY_MIN_INTERVAL_MS = 180;
const MAX_TEXTURE_TILE_SPAN = 8;
const CHUNK_RADIUS = Math.sqrt(3) * CHUNK_SIZE * 0.5;
const TERRAIN_COLORS = {
  surface: new THREE.Color(0x009959),
  dirt: new THREE.Color(0xaa684d),
  stone: new THREE.Color(0x9ca8ae),
  deep: new THREE.Color(0x4a5054),
};

// Atlas UV regions extracted from KayKit BlockBits gltf models
// x=u, y=v, z=width, w=height

const FACE_NORMALS = {
  px: [1, 0, 0],
  nx: [-1, 0, 0],
  py: [0, 1, 0],
  ny: [0, -1, 0],
  pz: [0, 0, 1],
  nz: [0, 0, -1],
};

function zoneContains(zone, x, z) {
  const b = zone.bounds;
  return x >= b.minX && x < b.maxX && z >= b.minZ && z < b.maxZ;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

export class TerrainMesh {
  constructor(scene) {
    this.scene = scene;
    this.material = null;
    this.zones = new Map();
    this.chunks = new Map();
    this.emptyChunkKeys = new Set();
    this.dirtyChunks = [];
    this.dirtyChunkSet = new Set();
    this.modifiedDensities = new Map();
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
    this.visibleChunkKeys = new Set();
    this.hotChunkKeys = new Set();
    this.visibilityStats = { visible: 0, hot: 0, live: 0, dirty: 0, rebuilt: 0, rebuildMs: 0, streamed: 0 };
    this._streamBuildsThisFrame = 0;
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
  }

  async preloadTypes() {
    if (!this.material) {
      this.material = this._createKayKitStyleMaterial();
    }
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
    const meshes = this.getNearbyMeshes(origin || raycaster.ray.origin, radius);
    if (meshes.length === 0) return null;
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length > 0 ? hits[0] : null;
  }

  getNearbyMeshes(position, radius = 42) {
    const out = [];
    const r2 = radius * radius;
    for (const chunk of this.chunks.values()) {
      if (!chunk.mesh) continue;
      const dx = chunk.centerX - position.x;
      const dy = chunk.centerY - position.y;
      const dz = chunk.centerZ - position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= r2 && (chunk.mesh.visible || chunk.hot || distSq < 12 * 12)) out.push(chunk.mesh);
    }
    return out;
  }

  setVisibleAround(position, radius = 58) {
    const r2 = radius * radius;
    for (const chunk of this.chunks.values()) {
      if (!chunk.mesh) continue;
      const dx = chunk.centerX - position.x;
      const dy = chunk.centerY - position.y;
      const dz = chunk.centerZ - position.z;
      chunk.mesh.visible = dx * dx + dy * dy + dz * dz <= r2;
    }
  }

  updateVisibility(position, options = {}) {
    const now = this._nowMs();
    const cameraMode = options.cameraMode || 'iso';
    const camera = options.camera || null;
    const budget = cameraMode === 'firstPerson' ? FP_VISIBLE_CHUNK_BUDGET : ISO_VISIBLE_CHUNK_BUDGET;
    this._lastPlayerPos.copy(position);
    this._streamBuildsThisFrame = 0;

    this._prepareCameraCulling(camera);
    const currentChunkKey = this._chunkKeyForPoint(position);
    const forwardStable = this._cameraForward.dot(this._lastVisibilityForward) > 0.965;
    const cacheValid = this.visibleChunkKeys.size > 0
      && this._lastVisibilityChunkKey === currentChunkKey
      && this._lastVisibilityMode === cameraMode
      && forwardStable
      && now - this._lastVisibilityAt < VISIBILITY_MIN_INTERVAL_MS;

    if (!cacheValid) {
      const result = this._computeVisibleChunkKeys(position, cameraMode, budget);
      this.visibleChunkKeys = result.visibleKeys;
      this.hotChunkKeys = result.hotKeys;
      this._lastVisibilityAt = now;
      this._lastVisibilityChunkKey = currentChunkKey;
      this._lastVisibilityMode = cameraMode;
      this._lastVisibilityForward.copy(this._cameraForward);
    }

    let visibleLive = 0;
    for (const key of this.visibleChunkKeys) {
      const chunk = this.ensureChunkMesh(key, now);
      if (!chunk?.mesh) continue;
      chunk.mesh.visible = true;
      chunk.lastVisibleAt = now;
      chunk.hot = this.hotChunkKeys.has(key);
      visibleLive++;
    }

    for (const [key, chunk] of this.chunks) {
      if (!chunk.mesh) continue;
      if (this.visibleChunkKeys.has(key)) continue;
      chunk.mesh.visible = false;
      chunk.hot = this.hotChunkKeys.has(key);
    }

    this.unloadColdChunks(now);
    this.visibilityStats.visible = this.visibleChunkKeys.size;
    this.visibilityStats.hot = this.hotChunkKeys.size;
    this.visibilityStats.live = this.chunks.size;
    this.visibilityStats.dirty = this.dirtyChunks.length;
    this.visibilityStats.streamed = this._streamBuildsThisFrame;
    this.visibilityStats.visibleLive = visibleLive;
    return this.visibilityStats;
  }

  ensureChunkMesh(key, now = this._nowMs()) {
    const existing = this.chunks.get(key);
    if (existing?.mesh) {
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

  hideChunkMesh(key) {
    const chunk = this.chunks.get(key);
    if (chunk?.mesh) chunk.mesh.visible = false;
  }

  getChunkKeyForPoint(position) {
    return this._chunkKeyForPoint(position);
  }

  unloadColdChunks(now = this._nowMs()) {
    const removable = [];
    for (const [key, chunk] of this.chunks) {
      if (!chunk?.mesh || chunk.mesh.visible || chunk.hot) continue;
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
    if (!this.material?.uniforms) return;
    this.material.uniforms.cutawayCenter.value.copy(this.cutaway.center);
    this.material.uniforms.cutawayForward.value.copy(this.cutaway.forward);
    this.material.uniforms.cutawayAmount.value = this.cutaway.amount;
    this.material.uniforms.cutawayRadius.value = this.cutaway.radius;
    this.material.uniforms.cutawayReach.value = this.cutaway.reach;
    this.material.uniforms.cutawayCeilingY.value = this.cutaway.ceilingY;
  }

  _computeVisibleChunkKeys(position, cameraMode, budget) {
    if (cameraMode !== 'firstPerson') {
      return this._computeIsoVisibleChunkKeys(position, budget);
    }

    const startKey = this._chunkKeyForPoint(position);
    const searchBudget = Math.max(budget, budget * VISIBILITY_SEARCH_MULTIPLIER);
    const visitedAir = new Set();
    const queue = [startKey];
    visitedAir.add(startKey);

    for (let qi = 0; qi < queue.length && visitedAir.size < searchBudget; qi++) {
      const key = queue[qi];
      const neighbors = this._neighborChunkKeys(key)
        .filter(n => !visitedAir.has(n.key) && this._chunkWithinTerrainBounds(n.cx, n.cy, n.cz))
        .filter(n => this._chunkCanMatter(n.key, position, cameraMode) || this._chunkDistanceSqToPoint(n.key, position) < CHUNK_SIZE * CHUNK_SIZE * 5)
        .sort((a, b) => this._chunkVisibilityScore(a.key, position, cameraMode) - this._chunkVisibilityScore(b.key, position, cameraMode));

      for (const next of neighbors) {
        if (visitedAir.size >= searchBudget) break;
        if (!this._chunkBoundaryOpen(key, next.key)) continue;
        visitedAir.add(next.key);
        queue.push(next.key);
      }
    }

    const candidateKeys = new Set();
    for (const key of visitedAir) {
      candidateKeys.add(key);
      for (const n of this._neighborChunkKeys(key)) {
        if (this._chunkWithinTerrainBounds(n.cx, n.cy, n.cz)) candidateKeys.add(n.key);
      }
    }

    const forcedKeys = new Set([startKey]);
    for (const n of this._neighborChunkKeys(startKey)) {
      if (this._chunkWithinTerrainBounds(n.cx, n.cy, n.cz)) forcedKeys.add(n.key);
    }

    const sorted = [...candidateKeys]
      .filter(key => forcedKeys.has(key) || this._chunkCanMatter(key, position, cameraMode))
      .sort((a, b) => this._chunkVisibilityScore(a, position, cameraMode) - this._chunkVisibilityScore(b, position, cameraMode));

    const visibleKeys = new Set();
    for (const key of forcedKeys) visibleKeys.add(key);
    for (const key of sorted) {
      if (visibleKeys.size >= budget) break;
      visibleKeys.add(key);
    }

    return { visibleKeys, hotKeys: new Set([...visibleKeys, ...visitedAir]) };
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
    if (cameraMode === 'firstPerson') return this._chunkInLookCorridor(key, 7.5, 90);
    return this._chunkInCutawayCorridor(key) || distSq < 34 * 34;
  }

  _chunkVisibilityScore(key, position, cameraMode) {
    this._getChunkCenter(key, this._tmpCenter);
    const distSq = this._tmpCenter.distanceToSquared(position);
    let score = distSq;
    if (this._chunkIntersectsFrustum(key)) score -= 900;
    if (cameraMode === 'firstPerson') {
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

          const oldDensity = this.sampleDensity(cx, cy, cz);
          if (oldDensity <= ISO_LEVEL) continue;

          const dist = Math.sqrt(distSq);
          const newDensity = Math.min(oldDensity, dist - brushRadius - 0.15);
          if (candidates) {
            candidates.push({ x, y, z, distSq, oldDensity, newDensity });
            continue;
          }
          this._setDensity(x, y, z, newDensity);
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
        removedCells++;
        removedVolume += Math.max(0.2, Math.min(c.oldDensity, c.oldDensity - Math.max(c.newDensity, ISO_LEVEL)));
        this._collectTouchedChunks(c.x, c.y, c.z, touched);
      }
    }

    if (removedCells > 0) this.queueDirtyChunks(touched);

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
    const maxFloorY = footY + 0.12;
    const startY = Math.floor(clamp(maxFloorY, TERRAIN_MIN_Y, TERRAIN_MAX_Y));
    const endY = Math.floor(clamp(minFloorY - 1, TERRAIN_MIN_Y, TERRAIN_MAX_Y));

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
    const samples = [
      [x, y + 0.20, z],
      [x, y + height * 0.50, z],
      [x, y + height, z],
      [x + radius, y + 0.75, z],
      [x - radius, y + 0.75, z],
      [x, y + 0.75, z + radius],
      [x, y + 0.75, z - radius],
    ];
    return samples.some(([sx, sy, sz]) => this.isSolidAt(sx, sy, sz));
  }

  isCellSolid(x, y, z) {
    if (y < TERRAIN_MIN_Y) return true;
    if (y > TERRAIN_MAX_Y) return false;
    const zoneEntry = this._findZoneEntry(x + 0.5, z + 0.5);
    if (!zoneEntry) return false;
    return this.sampleDensity(x + 0.5, y + 0.5, z + 0.5) > ISO_LEVEL;
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
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
    this.visibleChunkKeys.clear();
    this.hotChunkKeys.clear();
    this.visibilityStats = { visible: 0, hot: 0, live: 0, dirty: 0, rebuilt: 0, rebuildMs: 0, streamed: 0 };
    this.setCutaway(new THREE.Vector3(), 0, this.cutaway.radius, this.cutaway.ceilingY, { reach: this.cutaway.reach });
  }

  getStats() {
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
    const broad = smoothNoise(x * 0.055, z * 0.055, seed) - 0.5;
    const fine = smoothNoise(x * 0.18, z * 0.18, seed + 991) - 0.5;
    const surface = SURFACE_Y + broad * 0.55 + fine * 0.18;
    return Math.min(surface - y, edgeWall + 0.25);
  }

  _setDensity(x, y, z, density) {
    this.modifiedDensities.set(this._sampleKey(x, y, z), density);
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
    const existing = this.chunks.get(key);
    if (existing?.mesh) {
      this.scene.remove(existing.mesh);
      existing.mesh.geometry.dispose();
      this.chunks.delete(key);
    }

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
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `terrain-chunk:${key}`;
    mesh.userData.terrainChunk = { cx, cy, cz };
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.visible = this.visibleChunkKeys.size === 0 || this.visibleChunkKeys.has(key);
    this.scene.add(mesh);
    this.chunks.set(key, {
      mesh,
      geometry,
      cx,
      cy,
      cz,
      centerX: x0 + CHUNK_SIZE / 2,
      centerY: y0 + CHUNK_SIZE / 2,
      centerZ: z0 + CHUNK_SIZE / 2,
      lastVisibleAt: now,
      lastTouchedAt: now,
      hot: false,
    });
  }

  _buildChunkGeometry(cx, cy, cz) {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const x1 = x0 + CHUNK_SIZE;
    const y1 = y0 + CHUNK_SIZE;
    const z1 = z0 + CHUNK_SIZE;
    const positions = [];
    const colors = [];
    const normals = [];
    const uvs = [];
    const bands = [];
    const indices = [];

    this._buildGreedyFaces('px', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);
    this._buildGreedyFaces('nx', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);
    this._buildGreedyFaces('py', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);
    this._buildGreedyFaces('ny', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);
    this._buildGreedyFaces('pz', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);
    this._buildGreedyFaces('nz', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices);

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('band', new THREE.Float32BufferAttribute(bands, 1));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  _buildGreedyFaces(dir, x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, bands, indices) {
    if (dir === 'px' || dir === 'nx') {
      const width = z1 - z0;
      const height = y1 - y0;
      const mask = new Int16Array(width * height);
      for (let x = x0; x < x1; x++) {
        mask.fill(-1);
        for (let y = y0; y < y1; y++) {
          if (y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) continue;
          for (let z = z0; z < z1; z++) {
            const solid = this.isCellSolid(x, y, z);
            if (!solid) continue;
            const neighborSolid = dir === 'px' ? this.isCellSolid(x + 1, y, z) : this.isCellSolid(x - 1, y, z);
            if (!neighborSolid) mask[(y - y0) * width + (z - z0)] = this._depthBand(SURFACE_Y - y);
          }
        }
        this._greedyMask(mask, width, height, (u, v, w, h, band) => {
          const zA = z0 + u;
          const zB = zA + w;
          const yA = y0 + v;
          const yB = yA + h;
          this._pushGreedyQuad(dir, dir === 'px' ? x + 1 : x, yA, zA, dir === 'px' ? x + 1 : x, yB, zB, band, positions, colors, normals, uvs, bands, indices);
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
            const solid = this.isCellSolid(x, y, z);
            if (!solid) continue;
            const neighborSolid = dir === 'py' ? this.isCellSolid(x, y + 1, z) : this.isCellSolid(x, y - 1, z);
            if (!neighborSolid) mask[(z - z0) * width + (x - x0)] = this._depthBand(SURFACE_Y - y);
          }
        }
        this._greedyMask(mask, width, height, (u, v, w, h, band) => {
          const xA = x0 + u;
          const xB = xA + w;
          const zA = z0 + v;
          const zB = zA + h;
          this._pushGreedyQuad(dir, xA, dir === 'py' ? y + 1 : y, zA, xB, dir === 'py' ? y + 1 : y, zB, band, positions, colors, normals, uvs, bands, indices);
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
          const solid = this.isCellSolid(x, y, z);
          if (!solid) continue;
          const neighborSolid = dir === 'pz' ? this.isCellSolid(x, y, z + 1) : this.isCellSolid(x, y, z - 1);
          if (!neighborSolid) mask[(y - y0) * width + (x - x0)] = this._depthBand(SURFACE_Y - y);
        }
      }
      this._greedyMask(mask, width, height, (u, v, w, h, band) => {
        const xA = x0 + u;
        const xB = xA + w;
        const yA = y0 + v;
        const yB = yA + h;
        this._pushGreedyQuad(dir, xA, yA, dir === 'pz' ? z + 1 : z, xB, yB, dir === 'pz' ? z + 1 : z, band, positions, colors, normals, uvs, bands, indices);
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

  _pushGreedyQuad(dir, x0, y0, z0, x1, y1, z1, band, positions, colors, normals, uvs, bands, indices) {
    const base = positions.length / 3;
    const color = this._colorForBand(band);
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
      // World-space UVs tiled 1:1 with blocks
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
      bands.push(band);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  _createKayKitStyleMaterial() {
    return new THREE.ShaderMaterial({
      vertexColors: true,
      side: THREE.FrontSide,
      transparent: false,
      depthWrite: true,
      uniforms: {
        lightDir: { value: new THREE.Vector3(0.35, 0.85, 0.32).normalize() },
        cutawayCenter: { value: this.cutaway.center.clone() },
        cutawayForward: { value: this.cutaway.forward.clone() },
        cutawayRadius: { value: this.cutaway.radius },
        cutawayReach: { value: this.cutaway.reach },
        cutawayCeilingY: { value: this.cutaway.ceilingY },
        cutawayAmount: { value: this.cutaway.amount },
      },
      vertexShader: `
        attribute float band;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vBand;
        varying vec3 vWorldPos;

        void main() {
          vBand = band;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 lightDir;
        uniform vec3 cutawayCenter;
        uniform vec2 cutawayForward;
        uniform float cutawayRadius;
        uniform float cutawayReach;
        uniform float cutawayCeilingY;
        uniform float cutawayAmount;

        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vBand;
        varying vec3 vWorldPos;

        // KayKit BlockBits colors extracted from atlas
        vec3 grassColor = vec3(0.000, 0.600, 0.349);
        vec3 dirtColor  = vec3(0.667, 0.408, 0.298);
        vec3 stoneColor = vec3(0.612, 0.659, 0.682);
        vec3 deepColor  = vec3(0.290, 0.314, 0.329);

        vec3 getBaseColor(float band, float ny) {
          if (band < 0.5) {
            return (ny > 0.9) ? grassColor : dirtColor;
          }
          if (band < 1.5) return dirtColor;
          if (band < 2.5) return stoneColor;
          return deepColor;
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec3 n = normalize(vNormal);
          vec3 color = getBaseColor(vBand, n.y);

          vec2 uv = vUv;

          // Procedural texture based on material type
          if (vBand < 0.5 && n.y > 0.9) {
            // Grass top: subtle variation + wavy edge
            float wave = sin(uv.x * 6.283) * 0.03;
            float grain = (hash(floor(uv * 8.0)) - 0.5) * 0.04;
            color += grain + wave;

            // Wavy grass overhang at block edges
            vec2 cell = fract(uv);
            float edgeDist = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
            float edgeWave = sin((uv.x + uv.y) * 4.0) * 0.5 + 0.5;
            float grassEdge = smoothstep(0.10, 0.0, edgeDist) * edgeWave * 0.06;
            color += grassEdge;
          } else if (vBand < 1.5) {
            // Dirt: pebble dots + grain
            float pebble = smoothstep(0.18, 0.0, length(fract(uv * 5.0) - vec2(0.5))) * step(0.75, hash(floor(uv * 5.0)));
            float grain = (hash(floor(uv * 12.0)) - 0.5) * 0.06;
            color += pebble * 0.10 + grain;
          } else if (vBand < 2.5) {
            // Stone: subtle cracks + spots
            float crack = abs(noise(uv * 8.0) - noise(uv * 8.0 + vec2(0.05))) * 3.0;
            float spot = step(0.88, hash(floor(uv * 6.0))) * 0.06;
            color -= crack * 0.06;
            color += spot;
          } else {
            // Deep: very subtle variation
            float grain = (hash(floor(uv * 6.0)) - 0.5) * 0.04;
            color += grain;
          }

          // Lighting
          float light = 0.62 + max(dot(n, normalize(lightDir)), 0.0) * 0.38;
          float sideShade = 1.0 - (1.0 - max(n.y, 0.0)) * 0.15;
          float topBoost = smoothstep(0.45, 0.95, n.y) * 0.10;

          color *= sideShade + topBoost;
          color *= light;

          // Subtle bevel edge
          vec2 cell = fract(uv);
          float edgeDist = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
          float bevel = smoothstep(0.0, 0.06, edgeDist);
          color *= 0.94 + 0.06 * bevel;

          vec2 toPoint = vWorldPos.xz - cutawayCenter.xz;
          float corridorT = clamp(dot(toPoint, normalize(cutawayForward)), 0.0, cutawayReach);
          vec2 nearest = cutawayCenter.xz + normalize(cutawayForward) * corridorT;
          float horizontalDist = distance(vWorldPos.xz, nearest);
          float corridorBoost = smoothstep(0.0, max(0.001, cutawayReach), corridorT) * 1.5;
          float localRadius = cutawayRadius + corridorBoost;
          float radialMask = 1.0 - smoothstep(localRadius * 0.82, localRadius, horizontalDist);
          float heightMask = smoothstep(cutawayCeilingY - 0.10, cutawayCeilingY + 0.30, vWorldPos.y);
          float cutMask = clamp(radialMask * heightMask * cutawayAmount, 0.0, 1.0);
          if (cutMask > 0.42) discard;
          color = mix(color, color * 0.62, smoothstep(0.10, 0.42, cutMask) * 0.35);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }

  _colorForDepth(depth) {
    return this._colorForBand(this._depthBand(depth));
  }

  _depthBand(depth) {
    if (depth < 1) return 0;
    if (depth < 5) return 1;
    if (depth < 14) return 2;
    return 3;
  }

  _colorForBand(band) {
    if (band === 0) return TERRAIN_COLORS.surface;
    if (band === 1) return TERRAIN_COLORS.dirt;
    if (band === 2) return TERRAIN_COLORS.stone;
    return TERRAIN_COLORS.deep;
  }

  _clearChunks() {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.emptyChunkKeys.clear();
  }

  _disposeChunkMesh(key) {
    const chunk = this.chunks.get(key);
    if (!chunk?.mesh) return;
    this.scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    this.chunks.delete(key);
  }

  _refreshStats() {
    let triangles = 0;
    for (const chunk of this.chunks.values()) {
      triangles += chunk.geometry?.index ? Math.floor(chunk.geometry.index.count / 3) : 0;
    }
    this.stats = {
      chunks: this.chunks.size,
      triangles,
      samples: this.modifiedDensities.size,
    };
  }
}
