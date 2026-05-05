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

export class Furniture {
  constructor(scene, vocabEntry, position, options = {}) {
    this.scene = scene;
    this.vocab = vocabEntry;
    this.tier = FURNITURE_TIERS[vocabEntry.tier] || FURNITURE_TIERS.common;
    this.level = options.level || 1;
    this.variant = options.variant || (Math.random() < 0.025 ? 'shiny' : 'normal');
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
    this.detectionRadius = 6;
    this.fleeSpeed = 2.5;
    this.idleSpeed = 0.4;
    
    this.mesh = null;
    this.hitbox = new THREE.Sphere(position.clone(), 0.6);
    this.active = true;
    this.container = null;
    this._loadModel();
  }

  async _loadModel() {
    const path = `${ASSETS.furniturePrefix}${this.vocab.model}.obj`;
    try {
      const obj = await assetLoader.loadOBJ(path);
      this.mesh = obj.clone(true);
      this._applyMaterials();
      
      // Compute bounding box to normalize scale
      const box = new THREE.Box3().setFromObject(this.mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 1.2; // normalize to ~1.2 units
      const s = targetSize / maxDim;
      this.mesh.scale.setScalar(s);
      
      // Center the mesh vertically
      const center = new THREE.Vector3();
      box.getCenter(center);
      this.mesh.position.set(
        -center.x * s,
        -box.min.y * s,
        -center.z * s
      );
      
      // Create a container for world positioning
      this.container = new THREE.Group();
      this.container.add(this.mesh);
      this.container.position.copy(this.position);
      this.scene.add(this.container);
      
      // Add a subtle glow light for rare+
      if (this.tier !== FURNITURE_TIERS.common) {
        const light = new THREE.PointLight(this.tier.color, 0.5, 3);
        light.position.y = 0.8;
        this.container.add(light);
      }
      if (this.level > 1 || this.variant === 'shiny') {
        const lightColor = this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color;
        const levelLight = new THREE.PointLight(lightColor, this.variant === 'shiny' ? 0.7 : 0.35, 2.6);
        levelLight.position.y = 0.9;
        this.container.add(levelLight);
      }
    } catch (err) {
      console.error('Failed to load furniture:', this.vocab.model, err);
      // Fallback: colored box
      const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color });
      this.mesh = new THREE.Mesh(geometry, material);
      this.container = new THREE.Group();
      this.container.add(this.mesh);
      this.container.position.copy(this.position);
      this.scene.add(this.container);
    }
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
    
    // Container may have been nulled during capture — guard before touching it
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
    // Reset scale
    this.container.scale.setScalar(1);
    this.container.rotation.z = 0;
    
    // Gentle bobbing
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + Math.sin(t * 2 + this.bobOffset) * 0.05;
    this.container.rotation.y = Math.sin(t * 0.5 + this.bobOffset) * 0.1;
    
    // Random wander
    this.hopPhase += dt * 2;
    if (this.hopPhase > Math.PI * 2) {
      this.hopPhase = 0;
      // Pick new wander direction
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.idleSpeed;
      this.velocity.z = Math.sin(angle) * this.idleSpeed;
    }
    
    const nextPos = this.position.clone().addScaledVector(this.velocity, dt);
    if (nextPos.distanceTo(this.homePosition) < 4) {
      this.position.copy(nextPos);
    }
    
