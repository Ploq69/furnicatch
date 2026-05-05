import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { GAME, ANIMATION_ACTIONS } from './constants.js';
import { input } from './InputManager.js';

export class Player {
  constructor(scene, characterPath) {
    this.scene = scene;
    this.characterPath = characterPath;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.2;
    this.stamina = GAME.MAX_STAMINA;
    this.orbs = Infinity;
    this.orbTier = 'wood';
    this.throwPower = GAME.THROW_POWER_DEFAULT;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.dodgeDirection = new THREE.Vector3();
    this.celebrationTimer = 0;
    
    // Animation state machine — only switch clips on state change
    this.currentAnimState = null;
    this.animLockTimer = 0;
    
    this.mesh = null;
    this.mixer = null;
    this.animator = null;
    this.handOffset = new THREE.Vector3(0.35, 0.85, 0.45);
    this.actionMap = {};
    this.clipMap = {};
    
    this.ready = this._loadModel();
  }

  async _loadModel() {
    try {
      const gltf = await assetLoader.loadGLTF(this.characterPath);
      this.mesh = gltf.scene;
      
      // Scale calibration: normalize to ~0.5m height (these models run very large)
      const box = new THREE.Box3().setFromObject(this.mesh);
      const height = box.max.y - box.min.y;
      const targetHeight = 0.5;
      const scale = targetHeight / height;
      this.mesh.scale.setScalar(scale);
      this.mesh.updateMatrixWorld(true);
      
      this.scene.add(this.mesh);
      
      // Normalize anchor: place feet on ground
      const box2 = new THREE.Box3().setFromObject(this.mesh);
      this.groundOffset = -box2.min.y;
      
      // Forward verification arrow (debug, removable later)
      // const arrow = new THREE.ArrowHelper(new THREE.Vector3(0,0,-1), new THREE.Vector3(0, 1.5, 0), 0.8, 0xff00ff);
      // this.mesh.add(arrow);
      
      // Animation mixer
      this.mixer = new THREE.AnimationMixer(this.mesh);
      this.animations = gltf.animations;
      
      // Build clip map
      this.clipMap = {};
      for (const clip of this.animations) {
        this.clipMap[clip.name] = clip;
      }
      
      // Build action resolver map
      this._buildActionMap();
      
      // Start idle
      this.currentAnimState = 'idle';
      this.playAction('idle');
    } catch (err) {
      console.error('Failed to load player:', err);
      // Fallback capsule
      const geometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.y = 0.8;
      this.scene.add(this.mesh);
    }
  }

