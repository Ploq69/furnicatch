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

    let didAttack = false;
    if (this.data.type === 'melee') {
      didAttack = this._meleeAttack(origin, direction, scene, audio, particles, enemies, attackerWeaponId);
    } else if (this.data.type === 'ranged') {
      didAttack = this._rangedAttack(origin, direction, scene, audio, particles, enemies);
    } else if (this.data.type === 'thrown') {
      didAttack = this._thrownAttack(origin, direction, scene, audio, particles, enemies);
    }
    if (didAttack) {
      this.cooldown = this.data.type === 'thrown' ? GAME.GRENADE_COOLDOWN : GAME.ATTACK_COOLDOWN;
    }
    return didAttack;
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
    const activeGrenades = this.projectiles.filter(p => p.explosive).length;
    if (activeGrenades >= GAME.GRENADE_MAX_ACTIVE) return false;

    const throwDir = direction.clone().normalize();
    if (throwDir.y < 0.08) throwDir.y += 0.18;
    throwDir.normalize();

    const proj = {
      mesh: null,
      velocity: throwDir.multiplyScalar(13).add(new THREE.Vector3(0, 5.5, 0)),
      life: GAME.GRENADE_FUSE,
      age: 0,
      armedAt: GAME.GRENADE_ARM_TIME,
      damage: GAME.GRENADE_DAMAGE,
      explosive: true,
      radius: GAME.GRENADE_RADIUS,
      smokeTimer: 0,
      angularVelocity: new THREE.Vector3(8 + Math.random() * 4, 10 + Math.random() * 5, 6 + Math.random() * 4),
      bounceCount: 0,
    };

    const geo = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334433, emissive: 0x112211, emissiveIntensity: 0.35 });
    proj.mesh = new THREE.Mesh(geo, mat);
    proj.mesh.position.copy(origin).add(direction.clone().multiplyScalar(0.6));
    scene.add(proj.mesh);

    this.projectiles.push(proj);

    SFXMapper.grenadeThrow();

    return true;
  }

  updateProjectiles(dt, context, particlesArg, enemiesArg, attackerWeaponId = null) {
    const scene = context?.scene || context;
    const particles = context?.particles || particlesArg;
    const enemies = context?.enemies || enemiesArg || [];
    const world = context?.world || null;
    const game = context?.game || null;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.age = (p.age || 0) + dt;

      if (p.explosive) {
        const explode = (pos) => {
          if (game?._explodeGrenade) {
            game._explodeGrenade(pos.clone(), {
              radius: p.radius,
              damage: p.damage,
              attackerWeaponId: attackerWeaponId || this.data.id,
            });
          } else {
            particles?.burst(pos, 0xff6600, 20);
            SFXMapper.explosion('large');
            for (const enemy of enemies) {
              if (enemy.dead) continue;
              if (enemy.position.distanceTo(pos) < p.radius) {
                enemy.takeDamage(p.damage, attackerWeaponId || this.data.id);
              }
            }
          }
          scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        };

        const previous = p.mesh.position.clone();
        const impactSpeed = p.velocity.length();
        p.velocity.y += GAME.GRAVITY * dt;
        const next = previous.clone().addScaledVector(p.velocity, dt);
        let collided = false;

        const terrain = world?.terrainMesh;
        const isSolid = (pos) => !!terrain?.isSolidAt(pos.x, pos.y, pos.z);
        const groundY = world?.getGroundHeightAt?.(next.x, next.z, previous.y + 0.5);

        if (Number.isFinite(groundY) && groundY > -999 && next.y <= groundY + 0.12 && p.velocity.y <= 0) {
          next.y = groundY + 0.14;
          p.velocity.y = Math.abs(p.velocity.y) * 0.42;
          p.velocity.x *= 0.72;
          p.velocity.z *= 0.72;
          collided = true;
        } else if (isSolid(next)) {
          const testX = new THREE.Vector3(previous.x, next.y, next.z);
          const testY = new THREE.Vector3(next.x, previous.y, next.z);
          const testZ = new THREE.Vector3(next.x, next.y, previous.z);
          if (!isSolid(testX)) {
            next.x = previous.x;
            p.velocity.x *= -0.48;
          } else if (!isSolid(testZ)) {
            next.z = previous.z;
            p.velocity.z *= -0.48;
          } else if (!isSolid(testY)) {
            next.y = previous.y;
            p.velocity.y *= -0.42;
          } else {
            next.copy(previous);
            p.velocity.multiplyScalar(-0.35);
          }
          p.velocity.x *= 0.82;
          p.velocity.z *= 0.82;
          collided = true;
        }

        if (collided) {
          p.bounceCount++;
          if (p.age >= p.armedAt && impactSpeed > 7) {
            explode(next);
            continue;
          }
          if (p.velocity.lengthSq() < 1.2) {
            p.velocity.set(0, 0, 0);
          }
        }

        p.mesh.position.copy(next);
        p.mesh.rotation.x += p.angularVelocity.x * dt;
        p.mesh.rotation.y += p.angularVelocity.y * dt;
        p.mesh.rotation.z += p.angularVelocity.z * dt;
        p.angularVelocity.multiplyScalar(Math.max(0.2, 1 - dt * 0.55));

        p.smokeTimer -= dt;
        if (p.smokeTimer <= 0) {
          p.smokeTimer = 0.08;
          particles?.spawn({ pos: p.mesh.position, count: 1, color: 0x808070, speed: 0.5, life: 0.35, size: 0.18, texture: 'smoke' });
        }

        const blinkWindow = Math.max(0, 0.75 - p.life);
        const mat = p.mesh.material;
        if (mat?.emissive && blinkWindow > 0) {
          const blink = Math.sin((0.75 - p.life) * 42) > 0 ? 1.4 : 0.3;
          mat.emissive.setHex(0xff5522);
          mat.emissiveIntensity = blink;
        }
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);
      }

      if (p.life <= 0) {
        // Explode or remove
        if (p.explosive) {
          if (game?._explodeGrenade) {
            game._explodeGrenade(p.mesh.position.clone(), {
              radius: p.radius,
              damage: p.damage,
              attackerWeaponId: attackerWeaponId || this.data.id,
            });
          } else {
            particles?.burst(p.mesh.position, 0xff6600, 20);
            SFXMapper.explosion('large');
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
