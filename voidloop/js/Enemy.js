import * as THREE from 'three';
import { ENEMY_TYPES, GAME } from './constants.js';
import { assetLoader } from './AssetLoader.js';
import { SFXMapper } from './SFXMapper.js';

const STATES = { IDLE: 0, CHASE: 1, ATTACK: 2, DEAD: 3 };

export class Enemy {
  constructor(typeKey, x, z) {
    this.typeKey = typeKey;
    this.def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;
    this.state = STATES.IDLE;
    this.position = new THREE.Vector3(x, 0, z);
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.dead = false;
    this.justDied = false;
    this.mesh = null;
    this.mixer = null;
    this.animations = null;
    this.velocity = new THREE.Vector3();
    this.attackCooldown = 0;
    this.animLockTimer = 0;
    this.groundOffset = 0;
    this.proceduralTime = 0;
    this.proceduralAnim = 'idle';
    this.proceduralData = {};
    this.baseScale = 1;
    this.currentAnim = null;

    // HP bar
    this.hpBarGroup = null;
    this.hpBarBg = null;
    this.hpBarFill = null;
  }

  async spawn(scene) {
    try {
      const gltf = await assetLoader.loadGLTF(this.def.model);
      if (!gltf || !gltf.scene) throw new Error('GLTF empty');

      this.mesh = gltf.scene;

      // Calibration
      const box = new THREE.Box3().setFromObject(this.mesh);
      const height = box.max.y - box.min.y;
      const targetHeight = this.def.scale || 1.0;
      const scale = targetHeight / height;
      this.mesh.scale.setScalar(scale);
      this.mesh.updateMatrixWorld(true);
      this.baseScale = scale;

      const box2 = new THREE.Box3().setFromObject(this.mesh);
      this.groundOffset = -box2.min.y;

      scene.add(this.mesh);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = gltf.animations;
        this.playAnim('idle');
      }
    } catch (e) {
      // Fallback
      const geo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.groundOffset = 0.4;
      this.baseScale = 1;
      scene.add(this.mesh);
    }

