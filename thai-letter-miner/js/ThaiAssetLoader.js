import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_ROOT = 'assets/thai/glb/';

const CATEGORY_STYLE = {
  consonant: { color: 0xfacc15, emissive: 0x7c3f00 },
  vowel: { color: 0x7dd3fc, emissive: 0x075985 },
  number: { color: 0x86efac, emissive: 0x166534 },
  symbol: { color: 0xf0abfc, emissive: 0x86198f },
  tone: { color: 0xfb7185, emissive: 0x9f1239 },
};

export class ThaiAssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  async preload(items) {
    await Promise.all(items.map((item) => this.loadItem(item)));
  }

  async loadItem(item) {
    if (this.cache.has(item.id)) return this.cloneItem(item.id);
    const path = `${MODEL_ROOT}${item.id}.glb`;
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, (err) => {
        reject(new Error(`Thai GLB failed to load for ${item.id}: ${path} (${err?.message || err})`));
      });
    });
    const normalized = this._normalize(gltf.scene, item);
    this.cache.set(item.id, normalized);
    return this.cloneItem(item.id);
  }

  cloneItem(itemId) {
    const source = this.cache.get(itemId);
    if (!source) throw new Error(`Thai model ${itemId} was not preloaded`);
    const clone = source.clone(true);
    clone.traverse((node) => {
      if (node.isMesh && node.material) node.material = node.material.clone();
    });
    clone.userData.thaiModelId = itemId;
    return clone;
  }

  _normalize(scene, item) {
    const group = new THREE.Group();
    const root = scene.clone(true);
    const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.consonant;
    let meshCount = 0;
    root.traverse((node) => {
      if (!node.isMesh) return;
      meshCount += 1;
      node.castShadow = true;
      node.receiveShadow = true;
      node.material = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: 0.45,
        roughness: 0.42,
        metalness: 0.08,
      });
    });
    if (!meshCount) throw new Error(`Thai GLB ${item.id} has no meshes`);
    group.add(root);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) throw new Error(`Thai GLB ${item.id} has empty bounds`);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const maxAxis = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxAxis) || maxAxis <= 0.0001) throw new Error(`Thai GLB ${item.id} has invalid size`);
    root.scale.setScalar(1.25 / maxAxis);
    root.rotation.x = -Math.PI / 2;
    group.userData.thaiModelId = item.id;
    group.userData.thaiMeshCount = meshCount;
    return group;
  }
}
