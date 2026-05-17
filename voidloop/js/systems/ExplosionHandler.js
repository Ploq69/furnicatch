import * as THREE from 'three';
import { audio } from '../AudioManager.js';
import { SFXMapper } from '../SFXMapper.js';
import { GAME, BLOCK_LOOT_TABLES, BLOCK_TYPES } from '../constants.js';
import { FLIPBOOK_EFFECTS } from '../FlipbookVFX.js';
import { getZoneAtPosition } from '../ZoneData.js';

export class ExplosionHandler {
  constructor(game) {
    this.game = game;
  }

  grenade(position, config = {}) {
    return this.blast(position, {
      kind: 'grenade',
      radius: config.radius || GAME.GRENADE_RADIUS,
      damage: config.damage || GAME.GRENADE_DAMAGE,
      attackerWeaponId: config.attackerWeaponId || 'grenade',
      remote: !!config.remote,
      syncEventType: 'grenade_exploded',
      maxTerrainCells: GAME.GRENADE_MAX_TERRAIN_CELLS,
      floatingBlockCap: GAME.GRENADE_FLOATING_BLOCK_CAP,
      terrainCenterOffsetY: 0,
      terrainMinedCap: 12,
      lootBudget: 5,
      letterBudget: 2,
    });
  }

  missile(position, config = {}) {
    return this.blast(position, {
      kind: 'missile',
      radius: config.radius || GAME.MISSILE_STRIKE_RADIUS,
      damage: config.damage || GAME.MISSILE_STRIKE_DAMAGE,
      attackerWeaponId: config.attackerWeaponId || 'missile_strike',
      remote: !!config.remote,
      maxTerrainCells: GAME.MISSILE_STRIKE_MAX_TERRAIN_CELLS,
      floatingBlockCap: GAME.MISSILE_STRIKE_FLOATING_BLOCK_CAP,
      terrainCenterOffsetY: -0.85,
      terrainMinedCap: 24,
      lootBudget: 7,
      letterBudget: 2,
    });
  }

