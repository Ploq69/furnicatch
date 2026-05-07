import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { SFXMapper } from './SFXMapper.js';

// Loot type → glTF model path mapping
const LOOT_MODELS = {
  coin:         'Pirate Kit - Nov 2023/glTF/Prop_Coins.gltf',
  gem_blue:     'Pirate Kit - Nov 2023/glTF/UI_Gem_Blue.gltf',
  gem_green:    'Pirate Kit - Nov 2023/glTF/UI_Gem_Green.gltf',
  gem_pink:     'Pirate Kit - Nov 2023/glTF/UI_Gem_Pink.gltf',
  gold_bag:     'Pirate Kit - Nov 2023/glTF/Prop_GoldBag.gltf',
  crystal:      'Cube World - Aug 2023/Environment/glTF/Crystal_Small.gltf',
  health_meat:  'Pirate Kit - Nov 2023/glTF/UI_ChickenLeg.gltf',
  health_scifi: 'Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Health.gltf',
  key:          'Cube World - Aug 2023/Environment/glTF/Key.gltf',
  ore_coal:     'Cube World - Aug 2023/Pixel Blocks/glTF/Coal.gltf',
  ore_stone:    'Cube World - Aug 2023/Environment/glTF/Rock1.gltf',
  ore_metal:    'Cube World - Aug 2023/Blocks/glTF/Block_Metal.gltf',
  energy_orb:   'Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Sphere.gltf',
};

const LOOT_CONFIG = {
  coin:         { scale: 0.15, spin: 12.0, value: 1,  color: 0xffd700 },
  gem_blue:     { scale: 0.20, spin: 6.0,  value: 5,  color: 0x4488ff },
  gem_green:    { scale: 0.20, spin: 6.0,  value: 5,  color: 0x44ff88 },
  gem_pink:     { scale: 0.20, spin: 6.0,  value: 10, color: 0xff44cc },
  gold_bag:     { scale: 0.15, spin: 3.0,  value: 25, color: 0xffd700 },
  crystal:      { scale: 0.30, spin: 9.0,  value: 15, color: 0x00ffff },
  health_meat:  { scale: 0.20, spin: 3.0,  value: 0,  color: 0xff6644 },
  health_scifi: { scale: 0.25, spin: 6.0,  value: 0,  color: 0x44ff44 },
  key:          { scale: 0.20, spin: 12.0, value: 0,  color: 0xffaa00 },
  ore_coal:     { scale: 0.15, spin: 6.0,  value: 2,  color: 0x333333 },
  ore_stone:    { scale: 0.20, spin: 3.0,  value: 1,  color: 0x888888 },
  ore_metal:    { scale: 0.15, spin: 3.0,  value: 3,  color: 0x8899aa },
  energy_orb:   { scale: 0.20, spin: 12.0, value: 20, color: 0xaa44ff },
};

const GRAVITY = -15;
const BOUNCE_REST = 0.4;
const MAGNET_RANGE = 4.0; // magnetRange for loot hoover
const MAGNET_ACCEL = 15;
const MAGNET_MAX_SPEED = 12;
const COLLECT_DIST = 0.8;
const DESPAWN_TIME = 10; // despawn timer in seconds
const MAX_ACTIVE = 100;
const POOL_SIZE = 50;

export class LootDrop {
  constructor(scene) {
    this.scene = scene;
    this.drops = [];
    this.pools = new Map(); // type → array of pooled meshes
    this._initPools();
  }

  _initPools() {
    for (const [type, path] of Object.entries(LOOT_MODELS)) {
      this.pools.set(type, []);
    }
  }

  async preloadModels() {
    const promises = Object.entries(LOOT_MODELS).map(async ([type, path]) => {
      try {
        const gltf = await assetLoader.loadGLTF(path);
        if (!gltf || !gltf.scene) return;
        // Pre-clone pool meshes
        const pool = this.pools.get(type);
        for (let i = 0; i < POOL_SIZE; i++) {
          const mesh = gltf.scene.clone(true);
          const cfg = LOOT_CONFIG[type];
          mesh.scale.setScalar(cfg.scale);
          mesh.visible = false;
          this.scene.add(mesh);
          pool.push({ mesh, inUse: false });
        }
      } catch (e) {
        console.warn('[LootDrop] Failed to preload', type, e);
      }
    });
    await Promise.all(promises);
  }

