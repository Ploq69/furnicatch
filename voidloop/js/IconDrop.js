// ==========================================
// Voidloop — Icon Resource Drops (Instanced)
// 2D sprite-based drops using InstancedMesh.
// ==========================================

import * as THREE from 'three';
import { DropInstancer } from './DropInstancer.js';

const ICON_PATHS = {
  // Demo / ourCraft resources
  stone:           'assets/icons/drops/stone.png',
  dirt:            'assets/icons/drops/dirt.png',
  iron_ore:        'assets/icons/drops/iron_ore.png',
  copper_ore:      'assets/icons/drops/copper_ore.png',
  gold_ore:        'assets/icons/drops/gold_ore.png',

  loose_dirt:      'assets/icons/drops/loose_dirt.png',
  gravel_bits:     'assets/icons/drops/gravel_bits.png',
  scrap_stone:     'assets/icons/drops/scrap_stone.png',
  old_junk:        '../Free Icon Pack v3.1 (Basic)/Item/Chest/64px/Chest 1st 64px.png',
  moss_chip:       '../Free Icon Pack v3.1 (Basic)/Nature/Leaf/64px/Leaf 2nd 64px.png',
  crystal_shard:   'assets/icons/drops/crystal_shard.png',
  amber:           'assets/icons/drops/amber.png',
  ancient_bark:    '../Free Icon Pack v3.1 (Basic)/Nature/Wheat/64px/Wheat 1st 64px.png',
  ash:             'assets/icons/drops/ash.png',
  magma_shard:     'assets/icons/drops/magma_shard.png',
  obsidian_fragment:'../Free Icon Pack v3.1 (Basic)/Item/Bomb/64px/Bomb 1st 64px.png',
  ember_essence:   '../Free Icon Pack v3.1 (Basic)/Item/Potion/64px/Red Potion 1st 64px.png',
  ice_chunk:       'assets/icons/drops/ice_chunk.png',
  frost_shard:     'assets/icons/drops/frost_shard.png',
  glacial_metal:   '../Free Icon Pack v3.1 (Basic)/Currency/Ingot/64px/Silver 1st 64px.png',
  blizzard_essence:'../Free Icon Pack v3.1 (Basic)/Currency/Crystal/64w/Crystal Blue Outline 64px.png',
  sand:            'assets/icons/drops/sand.png',
  desert_shard:    '../Free Icon Pack v3.1 (Basic)/Currency/Crystal/64w/Crystal Yellow 64px.png',
  gold_nugget:     'assets/icons/drops/gold_nugget.png',
  solar_essence:   '../Free Icon Pack v3.1 (Basic)/Currency/Crystal/64w/Crystal Yellow Outline 64px.png',
  rust_chunk:      'assets/icons/drops/rust_chunk.png',
  gear_shard:      'assets/icons/drops/gear_shard.png',
  alloy_ingot:     '../Free Icon Pack v3.1 (Basic)/Currency/Ingot/64px/Gold 1st 64px.png',
  furnace_ember:   '../Free Icon Pack v3.1 (Basic)/Item/Torch/64w/Torch 1st 64px.png',
  mud_pie:         'assets/icons/drops/mud_pie.png',
  moss_clump:      '../Free Icon Pack v3.1 (Basic)/Nature/Leaf/64px/Leaf 2nd 64px.png',
  petrified_bark:  '../Free Icon Pack v3.1 (Basic)/Nature/Wheat/64px/Wheat 1st 64px.png',
  mire_essence:    '../Free Icon Pack v3.1 (Basic)/Item/Potion/64px/Green Potion 1st 64px.png',
  brick_chip:      'assets/icons/drops/brick_chip.png',
  royal_shard:     '../Free Icon Pack v3.1 (Basic)/Currency/Crystal/64w/Crystal Red Outline 64px.png',
  crown_jewel:     'assets/icons/drops/crown_jewel.png',
};

const GRAVITY = -15;
const BOUNCE_REST = 0.4;
const COLLECT_DIST = 1.2;
const MAGNET_RANGE = 3.5;
const MAGNET_ACCEL = 12;
const MAGNET_MAX_SPEED = 10;
const DESPAWN_TIME = 12;
const CAPACITY_PER_TYPE = 80; // was 12
const MAX_ACTIVE = 600;       // was 80

const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();
const _planeGeo = new THREE.PlaneGeometry(0.5, 0.5);

export class IconDrop {
  constructor(scene) {
    this.scene = scene;
    this.drops = [];
    this.instancer = new DropInstancer(scene);
    this.textures = new Map();
    this.preloaded = false;
  }