    // Detect player
    if (distToPlayer < this.detectionRadius) {
      this.state = STATES.ALERT;
      this.alertTimer = 0.8;
      this.velocity.set(0, 0, 0);
    }
  }

  _updateAlert(dt, distToPlayer) {
    this.alertTimer -= dt;
    // Wiggle
    const t = performance.now() * 0.001;
    this.container.rotation.z = Math.sin(t * 20) * 0.1;
    this.container.scale.setScalar(1 + Math.sin(t * 15) * 0.05);
    
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
    // Run away from player
    const away = new THREE.Vector3().subVectors(this.position, playerPosition);
    away.y = 0;
    away.normalize();
    this.position.addScaledVector(away, this.fleeSpeed * dt);
    
    // Hop animation
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + Math.abs(Math.sin(t * 12)) * 0.3;
    this.container.rotation.y = Math.atan2(away.x, away.z);
    
    if (distToPlayer > this.detectionRadius * 2.5) {
      this.state = STATES.IDLE;
    }
  }

  _updateTrapped(dt) {
    // Pulsing glow, spinning
    const t = performance.now() * 0.001;
    this.container.rotation.y += dt * 3;
    this.container.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
  }

  _updateCaptured(dt) {
    // Shrink and rise
    this.scale -= dt * 1.5;
    this.container.scale.setScalar(Math.max(0.01, this.scale));
    this.position.y += dt * 2;
    this.container.rotation.y += dt * 10;
    
    if (this.scale <= 0.01) {
      this.active = false;
      // Don't null the container here — let World.update()'s filter call dispose()
      // to avoid a race where update() touches container after it's gone
    }
  }

  _updateEscaped(dt) {
    // Dash away quickly
    this.position.addScaledVector(this.velocity, dt);
    this.container.position.copy(this.position);
    this.container.position.y = this.position.y + Math.abs(Math.sin(performance.now() * 0.012)) * 0.3;
    
    if (this.position.distanceTo(this.homePosition) > 8) {
      this.state = STATES.IDLE;
      this.velocity.set(0, 0, 0);
    }
  }

  onOrbHit(orbTier, context = {}) {
    if (this.state !== STATES.IDLE && this.state !== STATES.ALERT && this.state !== STATES.FLEE) return false;
    
    // Calculate catch rate
    let rate = this.tier.catchRate;
    const distance = context.distance ?? 8;
    const distanceBonus = Math.max(0, 0.18 - distance * 0.012);
    const stateBonus = this.state === STATES.IDLE ? 0.16 : this.state === STATES.ALERT ? 0.08 : -0.04;
    if (orbTier === 'iron') rate += 0.1;
    if (orbTier === 'gold') rate += 0.2;
    if (orbTier === 'diamond') rate += 0.3;
    rate += distanceBonus + stateBonus;
    rate -= this.levelConfig.catchPenalty || 0;
    if (this.variant === 'shiny') rate -= 0.08;
    rate = Math.max(0.05, Math.min(0.95, rate));
    
    if (Math.random() < rate) {
      this.state = STATES.TRAPPED;
      this.velocity.set(0, 0, 0);
      return 'trapped';
    } else {
      this.state = STATES.ESCAPED;
      // Dash away
      const angle = Math.random() * Math.PI * 2;
      this.velocity.set(Math.cos(angle) * 8, 0, Math.sin(angle) * 8);
      return 'escaped';
    }
  }

  capture() {
    this.state = STATES.CAPTURED;
    this.scale = 1;
  }

  failCapture() {
    this.state = STATES.ESCAPED;
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * 8, 0, Math.sin(angle) * 8);
  }

  _removeFromScene() {
    if (this.container) {
      this.scene.remove(this.container);
      this.container.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose?.();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose?.());
          } else {
            child.material.dispose?.();
          }
        }
      });
      this.container = null;
    }
  }

  dispose() {
    this._removeFromScene();
  }

  _applyMaterials() {
    if (!this.mesh) return;
    const accent = new THREE.Color(this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color);
    const rarity = new THREE.Color(this.tier.color);
    this.mesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = materials.map((mat, index) => {
        const next = mat.clone();
        const baseColor = next.color ? next.color.clone() : new THREE.Color(0x9ca3af);
        const mixAmount = this.variant === 'shiny' ? 0.52 : Math.min(0.48, 0.12 + this.level * 0.07);
        next.color = baseColor.lerp(accent, mixAmount);
        if (index % 3 === 0 && next.emissive) {
          next.emissive = rarity.clone();
          next.emissiveIntensity = this.variant === 'shiny' ? 0.18 : Math.max(0, (this.level - 1) * 0.035);
        }
        next.roughness = next.roughness ?? 0.55;
        return next;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
    });
  }
}