  spawn(pos, type) {
    // lootSpawn: spawn a physical loot drop at position
    const pool = this.pools.get(type);
    if (!pool) return null;

    // Find free mesh in pool
    let entry = pool.find(p => !p.inUse);
    if (!entry) {
      // Pool exhausted — create fallback if under max
      if (this.drops.length >= MAX_ACTIVE) {
        // Remove oldest
        const oldest = this.drops.shift();
        if (oldest && oldest.mesh) oldest.mesh.visible = false;
      }
      // Try to clone from first pool entry
      if (pool.length > 0) {
        const mesh = pool[0].mesh.clone(true);
        const cfg = LOOT_CONFIG[type];
        mesh.scale.setScalar(cfg.scale);
        this.scene.add(mesh);
        entry = { mesh, inUse: true };
        pool.push(entry);
      } else {
        return null;
      }
    }

    entry.inUse = true;
    const mesh = entry.mesh;
    mesh.visible = true;
    mesh.position.copy(pos);
    mesh.position.y += 0.3;

    const cfg = LOOT_CONFIG[type];

    this.drops.push({
      mesh,
      entry,
      type,
      value: cfg.value,
      color: cfg.color,
      spinSpeed: cfg.spin,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * 2
      ),
      state: 'bounce',
      stateTime: 0,
      life: DESPAWN_TIME,
      bobPhase: Math.random() * Math.PI * 2,
    });

    return this.drops[this.drops.length - 1];
  }

  update(dt, playerPos, onCollect) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;

      if (d.life <= 0) {
        this._remove(i);
        continue;
      }

      // Despawn fade
      if (d.life < 1.0) {
        this._setOpacity(d.mesh, d.life);
      }

      // Spin
      d.mesh.rotation.y += d.spinSpeed * dt;

      const dist = playerPos.distanceTo(d.mesh.position);

      if (d.state === 'bounce') {
        // Physics
        d.velocity.y += GRAVITY * dt;
        d.mesh.position.addScaledVector(d.velocity, dt);

        // Ground bounce
        if (d.mesh.position.y < 0.1) {
          d.mesh.position.y = 0.1;
          d.velocity.y *= -BOUNCE_REST;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }

        d.stateTime += dt;
        if (d.stateTime > 0.3 && d.velocity.y < 0.5) {
          d.state = 'hover';
          d.velocity.set(0, 0, 0);
        }

        // Early magnet if very close
        if (dist < MAGNET_RANGE * 0.5 && d.stateTime > 0.1) {
          d.state = 'hover';
        }
      }

      if (d.state === 'hover') {
        // Bob
        d.bobPhase += dt * 3;
        d.mesh.position.y = 0.2 + Math.sin(d.bobPhase) * 0.1;

        // Magnet
        if (dist < MAGNET_RANGE) {
          const dir = new THREE.Vector3().subVectors(playerPos, d.mesh.position).normalize();
          const speed = Math.min(MAGNET_MAX_SPEED, MAGNET_ACCEL * (MAGNET_RANGE - dist));
          d.mesh.position.addScaledVector(dir, speed * dt);
        }
      }

      // Collect
      if (dist < COLLECT_DIST) {
        if (onCollect) onCollect(d.type, d.value, d.color);
        this._remove(i);
      }
    }
  }

  _remove(index) {
    const d = this.drops[index];
    if (d.entry) d.entry.inUse = false;
    if (d.mesh) {
      d.mesh.visible = false;
      this._setOpacity(d.mesh, 1);
    }
    this.drops.splice(index, 1);
  }

  _setOpacity(root, opacity) {
    root.traverse(c => {
      if (c.isMesh && c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach(m => { m.opacity = opacity; m.transparent = opacity < 1; });
        } else {
          c.material.opacity = opacity;
          c.material.transparent = opacity < 1;
        }
      }
    });
  }

  clear() {
    for (const d of this.drops) {
      if (d.entry) d.entry.inUse = false;
      if (d.mesh) { d.mesh.visible = false; this._setOpacity(d.mesh, 1); }
    }
    this.drops = [];
  }

  // Spawn multiple loot from a loot table roll
  spawnFromTable(pos, table) {
    const drops = [];
    // Always drops
    if (table.always) {
      for (const item of table.always) {
        for (let i = 0; i < item.count; i++) {
          drops.push(this.spawn(pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5)), item.type));
        }
      }
    }
    // Roll rarity tiers
    const roll = Math.random();
    let tier = null;
    if (roll < 0.05) tier = table.veryRare;
    else if (roll < 0.15) tier = table.rare;
    else if (roll < 0.40) tier = table.uncommon;
    else tier = table.common;

    if (tier) {
      for (const item of tier) {
        for (let i = 0; i < item.count; i++) {
          drops.push(this.spawn(pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5)), item.type));
        }
      }
    }
    return drops;
  }
}

export { LOOT_CONFIG };
