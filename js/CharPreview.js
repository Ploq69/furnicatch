import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { ANIMATION_ACTIONS } from './constants.js';

console.log('[CharPreview] v2 loaded — targetHeight=0.6, cameraZ=5');

export class CharPreview {
  constructor(scene) {
    this.scene = scene;
    this.currentMesh = null;
    this.mixer = null;
    this.currentIndex = 0;
    this.rotationY = 0;
    this.clipMap = {};
    this.actionMap = {};
    this.previewTimer = 0;
    this.previewPhase = 'idle'; // 'idle' | 'walk'
    this.isLoading = false;

    // Optional: a subtle platform under the character
    const platformGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.05, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a6a,
      roughness: 0.6,
      metalness: 0.1,
    });
    this.platform = new THREE.Mesh(platformGeo, platformMat);
    this.platform.position.y = -0.025;
    this.platform.receiveShadow = true;
    this.platform.visible = false;
    this.scene.add(this.platform);

    // Dedicated preview lights (bright, studio-style)
    this.keyLight = new THREE.PointLight(0xfff5e6, 2.0, 12);
    this.keyLight.position.set(2, 3, 3);
    this.keyLight.castShadow = true;
    this.keyLight.visible = false;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.PointLight(0xc7d2fe, 1.0, 12);
    this.fillLight.position.set(-2, 2, 2);
    this.fillLight.visible = false;
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xffffff, 0.8, 12);
    this.rimLight.position.set(0, 2, -3);
    this.rimLight.visible = false;
    this.scene.add(this.rimLight);
  }

  async showCharacter(charDef) {
    if (this.isLoading) return;
    this.isLoading = true;
    
    // Remove old mesh and dispose
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.currentMesh = null;
    }

    this.mixer = null;
    this.clipMap = {};
    this.actionMap = {};
    this.previewTimer = 0;
    this.previewPhase = 'idle';

    // Load new model
    const gltf = await assetLoader.loadGLTF(charDef.path);
    this.currentMesh = gltf.scene;

    // Scale calibration: normalize to ~0.6m for preview framing
    const box = new THREE.Box3().setFromObject(this.currentMesh);
    const height = box.max.y - box.min.y;
    console.log('[CharPreview] raw height:', height, '-> scale:', 0.6 / height);
    const targetHeight = 0.6;
    const scale = targetHeight / height;
    this.currentMesh.scale.setScalar(scale);

    // Center and place feet on platform (recompute box after scaling)
    this.currentMesh.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(this.currentMesh);
    const centerX = (box2.min.x + box2.max.x) * 0.5;
    const centerZ = (box2.min.z + box2.max.z) * 0.5;
    this.currentMesh.position.x -= centerX;
    this.currentMesh.position.z -= centerZ;
    this.currentMesh.position.y -= box2.min.y;

    this.currentMesh.castShadow = true;
    this.currentMesh.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    this.scene.add(this.currentMesh);
    this.platform.visible = true;
    this.keyLight.visible = true;
    this.fillLight.visible = true;
    this.rimLight.visible = true;
    this.isLoading = false;

    // Animation mixer
    this.mixer = new THREE.AnimationMixer(this.currentMesh);
    for (const clip of gltf.animations) {
      this.clipMap[clip.name] = clip;
    }

    // Build action resolver map (same logic as Player)
    this._buildActionMap();

    // Start idle
    this._playResolved('idle');
  }

  _buildActionMap() {
    this.actionMap = {};
    for (const [action, config] of Object.entries(ANIMATION_ACTIONS)) {
      let resolved = null;
      if (this.clipMap[config.primary]) {
        resolved = config.primary;
      } else {
        for (const fb of config.fallbacks) {
          if (this.clipMap[fb]) {
            resolved = fb;
            break;
          }
        }
      }
      this.actionMap[action] = resolved;
    }
  }

  _playResolved(actionName, fade = 0.2) {
    const clipName = this.actionMap[actionName];
    if (!clipName || !this.mixer || !this.clipMap[clipName]) return;

    const action = this.mixer.clipAction(this.clipMap[clipName]);
    action.reset().fadeIn(fade).play();

    for (const [k, other] of Object.entries(this.clipMap)) {
      if (k !== clipName) {
        this.mixer.clipAction(other).fadeOut(fade);
      }
    }
  }

  update(dt) {
    if (this.mixer) this.mixer.update(dt);

    if (this.currentMesh) {
      // Slow turntable rotation
      this.rotationY += dt * 0.6;
      this.currentMesh.rotation.y = this.rotationY;
    }

    // Periodic walk preview for liveliness
    if (this.currentMesh) {
      this.previewTimer += dt;
      if (this.previewPhase === 'idle' && this.previewTimer > 3.0) {
        this.previewPhase = 'walk';
        this.previewTimer = 0;
        this._playResolved('walk', 0.3);
      } else if (this.previewPhase === 'walk' && this.previewTimer > 2.0) {
        this.previewPhase = 'idle';
        this.previewTimer = 0;
        this._playResolved('idle', 0.3);
      }
    }
  }

  hide() {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }
    this.platform.visible = false;
    this.keyLight.visible = false;
    this.fillLight.visible = false;
    this.rimLight.visible = false;
    this.mixer = null;
  }
}
