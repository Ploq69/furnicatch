/**
 * BlockInstancer — Chunk-based InstancedMesh rendering for static blocks.
 * Each 16×16 chunk gets its own InstancedMesh per block type.
 * Chunks outside the camera view are hidden entirely.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetLoader } from './AssetLoader.js';
import { BLOCK_TYPES, GAME } from './constants.js';
import { getBlockFaceTileIndex, TILES } from './TerrainAtlas.js';

const BLOCK_VISUAL_SCALE = 0.5;
const BLOCK_VISUAL_OFFSET = 0.5;
const CHUNK_SIZE = 16;
const FACE_KIND = {
  top: 0,
  side: 1,
  bottom: 2,
};

export class BlockInstancer {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.blockMap = new Map();
    this._typeCache = new Map();
    this._fallbackGeo = new THREE.BoxGeometry(GAME.BLOCK_SIZE, GAME.BLOCK_SIZE, GAME.BLOCK_SIZE);
    this._dummy = new THREE.Object3D();
    this._zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    this._atlasTexture = null;
    this._atlasMaterial = null;
    this._atlasGeoCache = new Map();
  }

  setAtlasTexture(texture) {
    this._atlasTexture = texture;
    if (this._atlasMaterial) {
      this._atlasMaterial.map = texture;
      this._atlasMaterial.needsUpdate = true;
    } else {
      this._atlasMaterial = new THREE.MeshStandardMaterial({
        map: this._atlasTexture,
        roughness: 0.8,
        metalness: 0.1,
      });
    }
  }

  _ensureAtlas() {
    if (this._atlasTexture) return;
    this._atlasTexture = new THREE.TextureLoader().load('assets/textures/ourcraft_atlas.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
    });
    this._atlasMaterial = new THREE.MeshStandardMaterial({
      map: this._atlasTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
  }

  _getAtlasGeometry(typeKey, overrideTileIdx = null) {
    const topTileIdx = overrideTileIdx ?? getBlockFaceTileIndex(typeKey, FACE_KIND.top);
    const sideTileIdx = overrideTileIdx ?? getBlockFaceTileIndex(typeKey, FACE_KIND.side);
    const bottomTileIdx = overrideTileIdx ?? getBlockFaceTileIndex(typeKey, FACE_KIND.bottom);
    const cacheKey = `${topTileIdx}:${sideTileIdx}:${bottomTileIdx}`;
    if (this._atlasGeoCache.has(cacheKey)) return this._atlasGeoCache.get(cacheKey);

    const geo = new THREE.BoxGeometry(GAME.BLOCK_SIZE, GAME.BLOCK_SIZE, GAME.BLOCK_SIZE);
    const uv = geo.attributes.uv;
    const normal = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const ny = normal.getY(i);
      const tileIdx = ny > 0.5 ? topTileIdx : ny < -0.5 ? bottomTileIdx : sideTileIdx;
      const rect = TILES[tileIdx] || TILES[sideTileIdx];
      const u = uv.getX(i);
      const v = uv.getY(i);
      const insetU = u * 0.96875 + 0.015625;
      const insetV = v * 0.96875 + 0.015625;
      uv.setXY(i, insetU * rect.w + rect.x, insetV * rect.h + rect.y);
    }
    geo.scale(BLOCK_VISUAL_SCALE, BLOCK_VISUAL_SCALE, BLOCK_VISUAL_SCALE);
    this._atlasGeoCache.set(cacheKey, geo);
    return geo;
  }

  async preloadTypes(typeKeys) {
    await Promise.all(typeKeys.map(t => this._getTypeGeoMat(t)));
  }

  _chunkKey(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return `${cx},${cz}`;
  }

  async _getTypeGeoMat(typeKey) {
    if (this._typeCache.has(typeKey)) return this._typeCache.get(typeKey);

    const def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    let geometry = null;
    let material = null;

    // Use Kenney atlas cube if a tile mapping exists
    const tileIdx = def.kenneyTile != null ? def.kenneyTile : getBlockFaceTileIndex(typeKey, FACE_KIND.side);
    if (tileIdx >= 0 && TILES[tileIdx]) {
      this._ensureAtlas();
      geometry = this._getAtlasGeometry(typeKey, def.kenneyTile ?? null);
      material = this._atlasMaterial;
      const result = { geometry, material };
      this._typeCache.set(typeKey, result);
      return result;
    }

    if (def.model) {
      try {
        const gltf = await assetLoader.loadGLTF(def.model);
        if (gltf && gltf.scene) {
          const geometries = [];
          gltf.scene.traverse((c) => {
            if (c.isMesh && c.geometry) {
              const clone = c.geometry.clone();
              clone.applyMatrix4(c.matrixWorld);
              geometries.push(clone);
              if (!material) material = c.material;
            }
          });
          if (geometries.length === 1) {
            geometry = geometries[0];
          } else if (geometries.length > 1) {
            geometry = mergeGeometries(geometries);
          }
        }
      } catch (e) {
        console.warn('[BlockInstancer] Failed to load model for', typeKey);
      }
    }

    if (!geometry) {
      geometry = this._fallbackGeo.clone();
      material = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.8,
        metalness: 0.1,
      });
    }

    geometry.scale(BLOCK_VISUAL_SCALE, BLOCK_VISUAL_SCALE, BLOCK_VISUAL_SCALE);
    const result = { geometry, material };
    this._typeCache.set(typeKey, result);
    return result;
  }

  _ensureChunk(chunkKey) {
    if (this.chunks.has(chunkKey)) return this.chunks.get(chunkKey);

    const group = new THREE.Group();
    group.name = `chunk_${chunkKey}`;
    this.scene.add(group);

    const chunk = { group, batches: new Map() };
    this.chunks.set(chunkKey, chunk);
    return chunk;
  }

  _ensureBatch(chunk, typeKey, capacity = 500) {
    if (chunk.batches.has(typeKey)) return chunk.batches.get(typeKey);

    const cached = this._typeCache.get(typeKey);
    if (!cached) {
      console.warn('[BlockInstancer] Type not preloaded:', typeKey);
      return null;
    }

    const { geometry, material } = cached;
    const im = new THREE.InstancedMesh(geometry, material, capacity);
    im.castShadow = false;
    im.receiveShadow = false;
    im.count = 0;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunk.group.add(im);

    const batch = { mesh: im, max: capacity, count: 0, free: [] };
    chunk.batches.set(typeKey, batch);
    return batch;
  }

  addBlock(block) {
    const chunkKey = this._chunkKey(block.position.x, block.position.z);
    const chunk = this._ensureChunk(chunkKey);
    const batch = this._ensureBatch(chunk, block.typeKey);
    if (!batch) return false;

    let index;
    if (batch.free.length > 0) {
      index = batch.free.pop();
    } else {
      index = batch.count;
      batch.count++;
      batch.mesh.count = batch.count;
    }

    this._setBlockMatrix(batch, index, block);
    batch.mesh.instanceMatrix.needsUpdate = true;

    batch.mesh.setColorAt(index, new THREE.Color(1, 1, 1));
    if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;

    this.blockMap.set(block, { chunkKey, typeKey: block.typeKey, index });
    return true;
  }

  _setBlockMatrix(batch, index, block) {
    const shake = block.shakeTimer > 0 ? block.shakeOffset : new THREE.Vector3();
    const decay = block.shakeTimer > 0 ? Math.max(0, block.shakeTimer / 0.15) : 0;
    const pulse = block._scalePulse > 0 ? 1 + Math.sin(block._scalePulse * Math.PI / 0.08) * block._scalePulse : 1;

    this._dummy.position.set(
      block.position.x + BLOCK_VISUAL_OFFSET + shake.x * decay,
      block.position.y + BLOCK_VISUAL_OFFSET + shake.y * decay,
      block.position.z + BLOCK_VISUAL_OFFSET + shake.z * decay
    );
    this._dummy.rotation.set(0, 0, 0);
    this._dummy.scale.set(pulse, pulse, pulse);
    this._dummy.updateMatrix();
    batch.mesh.setMatrixAt(index, this._dummy.matrix);
  }

  removeBlock(block) {
    const info = this.blockMap.get(block);
    if (!info) return false;
    const chunk = this.chunks.get(info.chunkKey);
    if (!chunk) return false;
    const batch = chunk.batches.get(info.typeKey);
    if (!batch) return false;

    batch.mesh.setMatrixAt(info.index, this._zeroMatrix);
    batch.mesh.instanceMatrix.needsUpdate = true;
    batch.free.push(info.index);
    this.blockMap.delete(block);
    return true;
  }

  updateBlockTransform(block) {
    const info = this.blockMap.get(block);
    if (!info) return false;
    const chunk = this.chunks.get(info.chunkKey);
    if (!chunk) return false;
    const batch = chunk.batches.get(info.typeKey);
    if (!batch) return false;

    this._setBlockMatrix(batch, info.index, block);
    batch.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  flashBlock(block, colorHex, intensity = 0.6) {
    const info = this.blockMap.get(block);
    if (!info) return false;
    const chunk = this.chunks.get(info.chunkKey);
    if (!chunk) return false;
    const batch = chunk.batches.get(info.typeKey);
    if (!batch) return false;

    const base = new THREE.Color(colorHex);
    const white = new THREE.Color(1, 1, 1);
    const tint = base.clone().lerp(white, intensity);
    batch.mesh.setColorAt(info.index, tint);
    if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  unflashBlock(block) {
    const info = this.blockMap.get(block);
    if (!info) return false;
    const chunk = this.chunks.get(info.chunkKey);
    if (!chunk) return false;
    const batch = chunk.batches.get(info.typeKey);
    if (!batch) return false;

    batch.mesh.setColorAt(info.index, new THREE.Color(1, 1, 1));
    if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  updateVisibility(playerPos, viewRadius = 45) {
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
      for (const batch of chunk.batches.values()) {
        const geo = batch.mesh.geometry;
        const mat = batch.mesh.material;
        // Skip disposal for shared atlas geometries
        const isSharedGeo = Array.from(this._atlasGeoCache.values()).includes(geo);
        if (!isSharedGeo) geo.dispose();
        // Skip disposal for shared atlas material
        if (Array.isArray(mat)) {
          mat.forEach(m => { if (m !== this._atlasMaterial) m.dispose(); });
        } else if (mat !== this._atlasMaterial) {
          mat.dispose();
        }
      }
      this.scene.remove(chunk.group);
    }
    this.chunks.clear();
    this.blockMap.clear();
  }

  getStats() {
    let chunks = 0;
    let meshes = 0;
    let instances = 0;
    for (const chunk of this.chunks.values()) {
      chunks++;
      for (const batch of chunk.batches.values()) {
        meshes++;
        instances += batch.count;
      }
    }
    return { chunks, meshes, instances };
  }
}