  blast(position, config = {}) {
    const radius = config.radius || GAME.GRENADE_RADIUS;
    const damage = config.damage || GAME.GRENADE_DAMAGE;
    const radiusSq = radius * radius;
    const isRemote = !!config.remote;
    const attackerWeaponId = config.attackerWeaponId || 'grenade';
    const isMissile = config.kind === 'missile';

    if (isMissile) {
      SFXMapper.missileImpact();
      this.game.particles.burst(position, 0xff8a00, 40);
      this.game.particles.spark(position, 26);
      this.game.particles.spawn({ pos: position, count: 34, color: 0x4f453c, speed: 7.5, life: 1.1, size: 0.52, texture: 'smoke' });
      this.game.particles.spawn({ pos: position, count: 24, color: 0x9a6b35, speed: 7, life: 0.9, size: 0.36, texture: 'dirt' });
      this.game.flipbooks.spawn({ ...FLIPBOOK_EFFECTS.explosion, pos: position.clone().add(new THREE.Vector3(0, 0.35, 0)), scale: 5.6, fps: 20 });
      this.shockwave(position, radius, 0xffaa33);
      this.impactLight(position, 0xff8a33, 4.8, 0.28);
      this.game._screenShake(2.35, 0.56);
    } else {
      SFXMapper.grenadeExplosion();
      this.game.particles.burst(position, 0xff6600, 22);
      this.game.particles.spark(position, 14);
      this.game.particles.spawn({ pos: position, count: 18, color: 0x6f6254, speed: 5, life: 0.75, size: 0.34, texture: 'smoke' });
      this.game.flipbooks.spawn({ pos: position.clone().add(new THREE.Vector3(0, 0.2, 0)), ...FLIPBOOK_EFFECTS.explosion });
      this.game._screenShake(1.15, 0.32);
    }

    if (this.game.isMultiplayer && this.game.net && !isRemote && config.syncEventType) {
      this.game.net.syncEvent(config.syncEventType, {
        x: position.x,
        y: position.y,
        z: position.z,
        radius,
        damage,
        attackerWeaponId,
      });
    }

    for (const enemy of this.game.world.enemies) {
      if (enemy.dead) continue;
      const hitPos = enemy.position.clone().add(new THREE.Vector3(0, 0.45, 0));
      const distSq = hitPos.distanceToSquared(position);
      if (distSq > radiusSq) continue;
      const dist = Math.sqrt(distSq);
      const falloff = Math.max(0.25, 1 - dist / radius);
      enemy.takeDamage(Math.round(damage * falloff), attackerWeaponId);
      this.game.particles.spark(hitPos, 3);
    }

    const zone = getZoneAtPosition(position.x, position.z);
    const terrainCenter = position.clone();
    terrainCenter.y += config.terrainCenterOffsetY || 0;
    const depth = Math.max(0, 1 - terrainCenter.y);
    const typeKey = depth > 12 ? 'stone_dark' : depth > 4 ? 'stone' : 'dirt';
    const terrainResult = this.game.world.explodeTerrain(terrainCenter, {
      radius,
      zoneId: zone?.id || null,
      type: typeKey,
      maxCells: config.maxTerrainCells || GAME.GRENADE_MAX_TERRAIN_CELLS,
    });
    if (terrainResult.meaningful && !isRemote) {
      this.game.blocksMined += Math.max(1, Math.min(config.terrainMinedCap || 12, Math.round((terrainResult.removedCells || 1) / 24)));
      this.game.mining.awardTerrainDigRewards(terrainResult, terrainCenter, terrainResult.zoneId);
    }

    const candidates = [];
    for (const block of this.game.world.floatingBlocks) {
      if (!block || block.destroyed) continue;
      const blockCenter = block.position.clone().add(new THREE.Vector3(0.5, 0.5, 0.5));
      const distSq = blockCenter.distanceToSquared(position);
      if (distSq <= radiusSq) candidates.push({ block, distSq, blockCenter });
    }
    candidates.sort((a, b) => a.distSq - b.distSq);

    let destroyedFloating = 0;
    let lootBudget = config.lootBudget ?? 5;
    let letterBudget = config.letterBudget ?? 2;
    const resourceRewards = new Map();
    const maxFloating = config.floatingBlockCap || GAME.GRENADE_FLOATING_BLOCK_CAP;

    for (const { block, blockCenter } of candidates) {
      if (destroyedFloating >= maxFloating) break;
      const status = this.game.mining.getStatus(block, { isPickaxe: true });
      if (!status.allowed) continue;

      const blockType = block.typeKey;
      const blockZoneId = block.zoneId;
      this.game.world.mineBlock(block, this.game.particles, audio);
      destroyedFloating++;

      if (isRemote) continue;

      if (lootBudget > 0) {
        const table = BLOCK_LOOT_TABLES[blockType];
        if (table) {
          this.game.loot.spawnFromTable(blockCenter, table);
          lootBudget--;
        }
      }

      if (letterBudget > 0 && Math.random() < 0.18) {
        const letter = this.game._pickLetterForZone(blockZoneId || this.game.zoneManager.currentZoneId);
        if (letter) {
          this.game.letterDrops.spawn(blockCenter, letter);
          letterBudget--;
        }
      }

      const blockDef = BLOCK_TYPES[blockType];
      if (blockDef?.resource) {
        resourceRewards.set(blockDef.resource, (resourceRewards.get(blockDef.resource) || 0) + 1);
      }
    }

    if (!isRemote && destroyedFloating > 0) {
      this.game.blocksMined += destroyedFloating;
      this.game.ui.showFloatingText(`${isMissile ? 'Strike' : 'Blast'} broke ${destroyedFloating}`, 0xffaa00);
      for (const [resource, amount] of resourceRewards) {
        if (this.game.resources.add(resource, amount)) {
          this.game.batchResourceText(resource, amount, 0x88ccff);
        }
      }
    }
  }

  shockwave(position, radius, color = 0xffaa33) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.035, 8, 64), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position).add(new THREE.Vector3(0, 0.08, 0));
    this.game.scene.add(ring);

    const start = performance.now();
    const duration = 360;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      ring.scale.setScalar(1 + t * radius * 1.15);
      mat.opacity = 0.72 * (1 - t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.game.scene.remove(ring);
        ring.geometry.dispose();
        mat.dispose();
      }
    };
    animate();
  }

  impactLight(position, color = 0xff8a33, intensity = 4, duration = 0.25) {
    const light = new THREE.PointLight(color, intensity, 18, 2);
    light.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
    this.game.scene.add(light);
    const start = performance.now();
    const total = duration * 1000;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / total);
      light.intensity = intensity * (1 - t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.game.scene.remove(light);
      }
    };
    animate();
  }
}
