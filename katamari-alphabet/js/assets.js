import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ALL_FBX = '../All/Models/All.fbx';
const ALPHABET_GLB = '../simple_alphabet.glb';

function cloneObject(source) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) child.material = Array.isArray(child.material)
        ? child.material.map(m => m.clone())
        : child.material.clone();
    }
  });
  return clone;
}

function fitToUnit(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return object;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  object.scale.multiplyScalar(1 / maxAxis);
  return object;
}

export class PackedAssetLibrary {
  constructor() {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
    this.allRoot = null;
    this.allModels = new Map();
    this.gltfCache = new Map();
    this.glyphs = new Map();
    this.ready = false;
  }

  async load() {
    await Promise.allSettled([
      this._loadAllFbx(),
      this._loadAlphabet(),
    ]);
    this.ready = true;
  }

  async _loadAllFbx() {
    this.fbxLoader.setResourcePath('../All/Textures/');
    this.allRoot = await this.fbxLoader.loadAsync(ALL_FBX);
    this.allRoot.updateMatrixWorld(true);
    this.allRoot.traverse((child) => {
      if (!child.isMesh || !child.name) return;
      const wrapper = new THREE.Group();
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      const mesh = new THREE.Mesh(geometry);
      mesh.material = Array.isArray(child.material)
        ? child.material.map(m => m.clone())
        : child.material?.clone();
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      wrapper.add(mesh);
      fitToUnit(wrapper);
      this.allModels.set(child.name, wrapper);
    });
  }

  async _loadAlphabet() {
    const gltf = await this.gltfLoader.loadAsync(ALPHABET_GLB);
    const meshOrderMap = new Map([
      [0, '0'],
      [1, 'A'], [2, 'B'], [3, 'C'], [4, 'D'], [5, 'E'], [6, 'F'], [7, 'G'], [8, 'H'],
      [9, 'O'], [10, 'I'], [11, 'J'], [12, 'Q'], [13, 'L'], [14, 'K'], [15, 'M'], [16, 'N'],
      [17, 'P'], [18, 'R'], [19, 'S'], [20, 'V'], [21, 'X'], [22, 'Y'], [23, 'T'], [24, 'U'],
      [25, 'W'], [26, 'Z'], [27, '1'], [28, '2'], [29, '3'], [30, '4'], [31, '5'], [32, '6'],
      [33, '7'], [34, '8'], [35, '9'],
    ]);
    let ordinal = 0;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;
      const index = ordinal++;
      const letterMatch = node.name.match(/(?:^|[:_])([A-Z])_text_0(?:$|_)/);
      const digitMatch = node.name.match(/(?:^|[:_])Mesh(\d*)_numbers_0(?:$|_)/);
      const key = letterMatch?.[1] || (digitMatch ? (digitMatch[1] || '0') : meshOrderMap.get(index));
      if (!key) return;
      const group = new THREE.Group();
      const geometry = node.geometry.clone();
      geometry.applyMatrix4(node.matrixWorld);
      const mesh = new THREE.Mesh(geometry, this._glyphMaterial('letter'));
      group.add(mesh);
      fitToUnit(group);
      this.glyphs.set(key, group);
    });
  }

  _glyphMaterial(style) {
    const colors = {
      letter: [0xffd166, 0xff9f1c, 0.95],
      attached: [0x7df9a8, 0x24c26a, 0.75],
      distractor: [0xb69cff, 0x6d55cc, 0.6],
    };
    const [color, emissive, intensity] = colors[style] || colors.letter;
    return new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      roughness: 0.5,
      metalness: 0.04,
    });
  }

  allNamesMatching(pattern) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    return Array.from(this.allModels.keys()).filter(name => re.test(name));
  }

  createFromAll(pattern, scale = 1) {
    const names = this.allNamesMatching(pattern);
    if (!names.length) return this.createFallback(scale);
    const name = names[Math.floor(Math.random() * names.length)];
    const object = cloneObject(this.allModels.get(name));
    object.scale.multiplyScalar(scale);
    object.userData.assetName = name;
    return object;
  }

  async createGltf(path, scale = 1) {
    try {
      let gltf = this.gltfCache.get(path);
      if (!gltf) {
        gltf = await this.gltfLoader.loadAsync(path);
        this.gltfCache.set(path, gltf);
      }
      const object = cloneObject(gltf.scene);
      fitToUnit(object);
      object.scale.multiplyScalar(scale);
      object.userData.assetName = path.split('/').pop();
      return object;
    } catch {
      return this.createFallback(scale);
    }
  }

  createGlyph(letter, style = 'letter') {
    const proto = this.glyphs.get(String(letter).toUpperCase());
    if (!proto) return this.createGlyphFallback(letter);
    const object = cloneObject(proto);
    const mat = this._glyphMaterial(style);
    object.traverse((child) => {
      if (child.isMesh) child.material = mat.clone();
    });
    return object;
  }

  createGlyphFallback(letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#08111b';
    ctx.font = 'bold 190px Avenir Next, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(letter).toUpperCase()[0], 128, 138);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    return mesh;
  }

  createFallback(scale = 1) {
    const shapes = [
      new THREE.BoxGeometry(1, 0.7, 0.8),
      new THREE.CylinderGeometry(0.48, 0.52, 0.9, 9),
      new THREE.SphereGeometry(0.55, 12, 8),
    ];
    const geo = shapes[Math.floor(Math.random() * shapes.length)];
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.55, 0.62),
      roughness: 0.64,
      metalness: 0.04,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(scale);
    return mesh;
  }
}
