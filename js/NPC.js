import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { ASSETS } from './constants.js';

const NPC_CONFIGS = [
  { key: 'male1', path: ASSETS.characters.male1, scale: 0.45 },
  { key: 'male2', path: 'Cube World - Aug 2023/Characters/glTF/Character_Male_2.gltf', scale: 0.45 },
  { key: 'female1', path: ASSETS.characters.female1, scale: 0.45 },
  { key: 'female2', path: 'Cube World - Aug 2023/Characters/glTF/Character_Female_2.gltf', scale: 0.45 },
];

const IDLE_CLIP_NAMES = ['Idle', 'Idle_Hold', 'Idle_Attack'];
const WALK_CLIP_NAMES = ['Walk', 'Walk_Hold', 'Run'];

export class NPC {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.entityType = 'npc';
    this.position = position.clone();
    this.homePosition = position.clone();
    this.velocity = new THREE.Vector3();
    this.active = true;
    this.container = null;
    this.mesh = null;
    this.mixer = null;
    this.animations = {};
    this.currentAnim = null;
    this.state = 'idle';
    this.stateTimer = 1 + Math.random() * 2;
    this.walkSpeed = 0.6 + Math.random() * 0.4;
    this.turnSpeed = 2;
    this.yaw = Math.random() * Math.PI * 2;
    this.targetYaw = this.yaw;
    this.iconMesh = null;
    this.iconTimer = 0;
    this.config = NPC_CONFIGS[Math.floor(Math.random() * NPC_CONFIGS.length)];
    this._loadModel();
  }

  async _loadModel() {
    try {
      const gltf = await assetLoader.loadGLTF(this.config.path);
      this.mesh = gltf.scene.clone(true);
      this.mesh.scale.setScalar(this.config.scale);
      this.mesh.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(this.mesh);
      const groundOffset = -box.min.y;
      this.mesh.position.y = groundOffset;

      this.container = new THREE.Group();
      this.container.add(this.mesh);
      this.container.position.copy(this.position);
      this.scene.add(this.container);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        for (const clip of gltf.animations) {
          this.animations[clip.name] = this.mixer.clipAction(clip);
        }
        this._playIdle();
      }
    } catch (err) {
      console.error('Failed to load NPC:', this.config.path, err);
      this._fallback();
    }
  }

  _fallback() {
    const geometry = new THREE.CapsuleGeometry(0.25, 0.6, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x60a5fa });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0.55;
    this.container = new THREE.Group();
    this.container.add(this.mesh);
    this.container.position.copy(this.position);
    this.scene.add(this.container);
  }

  _playIdle() {
    if (!this.mixer) return;
    const clipName = this._resolveClip(IDLE_CLIP_NAMES);
    if (clipName && clipName !== this.currentAnim) {
      this._crossfade(clipName);
      this.currentAnim = clipName;
    }
  }

  _playWalk() {
    if (!this.mixer) return;
    const clipName = this._resolveClip(WALK_CLIP_NAMES);
    if (clipName && clipName !== this.currentAnim) {
      this._crossfade(clipName);
      this.currentAnim = clipName;
    }
  }

  _resolveClip(priorityList) {
    for (const name of priorityList) {
      if (this.animations[name]) return name;
    }
    const keys = Object.keys(this.animations);
    return keys.length > 0 ? keys[0] : null;
  }

  _crossfade(clipName) {
    const next = this.animations[clipName];
    if (!next) return;
    next.reset().play();
    next.fadeIn(0.3);
    for (const [name, action] of Object.entries(this.animations)) {
      if (name !== clipName) action.fadeOut(0.3);
    }
  }

  update(dt, playerPosition) {
    if (this.mixer) this.mixer.update(dt);
    if (!this.container) return;

    const distToPlayer = this.position.distanceTo(playerPosition);

    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this._pickNewState();
    }

    if (this.state === 'walk') {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.position.addScaledVector(forward, this.walkSpeed * dt);
      if (this.position.distanceTo(this.homePosition) > 4) {
        this.targetYaw = Math.atan2(this.homePosition.x - this.position.x, this.homePosition.z - this.position.z);
      }
    }

    // Smooth turn
    let yawDiff = this.targetYaw - this.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.yaw += yawDiff * Math.min(1, this.turnSpeed * dt);

    // Face player when nearby
    if (distToPlayer < 5) {
      const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
      toPlayer.y = 0;
      if (toPlayer.lengthSq() > 0.001) {
        this.targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      }
    }

    this.container.position.copy(this.position);
    this.container.rotation.y = this.yaw;

    // Update icon
    if (this.iconMesh) {
      this.iconTimer -= dt;
      this.iconMesh.position.set(this.position.x, this.position.y + 1.6, this.position.z);
      this.iconMesh.lookAt(playerPosition.x, this.iconMesh.position.y, playerPosition.z);
      this.iconMesh.rotateY(Math.PI);
      if (this.iconTimer <= -1.5) {
        this._hideIcon();
      }
    } else {
      this.iconTimer -= dt;
      if (this.iconTimer <= 0) {
        this._showIcon();
        this.iconTimer = 3 + Math.random() * 4;
      }
    }
  }

  _pickNewState() {
    const r = Math.random();
    if (r < 0.6) {
      this.state = 'idle';
      this.stateTimer = 1.5 + Math.random() * 2.5;
      this._playIdle();
    } else {
      this.state = 'walk';
      this.stateTimer = 2 + Math.random() * 3;
      this.targetYaw = Math.random() * Math.PI * 2;
      this._playWalk();
    }
  }

  async _showIcon() {
    if (this.iconMesh) return;
    const iconType = Math.random() < 0.5 ? 'exclamation' : 'question';
    const path = iconType === 'exclamation'
      ? 'Cube World - Aug 2023/Pixel Blocks/glTF/Exclamation.gltf'
      : 'Cube World - Aug 2023/Pixel Blocks/glTF/QuestionMark.gltf';
    try {
      const gltf = await assetLoader.loadGLTF(path);
      this.iconMesh = gltf.scene.clone(true);
      this.iconMesh.scale.setScalar(0.25);
      this.scene.add(this.iconMesh);
    } catch (e) {
      // ignore
    }
  }

  _hideIcon() {
    if (!this.iconMesh) return;
    this.scene.remove(this.iconMesh);
    this.iconMesh.traverse((child) => {
      if (child.isMesh && child.material) child.material.dispose?.();
    });
    this.iconMesh = null;
  }

  dispose() {
    this._hideIcon();
    if (!this.container) return;
    this.scene.remove(this.container);
    this.container.traverse((child) => {
      if (child.isMesh) {
        if (child.material) child.material.dispose?.();
        if (child.geometry) child.geometry.dispose?.();
      }
    });
    this.container = null;
    this.mixer = null;
  }
}
