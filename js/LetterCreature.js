import * as THREE from 'three';
import { FURNITURE_LEVELS } from './constants.js';
import { glyph3D } from './Glyph3DManager.js';

const STATES = {
  IDLE: 'idle',
  ALERT: 'alert',
  FLEE: 'flee',
  TRAPPED: 'trapped',
  CAPTURED: 'captured',
  ESCAPED: 'escaped',
};

const LETTER_TIER = {
  catchRate: 0.42,
  reward: 14,
  color: '#facc15',
};

export class LetterCreature {
  constructor(scene, letter, position, options = {}) {
    this.scene = scene;
    this.entityType = 'letter';
    this.letter = String(letter || 'A').toUpperCase();
    this.tier = LETTER_TIER;
    this.level = options.level || 1;
    this.variant = options.variant || (Math.random() < 0.02 ? 'shiny' : 'normal');
    this.levelConfig = FURNITURE_LEVELS.find(item => item.level === this.level) || FURNITURE_LEVELS[0];
    this.state = STATES.IDLE;
    this.position = position.clone();
    this.homePosition = position.clone();
    this.velocity = new THREE.Vector3();
    this.lastPlayerPosition = position.clone();
    this.alertTimer = 0;
    this.scale = 1;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.hopPhase = Math.random() * Math.PI * 2;
    this.detectionRadius = 7;
    this.fleeSpeed = 3.0;
    this.idleSpeed = 0.55;
    this.hitbox = new THREE.Sphere(position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0.65);
    this.active = true;
    this.container = null;
    this.mesh = null;
    this._loadModel();
  }

