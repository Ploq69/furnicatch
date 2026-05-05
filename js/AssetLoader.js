import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.mtlLoader = new MTLLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  async loadGLTF(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => {
        // Enable shadows on all meshes
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.cache.set(url, gltf);
        resolve(gltf);
      }, undefined, reject);
    });
  }

  async loadOBJ(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const mtlUrl = url.replace(/\.obj$/i, '.mtl');
    let loader = this.objLoader;
    try {
      const basePath = mtlUrl.slice(0, mtlUrl.lastIndexOf('/') + 1);
      const fileName = mtlUrl.slice(mtlUrl.lastIndexOf('/') + 1);
      this.mtlLoader.setPath(basePath);
      const materials = await new Promise((resolve, reject) => {
        this.mtlLoader.load(fileName, resolve, undefined, reject);
      });
      materials.preload();
      loader = new OBJLoader();
      loader.setMaterials(materials);
    } catch (err) {
      loader = this.objLoader;
    }
    return new Promise((resolve, reject) => {
      loader.load(url, (obj) => {
        obj.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Ensure materials are decent
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => {
                  if (m.shininess !== undefined) m.shininess = 30;
                });
              } else {
                if (child.material.shininess !== undefined) child.material.shininess = 30;
              }
            }
          }
        });
        this.cache.set(url, obj);
        resolve(obj);
      }, undefined, reject);
    });
  }

  cloneGLTF(key) {
    const gltf = this.cache.get(key);
    if (!gltf) return null;
    const scene = gltf.scene.clone(true);
    const animations = gltf.animations.slice();
    return { scene, animations };
  }

  cloneOBJ(key) {
    const obj = this.cache.get(key);
    if (!obj) return null;
    return obj.clone(true);
  }

  getCached(key) {
    return this.cache.get(key);
  }
}

export const assetLoader = new AssetLoader();
