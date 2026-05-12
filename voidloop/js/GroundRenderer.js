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
import { assetLoader } from './AssetLoader.js';

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
    this._chunkCells = new Map();
    this._materialCache = new Map();
    this._modelCache = new Map();
  }

  async preloadTypes(typeKeys) {
    await Promise.all([...new Set(typeKeys)].map(typeKey => this._getModelGeoMat(typeKey)));
  }

  /**
   * Build ground meshes from a dense 2D grid of block type keys.
   * @param {Array<string|null>} typeGrid — flat array of typeKey or null, length = gridW * gridD
   * @param {number} gridW
   * @param {number} gridD
   * @param {number} minX — world X offset for grid[0]
   * @param {number} minZ — world Z offset for grid[0]
   */
  buildFromGrid(typeGrid, gridW, gridD, minX, minZ, options = {}) {
    if (!options.append) {
      this.clear();
      this._chunkCells.clear();
    }

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
      const mergedCells = this._chunkCells.get(chunkKey) || [];
      const seen = new Map(mergedCells.map(c => [`${c.x},${c.z}`, c]));
      for (const cell of cells) {
        seen.set(`${cell.x},${cell.z}`, cell);
      }
      const allCells = Array.from(seen.values());
      this._chunkCells.set(chunkKey, allCells);
      this._buildChunk(chunkKey, allCells);
    }
  }

  _buildChunk(chunkKey, cells) {
    const existing = this.chunks.get(chunkKey);
    if (existing) {
      for (const mesh of existing.meshes) {
        mesh.geometry.dispose();
      }
      this.scene.remove(existing.group);
      this.chunks.delete(chunkKey);
    }

    // Group faces by typeKey
    const facesByType = new Map(); // typeKey -> Array<BufferGeometry>

    // Build a local set for fast neighbor lookups within this chunk
    const cellSet = new Set();
    for (const c of cells) {
      cellSet.add(`${c.x},${c.z}`);
    }

    for (const { x, z, typeKey } of cells) {
      if (!facesByType.has(typeKey)) facesByType.set(typeKey, []);
      const model = this._modelCache.get(typeKey);
      if (model?.geometry) {
        facesByType.get(typeKey).push(this._makeModelCell(x, z, model.geometry));
      } else {
        const faces = this._generateFacesForCell(x, z, typeKey, cellSet);
        facesByType.get(typeKey).push(...faces);
      }
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

  _makeModelCell(x, z, sourceGeometry) {
    const geo = sourceGeometry.clone();
    _dummy.position.set(x + HALF, HALF, z + HALF);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    geo.applyMatrix4(_dummy.matrix);
    return geo;
  }

  async _getModelGeoMat(typeKey) {
    if (this._modelCache.has(typeKey)) return this._modelCache.get(typeKey);

    const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    let geometry = null;
    let material = null;

    if (def.model) {
      try {
        const gltf = await assetLoader.loadGLTF(def.model);
        const geometries = [];
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((child) => {
          if (!child.isMesh || !child.geometry) return;
          const clone = child.geometry.clone();
          clone.applyMatrix4(child.matrixWorld);
          geometries.push(clone);
          if (!material && child.material) {
            material = Array.isArray(child.material) ? child.material[0] : child.material;
          }
        });

        if (geometries.length === 1) {
          geometry = geometries[0];
        } else if (geometries.length > 1) {
          geometry = mergeGeometries(geometries);
          for (const g of geometries) g.dispose();
        }

        if (geometry) {
          geometry.scale(0.5, 0.5, 0.5);
        }
      } catch (error) {
        console.warn('[GroundRenderer] Failed to load ground model for', typeKey, error);
      }
    }

    const result = { geometry, material };
    this._modelCache.set(typeKey, result);
    return result;
  }

  _getMaterial(typeKey) {
    if (this._materialCache.has(typeKey)) {
      return this._materialCache.get(typeKey);
    }

    const model = this._modelCache.get(typeKey);
    const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    const mat = model?.material
      ? model.material.clone()
      : new THREE.MeshStandardMaterial({
          color: def.color || 0x888888,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
    mat.side = THREE.FrontSide;
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
    this._chunkCells.clear();
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