    this._createHPBar();
  }

  _createHPBar() {
    const group = new THREE.Group();

    // Background
    const bgGeo = new THREE.PlaneGeometry(1, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    group.add(this.hpBarBg);

    // Fill
    const fillGeo = new THREE.PlaneGeometry(1, 0.12);
    fillGeo.translate(0.5, 0, 0); // pivot left
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    this.hpBarFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpBarFill.position.x = -0.5;
    group.add(this.hpBarFill);

    group.position.y = (this.def.scale || 1.0) + 0.3;
    this.hpBarGroup = group;
    this.mesh.add(group);
  }

  _updateHPBar() {
    if (!this.hpBarFill) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.scale.x = ratio;
    this.hpBarFill.material.color.setHex(
      ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444
    );
  }

  _resolveAnimName(name) {
    const map = this.def.animMap || {};
    const mapped = map[name.toLowerCase()];
    if (mapped) return mapped;
    // Fallback: try direct substring match
    return name;
  }

  _findClip(name) {
    if (!this.animations) return null;
    const resolved = this._resolveAnimName(name);
    return this.animations.find(a => a.name.toLowerCase().includes(resolved.toLowerCase()));
  }

  playAnim(name, lockDuration = 0) {
    const key = name.toLowerCase();
    this.proceduralAnim = key;

    // Guard: don't restart same animation
    if (this.currentAnim === key) return;
    this.currentAnim = key;

    if (!this.mixer || !this.animations) return;

    const clip = this._findClip(name);
    if (!clip) return; // Will fall back to procedural in update()

    const action = this.mixer.clipAction(clip);
    action.reset().fadeIn(0.1).play();
    this.animations.forEach(a => {
      if (a !== clip) {
        const other = this.mixer.clipAction(a);
        other.fadeOut(0.1);
      }
    });
    if (lockDuration > 0) this.animLockTimer = lockDuration;
  }

  takeDamage(dmg) {
    if (this.dead) return;
    this.hp -= dmg;

    // White flash on hit (only on materials that natively support emissive)
    if (this.mesh) {
      this.mesh.traverse(c => {
        if (c.isMesh && c.material && c.material.emissive !== undefined) {
          const origEmissive = c.material.emissive.getHex();
          const origIntensity = c.material.emissiveIntensity;
          c.material.emissive.setHex(0xffffff);
          c.material.emissiveIntensity = 1.0;
          setTimeout(() => {
            if (c.material && c.material.emissive !== undefined) {
              c.material.emissive.setHex(origEmissive);
              c.material.emissiveIntensity = origIntensity;
            }
          }, 100);
        }
      });
    }

    // Procedural hit squash
    this.proceduralData.hitTime = 0.15;

    this._updateHPBar();
    SFXMapper.enemyHurt(this.typeKey);

    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = STATES.CHASE;
      this.playAnim('hit', 0.3);
    }
  }

  die() {
    this.dead = true;
    this.justDied = true;
    this.state = STATES.DEAD;
    this.playAnim('death');
    SFXMapper.enemyDeath(this.typeKey);

    // Hide HP bar
    if (this.hpBarGroup) this.hpBarGroup.visible = false;

    // Procedural death: scale down
    this.proceduralData.deathTimer = 0.8;

    setTimeout(() => {
      if (this.mesh) this.mesh.visible = false;
    }, 800);
  }

  update(dt, playerPos, particles, audio, player) {
    this.proceduralTime += dt;

    if (this.dead) {
      if (this.mixer) this.mixer.update(dt);
      this._applyProceduralAnim(dt);
      return;
    }

    if (this.mixer) this.mixer.update(dt);
    if (this.animLockTimer > 0) this.animLockTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // HP bar faces camera (isometric direction)
    if (this.hpBarGroup) {
      this.hpBarGroup.lookAt(20, 20, 20);
    }

    const distToPlayer = this.position.distanceTo(playerPos);
    const detectRange = 6;
    const attackRange = 1.5;

    switch (this.state) {
      case STATES.IDLE:
        if (distToPlayer < detectRange) {
          this.state = STATES.CHASE;
        }
        break;

      case STATES.CHASE:
        this._moveToward(playerPos, dt, this.def.speed);
        if (this.animLockTimer <= 0) this.playAnim('run');
        if (distToPlayer < attackRange) {
          this.state = STATES.ATTACK;
        }
        break;

      case STATES.ATTACK:
        if (this.attackCooldown <= 0) {
          if (player) {
            player.takeDamage(this.def.damage);
          }
          this.attackCooldown = this.def.attackCooldown || 1.5;
          SFXMapper.enemyAttack(this.typeKey);
          this.playAnim('attack', 0.3);
          // Procedural lunge
          this.proceduralData.lungeTimer = 0.2;
          this.proceduralData.lungeDir = playerPos.clone().sub(this.position).normalize();
        }
        if (distToPlayer > attackRange * 1.5) {
          this.state = STATES.CHASE;
        }
        break;
    }

    this._applyProceduralAnim(dt);

    if (this.mesh) {
      const flyOffset = this.def.flying ? (1.5 + Math.sin(this.proceduralTime * 1.5) * 0.3) : 0;
      this.mesh.position.set(this.position.x, this.position.y + this.groundOffset + flyOffset, this.position.z);
      if (this.velocity.lengthSq() > 0.01) {
        const lookTarget = this.position.clone().add(this.velocity);
        this.mesh.lookAt(lookTarget.x, this.position.y + this.groundOffset + flyOffset, lookTarget.z);
      }
    }
  }

  _applyProceduralAnim(dt) {
    if (!this.mesh) return;

    // Death: scale down
    if (this.proceduralData.deathTimer > 0) {
      this.proceduralData.deathTimer -= dt;
      const t = Math.max(0, this.proceduralData.deathTimer) / 0.8;
      const s = this.baseScale * t;
      this.mesh.scale.setScalar(Math.max(0.01, s));
      return; // Skip other anims when dying
    }

    // Hit squash
    if (this.proceduralData.hitTime > 0) {
      this.proceduralData.hitTime -= dt;
      const t = this.proceduralData.hitTime / 0.15;
      const squash = 1.0 - Math.sin(t * Math.PI) * 0.15;
      this.mesh.scale.setScalar(this.baseScale * squash);
    } else {
      // Idle / Run bobbing
      const isMoving = this.proceduralAnim === 'run' || this.proceduralAnim === 'walk';
      const speed = isMoving ? 8 : 2;
      const amp = isMoving ? 0.04 : 0.02;
      const bob = Math.sin(this.proceduralTime * speed) * amp;
      // Only apply bob if no mixer is playing (mixer handles its own transforms)
      if (!this.mixer || !this._findClip(this.proceduralAnim)) {
        this.mesh.scale.setScalar(this.baseScale);
        this.mesh.position.y += bob;
      }
    }

    // Attack lunge
    if (this.proceduralData.lungeTimer > 0) {
      this.proceduralData.lungeTimer -= dt;
      const t = this.proceduralData.lungeTimer / 0.2;
      const lungeAmt = Math.sin((1 - t) * Math.PI) * 0.3;
      if (this.proceduralData.lungeDir) {
        this.mesh.position.addScaledVector(this.proceduralData.lungeDir, lungeAmt);
      }
    }
  }

  _moveToward(target, dt, speed) {
    const dir = target.clone().sub(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.1) return;
    dir.normalize();
    this.velocity.copy(dir).multiplyScalar(speed);
    this.position.addScaledVector(this.velocity, dt);
  }

  cleanup(scene) {
    if (this.mesh) scene.remove(this.mesh);
  }
}
