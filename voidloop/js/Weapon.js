import * as THREE from 'three';
import { WEAPONS, GAME } from './constants.js';
import { assetLoader } from './AssetLoader.js';
import { SFXMapper } from './SFXMapper.js';

// Per-weapon hand calibration (local space relative to Fist.R)
const HAND_CONFIG = {
  pickaxe: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
  sword:   { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
  pistol:  { scale: 0.2,  x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0 },
  grenade: { scale: 0.15, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
};

export class Weapon {
  constructor(weaponId) {
    this.data = WEAPONS.find(w => w.id === weaponId) || WEAPONS[0];
    this.mesh = null;
    this.cooldown = 0;
    this.projectiles = [];
  }

  async equip(parentGroup) {
    if (!this.data.model) return;
    try {
      const cloned = assetLoader.cloneModel(this.data.model);
      if (cloned) {
        this.mesh = cloned.scene;
        const cfg = HAND_CONFIG[this.data.id] || { scale: 0.3 };
        this.mesh.position.set(cfg.x || 0, cfg.y || 0, cfg.z || 0);
        this.mesh.rotation.set(cfg.rx || 0, cfg.ry || 0, cfg.rz || 0);
        this.mesh.scale.setScalar(cfg.scale || 0.3);
        parentGroup.add(this.mesh);
      }
    } catch (e) {
      console.warn('[Weapon] Failed to equip', this.data.id, e);
      // Create procedural fallback
      const geo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      this.mesh = new THREE.Mesh(geo, mat);
      parentGroup.add(this.mesh);
    }
  }

  unequip() {
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.mesh = null;
    }
  }

  attack(origin, direction, scene, audio, particles, enemies, attackerWeaponId = null) {
    if (this.cooldown > 0) return false;
    this.cooldown = GAME.ATTACK_COOLDOWN;

    if (this.data.type === 'melee') {
      return this._meleeAttack(origin, direction, scene, audio, particles, enemies, attackerWeaponId);
    } else if (this.data.type === 'ranged') {
      return this._rangedAttack(origin, direction, scene, audio, particles, enemies);
    } else if (this.data.type === 'thrown') {
      return this._thrownAttack(origin, direction, scene, audio, particles, enemies);
    }
    return false;
  }

  _meleeAttack(origin, direction, scene, audio, particles, enemies, attackerWeaponId = null) {
    // Arc hitbox: sphere sweep in front of player
    const arcCenter = origin.clone().add(direction.clone().multiplyScalar(1.5));
    arcCenter.y += 0.5;
    const arcRadius = 1.2;

    // Check enemy hits
    let hit = false;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = enemy.position.distanceTo(arcCenter);
      if (dist < arcRadius) {
        enemy.takeDamage(this.data.damage, attackerWeaponId || this.data.id);
        hit = true;
        // VFX at hit point
        const hitPos = enemy.position.clone();
        hitPos.y += 0.8;
        particles.burst(hitPos, 0xff4444, 6);
      }
    }

    // Play SFX
    SFXMapper.meleeSwing(this.data.id);
    if (hit) SFXMapper.meleeHit();

    return hit;
  }

  _rangedAttack(origin, direction, scene, audio, particles, enemies) {
    const proj = {
      mesh: null,
      velocity: direction.clone().multiplyScalar(GAME.PROJECTILE_SPEED),
      life: GAME.PROJECTILE_LIFETIME,
      damage: this.data.damage,
    };

    // Create projectile mesh
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    proj.mesh = new THREE.Mesh(geo, mat);
    proj.mesh.position.copy(origin).add(direction.clone().multiplyScalar(0.5));
    scene.add(proj.mesh);

    // Muzzle flash
    const muzzlePos = origin.clone().add(direction.clone().multiplyScalar(0.6));
    particles.spark(muzzlePos, 5);

    this.projectiles.push(proj);

    SFXMapper.gunShot(this.data.id);

    return true;
  }

  _thrownAttack(origin, direction, scene, audio, particles, enemies) {
    const proj = {
      mesh: null,
      velocity: direction.clone().multiplyScalar(10).add(new THREE.Vector3(0, 5, 0)),
      life: 2,
      damage: this.data.damage,
      explosive: true,
      radius: 2.5,
    };

    const geo = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334433, emissive: 0x112211 });
    proj.mesh = new THREE.Mesh(geo, mat);
    proj.mesh.position.copy(origin).add(direction.clone().multiplyScalar(0.5));
    scene.add(proj.mesh);

    this.projectiles.push(proj);

    SFXMapper.grenadeThrow();

    return true;
  }

  updateProjectiles(dt, scene, particles, enemies, attackerWeaponId = null) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      if (p.explosive) {
        p.velocity.y -= GAME.GRAVITY * -0.5 * dt;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);

      // Ground collision for thrown
      if (p.explosive && p.mesh.position.y < 0.1) {
        p.life = 0;
      }

      if (p.life <= 0) {
        // Explode or remove
        if (p.explosive) {
          particles.burst(p.mesh.position, 0xff6600, 20);
          SFXMapper.explosion('large');
          // AoE damage
          for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (enemy.position.distanceTo(p.mesh.position) < p.radius) {
              enemy.takeDamage(p.damage, attackerWeaponId || this.data.id);
            }
          }
        }
        scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Direct hit check for non-explosive
      if (!p.explosive) {
        for (const enemy of enemies) {
          if (enemy.dead) continue;
          if (p.mesh.position.distanceTo(enemy.position) < 0.6) {
            enemy.takeDamage(p.damage, attackerWeaponId || this.data.id);
            particles.burst(p.mesh.position, 0xffaa00, 4);
            scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }
}
