/**
 * GroundRenderer — Face-culled merged mesh rendering for static ground blocks.
 *
 * Instead of instancing thousands of full BoxGeometry cubes, we build one merged
 * mesh per chunk per block type containing ONLY visible faces:
 *   - Top face always (nothing above ground)
 *   - Side faces only where there's no neighbor
 *   - Bottom face never (never visible at y=0)
 *
 * This cuts triangles by ~80-90% compared to full cubes and eliminates all
 * per-instance matrix overhead. Ground blocks are purely visual — not mineable,
 * not animated, no shadows cast (nothing below y=0 to receive them).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCK_TYPES, GAME } from './constants.js';

const CHUNK_SIZE = 16;
const BLOCK_SIZE = GAME.BLOCK_SIZE;
const HALF = BLOCK_SIZE * 0.5;

// Reusable plane geometry for face building
const _planeGeo = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);

// Temp objects for matrix composition
const _dummy = new THREE.Object3D();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();

export class GroundRenderer {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // key: "cx,cz" -> { group, meshes: [] }
    this._materialCache = new Map();
  }

  /**
   * Build ground meshes from a dense 2D grid of block type keys.
   * @param {Array<string|null>} typeGrid — flat array of typeKey or null, length = gridW * gridD
   * @param {number} gridW
   * @param {number} gridD
   * @param {number} minX — world X offset for grid[0]
   * @param {number} minZ — world Z offset for grid[0]
   */
  buildFromGrid(typeGrid, gridW, gridD, minX, minZ) {
    this.clear();

    // Organize cells into chunk buckets
    const chunkCells = new Map(); // key: "cx,cz" -> Array<{x, z, typeKey}>

    for (let gz = 0; gz < gridD; gz++) {
      for (let gx = 0; gx < gridW; gx++) {
        const typeKey = typeGrid[gz * gridW + gx];
        if (!typeKey) continue;

        const worldX = minX + gx;
        const worldZ = minZ + gz;
        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const key = `${cx},${cz}`;

        if (!chunkCells.has(key)) chunkCells.set(key, []);
        chunkCells.get(key).push({ x: worldX, z: worldZ, typeKey });
      }
    }

    // Build merged geometry for each chunk
    for (const [chunkKey, cells] of chunkCells) {
      this._buildChunk(chunkKey, cells);
    }
  }

  _buildChunk(chunkKey, cells) {
    // Group faces by typeKey
    const facesByType = new Map(); // typeKey -> Array<BufferGeometry>

    // Build a local set for fast neighbor lookups within this chunk
    const cellSet = new Set();
    for (const c of cells) {
      cellSet.add(`${c.x},${c.z}`);
    }

    for (const { x, z, typeKey } of cells) {
      const faces = this._generateFacesForCell(x, z, typeKey, cellSet);
      if (!facesByType.has(typeKey)) facesByType.set(typeKey, []);
      facesByType.get(typeKey).push(...faces);
    }

    // Create chunk group
    const group = new THREE.Group();
    group.name = `ground_chunk_${chunkKey}`;
    this.scene.add(group);

    const meshes = [];

    for (const [typeKey, geos] of facesByType) {
      if (geos.length === 0) continue;

      const merged = mergeGeometries(geos);
      const material = this._getMaterial(typeKey);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.name = `ground_${typeKey}`;
      group.add(mesh);
      meshes.push(mesh);

      // Dispose individual face geometries
      for (const g of geos) g.dispose();
    }

    this.chunks.set(chunkKey, { group, meshes });
  }

  _generateFacesForCell(x, z, typeKey, cellSet) {
    const faces = [];
    const cx = x * BLOCK_SIZE;
    const cz = z * BLOCK_SIZE;
    const cy = HALF; // block center at y=0.5

    // Top face (always visible) — rotate -90° around X to face upward (+Y)
    faces.push(this._makeFace(cx, cy + HALF, cz, -Math.PI / 2, 0, 0));

    // +X face (right)
    if (!cellSet.has(`${x + 1},${z}`)) {
      faces.push(this._makeFace(cx + HALF, cy, cz, 0, Math.PI / 2, 0));
    }
    // -X face (left)
    if (!cellSet.has(`${x - 1},${z}`)) {
      faces.push(this._makeFace(cx - HALF, cy, cz, 0, -Math.PI / 2, 0));
    }
    // +Z face (front) — plane default faces +Z, no rotation needed
    if (!cellSet.has(`${x},${z + 1}`)) {
      faces.push(this._makeFace(cx, cy, cz + HALF, 0, 0, 0));
    }
    // -Z face (back) — rotate 180° around Y to face -Z
    if (!cellSet.has(`${x},${z - 1}`)) {
      faces.push(this._makeFace(cx, cy, cz - HALF, 0, Math.PI, 0));
    }

    return faces;
  }

  _makeFace(px, py, pz, rx, ry, rz) {
    const geo = _planeGeo.clone();
    _dummy.position.set(px, py, pz);
    _dummy.rotation.set(rx, ry, rz);
    _dummy.updateMatrix();
    geo.applyMatrix4(_dummy.matrix);
    return geo;
  }

  _getMaterial(typeKey) {
    if (this._materialCache.has(typeKey)) {
      return this._materialCache.get(typeKey);
    }

    const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    const mat = new THREE.MeshStandardMaterial({
      color: def.color || 0x888888,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this._materialCache.set(typeKey, mat);
    return mat;
  }

  updateVisibility(playerPos, viewRadius = 50) {
    for (const [chunkKey, chunk] of this.chunks) {
      const [cx, cz] = chunkKey.split(',').map(Number);
      const chunkCenterX = (cx + 0.5) * CHUNK_SIZE;
      const chunkCenterZ = (cz + 0.5) * CHUNK_SIZE;
      const dist = Math.sqrt(
        (chunkCenterX - playerPos.x) ** 2 + (chunkCenterZ - playerPos.z) ** 2
      );
      const shouldShow = dist < viewRadius + CHUNK_SIZE;
      if (chunk.group.visible !== shouldShow) {
        chunk.group.visible = shouldShow;
      }
    }
  }

  clear() {
    for (const chunk of this.chunks.values()) {
      for (const mesh of chunk.meshes) {
        mesh.geometry.dispose();
      }
      this.scene.remove(chunk.group);
    }
    this.chunks.clear();
  }

  getStats() {
    let chunks = 0;
    let meshes = 0;
    let triangles = 0;
    for (const chunk of this.chunks.values()) {
      chunks++;
      for (const mesh of chunk.meshes) {
        meshes++;
        triangles += mesh.geometry.index
          ? mesh.geometry.index.count / 3
          : mesh.geometry.attributes.position.count / 3;
      }
    }
    return { chunks, meshes, triangles: Math.floor(triangles) };
  }
}
