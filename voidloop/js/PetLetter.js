import * as THREE from 'three';
import { glyph3D } from '../../js/Glyph3DManager.js';
import { PET_LEVELS, PET_ATTACK_RANGE, PET_ATTACK_INTERVAL } from './constants.js';

const PET_STATES = {
  FOLLOW: 'follow',
  ATTACK: 'attack',
  IDLE: 'idle',
  LEVEL_UP: 'levelUp',
};

export class PetLetter {
  constructor(scene, letter, level = 1, options = {}) {
    this.scene = scene;
    this.letter = String(letter || 'A').toUpperCase();
    this.level = level;
    this.visualLevel = level;
    this.container = null;
    this.mesh = null;
    this.glowLight = null;
    this.evolvedPrototype = null;
    this.onBlockDestroyed = options.onBlockDestroyed || null;
    this.canMineBlock = options.canMineBlock || null;
    this.initialPosition = options.initialPosition || null;

    this.state = PET_STATES.FOLLOW;
    this.stateTimer = 0;
    this.attackTimer = PET_ATTACK_INTERVAL;
    this.attackTarget = null;
    this.attackTargetType = null; // 'enemy' | 'block'

    this.followOffset = new THREE.Vector3(-1.2, 0.5, -1.2);
    this.targetPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.bobOffset = Math.random() * Math.PI * 2;

    this._loadModel();
  }

  async _loadModel() {
    await glyph3D.load();
    this.container = new THREE.Group();
    this.glowLight = new THREE.PointLight(0xffffff, 0.5, 2.5);
    this.glowLight.position.y = 0.8;
    this.container.add(this.glowLight);
    this._applyVisuals();
    if (this.initialPosition) {
      this.container.position.copy(this.initialPosition);
    }
    this.scene.add(this.container);
  }

  _applyVisuals() {
    const cfg = PET_LEVELS.find(l => l.level === this.visualLevel) || PET_LEVELS[0];

    if (this.glowLight) {
      this.glowLight.color.setHex(cfg.color);
    }

    if (!this.container) return;

    this._removeCurrentMesh();
    this._buildGlyphMesh(cfg);
  }

