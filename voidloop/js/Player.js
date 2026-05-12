import * as THREE from 'three';
import { GAME } from './constants.js';
import { Weapon } from './Weapon.js';
import { assetLoader } from './AssetLoader.js';
import { SFXMapper } from './SFXMapper.js';
import {
  DEFAULT_LOADOUT,
  HOTBAR_LOADOUTS,
  KAYKIT_ANIMATION_PATHS,
  KAYKIT_ANIMATIONS,
  KAYKIT_ITEM_GRIP_PRESETS,
  KAYKIT_SOCKET_PRESETS,
  WEAPON_ATTACK_ANIMS,
  cloneLoadout,
  getKayKitCharacter,
  getKayKitItem,
} from './KayKitLoadout.js';
import { WeaponVFXEmitter, getWeaponVFXConfig } from './ElementalVFX.js';

const TARGET_HEIGHT = 1.6;
const _anchorOffsetMatrix = new THREE.Matrix4();
const _targetWorldMatrix = new THREE.Matrix4();
const _parentInverseMatrix = new THREE.Matrix4();
const _targetLocalMatrix = new THREE.Matrix4();
const _offsetPosition = new THREE.Vector3();
const _offsetQuaternion = new THREE.Quaternion();
const _offsetScale = new THREE.Vector3();
const _offsetEuler = new THREE.Euler();

