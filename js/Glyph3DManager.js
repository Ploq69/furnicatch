import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';

const GLYPH_ASSET = 'simple_alphabet.glb';

export class Glyph3DManager {
  constructor() {
    this.ready = false;
    this.loading = null;
    this.prototypes = new Map();
    this.materials = new Map();
    this.unitSize = 1;
  }

  async load() {
    if (this.ready) return this;
    if (this.loading) return this.loading;

    this.loading = assetLoader.loadGLTF(GLYPH_ASSET)
      .then((gltf) => {
        this._buildPrototypes(gltf.scene);
        this.ready = this.prototypes.size > 0;
        return this;
      })
      .catch((err) => {
        console.warn('3D alphabet failed to load:', err);
        return this;
      });

    return this.loading;
  }

  has(char) {
    return this.prototypes.has(this._normalizeChar(char));
  }

  createGlyph(char, style = 'typed') {
    const key = this._normalizeChar(char);
    const proto = this.prototypes.get(key);
    if (!proto) return null;

    const clone = proto.clone(true);
    const mat = this._getMaterial(style).clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = mat;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    clone.userData.glyphMaterial = mat;
    clone.userData.glyphKey = key;
    return clone;
  }

  applyStyle(group, style) {
    if (!group) return;
    const source = this._getMaterial(style);
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.copy(source.color);
        child.material.emissive.copy(source.emissive);
        child.material.emissiveIntensity = source.emissiveIntensity;
        child.material.opacity = source.opacity;
        child.material.transparent = source.transparent;
      }
    });
  }

  _buildPrototypes(scene) {
    scene.updateMatrixWorld(true);
    const candidates = [];
    const meshOrderMap = new Map([
      [0, '0'],
      [1, 'A'], [2, 'B'], [3, 'C'], [4, 'D'], [5, 'E'], [6, 'F'], [7, 'G'], [8, 'H'],
      [9, 'O'], [10, 'I'], [11, 'J'], [12, 'Q'], [13, 'L'], [14, 'K'], [15, 'M'], [16, 'N'],
      [17, 'P'], [18, 'R'], [19, 'S'], [20, 'V'], [21, 'X'], [22, 'Y'], [23, 'T'], [24, 'U'],
      [25, 'W'], [26, 'Z'], [27, '1'], [28, '2'], [29, '3'], [30, '4'], [31, '5'], [32, '6'],
      [33, '7'], [34, '8'], [35, '9'],
    ]);
    let meshOrdinal = 0;
    scene.traverse((node) => {
      if (!node.isMesh) return;
      const ordinal = meshOrdinal++;
      const letterMatch = node.name.match(/(?:^|[:_])([A-Z])_text_0(?:$|_)/);
      const digitMatch = node.name.match(/(?:^|[:_])Mesh(\d*)_numbers_0(?:$|_)/);
      if (letterMatch) {
        candidates.push([letterMatch[1], node]);
      } else if (digitMatch) {
        candidates.push([digitMatch[1] === '' ? '0' : digitMatch[1], node]);
      } else {
        if (meshOrderMap.has(ordinal)) {
          candidates.push([meshOrderMap.get(ordinal), node]);
        }
      }
    });

    for (const [key, mesh] of candidates) {
      const wrapper = new THREE.Group();
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      const clone = new THREE.Mesh(geometry, this._getMaterial('typed'));
      wrapper.add(clone);

      const box = new THREE.Box3().setFromObject(wrapper);
      if (box.isEmpty()) continue;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -box.min.y, -center.z);

      const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
      wrapper.scale.setScalar(this.unitSize / maxAxis);
      wrapper.userData.glyphKey = key;
      this.prototypes.set(key, wrapper);
    }
    if (this.prototypes.size < 36) {
      console.warn(`3D alphabet mapped ${this.prototypes.size}/36 glyphs.`, [...this.prototypes.keys()].sort());
    }
  }

  _getMaterial(style) {
    if (this.materials.has(style)) return this.materials.get(style);

    const configs = {
      preview: { color: 0x79663c, emissive: 0x332200, intensity: 0.12, opacity: 0.45 },
      typed: { color: 0xffd45a, emissive: 0xffb000, intensity: 0.5, opacity: 1 },
      correct: { color: 0x78f7a5, emissive: 0x31d96b, intensity: 0.85, opacity: 1 },
      wrong: { color: 0xff6b6b, emissive: 0xff2222, intensity: 1.1, opacity: 1 },
      combo: { color: 0x7dd3fc, emissive: 0x0891b2, intensity: 0.8, opacity: 1 },
      reward: { color: 0xfacc15, emissive: 0xf59e0b, intensity: 0.95, opacity: 1 },
      level: { color: 0xc084fc, emissive: 0x9333ea, intensity: 1.05, opacity: 1 },
      slot: { color: 0x334155, emissive: 0x111827, intensity: 0.05, opacity: 0.7 },
    };
    const cfg = configs[style] || configs.typed;
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: cfg.intensity,
      roughness: 0.48,
      metalness: 0.08,
      transparent: cfg.opacity < 1,
      opacity: cfg.opacity,
    });
    this.materials.set(style, mat);
    return mat;
  }

  _normalizeChar(char) {
    return String(char || '').toUpperCase();
  }
}

export const glyph3D = new Glyph3DManager();