  _buildActionMap() {
    for (const [action, config] of Object.entries(ANIMATION_ACTIONS)) {
      let resolved = null;
      // Try primary
      if (this.clipMap[config.primary]) {
        resolved = config.primary;
      } else {
        // Try fallbacks
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

  playAction(actionName, fade = 0.15, opts = {}) {
    const clipName = this.actionMap[actionName];
    if (!clipName || !this.mixer || !this.clipMap[clipName]) return;
    
    const action = this.mixer.clipAction(this.clipMap[clipName]);
    action.reset();
    if (opts.loop === false) action.loop = THREE.LoopOnce;
    if (opts.clampWhenFinished) action.clampWhenFinished = true;
    if (opts.timeScale) action.timeScale = opts.timeScale;
    action.fadeIn(fade).play();
    
    // Fade out others
    for (const [k, other] of Object.entries(this.clipMap)) {
      if (k !== clipName) {
        this.mixer.clipAction(other).fadeOut(fade);
      }
    }
    
    // Lock animation state for one-shot actions so they play out
    if (opts.loop === false) {
      this.animLockTimer = 0.4;
    }
  }

  playVictory() {
    this.celebrationTimer = 2.0;
    this.currentAnimState = 'victory';
    this.playAction('victory', 0.1, { loop: false, clampWhenFinished: true });
  }

  _transitionAnim(newState, fade = 0.15, opts = {}) {
    if (this.currentAnimState === newState) return;
    this.currentAnimState = newState;
    this.playAction(newState, fade, opts);
  }

  update(dt, cameraYaw, options = {}) {
    if (this.mixer) this.mixer.update(dt);
    
    // Dodge
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      this.position.addScaledVector(this.dodgeDirection, GAME.DODGE_FORCE * dt);
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      }
      this._updateMesh();
      return;
    }
    
    // Input
    const move = input.getMovementVector();
    const aiming = !!options.aiming;
    const sprinting = !aiming && input.isSprinting() && this.stamina > 0;
    const dodging = !aiming && input.isDodging() && this.stamina >= GAME.DODGE_COST;
    
    if (dodging && !this.isDodging) {
      this.isDodging = true;
      this.dodgeTimer = GAME.DODGE_DURATION;
      this.stamina -= GAME.DODGE_COST;
      
      const dodgeDir = new THREE.Vector3(move.x, 0, move.z);
      if (dodgeDir.lengthSq() < 0.01) {
        dodgeDir.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
      } else {
        dodgeDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
      }
      this.dodgeDirection.copy(dodgeDir.normalize());
      this.playAction('dodge', 0.05);
      return;
    }
    
    // Movement relative to camera yaw
    const speed = (sprinting ? GAME.PLAYER_SPRINT_SPEED : GAME.PLAYER_SPEED) * (aiming ? GAME.AIM_MOVE_MULTIPLIER : 1);
    const worldMove = new THREE.Vector3(move.x, 0, move.z);
    worldMove.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    
    this.velocity.x = worldMove.x * speed;
    this.velocity.z = worldMove.z * speed;
    
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    // Y is controlled by Game loop terrain snapping; don't zero it here
    
    // Defensive: reset if NaN somehow got in
    if (Number.isNaN(this.position.x) || Number.isNaN(this.position.z)) {
      this.position.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
      this.yaw = 0;
    }
    
    // Face aim direction while aiming, otherwise face movement direction.
    const targetYaw = aiming && typeof options.aimYaw === 'number'
      ? options.aimYaw
      : (worldMove.lengthSq() > 0.01 ? Math.atan2(worldMove.x, worldMove.z) : null);
    if (targetYaw !== null) {
      let yawDiff = targetYaw - this.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.yaw += yawDiff * Math.min(1, GAME.PLAYER_ROTATION_SPEED * dt);
    }
    
    // Stamina
    if (sprinting && (move.x !== 0 || move.z !== 0)) {
      this.stamina -= GAME.SPRINT_DRAIN * dt;
      this.stamina = Math.max(0, this.stamina);
    } else {
      this.stamina += GAME.STAMINA_REGEN * dt;
      this.stamina = Math.min(GAME.MAX_STAMINA, this.stamina);
    }
    
    // Animation state machine — only transition on state change
    // One-shot actions (toss, dodge, victory) lock the anim state briefly
    if (this.animLockTimer > 0) {
      this.animLockTimer -= dt;
    }
    if (this.celebrationTimer > 0) {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0 && this.animLockTimer <= 0) {
        this._transitionAnim('idle', 0.3);
      }
    } else if (this.animLockTimer <= 0) {
      const isMoving = worldMove.lengthSq() > 0.01;
      let nextState = 'idle';
      if (isMoving) {
        nextState = sprinting ? 'sprint' : 'walk';
      }
      this._transitionAnim(nextState, 0.15, nextState === 'sprint' ? { timeScale: 1.0 } : undefined);
    }
    
    this._updateMesh();
  }

  _updateMesh() {
    if (!this.mesh) return;
    this.mesh.position.copy(this.position);
    this.mesh.position.y += this.groundOffset || 0;
    this.mesh.rotation.y = this.yaw;
  }

  setVisible(visible) {
    if (this.mesh) this.mesh.visible = visible;
  }

  getHandPosition() {
    const pos = new THREE.Vector3().copy(this.handOffset);
    pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    pos.add(this.position);
    pos.y += this.groundOffset || 0;
    return pos;
  }

  getForwardDirection() {
    return new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
  }

  canTossOrb() {
    return true; // unlimited
  }

  tossOrb() {
    return true; // no consumption
  }

  adjustThrowPower(delta) {
    this.throwPower = Math.max(GAME.THROW_POWER_MIN, Math.min(GAME.THROW_POWER_MAX, this.throwPower + delta));
    return this.throwPower;
  }
}