const ITEM_TRANSFORMS = {
  default: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -1.0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 1.0 },
    back: { scale: 0.9, x: 0, y: 0.02, z: -0.2, rx: 0, ry: 0, rz: 0 },
  },
  bow: {
    rightHand: { scale: 0.38, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    leftHand: { scale: 0.38, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    back: { scale: 0.78, x: 0.12, y: 0.04, z: -0.24, rx: Math.PI / 2, ry: 0, rz: 0.35 },
  },
  bow_withString: {
    rightHand: { scale: 0.38, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    leftHand: { scale: 0.38, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    back: { scale: 0.78, x: 0.12, y: 0.04, z: -0.24, rx: Math.PI / 2, ry: 0, rz: 0.35 },
  },
  crossbow_1handed: {
    rightHand: { scale: 0.36, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    leftHand: { scale: 0.36, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    back: { scale: 0.72, x: 0.06, y: 0.1, z: -0.28, rx: Math.PI / 2, ry: 0, rz: 0.45 },
  },
  crossbow_2handed: {
    rightHand: { scale: 0.34, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    leftHand: { scale: 0.34, x: 0, y: 0.02, z: 0.02, rx: Math.PI / 2, ry: 0, rz: 0 },
    back: { scale: 0.68, x: 0.06, y: 0.08, z: -0.28, rx: Math.PI / 2, ry: 0, rz: 0.45 },
  },
  arrow_bow: { back: { scale: 0.82, x: -0.1, y: 0.05, z: -0.2, rx: Math.PI / 2, ry: 0, rz: -0.35 } },
  arrow_crossbow: { back: { scale: 0.9, x: -0.1, y: 0.05, z: -0.2, rx: Math.PI / 2, ry: 0, rz: -0.35 } },
  quiver: { back: { scale: 0.86, x: -0.16, y: 0.02, z: -0.24, rx: 0, ry: -0.15, rz: -0.35 } },
  staff: {
    rightHand: { scale: 0.42, x: 0, y: -0.12, z: 0, rx: 0, ry: 0, rz: Math.PI / 2 },
    leftHand: { scale: 0.42, x: 0, y: -0.12, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    back: { scale: 0.78, x: 0.14, y: 0.05, z: -0.25, rx: 0, ry: 0, rz: 0.55 },
  },
  sword_2handed: { back: { scale: 0.78, x: 0.12, y: 0.05, z: -0.25, rx: 0, ry: 0, rz: 0.55 } },
  sword_2handed_color: { back: { scale: 0.78, x: 0.12, y: 0.05, z: -0.25, rx: 0, ry: 0, rz: 0.55 } },
  axe_2handed: { back: { scale: 0.78, x: 0.14, y: 0.02, z: -0.25, rx: 0, ry: 0, rz: 0.5 } },
  shield_badge: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_badge_color: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_round: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_round_barbarian: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_round_color: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_spikes: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_spikes_color: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_square: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
  shield_square_color: {
    rightHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
    leftHand: { scale: 0.42, x: 0, y: 0, z: 0, rx: -0.55, ry: 0, rz: 0 },
  },
};

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
    this.stamina = GAME.MAX_STAMINA;

    this.mesh = null;
    this.mixer = null;
    this.animations = [];
    this.currentAnim = null;
    this.animLockTimer = 0;
    this.groundOffset = 0;

    // Combat state
    this.isBlocking = false;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.dodgeDir = { x: 0, z: 0 };

    this.weapons = [
      new Weapon('pickaxe'),
      new Weapon('sword'),
      new Weapon('pistol'),
      new Weapon('grenade'),
    ];
    this.currentSlot = 0;
    this.equipmentHolders = {};
    this.equipmentMeshes = {};
    this.weaponEmitters = {};
    this.damageFlashTimer = 0;
    this.damageFlashEntries = [];
    this.loadout = cloneLoadout(DEFAULT_LOADOUT);
    this.calibration = {
      enabled: false,
      slot: 'rightHand',
      offset: this._defaultCalibrationOffset(),
    };

    this.coins = 0;
    this.keys = 0;
    this.inventory = {};
    this.level = 1;
    this.xp = 0;
    this.world = null; // set by Game for ground height snapping

    // Functional equipment slots (separate from visual loadout)
    this.equippedTool = null;
    this.equippedArmor = null;
    this.equippedWeapon = null;

    // Upgrade-applied stats (set by applyUpgrades)
    this.mineDamage = 1;
    this.mineSpeed = 1.0;
  }

  /**
   * Apply shop upgrade levels to player stats.
   * Called after buying upgrades or loading saved data.
   * @param {object} upgradeLevels - { pick_tier: N, mine_speed: N, ... }
   */
  applyUpgrades(upgradeLevels) {
    const pickTier = upgradeLevels?.pick_tier || 0;
    const mineSpeedLevel = upgradeLevels?.mine_speed || 0;

    // pick_tier: +1 mine damage per level
    this.mineDamage = 1 + pickTier;

    // mine_speed: +10% per level (max 50%)
    this.mineSpeed = 1.0 + (mineSpeedLevel * 0.1);

    // max_hp upgrade
    const maxHpLevel = upgradeLevels?.max_hp || 0;
    this.maxHp = GAME.MAX_HP + (maxHpLevel * 10);
    this.hp = Math.min(this.hp, this.maxHp);

    // max_stamina upgrade
    const maxStamLevel = upgradeLevels?.max_stamina || 0;
    this.maxStamina = GAME.MAX_STAMINA + (maxStamLevel * 10);
    this.stamina = Math.min(this.stamina, this.maxStamina);
  }

  /**
   * Get the effective swing cooldown based on mineSpeed.
   * @returns {number} cooldown in seconds
   */
  getSwingCooldown() {
    return GAME.ATTACK_COOLDOWN / this.mineSpeed;
  }

  async spawn(characterId = DEFAULT_LOADOUT.characterId) {
    this.animations = await this._loadKayKitAnimations();
    await this.setCharacter(characterId);
    await this.applyLoadout(this.loadout, { includeCharacter: false });
  }

  async setCharacter(characterId) {
    const character = getKayKitCharacter(characterId);
    this.loadout.characterId = character.id;

    if (this.mesh) {
      this._restoreDamageFlash();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }

    try {
      await assetLoader.loadGLTF(character.model);
      const cloned = assetLoader.cloneModel(character.model);
      if (!cloned || !cloned.scene) throw new Error('GLTF clone returned empty');

      this.mesh = cloned.scene;
      this._normalizeMesh(character.model);
      this._bindEquipmentHolders();
      this.scene.add(this.mesh);
      this._updateMesh();

      if (this.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.currentAnim = null;
        this.playAnim('Idle');
      }

      await this.applyLoadout(this.loadout, { includeCharacter: false });
    } catch (e) {
      console.error('[Player] KayKit model load failed, using fallback capsule:', e);
      const geo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x6644aa, emissive: 0x221144, emissiveIntensity: 0.5 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.groundOffset = 0.5;
      this.scene.add(this.mesh);
      this._bindEquipmentHolders();
    }
  }

  async applyLoadout(loadout, opts = {}) {
    const next = cloneLoadout(loadout);
    if (opts.includeCharacter !== false && next.characterId !== this.loadout.characterId) {
      this.loadout = next;
      await this.setCharacter(next.characterId);
      return;
    }

    this.loadout = next;
    await this.equipSlot('rightHand', next.rightHand);
    await this.equipSlot('leftHand', next.leftHand);
    await this.equipSlot('back', next.back);
  }

  async equipSlot(slot, itemId) {
    const holder = this.equipmentHolders[slot];
    if (!holder) return;

    if (this.equipmentMeshes[slot]) {
      holder.remove(this.equipmentMeshes[slot]);
      this.equipmentMeshes[slot] = null;
    }

    // Stop existing emitter for this slot
    if (this.weaponEmitters[slot]) {
      this.weaponEmitters[slot].destroy();
      this.weaponEmitters[slot] = null;
    }

    this.loadout[slot] = itemId || null;
    const item = getKayKitItem(itemId);
    if (!item || !item.slots.includes(slot)) return;

    try {
      await assetLoader.loadGLTF(item.model);
      const cloned = assetLoader.cloneModel(item.model);
      if (!cloned || !cloned.scene) return;
      this.equipmentMeshes[slot] = cloned.scene;
      this._applyEquippedItemTransform(slot);
      holder.add(this.equipmentMeshes[slot]);
      this._placeEquipmentHolders();
    } catch (e) {
      console.warn('[Player] Failed to equip KayKit item', item.id, e);
    }

    // Start weapon VFX emitter if this item has one assigned
    const vfxConfig = getWeaponVFXConfig(itemId);
    if (vfxConfig && (slot === 'rightHand' || slot === 'leftHand')) {
      const emitter = new WeaponVFXEmitter(holder, this.scene, null, vfxConfig);
      emitter.start();
      this.weaponEmitters[slot] = emitter;
    }
  }

  setCalibrationEnabled(enabled, slot = this.calibration.slot) {
    this.calibration.enabled = enabled;
    this.calibration.slot = slot;
    this.calibration.offset = this._defaultCalibrationOffset();
    this._placeEquipmentHolders();
    this._applyEquippedItemTransform(slot);
    return this.getCalibrationSnapshot();
  }

  setCalibrationSlot(slot) {
    this.calibration.slot = slot;
    this.calibration.offset = this._defaultCalibrationOffset();
    this._placeEquipmentHolders();
    this._applyEquippedItemTransform(slot);
    return this.getCalibrationSnapshot();
  }

  adjustCalibration(field, delta) {
    if (!this.calibration.enabled || !(field in this.calibration.offset)) return this.getCalibrationSnapshot();
    this.calibration.offset[field] += delta;
    if (field === 'scale') {
      this.calibration.offset.scale = Math.max(0.1, this.calibration.offset.scale);
    }
    this._applyEquippedItemTransform(this.calibration.slot);
    return this.getCalibrationSnapshot();
  }

  setCalibration(field, value) {
    if (!this.calibration.enabled || !(field in this.calibration.offset)) return this.getCalibrationSnapshot();
    this.calibration.offset[field] = value;
    if (field === 'scale') {
      this.calibration.offset.scale = Math.max(0.1, this.calibration.offset.scale);
    }
    this._applyEquippedItemTransform(this.calibration.slot);
    return this.getCalibrationSnapshot();
  }

  resetCalibrationOffset() {
    this.calibration.offset = this._defaultCalibrationOffset();
    this._placeEquipmentHolders();
    this._applyEquippedItemTransform(this.calibration.slot);
    return this.getCalibrationSnapshot();
  }

  saveCalibrationOffset() {
    // Merge live nudge into saved preset, then reset live nudge
    const slot = this.calibration.slot;
    const itemId = this.loadout[slot];
    if (!itemId) return this.getCalibrationSnapshot();
    const live = this.calibration.offset;
    const saved = KAYKIT_ITEM_GRIP_PRESETS[itemId]?.[slot] || this._defaultCalibrationOffset();
    const merged = this._combineOffsets(saved, live);
    if (!KAYKIT_ITEM_GRIP_PRESETS[itemId]) KAYKIT_ITEM_GRIP_PRESETS[itemId] = {};
    KAYKIT_ITEM_GRIP_PRESETS[itemId][slot] = this._roundOffset(merged);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('voidloopKayKitItemGripPresetsV1', JSON.stringify(KAYKIT_ITEM_GRIP_PRESETS));
      }
    } catch {}
    this.calibration.offset = this._defaultCalibrationOffset();
    this._applyEquippedItemTransform(slot);
    return this.getCalibrationSnapshot();
  }

  getCalibrationSnapshot() {
    return {
      enabled: this.calibration.enabled,
      slot: this.calibration.slot,
      itemId: this.loadout[this.calibration.slot] || null,
      offset: this._roundOffset(this.calibration.offset),
      itemGripPreset: this._getActiveItemGripPreset(this.calibration.slot),
    };
  }

  async equipWeapon(slot) {
    if (this.currentSlot >= 0 && this.currentSlot < this.weapons.length) {
      this.weapons[this.currentSlot].unequip();
    }
    this.currentSlot = slot;
    const weapon = this.weapons[slot];
    this.equippedWeapon = weapon?.data?.id || null;
    const hotbarLoadout = HOTBAR_LOADOUTS[weapon?.data?.id];
    if (hotbarLoadout) {
      await this.applyLoadout({ ...this.loadout, ...hotbarLoadout }, { includeCharacter: false });
    }
  }

  playAnim(name, opts = {}) {
    if (!this.mixer || !this.animations.length) return;

    const lockDuration = opts.lock ?? 0;
    const timeScale = opts.timeScale ?? 1.0;
    const loop = opts.loop ?? true;

    // Don't re-trigger same animation (fixes walk/run/idle freeze)
    if (this.currentAnim === name) {
      if (loop || this.animLockTimer > 0) return;
    }

    const mappedName = KAYKIT_ANIMATIONS[name] || name;
    const clip = this.animations.find(a => a.name === mappedName);

    if (!clip) {
      console.warn(`[Player] Animation not found: "${name}" → mapped: "${mappedName}"`);
      return;
    }

    const action = this.mixer.clipAction(clip);
    action.reset().fadeIn(0.12);
    action.timeScale = timeScale;
    action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !loop;
    action.play();

    this.animations.forEach(a => {
      if (a !== clip) this.mixer.clipAction(a).fadeOut(0.12);
    });
    this.currentAnim = name;
    if (lockDuration > 0) this.animLockTimer = lockDuration;
  }

  playAttackAnim() {
    const itemId = this.loadout.rightHand;
    const attackDef = WEAPON_ATTACK_ANIMS[itemId];

    if (attackDef) {
      const cooldown = GAME.ATTACK_COOLDOWN;
      const timeScale = attackDef.duration / cooldown;
      console.log(`[Attack] ${itemId} → ${attackDef.animKey} (timeScale: ${timeScale.toFixed(2)})`);
      this.playAnim(attackDef.animKey, { lock: cooldown, timeScale, loop: false });
    } else {
      console.warn(`[Attack] No anim mapping for item: ${itemId}`);
      this.playAnim('Use', { lock: 0.5, loop: false });
    }
  }

  startBlock() {
    if (this.isDodging || this.animLockTimer > 0) return;
    this.isBlocking = true;
    this.playAnim('Block', { loop: true });
  }

  endBlock() {
    this.isBlocking = false;
    if (this.currentAnim === 'Block') {
      this.playAnim('Idle', { lock: 0 });
    }
  }

  dodge(dx, dz) {
    if (this.isDodging || this.stamina < GAME.DODGE_COST) return;
    this.stamina -= GAME.DODGE_COST;
    this.isDodging = true;
    this.dodgeTimer = GAME.DODGE_DURATION;
    this.dodgeDir = { x: dx, z: dz };

    // Choose dodge animation based on direction
    let anim = 'DodgeForward';
    if (dz > 0.5) anim = 'DodgeForward';
    else if (dz < -0.5) anim = 'DodgeBack';
    else if (dx > 0.5) anim = 'DodgeRight';
    else if (dx < -0.5) anim = 'DodgeLeft';

    this.playAnim(anim, { lock: GAME.DODGE_DURATION, timeScale: 1.3 });
  }

  update(dt, input) {
    if (this.mixer) this.mixer.update(dt);

    // Damage flash countdown
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= dt;
      if (this.damageFlashTimer <= 0) {
        this._restoreDamageFlash();
      }
    }

    if (this.animLockTimer > 0) {
      this.animLockTimer -= dt;
    }

    // Stamina regen
    if (this.stamina < GAME.MAX_STAMINA) {
      this.stamina = Math.min(GAME.MAX_STAMINA, this.stamina + GAME.STAMINA_REGEN * dt);
    }

    // Ground height snapping (3D terrain support) — 2×2 area check
    let groundY = 0;
    let fallingIntoVoid = false;
    if (this.world) {
      const topY = this._getGroundHeight(this.position.x, this.position.z);
      if (topY > -999) {
        groundY = topY;
      } else if (this.world.authoredMode) {
        // No block underfoot in authored level = fall into void
        groundY = -999;
        fallingIntoVoid = true;
      } else {
        // Procedural mode: hard floor at -50
        groundY = -50;
      }
    }

    // Void death: fell off the edge of the level
    if (fallingIntoVoid && this.position.y < -10) {
      this._respawnFromVoid();
      return;
    }

    // Simple gravity / falling
    if (this.position.y > groundY + 0.01 || fallingIntoVoid) {
      this.velocity.y += GAME.GRAVITY * dt;
      this.position.y += this.velocity.y * dt;
      if (!fallingIntoVoid && this.position.y <= groundY) {
        this.position.y = groundY;
        this.velocity.y = 0;
      }
    } else if (this.position.y < groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
    }

    // Dodge handling
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      this.position.x += this.dodgeDir.x * GAME.DODGE_FORCE * dt;
      this.position.z += this.dodgeDir.z * GAME.DODGE_FORCE * dt;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      }
      this._updateMesh();
      return; // Skip normal movement during dodge
    }

    // Block input
    if (input.buttons.right) {
      if (!this.isBlocking) this.startBlock();
    } else {
      if (this.isBlocking) this.endBlock();
    }

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

    // Dodge on double-tap Space + direction
    if (input.pressed('Space') && (dx !== 0 || dz !== 0)) {
      this.dodge(dx, dz);
    }

    const speed = input.isDown('ShiftLeft') && this.stamina > 0
      ? GAME.PLAYER_SPRINT_SPEED
      : GAME.PLAYER_SPEED;

    if (input.isDown('ShiftLeft')) {
      this.stamina = Math.max(0, this.stamina - GAME.SPRINT_DRAIN * dt);
    }

    this.position.x += dx * speed * dt;
    this.position.z += dz * speed * dt;

    if (dx !== 0 || dz !== 0) {
      this.targetRotation = Math.atan2(dx, dz);
      let diff = this.targetRotation - this.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rotation += diff * Math.min(1, 10 * dt);

      if (this.animLockTimer <= 0 && !this.isBlocking) {
        const isRunning = input.isDown('ShiftLeft') && this.stamina > 0;
        this.playAnim(isRunning ? 'Run' : 'Walk');
      }
    } else if (this.animLockTimer <= 0 && !this.isBlocking && this.currentAnim !== 'Idle') {
      this.playAnim('Idle');
    }

    this._updateMesh();
  }

  takeDamage(amount) {
    if (this.hp <= 0) return;

    // Block mitigation
    if (this.isBlocking) {
      amount = Math.floor(amount * 0.3); // 70% blocked
      this.playAnim('BlockHit', { lock: 0.3 });
      SFXMapper.meleeHit(); // reuse block sound
      if (amount <= 0) return;
    }

    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;

    // Light vs heavy hit reaction
    if (amount >= 15) {
      this.playAnim('HitHeavy', { lock: 0.6 });
      SFXMapper.playerHurtHeavy();
    } else {
      this.playAnim('Hit', { lock: 0.4 });
      SFXMapper.playerHurt();
    }

    if (this.mesh) {
      this._flashDamage();
    }
  }

  heal(amount) {
    this.hp += amount;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    SFXMapper.playerHeal();
  }

  // Hazard interaction — burn damage handled by HazardSystem
  isInHazard() {
    return false; // Game.js HazardSystem handles this externally
  }

  addItem(type, count = 1) {
    this.inventory[type] = (this.inventory[type] || 0) + count;
  }

  // Functional equipment slots
  equipTool(toolId) {
    this.equippedTool = toolId;
  }

  equipArmor(armorId) {
    this.equippedArmor = armorId;
  }

  equipFunctionalWeapon(weaponId) {
    this.equippedWeapon = weaponId;
  }

  getEquippedTool() {
    return this.equippedTool;
  }

  getEquippedArmor() {
    return this.equippedArmor;
  }

  getEquippedWeapon() {
    return this.equippedWeapon;
  }

  hasItem(itemId) {
    return this.inventory[itemId] > 0;
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

  _getGroundHeight(px, pz) {
    if (!this.world) return 0;
    // Check a 2×2 area around the player's position for the highest ground.
    // This prevents falling through narrow gaps between tiles.
    let maxY = -999;
    const x0 = Math.floor(px);
    const z0 = Math.floor(pz);
    for (let dx = 0; dx <= 1; dx++) {
      for (let dz = 0; dz <= 1; dz++) {
        const y = this.world.getColumnTop(x0 + dx, z0 + dz);
        if (y > maxY) maxY = y;
      }
    }
    return maxY;
  }

  _respawnFromVoid() {
    // Respawn at level start position
    if (this.world && this.world.startPosition) {
      this.position.copy(this.world.startPosition);
    } else {
      this.position.set(0, 0, 0);
    }
    this.velocity.set(0, 0, 0);
    // Brief damage flash to indicate "whoops"
    this._flashDamage();
    // Emit a toast/event for UI feedback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voidloop:playerFell', {
        detail: { message: 'Whoops! Watch your step!' }
      }));
    }
  }

  _flashDamage() {
    // Restore any previous flash first so we always save true originals
    this._restoreDamageFlash();

    const entries = [];
    this.mesh.traverse(c => {
      if (!c.isMesh || !c.material) return;
      const materials = Array.isArray(c.material) ? c.material : [c.material];
      for (const mat of materials) {
        if (!mat || !mat.color) continue;
        entries.push({
          mat,
          color: mat.color.clone(),
          emissive: mat.emissive ? mat.emissive.clone() : null,
        });
        mat.color.setHex(0xff6b5f);
        if (mat.emissive) mat.emissive.setHex(0xff2a1f);
      }
    });

    this.damageFlashEntries = entries;
    this.damageFlashTimer = 0.12;
  }

  _restoreDamageFlash() {
    for (const entry of this.damageFlashEntries) {
      entry.mat.color.copy(entry.color);
      if (entry.mat.emissive && entry.emissive) entry.mat.emissive.copy(entry.emissive);
    }
    this.damageFlashEntries = [];
    this.damageFlashTimer = 0;
  }

  _normalizeMesh(modelPath) {
    // Ensure skeleton matrices are initialized before measuring bounds.
    this.mesh.updateMatrixWorld(true);
    // Clear stale SkinnedMesh bounding-box caches so setFromObject
    // computes fresh, accurate bounds.
    this.mesh.traverse(c => { if (c.isSkinnedMesh) c.boundingBox = null; });

    const box = new THREE.Box3().setFromObject(this.mesh);
    const height = box.max.y - box.min.y;
    const scale = height > 0 ? TARGET_HEIGHT / height : 1;
    this.mesh.scale.setScalar(scale);
    this.mesh.updateMatrixWorld(true);

    // Clear caches again before the second measurement.
    this.mesh.traverse(c => { if (c.isSkinnedMesh) c.boundingBox = null; });
    const box2 = new THREE.Box3().setFromObject(this.mesh);
    this.groundOffset = -box2.min.y;
    console.log('[Player] KayKit model:', modelPath, 'height:', height, 'scale:', scale, 'groundOffset:', this.groundOffset);
  }

  _bindEquipmentHolders() {
    this.equipmentHolders = {
      rightHand: new THREE.Group(),
      leftHand: new THREE.Group(),
      back: new THREE.Group(),
    };
    this.equipmentMeshes = {};

    this.mesh.add(this.equipmentHolders.rightHand);
    this.mesh.add(this.equipmentHolders.leftHand);
    this.mesh.add(this.equipmentHolders.back);
    this._placeEquipmentHolders();
  }

  _placeEquipmentHolders() {
    this._placeSlotHolder('rightHand');
    this._placeSlotHolder('leftHand');
    this._placeSlotHolder('back');
  }

  _placeSlotHolder(slot) {
    const holder = this.equipmentHolders[slot];
    if (!holder) return;

    const preset = KAYKIT_SOCKET_PRESETS[slot] || KAYKIT_SOCKET_PRESETS.rightHand;
    const anchorName = preset.anchor || this._defaultAnchorForSlot(slot);
    const offset = preset.offset || this._defaultCalibrationOffset();

    const anchor = this._getAnchorNode(anchorName) || this._getAnchorNode(this._defaultAnchorForSlot(slot));
    if (!anchor) return;
    if (holder.parent !== this.mesh) {
      this.mesh.add(holder);
    }
    this._applyAnchorOffsetToObject(holder, anchor, offset);
  }

  _applyItemTransform(mesh, itemId, slot) {
    const cfg = ITEM_TRANSFORMS[itemId]?.[slot] || ITEM_TRANSFORMS.default[slot] || ITEM_TRANSFORMS.default.rightHand;
    const grip = this._getActiveItemGripOffset(itemId, slot);
    mesh.position.set((cfg.x || 0) + grip.x, (cfg.y || 0) + grip.y, (cfg.z || 0) + grip.z);
    mesh.rotation.set((cfg.rx || 0) + grip.rx, (cfg.ry || 0) + grip.ry, (cfg.rz || 0) + grip.rz);
    mesh.scale.setScalar((cfg.scale || 1) * (grip.scale || 1));
  }

  _updateMesh() {
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y + this.groundOffset, this.position.z);
      this.mesh.rotation.y = this.rotation;
      this.mesh.updateMatrixWorld(true);
      this._placeEquipmentHolders();
    }
  }

  async _loadKayKitAnimations() {
    const clips = [];
    for (const path of KAYKIT_ANIMATION_PATHS) {
      try {
        const gltf = await assetLoader.loadGLTF(path);
        const loaded = gltf.animations || [];
        console.log(`[Anim] ${path}: ${loaded.length} clips → ${loaded.map(c => c.name).join(', ')}`);
        clips.push(...loaded);
      } catch (e) {
        console.error(`[Anim] FAILED to load: ${path}`, e);
      }
    }
    return clips;
  }

  _defaultCalibrationOffset() {
    return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  }

  _getAnchorNode(anchorName) {
    return anchorName && this.mesh ? this.mesh.getObjectByName(anchorName) : null;
  }

  _defaultAnchorForSlot(slot) {
    if (slot === 'leftHand') return 'handslotl';
    if (slot === 'back') return 'chest';
    return 'handslotr';
  }

  _combineOffsets(base = {}, extra = {}) {
    return {
      x: (base.x || 0) + (extra.x || 0),
      y: (base.y || 0) + (extra.y || 0),
      z: (base.z || 0) + (extra.z || 0),
      rx: (base.rx || 0) + (extra.rx || 0),
      ry: (base.ry || 0) + (extra.ry || 0),
      rz: (base.rz || 0) + (extra.rz || 0),
      scale: (base.scale || 1) * (extra.scale || 1),
    };
  }

  _applyEquippedItemTransform(slot) {
    const mesh = this.equipmentMeshes[slot];
    const itemId = this.loadout[slot];
    if (mesh && itemId) this._applyItemTransform(mesh, itemId, slot);
  }

  _getActiveItemGripOffset(itemId, slot) {
    const base = KAYKIT_ITEM_GRIP_PRESETS[itemId]?.[slot]
      || KAYKIT_ITEM_GRIP_PRESETS[itemId]?.default
      || KAYKIT_ITEM_GRIP_PRESETS.default?.[slot]
      || this._defaultCalibrationOffset();
    if (this.calibration.enabled && this.calibration.slot === slot) {
      return this._combineOffsets(base, this.calibration.offset);
    }
    return base;
  }

  _getActiveItemGripPreset(slot) {
    const itemId = this.loadout[slot];
    if (!itemId) return null;
    return {
      itemId,
      slot,
      offset: this._roundOffset(this._getActiveItemGripOffset(itemId, slot)),
    };
  }

  _roundVec(v) {
    return {
      x: Number(v.x.toFixed(4)),
      y: Number(v.y.toFixed(4)),
      z: Number(v.z.toFixed(4)),
    };
  }

  _roundOffset(offset) {
    return Object.fromEntries(Object.entries(offset).map(([key, value]) => [key, Number(value.toFixed(4))]));
  }

  _applyAnchorOffsetToObject(object, anchor, offset = {}) {
    this.mesh.updateMatrixWorld(true);
    anchor.updateWorldMatrix(true, false);

    _offsetPosition.set(offset.x || 0, offset.y || 0, offset.z || 0);
    _offsetEuler.set(offset.rx || 0, offset.ry || 0, offset.rz || 0);
    _offsetQuaternion.setFromEuler(_offsetEuler);
    _offsetScale.setScalar(offset.scale || 1);
    _anchorOffsetMatrix.compose(_offsetPosition, _offsetQuaternion, _offsetScale);

    _targetWorldMatrix.multiplyMatrices(anchor.matrixWorld, _anchorOffsetMatrix);
    _parentInverseMatrix.copy(this.mesh.matrixWorld).invert();
    _targetLocalMatrix.multiplyMatrices(_parentInverseMatrix, _targetWorldMatrix);
    _targetLocalMatrix.decompose(object.position, object.quaternion, object.scale);
  }
}
