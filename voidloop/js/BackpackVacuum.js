// ==========================================
// Voidloop — Backpack Vacuum
// Automatically hovers loot from backpack to beacon with 3D animation.
// ==========================================

import * as THREE from 'three';
import { RESOURCE_META } from './ResourceInventory.js';
import { SFXMapper } from './SFXMapper.js';

const VACuum_RATE = 0.09;         // seconds between suck batches
const VACuum_BATCH = 2;           // items per tick
const FLY_SPEED_MIN = 5;
const FLY_SPEED_MAX = 9;
const ORB_SIZE = 0.32;

const RESOURCE_COLORS = {
  stone: 0xaaaaaa,
  dirt: 0x8b5a2b,
  iron_ore: 0x8899aa,
  copper_ore: 0xb87333,
  gold_ore: 0xffd700,
  loose_dirt: 0xa0522d,
  gravel_bits: 0x999999,
  scrap_stone: 0x777777,
  old_junk: 0x556b2f,
  moss_chip: 0x4ade80,
  crystal_shard: 0x60a5fa,
  amber: 0xf59e0b,
  ancient_bark: 0x8b4513,
  ash: 0x4a4a4a,
  magma_shard: 0xef4444,
  obsidian_fragment: 0x7c3aed,
  ember_essence: 0xf97316,
  ice_chunk: 0xa5f3fc,
  frost_shard: 0x22d3ee,
  glacial_metal: 0xc0c0c0,
  blizzard_essence: 0x67e8f9,
  sand: 0xfde68a,
  desert_shard: 0xfacc15,
  gold_nugget: 0xffb700,
  solar_essence: 0xfef08a,
  rust_chunk: 0x9a3412,
  gear_shard: 0x94a3b8,
  alloy_ingot: 0xfcd34d,
  furnace_ember: 0xea580c,
  mud_pie: 0x5d4037,
  moss_clump: 0x16a34a,
  petrified_bark: 0x3e2723,
  mire_essence: 0x15803d,
  brick_chip: 0xb91c1c,
  royal_shard: 0xdc2626,
  crown_jewel: 0xeab308,
};

export class BackpackVacuum {
  constructor(scene, runBackpack, resources, playerRef, uiRef) {
    this.scene = scene;
    this.runBackpack = runBackpack;
    this.resources = resources;
    this.player = playerRef;
    this.ui = uiRef;

    this.active = false;
    this.timer = 0;
    this.queue = [];          // { type, count }
    this.orbs = [];           // flying visual orbs
    this.totalCoins = 0;
    this.depositedSnapshot = []; // for UI summary
    this._textureCache = new Map();
    this._sfxTimer = 0;
    this._doneCallback = null;
    this.beaconPos = new THREE.Vector3();
  }

  start(beaconPos) {
    if (this.active) return;
    const all = this.runBackpack.getAll();
    if (all.length === 0) return;

    this.active = true;
    this.timer = 0;
    this.queue = all.map(item => ({ type: item.type, count: item.count }));
    this.totalCoins = 0;
    this.depositedSnapshot = [];
    this.beaconPos.copy(beaconPos);
    this._sfxTimer = 0;

    this._suckNext();
  }

  stop() {
    this.active = false;
    this.queue = [];
  }

  isIdle() {
    return !this.active && this.orbs.length === 0;
  }

  update(dt, playerPos, beaconPos) {
    this.beaconPos.copy(beaconPos);

    if (this.active && this.queue.length > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        for (let i = 0; i < VACuum_BATCH; i++) {
          if (this.queue.length === 0) break;
          this._suckNext();
        }
        this.timer = VACuum_RATE;
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;

      const toBeacon = new THREE.Vector3().subVectors(this.beaconPos, o.mesh.position);
      const dist = toBeacon.length();
      if (dist > 0.0001) toBeacon.normalize();

      const swirl = new THREE.Vector3(
        Math.sin(o.life * 8 + o.phase) * 1.2,
        Math.cos(o.life * 6 + o.phase) * 0.8,
        Math.sin(o.life * 7 + o.phase) * 1.2
      );

      if (dist > 0.0001) {
        o.vel.addScaledVector(toBeacon, o.accel * dt);
      }
      o.vel.addScaledVector(swirl, dt * 2);
      o.vel.multiplyScalar(1 - 0.5 * dt);

      const speed = o.vel.length();
      if (speed > o.maxSpeed) o.vel.multiplyScalar(o.maxSpeed / speed);

      o.mesh.position.addScaledVector(o.vel, dt);
      o.mesh.material.opacity = Math.min(1, dist * 0.8);
      const pulse = 0.8 + 0.2 * Math.sin(o.life * 12 + o.phase);
      o.mesh.scale.setScalar(ORB_SIZE * pulse);

      if (dist < 0.5 || o.life <= 0) {
        this._arrive(o);
        this._removeOrb(i);
      }
    }

    if ((this.active || this.orbs.length > 0)) {
      this._sfxTimer -= dt;
      if (this._sfxTimer <= 0) {
        SFXMapper.cashOutSuction?.();
        this._sfxTimer = 0.4;
      }
    }

    if (this.active && this.queue.length === 0 && this.orbs.length === 0) {
      this._finish();
    }
  }