  async _loadModel() {
    await glyph3D.load();
    const glyph = glyph3D.createGlyph(this.letter, this.variant === 'shiny' ? 'reward' : 'typed');
    this.container = new THREE.Group();
    this.container.position.copy(this.position);

    if (glyph) {
      this.mesh = glyph;
      this.mesh.scale.multiplyScalar(1.05);
      this.mesh.position.y = 0.1;
      glyph3D.applyStyle(this.mesh, this.variant === 'shiny' ? 'reward' : this._styleForLevel());
      this.container.add(this.mesh);
    } else {
      console.warn(`Letter glyph ${this.letter} was not found; using fallback box.`);
      const mat = new THREE.MeshStandardMaterial({ color: this.levelConfig.color, emissive: this.levelConfig.color, emissiveIntensity: 0.3 });
      this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.16), mat);
      this.mesh.position.y = 0.6;
      this.container.add(this.mesh);
    }

    const halo = new THREE.PointLight(this.variant === 'shiny' ? 0xffd166 : this.levelConfig.color, this.variant === 'shiny' ? 0.75 : 0.45, 3.2);
    halo.position.y = 1.0;
    this.container.add(halo);
    this.scene.add(this.container);
  }

  update(dt, playerPosition) {
    if (!this.container) return;
    this.lastPlayerPosition.copy(playerPosition);
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
    this.hitbox.center.set(this.position.x, this.container.position.y + 0.75, this.position.z);
    this.hitbox.radius = 0.62 * this.scale;
  }

  onOrbHit(orbTier, context = {}) {
    if (!this.isCatchable()) return false;
    let rate = this.tier.catchRate;
    const distance = context.distance ?? 8;
    const distanceBonus = Math.max(0, 0.16 - distance * 0.012);
    const stateBonus = this.state === STATES.IDLE ? 0.14 : this.state === STATES.ALERT ? 0.07 : -0.04;
    if (orbTier === 'iron') rate += 0.1;
    if (orbTier === 'gold') rate += 0.2;
    if (orbTier === 'diamond') rate += 0.3;
    rate += distanceBonus + stateBonus;
    rate -= (this.levelConfig.catchPenalty || 0) * 0.75;
    if (this.variant === 'shiny') rate -= 0.06;
    rate = Math.max(0.08, Math.min(0.95, rate));

    if (Math.random() < rate) {
      this.state = STATES.TRAPPED;
      this.velocity.set(0, 0, 0);
      return 'trapped';
    }

    this.state = STATES.ESCAPED;
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * 8, 0, Math.sin(angle) * 8);
    return 'escaped';
  }

  isCatchable() {
    return this.state === STATES.IDLE || this.state === STATES.ALERT || this.state === STATES.FLEE;
  }

  getCatchPoint() {
    const point = this.hitbox.center.clone();
    point.y = Math.max(0.75, point.y);
    return point;
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

  dispose() {
    if (!this.container) return;
    this.scene.remove(this.container);
    this.container.traverse((child) => {
      if (child.isMesh) {
        if (child.material) child.material.dispose?.();
      }
    });
    this.container = null;
  }

  _updateIdle(dt, distToPlayer) {
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + 0.5 + Math.sin(t * 2.4 + this.bobOffset) * 0.16;
    this._facePlayer(Math.sin(t * 0.8 + this.bobOffset) * 0.12);
    this.container.rotation.z = Math.sin(t * 1.8 + this.bobOffset) * 0.05;
    this.container.scale.setScalar(1);

    this.hopPhase += dt * 1.7;
    if (this.hopPhase > Math.PI * 2) {
      this.hopPhase = 0;
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.idleSpeed;
      this.velocity.z = Math.sin(angle) * this.idleSpeed;
    }
    const nextPos = this.position.clone().addScaledVector(this.velocity, dt);
    if (nextPos.distanceTo(this.homePosition) < 5) this.position.copy(nextPos);

    if (distToPlayer < this.detectionRadius) {
      this.state = STATES.ALERT;
      this.alertTimer = 0.7;
      this.velocity.set(0, 0, 0);
    }
  }

  _updateAlert(dt, distToPlayer) {
    this.alertTimer -= dt;
    const t = performance.now() * 0.001;
    this._facePlayer(Math.sin(t * 20) * 0.08);
    this.container.rotation.z = Math.sin(t * 24) * 0.16;
    this.container.scale.setScalar(1 + Math.sin(t * 18) * 0.08);
    if (this.alertTimer <= 0) {
      this.state = distToPlayer < this.detectionRadius * 0.6 ? STATES.FLEE : STATES.IDLE;
    }
  }

  _updateFlee(dt, distToPlayer, playerPosition) {
    const away = new THREE.Vector3().subVectors(this.position, playerPosition);
    away.y = 0;
    away.normalize();
    this.position.addScaledVector(away, this.fleeSpeed * dt);
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + 0.5 + Math.abs(Math.sin(t * 12)) * 0.45;
    this._facePlayer(Math.sin(t * 14) * 0.1);
    if (distToPlayer > this.detectionRadius * 2.5) this.state = STATES.IDLE;
  }

  _updateTrapped(dt) {
    const t = performance.now() * 0.001;
    this.container.position.y = this.position.y + 0.7 + Math.sin(t * 8) * 0.08;
    this._facePlayer(Math.sin(t * 10) * 0.16);
    this.container.scale.setScalar(1 + Math.sin(t * 10) * 0.12);
  }

  _updateCaptured(dt) {
    this.scale -= dt * 1.65;
    this.container.scale.setScalar(Math.max(0.01, this.scale));
    this.position.y += dt * 2.2;
    this.container.rotation.y += dt * 12;
    if (this.scale <= 0.01) this.active = false;
  }

  _updateEscaped(dt) {
    this.position.addScaledVector(this.velocity, dt);
    this.container.position.copy(this.position);
    this.container.position.y = this.position.y + 0.6 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.4;
    if (this.position.distanceTo(this.homePosition) > 9) {
      this.state = STATES.IDLE;
      this.velocity.set(0, 0, 0);
    }
  }

  _styleForLevel() {
    if (this.level >= 5) return 'reward';
    if (this.level >= 4) return 'level';
    if (this.level >= 3) return 'combo';
    if (this.level >= 2) return 'correct';
    return 'typed';
  }

  _facePlayer(wobble = 0) {
    const toPlayer = new THREE.Vector3().subVectors(this.lastPlayerPosition, this.position);
    toPlayer.y = 0;
    if (toPlayer.lengthSq() < 0.0001) return;
    this.container.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) + wobble;
  }
}
