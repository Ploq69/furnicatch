/**
 * TerrainMesh — stable SDF-backed diggable terrain.
 *
 * The density field remains the gameplay truth, but v1 renders it as exposed
 * solid/air cell faces. This trades some smoothness for closed caves, fast
 * rebuilds, and predictable collision.
 */

import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { BLOCK_TYPES } from './constants.js';

const ISO_LEVEL = 0;
const CHUNK_SIZE = 8;
const TERRAIN_MIN_Y = -48;
const TERRAIN_MAX_Y = 2;
const SURFACE_Y = 1;
const CELL_SIZE = 1;
const MAX_REBUILDS_PER_FRAME = 2;
const MAX_TEXTURE_TILE_SPAN = 2;
const TERRAIN_TYPE_BY_BAND = ['grass', 'dirt', 'stone', 'stone_dark'];
const TERRAIN_COLORS = {
  surface: new THREE.Color(0xf4fff0),
  dirt: new THREE.Color(0xfff0dd),
  stone: new THREE.Color(0xf1f1f1),
  deep: new THREE.Color(0xe0e0e8),
};
const FACE_NORMALS = {
  px: [1, 0, 0],
  nx: [-1, 0, 0],
  py: [0, 1, 0],
  ny: [0, -1, 0],
  pz: [0, 0, 1],
  nz: [0, 0, -1],
};
const FULL_UV_RECT = { u0: 0, v0: 0, u1: 1, v1: 1 };

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
    this.dirtyChunks = [];
    this.dirtyChunkSet = new Set();
    this.modifiedDensities = new Map();
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
    this.uvRects = null;
  }

  async preloadTypes() {
    if (!this.material) {
      await this._loadKayKitTerrainMaterial();
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

  update() {
    let rebuilt = 0;
    while (rebuilt < MAX_REBUILDS_PER_FRAME && this.dirtyChunks.length > 0) {
      const key = this.dirtyChunks.shift();
      this.dirtyChunkSet.delete(key);
      const [cx, cy, cz] = key.split(',').map(Number);
      this._rebuildChunk(cx, cy, cz);
      rebuilt++;
    }
    if (rebuilt > 0) this._refreshStats();
  }

  queueDirtyChunks(chunkKeys) {
    for (const key of chunkKeys) {
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
      if (dx * dx + dy * dy + dz * dz <= r2) out.push(chunk.mesh);
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

  applyDigBrush(center, radius, strength = 1, zoneId = null) {
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
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > brushRadius) continue;

          const oldDensity = this.sampleDensity(cx, cy, cz);
          if (oldDensity <= ISO_LEVEL) continue;

          const newDensity = Math.min(oldDensity, dist - brushRadius - 0.15);
          this._setDensity(x, y, z, newDensity);
          removedCells++;
          removedVolume += Math.max(0.2, Math.min(oldDensity, oldDensity - Math.max(newDensity, ISO_LEVEL)));
          this._collectTouchedChunks(x, y, z, touched);
        }
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

  isSolidAt(x, y, z) {
    return this.isCellSolid(Math.floor(x), Math.floor(y), Math.floor(z));
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
    this.modifiedDensities.clear();
    this.protectedPoints = [];
    this.stats = { chunks: 0, triangles: 0, samples: 0 };
  }

  getStats() {
    return {
      blocks: this.modifiedDensities.size,
      chunks: this.stats.chunks,
      triangles: this.stats.triangles,
      samples: this.modifiedDensities.size,
      dirtyChunks: this.dirtyChunks.length,
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
    if (!geometry) return;

    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `terrain-chunk:${key}`;
    mesh.userData.terrainChunk = { cx, cy, cz };
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
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
    const indices = [];

    this._buildGreedyFaces('px', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);
    this._buildGreedyFaces('nx', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);
    this._buildGreedyFaces('py', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);
    this._buildGreedyFaces('ny', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);
    this._buildGreedyFaces('pz', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);
    this._buildGreedyFaces('nz', x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices);

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  _buildGreedyFaces(dir, x0, y0, z0, x1, y1, z1, positions, colors, normals, uvs, indices) {
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
          this._pushGreedyQuad(dir, dir === 'px' ? x + 1 : x, yA, zA, dir === 'px' ? x + 1 : x, yB, zB, band, positions, colors, normals, uvs, indices);
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
          this._pushGreedyQuad(dir, xA, dir === 'py' ? y + 1 : y, zA, xB, dir === 'py' ? y + 1 : y, zB, band, positions, colors, normals, uvs, indices);
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
        this._pushGreedyQuad(dir, xA, yA, dir === 'pz' ? z + 1 : z, xB, yB, dir === 'pz' ? z + 1 : z, band, positions, colors, normals, uvs, indices);
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

  _pushGreedyQuad(dir, x0, y0, z0, x1, y1, z1, band, positions, colors, normals, uvs, indices) {
    const base = positions.length / 3;
    const color = this._colorForBand(band);
    const uvRect = this._uvRectFor(dir, band);
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
    }
    uvs.push(
      uvRect.u0, uvRect.v0,
      uvRect.u1, uvRect.v0,
      uvRect.u1, uvRect.v1,
      uvRect.u0, uvRect.v1
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  async _loadKayKitTerrainMaterial() {
    const loaded = new Map();
    for (const typeKey of new Set(TERRAIN_TYPE_BY_BAND)) {
      const def = BLOCK_TYPES[typeKey];
      if (!def?.model) continue;
      try {
        loaded.set(typeKey, await assetLoader.loadGLTF(def.model));
      } catch (error) {
        console.warn('[TerrainMesh] Failed to load KayKit terrain material:', typeKey, error);
      }
    }

    const surface = this._extractKayKitModelInfo(loaded.get('grass'));
    const fallback = surface?.material || this._extractKayKitModelInfo(loaded.get('dirt'))?.material;
    this.material = fallback
      ? fallback.clone()
      : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.02 });

    this.material.side = THREE.FrontSide;
    this.material.vertexColors = true;
    this.material.roughness = 0.72;
    this.material.metalness = 0.02;
    if (this.material.map) {
      this.material.map.wrapS = THREE.ClampToEdgeWrapping;
      this.material.map.wrapT = THREE.ClampToEdgeWrapping;
      this.material.map.needsUpdate = true;
    }

    this.uvRects = {};
    for (let band = 0; band < TERRAIN_TYPE_BY_BAND.length; band++) {
      const typeKey = TERRAIN_TYPE_BY_BAND[band];
      const info = this._extractKayKitModelInfo(loaded.get(typeKey));
      this.uvRects[band] = info?.rects || {};
    }
  }

  _extractKayKitModelInfo(gltf) {
    if (!gltf?.scene) return null;
    let material = null;
    let geometry = null;
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.geometry || geometry) return;
      geometry = child.geometry;
      material = Array.isArray(child.material) ? child.material[0] : child.material;
    });
    if (!geometry) return null;

    const rects = {};
    for (const dir of Object.keys(FACE_NORMALS)) {
      rects[dir] = this._extractUvRectForNormal(geometry, FACE_NORMALS[dir]);
    }
    return { material, rects };
  }

  _extractUvRectForNormal(geometry, targetNormal) {
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const index = geometry.index;
    if (!normal || !uv) return FULL_UV_RECT;

    let u0 = Infinity;
    let v0 = Infinity;
    let u1 = -Infinity;
    let v1 = -Infinity;
    const includeVertex = (i) => {
      const u = uv.getX(i);
      const v = uv.getY(i);
      u0 = Math.min(u0, u);
      v0 = Math.min(v0, v);
      u1 = Math.max(u1, u);
      v1 = Math.max(v1, v);
    };
    const triCount = index ? index.count / 3 : normal.count / 3;
    for (let tri = 0; tri < triCount; tri++) {
      const ia = index ? index.getX(tri * 3) : tri * 3;
      const ib = index ? index.getX(tri * 3 + 1) : tri * 3 + 1;
      const ic = index ? index.getX(tri * 3 + 2) : tri * 3 + 2;
      const nx = (normal.getX(ia) + normal.getX(ib) + normal.getX(ic)) / 3;
      const ny = (normal.getY(ia) + normal.getY(ib) + normal.getY(ic)) / 3;
      const nz = (normal.getZ(ia) + normal.getZ(ib) + normal.getZ(ic)) / 3;
      const len = Math.max(0.0001, Math.sqrt(nx * nx + ny * ny + nz * nz));
      const dot = (nx / len) * targetNormal[0] + (ny / len) * targetNormal[1] + (nz / len) * targetNormal[2];
      if (dot < 0.72) continue;
      includeVertex(ia);
      includeVertex(ib);
      includeVertex(ic);
    }

    if (!Number.isFinite(u0) || !Number.isFinite(v0) || !Number.isFinite(u1) || !Number.isFinite(v1)) {
      return FULL_UV_RECT;
    }

    const pad = 0.001;
    return {
      u0: clamp(u0 + pad, 0, 1),
      v0: clamp(v0 + pad, 0, 1),
      u1: clamp(u1 - pad, 0, 1),
      v1: clamp(v1 - pad, 0, 1),
    };
  }

  _uvRectFor(dir, band) {
    return this.uvRects?.[band]?.[dir] || FULL_UV_RECT;
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