  _removeCurrentMesh() {
    if (!this.mesh) return;
    this.container.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose?.());
          } else {
            child.material.dispose?.();
          }
        }
        child.geometry?.dispose?.();
      }
    });
    this.mesh = null;
  }

  _buildGlyphMesh(cfg) {
    const glyph = glyph3D.createGlyph(this.letter, cfg.style);
    if (glyph) {
      this.mesh = glyph;
      this.mesh.scale.multiplyScalar(0.75);
      this.mesh.position.y = 0.1;
      this.container.add(this.mesh);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.5,
      });
      this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.15), mat);
      this.mesh.position.y = 0.4;
      this.container.add(this.mesh);
    }
  }

  setEvolvedMesh(evolvedMesh) {
    // No-op: evolved FBX approach scrapped in favor of rainbow effect
  }

  setEvolvedPrototype(proto) {
    // No-op: evolved FBX approach scrapped in favor of rainbow effect
  }

  setLevel(level) {
    if (this.level === level) return;
    this.level = level;
    this.visualLevel = level;
    this._applyVisuals();
  }

  setVisualLevel(v) {
    if (this.visualLevel === v) return;
    this.visualLevel = Math.max(1, Math.min(7, v));
    this._applyVisuals();
  }

  clearVisualLevel() {
    this.setVisualLevel(this.level);
  }

  update(dt, player, world) {
    if (!this.container) return;

    this.attackTimer -= dt;
    if (this.attackTimer <= 0 && this.state === PET_STATES.FOLLOW) {
      this._tryAttack(player, world);
    }

    switch (this.state) {
      case PET_STATES.FOLLOW:
        this._updateFollow(dt, player);
        break;
      case PET_STATES.ATTACK:
        this._updateAttack(dt, player, world);
        break;
      case PET_STATES.IDLE:
        this._updateIdle(dt, player);
        break;
      case PET_STATES.LEVEL_UP:
        this._updateLevelUp(dt, player);
        break;
    }

    if (this.visualLevel >= 7) {
      this._updateRainbowEffect();
    }
  }

  _updateRainbowEffect() {
    const t = performance.now() * 0.001;
    const hue = (t * 0.3) % 1;
    const intensity = 1.1 + Math.sin(t * 2) * 0.4;
    const color = new THREE.Color().setHSL(hue, 1.0, 0.5);

    if (this.glowLight) {
      this.glowLight.color.copy(color);
      this.glowLight.intensity = intensity * 0.8;
    }

    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) {
            m.emissive.copy(color);
            m.emissiveIntensity = intensity;
          }
        }
      });
    }
  }

  _updateFollow(dt, player) {
    const t = performance.now() * 0.001;

    // Calculate target follow position behind player
    const offset = this.followOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation);
    this.targetPosition.copy(player.position).add(offset);
    this.targetPosition.y = player.position.y + 0.5;

    // Smooth lerp
    this.container.position.lerp(this.targetPosition, Math.min(1, 6 * dt));

    // Bobbing
    this.container.position.y += Math.sin(t * 3 + this.bobOffset) * 0.06;

    // Face player direction with slight wobble
    const targetRot = player.rotation + Math.sin(t * 1.5 + this.bobOffset) * 0.1;
    let diff = targetRot - this.container.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.container.rotation.y += diff * Math.min(1, 8 * dt);

    this.container.scale.setScalar(1);
    this.container.rotation.z = 0;
  }

  _tryAttack(player, world) {
    const playerDmgMult = 1 + (this.level - 1) * 0.05;

    // 1. Check for enemies first
    let nearestEnemy = null;
    let nearestEnemyDist = PET_ATTACK_RANGE;
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      const dist = this.container.position.distanceTo(enemy.position);
      if (dist < nearestEnemyDist) {
        nearestEnemyDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      this.attackTarget = nearestEnemy;
      this.attackTargetType = 'enemy';
      this.state = PET_STATES.ATTACK;
      this.stateTimer = 0.25;
      this.attackTimer = PET_ATTACK_INTERVAL;
      return;
    }

    // 2. Check for floating blocks only (ground blocks are never mineable by pet)
    let nearestBlock = null;
    let nearestBlockDist = PET_ATTACK_RANGE;
    for (const block of world.blocks.values()) {
      if (block.destroyed) continue;
      if (!block.isFloating) continue; // Pet only mines floating blocks
      if (this.canMineBlock && !this.canMineBlock(block)) continue;
      const dist = this.container.position.distanceTo(block.position);
      if (dist < nearestBlockDist) {
        nearestBlockDist = dist;
        nearestBlock = block;
      }
    }

    if (nearestBlock) {
      this.attackTarget = nearestBlock;
      this.attackTargetType = 'block';
      this.state = PET_STATES.ATTACK;
      this.stateTimer = 0.25;
      this.attackTimer = PET_ATTACK_INTERVAL;
    } else {
      // No target, reset timer with shorter cooldown
      this.attackTimer = PET_ATTACK_INTERVAL * 0.5;
    }
  }

  _updateAttack(dt, player, world) {
    this.stateTimer -= dt;

    if (this.attackTarget && this.attackTargetType === 'enemy') {
      const enemy = this.attackTarget;
      if (enemy.dead) {
        this.state = PET_STATES.FOLLOW;
        return;
      }
      // Dash toward enemy
      const targetPos = enemy.position.clone();
      targetPos.y = this.container.position.y;
      this.container.position.lerp(targetPos, Math.min(1, 15 * dt));
      this.container.lookAt(targetPos.x, this.container.position.y, targetPos.z);

      // Attack hit at end of dash
      if (this.stateTimer <= 0.1 && this.stateTimer + dt > 0.1) {
        const weapon = player.weapons[player.currentSlot];
        const baseDmg = weapon ? weapon.data.damage : 10;
        const dmgMult = 1 + (this.level - 1) * 0.05;
        const damage = Math.max(1, Math.floor(baseDmg * 0.5 * dmgMult));
        enemy.takeDamage(damage, player.getEquippedWeapon?.());
      }
    } else if (this.attackTarget && this.attackTargetType === 'block') {
      const block = this.attackTarget;
      if (block.destroyed) {
        this.state = PET_STATES.FOLLOW;
        return;
      }
      // Dash toward block
      const targetPos = block.position.clone();
      targetPos.y = this.container.position.y;
      this.container.position.lerp(targetPos, Math.min(1, 15 * dt));
      this.container.lookAt(targetPos.x, this.container.position.y, targetPos.z);

      // Attack hit at end of dash
      if (this.stateTimer <= 0.1 && this.stateTimer + dt > 0.1) {
        const dmgMult = 1 + (this.level - 1) * 0.05;
        const damage = Math.max(1, Math.floor(player.mineDamage / 10 * dmgMult));
        const destroyed = block.takeDamage(damage);
        if (destroyed && this.onBlockDestroyed) {
          this.onBlockDestroyed(block);
        }
      }
    }

    // Scale punch animation
    const progress = 1 - Math.max(0, this.stateTimer) / 0.25;
    const scale = 1 + Math.sin(progress * Math.PI) * 0.25;
    this.container.scale.setScalar(scale);

    if (this.stateTimer <= 0) {
      this.state = PET_STATES.IDLE;
      this.stateTimer = 0.3;
      this.attackTarget = null;
      this.attackTargetType = null;
    }
  }

  _updateIdle(dt, player) {
    this.stateTimer -= dt;
    this.container.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, 8 * dt));
    if (this.stateTimer <= 0) {
      this.state = PET_STATES.FOLLOW;
    }
  }

  _updateLevelUp(dt, player) {
    this.stateTimer -= dt;
    const t = performance.now() * 0.001;
    const pulse = 1 + Math.sin(t * 12) * 0.25;
    this.container.scale.setScalar(pulse);
    this.container.rotation.y += dt * 8;

    if (this.stateTimer <= 0) {
      this.state = PET_STATES.FOLLOW;
      this.container.scale.setScalar(1);
    }
  }

  playLevelUp() {
    this.state = PET_STATES.LEVEL_UP;
    this.stateTimer = 1.2;
  }

  dispose() {
    if (!this.container) return;
    this.scene.remove(this.container);
    this.container.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose?.());
          } else {
            child.material.dispose?.();
          }
        }
        child.geometry?.dispose?.();
      }
    });
    this.container = null;
    this.mesh = null;
  }
}
