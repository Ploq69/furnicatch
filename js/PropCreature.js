import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { FURNITURE_TIERS, FURNITURE_LEVELS, ASSETS } from './constants.js';

const STATES = {
  IDLE: 'idle',
  ALERT: 'alert',
  FLEE: 'flee',
  TRAPPED: 'trapped',
  CAPTURED: 'captured',
  ESCAPED: 'escaped',
};

const PROP_TIER = {
  catchRate: 0.48,
  reward: 12,
  color: '#4ade80',
};

export class PropCreature {
  constructor(scene, propConfig, position, options = {}) {
    this.scene = scene;
    this.entityType = 'prop';
    this.propKey = propConfig.key;
    this.word = propConfig.word;
    this.ttsWord = propConfig.ttsWord || propConfig.word;
    this.biome = propConfig.biome || 'farm_garden';
    this.resourceDrops = propConfig.resourceDrops || [];
    this.collectionKey = propConfig.word;
    this.assetKey = options.assetOverride || propConfig.asset;
    this.assetPath = propConfig.assetPath || null;
    this.tier = PROP_TIER;
    this.level = options.level || 1;
    this.variant = options.variant || (Math.random() < 0.02 ? 'shiny' : 'normal');
    this.levelConfig = FURNITURE_LEVELS.find(item => item.level === this.level) || FURNITURE_LEVELS[0];
    this.state = STATES.IDLE;
    this.position = position.clone();
    this.homePosition = position.clone();
    this.velocity = new THREE.Vector3();
    this.alertTimer = 0;
    this.trappedTimer = 0;
    this.scale = 1;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.hopPhase = Math.random() * Math.PI * 2;
    this.detectionRadius = 5;
    this.fleeSpeed = 1.2;
    this.idleSpeed = 0.25;
    this.hitbox = new THREE.Sphere(position.clone(), 0.55);
    this.active = true;
    this.container = null;
    this.mesh = null;
    this._loadModel();
  }

  async _loadModel() {
    const path = this.assetPath || ASSETS.environment[this.assetKey];
    if (!path) {
      console.warn('Prop asset not found:', this.assetKey);
      this._fallback();
      return;
    }
    try {
      const lower = path.toLowerCase();
      if (lower.endsWith('.obj')) {
        const obj = await assetLoader.loadOBJ(path);
        this.mesh = obj.clone(true);
      } else {
        const gltf = await assetLoader.loadGLTF(path);
        this.mesh = gltf.scene.clone(true);
      }
      this._normalizeMesh();
      this._applyMaterials();
      this.container = new THREE.Group();
      this.container.add(this.mesh);
      this.container.position.copy(this.position);
      this.scene.add(this.container);

      const halo = new THREE.PointLight(this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color, this.variant === 'shiny' ? 0.6 : 0.35, 2.6);
      halo.position.y = 0.8;
      this.container.add(halo);
    } catch (err) {
      console.error('Failed to load prop:', this.assetKey, err);
      this._fallback();
    }
  }

