import * as THREE from 'three';
import { GAME } from './constants.js';
import { Weapon } from './Weapon.js';
import { assetLoader } from './AssetLoader.js';
import { SFXMapper } from './SFXMapper.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.rotation = 0;
    this.targetRotation = 0;

    this.hp = GAME.MAX_HP;
    this.maxHp = GAME.MAX_HP;
    this.mineDamage = 1;
    this.mineSpeed = 1.0;

    this.mesh = null;
    this.mixer = null;
    this.animations = [];
    this.currentAnim = null;
    this.animLockTimer = 0;
    this.groundOffset = 0;

    this.weapons = [
      new Weapon('pickaxe'),
      new Weapon('sword'),
      new Weapon('pistol'),
      new Weapon('grenade'),
    ];
    this.currentSlot = 0;
    this.weaponHolder = null;

    this.coins = 0;
    this.keys = 0;
    this.inventory = {};
    this.level = 1;
    this.xp = 0;
  }

  async spawn(characterModel = 'Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Male.gltf') {
    try {
      const gltf = await assetLoader.loadGLTF(characterModel);
      if (!gltf || !gltf.scene) throw new Error('GLTF load returned empty');

      this.mesh = gltf.scene;

      // === CALIBRATION PASS ===
      const box = new THREE.Box3().setFromObject(this.mesh);
      const height = box.max.y - box.min.y;
      console.log('[Player] Natural height:', height, 'model:', characterModel);

      const targetHeight = 1.6;
      const scale = targetHeight / height;
      this.mesh.scale.setScalar(scale);
      this.mesh.updateMatrixWorld(true);
      console.log('[Player] Applied scale:', scale);

      const box2 = new THREE.Box3().setFromObject(this.mesh);
      this.groundOffset = -box2.min.y;
      console.log('[Player] Ground offset:', this.groundOffset);

      // Forward arrow
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, targetHeight * 0.6, 0),
        0.5,
        0xff00ff
      );
      this.mesh.add(arrow);

      this.scene.add(this.mesh);

      // Weapon holder attached to right hand bone
      this.weaponHolder = new THREE.Group();
      const fistR = this.mesh.getObjectByName('Fist.R');
      if (fistR) {
        fistR.add(this.weaponHolder);
      } else {
        this.mesh.add(this.weaponHolder);
        this.weaponHolder.position.set(0.3, 1.0, 0.2);
      }

      this.animations = gltf.animations || [];
      if (this.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.playAnim('Idle');
      }
    } catch (e) {
      throw new Error(`[Player] Required player model failed to load: ${e?.message || e}`);
    }

    await this.equipWeapon(0);
  }

  playAnim(name, lockDuration = 0) {
    if (!this.mixer || !this.animations.length) return;
    // Guard: don't restart same animation
    if (this.currentAnim === name) return;
    const clip = this.animations.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
    if (!clip) {
      console.warn('[Player] Animation not found:', name, 'Available:', this.animations.map(a => a.name));
      return;
    }
    const action = this.mixer.clipAction(clip);
    action.reset().fadeIn(0.15).play();
    this.animations.forEach(a => {
      if (a !== clip) {
        const other = this.mixer.clipAction(a);
        other.fadeOut(0.15);
      }
    });
    this.currentAnim = name;
    if (lockDuration > 0) this.animLockTimer = lockDuration;
  }

  playAttackAnim(weaponId) {
    const map = {
      pickaxe: 'Punch',
      sword: 'SwordSlash',
      pistol: 'Shoot_OneHanded',
      grenade: 'PickUp',
    };
    const anim = map[weaponId] || 'Punch';
    this.playAnim(anim, 0.5);
  }

  async equipWeapon(slot) {
    // Unequip current
    if (this.currentSlot >= 0 && this.currentSlot < this.weapons.length) {
      this.weapons[this.currentSlot].unequip();
    }
    this.currentSlot = slot;
    // Equip new
    if (this.weaponHolder) {
      await this.weapons[slot].equip(this.weaponHolder);
    }
  }

  update(dt, input) {
    if (this.mixer) this.mixer.update(dt);
    if (this.animLockTimer > 0) {
      this.animLockTimer -= dt;
    }

    // 8-directional movement
    let dx = 0;
    let dz = 0;
    if (input.isDown('ArrowUp') || input.isDown('KeyW')) dz -= 1;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) dz += 1;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;

    if (dx !== 0 && dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
    }

    const speed = GAME.PLAYER_SPEED;
    this.position.x += dx * speed * dt;
    this.position.z += dz * speed * dt;

    if (dx !== 0 || dz !== 0) {
      this.targetRotation = Math.atan2(dx, dz);
      // Smooth rotation lerp
      let diff = this.targetRotation - this.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rotation += diff * Math.min(1, 10 * dt);

      if (this.animLockTimer <= 0) {
        const isRunning = input.isDown('ShiftLeft');
        this.playAnim(isRunning ? 'Run' : 'Walk');
      }
    } else {
      if (this.animLockTimer <= 0 && this.currentAnim !== 'Idle') {
        this.playAnim('Idle');
      }
    }

    const bound = GAME.FLOOR_SIZE - 1;
    this.position.x = Math.max(-bound, Math.min(bound, this.position.x));
    this.position.z = Math.max(-bound, Math.min(bound, this.position.z));

    this._updateMesh();
  }

  _updateMesh() {
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y + this.groundOffset, this.position.z);
      this.mesh.rotation.y = this.rotation;
    }
  }

  takeDamage(amount) {
    if (this.hp <= 0) return;
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
    this.playAnim('RecieveHit', 0.4);

    if (this.mesh) {
      this.mesh.traverse(c => {
        if (c.isMesh && c.material && c.material.emissive !== undefined) {
          const orig = c.material.emissive.getHex();
          c.material.emissive.setHex(0xff0000);
          setTimeout(() => { if (c.material && c.material.emissive) c.material.emissive.setHex(orig); }, 150);
        }
      });
    }

    if (amount > 15) {
      SFXMapper.playerHurtHeavy();
    } else {
      SFXMapper.playerHurt();
    }
  }

  heal(amount) {
    this.hp += amount;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    SFXMapper.playerHeal();
  }

  addItem(type, count = 1) {
    this.inventory[type] = (this.inventory[type] || 0) + count;
  }

  attack(origin, direction, scene, audio, particles, enemies) {
    return this.weapons[this.currentSlot].attack(origin, direction, scene, audio, particles, enemies);
  }

  updateProjectiles(dt, scene, particles, enemies) {
    this.weapons[this.currentSlot].updateProjectiles(dt, scene, particles, enemies);
  }

  getHandPosition() {
    return this.position.clone().add(new THREE.Vector3(0, 1.2 + this.groundOffset, 0));
  }
}
