import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetLoader } from './AssetLoader.js';
import { DropInstancer } from './DropInstancer.js';

// Loot type → glTF model path mapping
const LOOT_MODELS = {
  coin:         'Pirate Kit - Nov 2023/glTF/Prop_Coins.gltf',
  gem_blue:     'Pirate Kit - Nov 2023/glTF/UI_Gem_Blue.gltf',
  gem_green:    'Pirate Kit - Nov 2023/glTF/UI_Gem_Green.gltf',
  gem_pink:     'Pirate Kit - Nov 2023/glTF/UI_Gem_Pink.gltf',
  gold_bag:     'Pirate Kit - Nov 2023/glTF/Prop_GoldBag.gltf',
  crystal:      'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf',
  health_meat:  'Pirate Kit - Nov 2023/glTF/UI_ChickenLeg.gltf',
  health_scifi: 'Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Health.gltf',
  key:          'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/journal_closed.gltf',
  ore_coal:     'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf',
  ore_stone:    'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_1_A_Color1.gltf',
  ore_metal:    'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf',
  energy_orb:   'Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Sphere.gltf',
};

const LOOT_CONFIG = {
  coin:         { scale: 0.75, spin: 12.0, value: 1,  color: 0xffd700 },
  gem_blue:     { scale: 1.00, spin: 6.0,  value: 5,  color: 0x4488ff },
  gem_green:    { scale: 1.00, spin: 6.0,  value: 5,  color: 0x44ff88 },
  gem_pink:     { scale: 1.00, spin: 6.0,  value: 10, color: 0xff44cc },
  gold_bag:     { scale: 0.75, spin: 3.0,  value: 25, color: 0xffd700 },
  crystal:      { scale: 0.40, spin: 9.0,  value: 15, color: 0x00ffff },
  health_meat:  { scale: 1.00, spin: 3.0,  value: 0,  color: 0xff6644 },
  health_scifi: { scale: 1.25, spin: 6.0,  value: 0,  color: 0x44ff44 },
  key:          { scale: 1.00, spin: 12.0, value: 0,  color: 0xffaa00 },
  ore_coal:     { scale: 0.75, spin: 6.0,  value: 2,  color: 0x333333 },
  ore_stone:    { scale: 1.00, spin: 3.0,  value: 1,  color: 0x888888 },
  ore_metal:    { scale: 0.75, spin: 3.0,  value: 3,  color: 0x8899aa },
  energy_orb:   { scale: 1.00, spin: 12.0, value: 20, color: 0xaa44ff },
};

const GRAVITY = -15;
const BOUNCE_REST = 0.4;
const MAGNET_RANGE = 4.0;
const MAGNET_ACCEL = 15;
const MAGNET_MAX_SPEED = 12;
const COLLECT_DIST = 0.8;
const DESPAWN_TIME = 10;
const CAPACITY_PER_TYPE = 120; // was POOL_SIZE=50 — now much higher
const MAX_ACTIVE = 600;        // was 100 — now supports 500+

const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

function extractGeometryAndMaterial(scene) {
  scene.updateMatrixWorld(true);
  const geometries = [];
  let material = null;
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);
      if (!material) {
        material = Array.isArray(child.material) ? child.material[0].clone() : child.material.clone();
      }
    }
  });
  if (geometries.length === 0) return null;
  let geometry = geometries[0];
  if (geometries.length > 1) {
    try {
      geometry = mergeGeometries(geometries);
    } catch (e) {
      // Fallback: use first geometry if merge fails (attribute mismatch)
      geometry = geometries[0];
    }
  }
  if (!material) material = new THREE.MeshStandardMaterial();
  return { geometry, material };
}

export class LootDrop {
  constructor(scene) {
    this.scene = scene;
    this.drops = [];
    this.instancer = new DropInstancer(scene);
    this._preloaded = false;
  }

  async preloadModels() {
    if (this._preloaded) return;
    const promises = Object.entries(LOOT_MODELS).map(async ([type, path]) => {
      try {
        const gltf = await assetLoader.loadGLTF(path);
        if (!gltf?.scene) return;
        const extracted = extractGeometryAndMaterial(gltf.scene);
        if (!extracted) return;
        const cfg = LOOT_CONFIG[type];
        // Pre-scale geometry so instance scale stays near 1
        extracted.geometry.scale(cfg.scale, cfg.scale, cfg.scale);
        // Optimize geometry
        extracted.geometry.computeBoundingSphere();
        this.instancer.registerType(type, extracted.geometry, extracted.material, CAPACITY_PER_TYPE);
      } catch (e) {
        console.warn('[LootDrop] Failed to preload', type, e);
      }
    });
    await Promise.all(promises);
    this._preloaded = true;
  }

