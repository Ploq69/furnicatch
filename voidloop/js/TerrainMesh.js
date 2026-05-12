/**
 * TerrainMesh — Unified deformable terrain mesh for digable worlds.
 *
 * Instead of thousands of individual block meshes, the entire zone terrain
 * is merged into a single BufferGeometry. Mining "destroys" blocks by
 * collapsing their vertices to degenerate positions, revealing interior
 * faces of neighboring blocks for natural tunnel walls.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCK_TYPES, GAME } from './constants.js';
import { assetLoader } from './AssetLoader.js';

const BLOCK_SIZE = GAME.BLOCK_SIZE; // 1
const HALF = BLOCK_SIZE * 0.5;

export class TerrainMesh {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.geometry = null;
    this.materials = [];
    this.materialIndexMap = new Map(); // typeKey -> materialIndex
    this.blockVertexMap = new Map(); // "x,y,z" -> { startVertex, vertexCount, center }
    this._modelCache = new Map(); // typeKey -> BufferGeometry (cached prototype, not owned)
    this._originalPositions = null; // Float32Array for restore/displace
  }

  /* ================================================================ */
  /*  Preloading & Materials                                           */
  /* ================================================================ */

  async preloadTypes(typeKeys) {
    const unique = [...new Set(typeKeys)];
    await Promise.all(unique.map(t => this._preloadType(t)));
    this._buildMaterials(unique);
  }

  async _preloadType(typeKey) {
    if (this._modelCache.has(typeKey)) return;

    const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    let geometry = null;

    if (def.model) {
      try {
        const gltf = await assetLoader.loadGLTF(def.model);
        if (gltf && gltf.scene) {
          const geometries = [];
          gltf.scene.updateMatrixWorld(true);
          gltf.scene.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;
            const clone = child.geometry.clone();
            clone.applyMatrix4(child.matrixWorld);
            geometries.push(clone);
          });
          if (geometries.length === 1) {
            geometry = geometries[0];
          } else if (geometries.length > 1) {
            geometry = mergeGeometries(geometries);
            for (const g of geometries) g.dispose();
          }
          if (geometry) {
            // KayKit BlockBits are 2×2×2 units; scale to 1×1×1
            geometry.scale(0.5, 0.5, 0.5);
          }
        }
      } catch (e) {
        console.warn('[TerrainMesh] Failed to load model for', typeKey, e);
      }
    }

    if (!geometry) {
      geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }

    this._modelCache.set(typeKey, geometry);
  }

  _buildMaterials(typeKeys) {
    for (const mat of this.materials) mat.dispose();
    this.materials = [];
    this.materialIndexMap.clear();

    for (const typeKey of typeKeys) {
      const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
      const mat = new THREE.MeshStandardMaterial({
        color: def.color || 0x888888,
        roughness: 0.85,
        metalness: 0.05,
      });
      this.materialIndexMap.set(typeKey, this.materials.length);
      this.materials.push(mat);
    }
  }

  /* ================================================================ */
  /*  Mesh Generation                                                  */
  /* ================================================================ */

  generateFromOccupancyGrid(occupancyGrid) {
    this.clear();
    if (occupancyGrid.size === 0) return;

    const geos = []; // { geometry, key, x, y, z }
    const _matrix = new THREE.Matrix4();

    for (const [key, cell] of occupancyGrid.entries()) {
      if (cell.destroyed) continue;

      const [x, y, z] = key.split(',').map(Number);
      const matIndex = this.materialIndexMap.get(cell.type);
      if (matIndex === undefined) {
        console.warn('[TerrainMesh] Unknown block type, skipping:', cell.type);
        continue;
      }

      const baseGeo = this._modelCache.get(cell.type);
      if (!baseGeo) continue;

      const geo = baseGeo.clone();

      // Position at grid cell — offset by HALF so block sits on integer coords
      _matrix.makeTranslation(x + HALF, y + HALF, z + HALF);
      geo.applyMatrix4(_matrix);

      // Tag with material index for mergeGeometries
      const indexCount = geo.index ? geo.index.count : geo.attributes.position.count;
      geo.groups = [{ start: 0, count: indexCount, materialIndex: matIndex }];

      geos.push({ geometry: geo, key, x, y, z });
    }

    if (geos.length === 0) return;

    // Merge into unified geometry
    const allGeometries = geos.map(g => g.geometry);
    this.geometry = mergeGeometries(allGeometries, true);

    for (const g of allGeometries) g.dispose();

    // Cache original positions for deformation / restore
    const posAttr = this.geometry.attributes.position;
    this._originalPositions = new Float32Array(posAttr.array);

    // Build block→vertex mapping
    let vertexOffset = 0;
    for (const { key, x, y, z } of geos) {
      const baseGeo = this._modelCache.get(occupancyGrid.get(x, y, z).type);
      const vertexCount = baseGeo.attributes.position.count;

      this.blockVertexMap.set(key, {
        startVertex: vertexOffset,
        vertexCount,
        center: new THREE.Vector3(x + HALF, y + HALF, z + HALF),
      });

      vertexOffset += vertexCount;
    }

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
    this.scene.add(this.mesh);
  }

  /* ================================================================ */
  /*  Queries                                                          */
  /* ================================================================ */

  hasBlock(x, y, z) {
    return this.blockVertexMap.has(`${x},${y},${z}`);
  }

  getBlockCenter(x, y, z) {
    const mapping = this.blockVertexMap.get(`${x},${y},${z}`);
    return mapping ? mapping.center.clone() : null;
  }

  /**
   * Raycast against the unified terrain mesh.
   * @returns {THREE.Intersection|null}
   */
  raycast(raycaster) {
    if (!this.mesh) return null;
    const hits = raycaster.intersectObject(this.mesh, false);
    return hits.length > 0 ? hits[0] : null;
  }

  /**
   * Convert a raycast hit to integer grid cell coordinates.
   */
  static hitToGrid(hit) {
    const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
    // Nudge against normal so the point lands inside the hit block
    const px = hit.point.x - normal.x * 0.001;
    const py = hit.point.y - normal.y * 0.001;
    const pz = hit.point.z - normal.z * 0.001;
    return {
      x: Math.floor(px),
      y: Math.floor(py),
      z: Math.floor(pz),
    };
  }

  /* ================================================================ */
  /*  Deformation API                                                  */
  /* ================================================================ */

  /**
   * Destroy a block by collapsing its vertices to degenerate triangles.
   */
  destroyBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const mapping = this.blockVertexMap.get(key);
    if (!mapping || !this.geometry) return false;

    const posAttr = this.geometry.attributes.position;
    const { startVertex, vertexCount, center } = mapping;

    for (let i = 0; i < vertexCount; i++) {
      const idx = startVertex + i;
      posAttr.setXYZ(idx, center.x, center.y, center.z);
    }

    posAttr.needsUpdate = true;
    return true;
  }

  /**
   * Restore a previously destroyed block to its original shape.
   */
  restoreBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const mapping = this.blockVertexMap.get(key);
    if (!mapping || !this.geometry || !this._originalPositions) return false;

    const posAttr = this.geometry.attributes.position;
    const { startVertex, vertexCount } = mapping;

    for (let i = 0; i < vertexCount; i++) {
      const src = (startVertex + i) * 3;
      const dst = startVertex + i;
      posAttr.setXYZ(dst,
        this._originalPositions[src],
        this._originalPositions[src + 1],
        this._originalPositions[src + 2]
      );
    }

    posAttr.needsUpdate = true;
    return true;
  }

  /**
   * Displace a block inward by a factor (0 = original, 1 = fully collapsed).
   * Useful for damage-state visuals.
   */
  displaceBlock(x, y, z, factor = 0.3) {
    const key = `${x},${y},${z}`;
    const mapping = this.blockVertexMap.get(key);
    if (!mapping || !this.geometry || !this._originalPositions) return false;

    const posAttr = this.geometry.attributes.position;
    const { startVertex, vertexCount, center } = mapping;

    for (let i = 0; i < vertexCount; i++) {
      const src = (startVertex + i) * 3;
      const dst = startVertex + i;
      const ox = this._originalPositions[src];
      const oy = this._originalPositions[src + 1];
      const oz = this._originalPositions[src + 2];
      posAttr.setXYZ(dst,
        ox + (center.x - ox) * factor,
        oy + (center.y - oy) * factor,
        oz + (center.z - oz) * factor
      );
    }

    posAttr.needsUpdate = true;
    return true;
  }

  /* ================================================================ */
  /*  Lifecycle                                                        */
  /* ================================================================ */

  clear() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    for (const mat of this.materials) mat.dispose();
    this.materials = [];
    this.blockVertexMap.clear();
    this._originalPositions = null;
  }

  getStats() {
    if (!this.geometry) return { triangles: 0, blocks: 0 };
    const idxCount = this.geometry.index
      ? this.geometry.index.count
      : this.geometry.attributes.position.count;
    return {
      triangles: Math.floor(idxCount / 3),
      blocks: this.blockVertexMap.size,
    };
  }
}
