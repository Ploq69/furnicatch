import * as THREE from 'three';
import { GAME } from './constants.js';

export class Orb {
  constructor(scene, startPos, directionOrVelocity, tier = 'wood', speed = GAME.ORB_SPEED, options = {}) {
    this.scene = scene;
    this.tier = tier;
    this.life = GAME.ORB_LIFETIME;
    this.active = true;
    this.hitSomething = false;
    this.age = 0;

    const colors = {
      wood: 0x8b5a2b,
      iron: 0xb0b0b0,
      gold: 0xffd700,
      diamond: 0x00ffff,
    };
    const color = colors[tier] || colors.wood;

    // Orb mesh
    const geometry = new THREE.IcosahedronGeometry(GAME.ORB_RADIUS, 1);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: tier === 'diamond' ? 1.5 : tier === 'gold' ? 0.8 : 0.3,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(startPos);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    // Point light
    this.light = new THREE.PointLight(color, tier === 'diamond' ? 2 : 1, 4);
    this.light.position.copy(startPos);
    this.scene.add(this.light);

    // Physics
    this.gravityScale = options.gravityScale ?? GAME.ORB_GRAVITY_SCALE;
    this.velocity = options.isVelocity
      ? directionOrVelocity.clone()
      : directionOrVelocity.clone().normalize().multiplyScalar(speed);
    this.homingTarget = options.homingTarget || null;
    this.homingEntity = options.homingEntity || null;
    this.homingStrength = options.homingStrength ?? 0;
    this.maxTurnRate = options.maxTurnRate ?? 12;
    this.snapRadius = options.snapRadius ?? 0;
    this.assistRadiusBonus = options.assistRadiusBonus ?? 0;
    this.homingDelay = options.homingDelay ?? 0.12;
    if (!options.isVelocity) {
      this.velocity.y += 2;
    }
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      return;
    }

    // Gravity arc
    this.velocity.y += GAME.GRAVITY * dt * this.gravityScale;
    this.age += dt;

    if (this.homingTarget && this.age >= this.homingDelay && this.homingStrength > 0) {
      const target = this.homingEntity?.getCatchPoint?.() || this.homingTarget;
      const toTarget = new THREE.Vector3().subVectors(target, this.mesh.position);
      const distance = toTarget.length();
      if (distance > 0.001) {
        const speed = Math.max(this.velocity.length(), 6);
        const desired = toTarget.multiplyScalar(1 / distance).multiplyScalar(speed);
        const turn = Math.min(1, this.maxTurnRate * dt);
        const assist = distance < 6 ? this.homingStrength : this.homingStrength * 0.65;
        this.velocity.lerp(desired, Math.min(1, turn * assist * 0.12));
        if (distance < this.snapRadius) {
          this.mesh.position.copy(target);
          this.light.position.copy(target);
        }
      }
    }

    this.mesh.position.addScaledVector(this.velocity, dt);
    this.mesh.rotation.x += 10 * dt;
    this.mesh.rotation.z += 8 * dt;
    this.light.position.copy(this.mesh.position);
    
    // Ground collision
    if (this.mesh.position.y < 0) {
      this.destroy();
    }
  }

  getPosition() {
    return this.mesh.position;
  }

  destroy() {
    this.active = false;
    this.scene.remove(this.mesh);
    this.scene.remove(this.light);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