  _suckNext() {
    if (this.queue.length === 0) return;
    const item = this.queue[0];
    const type = item.type;

    const removed = this.runBackpack.remove(type, 1);
    if (removed <= 0) {
      this.queue.shift();
      return;
    }

    item.count -= removed;
    if (item.count <= 0) this.queue.shift();

    const startPos = new THREE.Vector3(
      this.player.position.x + (Math.random() - 0.5) * 0.5,
      this.player.position.y + 0.5 + Math.random() * 0.4,
      this.player.position.z + (Math.random() - 0.5) * 0.5
    );

    const orb = this._createOrb(type, startPos);
    this.orbs.push(orb);
  }

  _createOrb(type, pos) {
    const texture = this._getTexture(type);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(ORB_SIZE);
    this.scene.add(sprite);

    const toBeacon = new THREE.Vector3().subVectors(this.beaconPos, pos);
    const baseSpeed = FLY_SPEED_MIN + Math.random() * (FLY_SPEED_MAX - FLY_SPEED_MIN);
    const vel = toBeacon.lengthSq() > 0.0001
      ? toBeacon.normalize().multiplyScalar(baseSpeed)
      : new THREE.Vector3(0, baseSpeed, 0);

    return {
      mesh: sprite,
      type,
      vel,
      accel: 16 + Math.random() * 10,
      maxSpeed: 14 + Math.random() * 5,
      phase: Math.random() * Math.PI * 2,
      life: 2.5,
    };
  }

  _getTexture(type) {
    if (this._textureCache.has(type)) return this._textureCache.get(type);

    const colorHex = RESOURCE_COLORS[type] || 0x4ade80;
    const r = ((colorHex >> 16) & 0xff) / 255;
    const g = ((colorHex >> 8) & 0xff) / 255;
    const b = (colorHex & 0xff) / 255;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Outer glow
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 1)`);
    grad.addColorStop(0.5, `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.5)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    // Bright core
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._textureCache.set(type, tex);
    return tex;
  }

  _arrive(orb) {
    const type = orb.type;
    const meta = RESOURCE_META[type] || {};
    const value = meta.value || 0;

    this.resources.add(type, 1);
    const coins = value;
    this.totalCoins += coins;

    const existing = this.depositedSnapshot.find(d => d.type === type);
    if (existing) {
      existing.count += 1;
      existing.coins += coins;
    } else {
      this.depositedSnapshot.push({
        type,
        count: 1,
        name: meta.name || type,
        coins,
      });
    }

    const game = window._game;
    if (game?.particles) {
      const color = RESOURCE_COLORS[type] || 0x4ade80;
      game.particles.spawn({
        pos: this.beaconPos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.6
        )),
        count: 2,
        color,
        speed: 1.5,
        life: 0.25,
        size: 0.12,
        texture: 'spark',
      });
    }
  }

  _removeOrb(i) {
    const o = this.orbs[i];
    this.scene.remove(o.mesh);
    o.mesh.material.dispose();
    const last = this.orbs.pop();
    if (last && last !== o) this.orbs[i] = last;
  }

  _finish() {
    this.active = false;

    if (this.totalCoins > 0 && this.player.coins !== Infinity) {
      this.player.coins += this.totalCoins;
    }

    if (this.ui) {
      if (this.totalCoins > 0) {
        this.ui.showFloatingText(`Deposited +${this.totalCoins} coins`, 0xfbbf24);
      } else if (this.depositedSnapshot.length > 0) {
        this.ui.showFloatingText('Backpack emptied', 0x4ade80);
      }
    }

    if (this._doneCallback) {
      this._doneCallback(this.depositedSnapshot, this.totalCoins);
      this._doneCallback = null;
    }
  }

  onComplete(cb) {
    this._doneCallback = cb;
  }

  dispose() {
    for (const o of this.orbs) {
      this.scene.remove(o.mesh);
      o.mesh.material.dispose();
    }
    this.orbs = [];
    for (const tex of this._textureCache.values()) {
      tex.dispose();
    }
    this._textureCache.clear();
  }
}