  spawn(pos, type, offsetX = 0, offsetZ = 0) {
    if (!this._preloaded) return null;
    if (this.drops.length >= MAX_ACTIVE) {
      // Remove oldest
      const oldest = this.drops[0];
      this._remove(0);
    }

    const index = this.instancer.alloc(type);
    if (index < 0) return null; // pool full

    const cfg = LOOT_CONFIG[type];
    const x = pos.x + offsetX;
    const y = pos.y + 0.3;
    const z = pos.z + offsetZ;

    _tmpPos.set(x, y, z);
    _tmpQuat.identity();
    _tmpScale.setScalar(1);
    this.instancer.setTransform(type, index, _tmpPos, _tmpQuat, _tmpScale);

    const drop = {
      type,
      index,
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
      position: new THREE.Vector3(x, y, z),
      rotY: 0,
      scale: 1,
    };
    this.drops.push(drop);
    return drop;
  }

  update(dt, playerPos, onCollect) {
    if (!this._preloaded) return;
    let collectedAny = false;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;

      if (d.life <= 0) {
        this._remove(i);
        continue;
      }

      // Fade out via scale when nearly dead
      let scaleMul = 1;
      if (d.life < 0.5) {
        scaleMul = Math.max(0, d.life / 0.5);
      }

      // Spin
      d.rotY += d.spinSpeed * dt;

      const dx = playerPos.x - d.position.x;
      const dy = playerPos.y - d.position.y;
      const dz = playerPos.z - d.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (d.state === 'bounce') {
        d.velocity.y += GRAVITY * dt;
        d.position.x += d.velocity.x * dt;
        d.position.y += d.velocity.y * dt;
        d.position.z += d.velocity.z * dt;

        if (d.position.y < 0.1) {
          d.position.y = 0.1;
          d.velocity.y *= -BOUNCE_REST;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }

        d.stateTime += dt;
        if (d.stateTime > 0.3 && d.velocity.y < 0.5) {
          d.state = 'hover';
          d.velocity.set(0, 0, 0);
        }

        if (distSq < MAGNET_RANGE * MAGNET_RANGE * 0.25 && d.stateTime > 0.1) {
          d.state = 'hover';
        }
      }

      if (d.state === 'hover') {
        d.bobPhase += dt * 3;
        d.position.y = 0.2 + Math.sin(d.bobPhase) * 0.1;

        if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
          const dist = Math.sqrt(distSq);
          const dir = _tmpDir.set(dx, dy, dz).multiplyScalar(dist > 0.0001 ? 1 / dist : 0);
          const speed = Math.min(MAGNET_MAX_SPEED, MAGNET_ACCEL * (MAGNET_RANGE - dist));
          d.position.x += dir.x * speed * dt;
          d.position.y += dir.y * speed * dt;
          d.position.z += dir.z * speed * dt;
        }
      }

      // Write transform
      _tmpQuat.setFromAxisAngle(_upAxis, d.rotY);
      _tmpScale.setScalar(scaleMul);
      this.instancer.setTransform(d.type, d.index, d.position, _tmpQuat, _tmpScale);

      // Collect
      if (distSq < COLLECT_DIST * COLLECT_DIST) {
        if (onCollect) onCollect(d.type, d.value, d.color);
        this._remove(i);
        collectedAny = true;
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

  spawnFromTable(pos, table) {
    const drops = [];
    if (table.always) {
      for (const item of table.always) {
        for (let i = 0; i < item.count; i++) {
          const d = this.spawn(pos, item.type, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
          if (d) drops.push(d);
        }
      }
    }
    const roll = Math.random();
    let tier = null;
    if (roll < 0.05) tier = table.veryRare;
    else if (roll < 0.15) tier = table.rare;
    else if (roll < 0.40) tier = table.uncommon;
    else tier = table.common;

    if (tier) {
      for (const item of tier) {
        for (let i = 0; i < item.count; i++) {
          const d = this.spawn(pos, item.type, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
          if (d) drops.push(d);
        }
      }
    }
    return drops;
  }
}

export { LOOT_CONFIG };
