/**
 * RemotePlayer — Simplified player representation for multiplayer peers.
 * Loads a KayKit character model + animations, but has no input/equipment/combat.
 */

import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import {
  KAYKIT_ANIMATION_PATHS,
  KAYKIT_ANIMATIONS,
  getKayKitCharacter,
} from './KayKitLoadout.js';

export class RemotePlayer {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.mixer = null;
    this.animations = [];
    this.currentAnim = null;
    this.position = new THREE.Vector3();
    this.rotation = 0;
    this._lastPos = new THREE.Vector3();
    this._velocity = 0;
    this.characterId = 'ranger';
    this._loaded = false;
  }

  async init(characterId = 'ranger') {
    this.characterId = characterId;
    this.animations = await this._loadAnimations();
    await this._setModel(characterId);
    this._loaded = true;
  }

  async _loadAnimations() {
    const clips = [];
    for (const path of KAYKIT_ANIMATION_PATHS) {
      try {
        const gltf = await assetLoader.loadGLTF(path);
        clips.push(...(gltf.animations || []));
      } catch (e) {
        console.warn('[RemotePlayer] Animation load failed:', path);
      }
    }
    return clips;
  }

  async _setModel(characterId) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }

    const character = getKayKitCharacter(characterId);
    try {
      await assetLoader.loadGLTF(character.model);
      const cloned = assetLoader.cloneModel(character.model);
      if (!cloned || !cloned.scene) throw new Error('Empty clone');

      this.mesh = cloned.scene;
      this.mesh.scale.setScalar(0.01); // KayKit models use cm units
      this.mesh.rotation.y = Math.PI;  // Face camera

      // Enable shadows
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(this.mesh);

      if (this.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.currentAnim = null;
        this._playAnim('Idle');
      }
    } catch (e) {
      console.error('[RemotePlayer] Model load failed, using fallback:', e);
      const geo = new THREE.CapsuleGeometry(0.25, 0.7, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044aa, emissiveIntensity: 0.4 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.y = 0.85;
      this.scene.add(this.mesh);
    }
  }

  async setCharacter(characterId) {
    if (characterId === this.characterId && this.mesh) return;
    this.characterId = characterId;
    await this._setModel(characterId);
  }

  _playAnim(name) {
    if (!this.mixer || !this.animations.length) return;
    if (this.currentAnim === name) return;

    const mappedName = KAYKIT_ANIMATIONS[name] || name;
    const clip = this.animations.find((a) => a.name === mappedName);
    if (!clip) return;

    const action = this.mixer.clipAction(clip);
    action.reset().fadeIn(0.12);
    action.timeScale = 1.0;
    action.loop = THREE.LoopRepeat;
    action.play();

    this.animations.forEach((a) => {
      if (a !== clip) this.mixer.clipAction(a).fadeOut(0.12);
    });

    this.currentAnim = name;
  }

  update(dt) {
    if (this.mixer) this.mixer.update(dt);

    if (!this.mesh) return;

    // Smooth position interpolation
    this.mesh.position.lerp(this.position, Math.min(1, 15 * dt));

    // Smooth rotation
    let diff = this.rotation - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, 10 * dt);

    // Determine animation from velocity
    const dx = this.mesh.position.x - this._lastPos.x;
    const dz = this.mesh.position.z - this._lastPos.z;
    this._velocity = Math.sqrt(dx * dx + dz * dz) / dt;
    this._lastPos.copy(this.mesh.position);

    if (this._velocity > 2.5) {
      this._playAnim('Run');
    } else if (this._velocity > 0.3) {
      this._playAnim('Walk');
    } else {
      this._playAnim('Idle');
    }
  }

  setState(state) {
    this.position.set(state.x || 0, state.y || 0, state.z || 0);
    this.rotation = state.r || 0;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    this.mixer = null;
    this.animations = [];
  }
}