  _normalizeMesh() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 1.0;
    const s = targetSize / maxDim;
    this.mesh.scale.setScalar(s);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.mesh.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }

  _fallback() {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: this.levelConfig.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.container = new THREE.Group();
    this.container.add(this.mesh);
    this.container.position.copy(this.position);
    this.scene.add(this.container);
  }

  update(dt, playerPosition) {
    if (!this.container) return;
    const distToPlayer = this.position.distanceTo(playerPosition);
    switch (this.state) {
      case STATES.IDLE:
        this._updateIdle(dt, distToPlayer, playerPosition);
        break;
      case STATES.ALERT:
        this._updateAlert(dt, distToPlayer);
        break;
      case STATES.FLEE:
        this._updateFlee(dt, distToPlayer, playerPosition);
        break;
      case STATES.TRAPPED:
        this._updateTrapped(dt);
        break;
      case STATES.CAPTURED:
        this._updateCaptured(dt);
        break;
      case STATES.ESCAPED:
        this._updateEscaped(dt);
        break;
    }
    if (!this.container) return;
    this.container.position.x = this.position.x;
    this.container.position.z = this.position.z;
    this.hitbox.center.x = this.position.x;
    this.hitbox.center.z = this.position.z;
    this.hitbox.center.y = this.container.position.y;
    this.hitbox.radius = 0.5 * this.scale;
  }

  isCatchable() {
    return this.state === STATES.IDLE || this.state === STATES.ALERT || this.state === STATES.FLEE;
  }

  getCatchPoint() {
    const point = this.hitbox.center.clone();
    point.y = Math.max(0.35, point.y + this.hitbox.radius * 0.35);
    return point;
  }

  _updateIdle(dt, distToPlayer, playerPosition) {
    this.container.scale.setScalar(1);
    this.container.rotation.z = 0;
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + Math.sin(t * 1.8 + this.bobOffset) * 0.04;
    this.container.rotation.y = Math.sin(t * 0.4 + this.bobOffset) * 0.08;

    this.hopPhase += dt * 1.4;
    if (this.hopPhase > Math.PI * 2) {
      this.hopPhase = 0;
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.idleSpeed;
      this.velocity.z = Math.sin(angle) * this.idleSpeed;
    }
    const nextPos = this.position.clone().addScaledVector(this.velocity, dt);
    if (nextPos.distanceTo(this.homePosition) < 3) {
      this.position.copy(nextPos);
    }

    if (distToPlayer < this.detectionRadius) {
      this.state = STATES.ALERT;
      this.alertTimer = 1.0;
      this.velocity.set(0, 0, 0);
    }
  }

  _updateAlert(dt, distToPlayer) {
    this.alertTimer -= dt;
    const t = performance.now() * 0.001;
    this.container.rotation.z = Math.sin(t * 16) * 0.08;
    this.container.scale.setScalar(1 + Math.sin(t * 12) * 0.04);
    if (this.alertTimer <= 0) {
      if (distToPlayer < this.detectionRadius * 0.6) {
        this.state = STATES.FLEE;
      } else {
        this.state = STATES.IDLE;
        this.container.rotation.z = 0;
        this.container.scale.setScalar(1);
      }
    }
  }

  _updateFlee(dt, distToPlayer, playerPosition) {
    const away = new THREE.Vector3().subVectors(this.position, playerPosition);
    away.y = 0;
    away.normalize();
    this.position.addScaledVector(away, this.fleeSpeed * dt);
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + Math.abs(Math.sin(t * 10)) * 0.2;
    this.container.rotation.y = Math.atan2(away.x, away.z);
    if (distToPlayer > this.detectionRadius * 2.5) {
      this.state = STATES.IDLE;
    }
  }

  _updateTrapped(dt) {
    const t = performance.now() * 0.001;
    this.container.rotation.y += dt * 2.5;
    this.container.scale.setScalar(1 + Math.sin(t * 7) * 0.07);
  }

  _updateCaptured(dt) {
    this.scale -= dt * 1.4;
    this.container.scale.setScalar(Math.max(0.01, this.scale));
    this.position.y += dt * 1.8;
    this.container.rotation.y += dt * 8;
    if (this.scale <= 0.01) this.active = false;
  }

  _updateEscaped(dt) {
    this.position.addScaledVector(this.velocity, dt);
    this.container.position.copy(this.position);
    this.container.position.y = this.position.y + Math.abs(Math.sin(performance.now() * 0.012)) * 0.25;
    if (this.position.distanceTo(this.homePosition) > 7) {
      this.state = STATES.IDLE;
      this.velocity.set(0, 0, 0);
    }
  }

  onOrbHit(orbTier, context = {}) {
    if (!this.isCatchable()) return false;
    let rate = this.tier.catchRate;
    const distance = context.distance ?? 8;
    const distanceBonus = Math.max(0, 0.18 - distance * 0.012);
    const stateBonus = this.state === STATES.IDLE ? 0.16 : this.state === STATES.ALERT ? 0.08 : -0.04;
    if (orbTier === 'iron') rate += 0.1;
    if (orbTier === 'gold') rate += 0.2;
    if (orbTier === 'diamond') rate += 0.3;
    rate += distanceBonus + stateBonus;
    rate -= (this.levelConfig.catchPenalty || 0) * 0.5;
    if (this.variant === 'shiny') rate -= 0.06;
    rate = Math.max(0.08, Math.min(0.95, rate));

    if (Math.random() < rate) {
      this.state = STATES.TRAPPED;
      this.velocity.set(0, 0, 0);
      return 'trapped';
    }
    this.state = STATES.ESCAPED;
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * 6, 0, Math.sin(angle) * 6);
    return 'escaped';
  }

  capture() {
    this.state = STATES.CAPTURED;
    this.scale = 1;
  }

  failCapture() {
    this.state = STATES.ESCAPED;
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * 6, 0, Math.sin(angle) * 6);
  }

  dispose() {
    if (!this.container) return;
    this.scene.remove(this.container);
    this.container.traverse((child) => {
      if (child.isMesh) {
        if (child.material) child.material.dispose?.();
        if (child.geometry) child.geometry.dispose?.();
      }
    });
    this.container = null;
  }

  _applyMaterials() {
    if (!this.mesh) return;
    const accent = new THREE.Color(this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color);
    this.mesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = materials.map((mat) => {
        const next = mat.clone();
        const baseColor = next.color ? next.color.clone() : new THREE.Color(0x9ca3af);
        const mixAmount = this.variant === 'shiny' ? 0.42 : Math.min(0.38, 0.08 + this.level * 0.06);
        next.color = baseColor.lerp(accent, mixAmount);
        next.roughness = next.roughness ?? 0.6;
        return next;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
    });
  }
}