  async preload() {
    if (this.preloaded) return;
    const promises = Object.entries(ICON_PATHS).map(async ([type, path]) => {
      try {
        const texture = await this._loadTexture(path);
        if (!texture) return;
        this.textures.set(type, texture);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        this.instancer.registerType(type, _planeGeo, material, CAPACITY_PER_TYPE);
      } catch (e) {
        console.warn('[IconDrop] Failed to preload', type, path, e);
      }
    });
    await Promise.all(promises);
    this.preloaded = true;
  }

  _loadTexture(path) {
    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  spawn(pos, type, amount = 1) {
    const results = [];
    for (let i = 0; i < amount; i++) {
      if (this.drops.length >= MAX_ACTIVE) {
        const oldest = this.drops[0];
        this._remove(0);
      }

      const index = this.instancer.alloc(type);
      if (index < 0) break;

      const x = pos.x + (Math.random() - 0.5) * 0.6;
      const y = pos.y + 0.3;
      const z = pos.z + (Math.random() - 0.5) * 0.6;

      _tmpPos.set(x, y, z);
      _tmpQuat.identity();
      _tmpScale.setScalar(1);
      this.instancer.setTransform(type, index, _tmpPos, _tmpQuat, _tmpScale);

      const drop = {
        type,
        index,
        amount: 1,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          3 + Math.random() * 3,
          (Math.random() - 0.5) * 2.5
        ),
        state: 'bounce',
        stateTime: 0,
        life: DESPAWN_TIME,
        bobPhase: Math.random() * Math.PI * 2,
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 1,
      };
      this.drops.push(drop);
      results.push(drop);
    }
    return results;
  }

  update(dt, playerPos, onCollect) {
    if (!this.preloaded) return;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;

      if (d.life <= 0) {
        this._remove(i);
        continue;
      }

      // Frame-based fade (replaces toxic setInterval)
      let scaleMul = 1;
      if (d.life < 2.0) {
        scaleMul = Math.max(0, d.life / 2.0);
      }

      const dx = playerPos.x - d.position.x;
      const dy = playerPos.y - d.position.y;
      const dz = playerPos.z - d.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (d.state === 'bounce') {
        d.velocity.y += GRAVITY * dt;
        d.position.x += d.velocity.x * dt;
        d.position.y += d.velocity.y * dt;
        d.position.z += d.velocity.z * dt;
        d.rotation.z += d.velocity.x * dt * 2;
        d.rotation.x += d.velocity.z * dt * 2;

        if (d.position.y <= 0.25) {
          d.position.y = 0.25;
          d.velocity.y *= -BOUNCE_REST;
          d.velocity.x *= 0.7;
          d.velocity.z *= 0.7;
          if (Math.abs(d.velocity.y) < 0.5) {
            d.state = 'hover';
            d.stateTime = 0;
          }
        }
      } else if (d.state === 'hover') {
        d.stateTime += dt;
        d.bobPhase += dt * 3;
        d.position.y = 0.25 + Math.sin(d.bobPhase) * 0.1;
        d.rotation.x = 0;
        d.rotation.z = 0;

        if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
          const dist = Math.sqrt(distSq);
          const dir = _tmpDir.set(dx, dy, dz).multiplyScalar(dist > 0.0001 ? 1 / dist : 0);
          const speed = Math.min(MAGNET_MAX_SPEED, MAGNET_ACCEL * (MAGNET_RANGE - dist));
          d.position.x += dir.x * speed * dt;
          d.position.y += dir.y * speed * dt;
          d.position.z += dir.z * speed * dt;
        }
      }

      _tmpQuat.setFromEuler(d.rotation);
      _tmpScale.setScalar(scaleMul);
      this.instancer.setTransform(d.type, d.index, d.position, _tmpQuat, _tmpScale);

      if (distSq < COLLECT_DIST * COLLECT_DIST) {
        const collected = onCollect ? onCollect(d.type, d.amount) : true;
        if (collected !== false) {
          this._remove(i);
        }
      }
    }

    this.instancer.upload();
  }

  _remove(i) {
    const d = this.drops[i];
    if (!d) return;
    this.instancer.free(d.type, d.index);
    const last = this.drops.pop();
    if (last && last !== d) this.drops[i] = last;
  }

  clear() {
    this.instancer.clear();
    this.drops = [];
  }

  getActiveCount() {
    return this.drops.length;
  }
}
