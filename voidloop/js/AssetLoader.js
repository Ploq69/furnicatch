import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.textures = new Map();
    this.total = 0;
    this.loaded = 0;
    this.loader = new GLTFLoader();
  }

  async loadGLTF(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    const fullPath = '../../' + path;
    return new Promise((resolve, reject) => {
      this.loader.load(fullPath, (gltf) => {
        // Normalize: enable shadows on all meshes
        gltf.scene.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        this.cache.set(path, gltf);
        resolve(gltf);
      }, undefined, (err) => {
        console.warn('Failed to load:', path, err);
        reject(err);
      });
    });
  }

  cloneModel(path) {
    const gltf = this.cache.get(path);
    if (!gltf) return null;
    const scene = gltf.scene.clone(true);
    const animations = gltf.animations.slice();
    // Re-find skinned meshes in clone
    scene.traverse(c => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return { scene, animations };
  }

  async preloadBatch(items) {
    this.total = items.length;
    this.loaded = 0;
    const promises = items.map(path =>
      this.loadGLTF(path).then(() => {
        this.loaded++;
        this.onProgress?.(this.loaded, this.total);
      }).catch(() => {
        this.loaded++;
        this.onProgress?.(this.loaded, this.total);
      })
    );
    await Promise.all(promises);
  }
}

export const assetLoader = new AssetLoader();
