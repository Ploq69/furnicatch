import * as THREE from 'three';
import { audio } from '../AudioManager.js';
import { GAME, BLOCK_LOOT_TABLES, BLOCK_TYPES } from '../constants.js';
import { getZoneAtPosition, getZoneById } from '../ZoneData.js';
import { getBlockProperties } from '../BlockProperties.js';

export class MiningSystem {
  constructor(game) {
    this.game = game;
    this._rewardFeedbackQueue = [];
    this._resourceTextBatcher = new Map();
    this._RESOURCE_TEXT_FLUSH_DELAY = 0.8; // seconds of inactivity before flush
    this._RESOURCE_TEXT_IMMEDIATE_FLUSH = 1000; // flush instantly at this threshold
  }

  findNearestEnemy(range) {
    let nearest = null;
    let nearestDist = range;
    for (const enemy of this.game.world.enemies) {
      if (enemy.dead) continue;
      const dist = this.game.player.position.distanceTo(enemy.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  findTarget(range) {
    let nearest = null;
    let nearestDist = range;
    const playerPos = this.game.player.position;
    const aim = this.game._getMiningAim();
    const forward = new THREE.Vector3(aim.direction.x, 0, aim.direction.z);
    if (forward.lengthSq() < 0.001) forward.set(Math.sin(this.game.player.rotation), 0, Math.cos(this.game.player.rotation));
    forward.normalize();

    const weaponId = this.game.player.weapons[this.game.player.currentSlot]?.data?.id || 'unknown';
    const isPickaxe = weaponId === 'pickaxe';

    // ── 1. Floating blocks (original behaviour) ──
    for (const block of this.game.world.blocks.values()) {
      if (block.destroyed) continue;

      const blockIsFloating = block.isFloating === true;
      if (!blockIsFloating) continue;

      // Forward cone check — only blocks in front of the player
      const toBlock = block.position.clone().sub(playerPos);
      toBlock.y = 0;
      const dist = toBlock.length();
      if (dist > range) continue;

      toBlock.normalize();
      const dot = Math.max(-1, Math.min(1, forward.dot(toBlock)));
      const angle = Math.acos(dot);
      if (angle > Math.PI / 2.5) continue; // ~72° forward cone

      // Block must be at or above ankle level
      if (block.position.y + 0.5 < playerPos.y - 0.5) continue;

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = block;
      }
    }

    if (nearest) {
      return this.getStatus(nearest, { isPickaxe });
    }

    // ── 2. Terrain blocks — raycast against unified mesh ──
    if (isPickaxe) {
      const terrainTarget = this.findTerrainTarget(aim, forward, range, isPickaxe);
      if (terrainTarget) return terrainTarget;
    }

    return null;
  }

  findTerrainTarget(aim, forward, range, isPickaxe) {
    if (!this.game.world?.terrainMesh?.raycast) return null;

    const playerFocus = this.game.player.position.clone().add(new THREE.Vector3(0, 0.65, 0));
    const attempts = [];

    if (this.game.cameraMode === 'thirdPerson') {
      // Precision pass: camera/crosshair aim, but long enough to travel from
      // the camera to the player's reachable mining bubble.
      const cameraToPlayer = Math.max(0, aim.origin.distanceTo(playerFocus));
      attempts.push({
        origin: aim.origin.clone(),
        dirs: [aim.direction.clone().normalize()],
        rayRange: cameraToPlayer + range + 2.5,
        maxPlayerDistance: range + 1.0,
      });

      // Auto-target pass: swing straight from the player like isometric mode,
      // with a little vertical fan so walls, ceilings, and floor lips all work.
      attempts.push({
        origin: playerFocus,
        dirs: [
          forward.clone().setY(0.05).normalize(),
          forward.clone().setY(0.28).normalize(),
          forward.clone().setY(-0.35).normalize(),
          forward.clone().multiplyScalar(0.85).add(new THREE.Vector3(0, -0.65, 0)).normalize(),
        ],
        rayRange: range + 1.35,
        maxPlayerDistance: range + 0.85,
      });
    } else {
      attempts.push({
        origin: aim.origin,
        dirs: [
          aim.direction.clone(),
          aim.direction.clone().multiplyScalar(0.75).add(new THREE.Vector3(0, -0.65, 0)).normalize(),
          new THREE.Vector3(0, -1, 0),
        ],
        rayRange: range,
        maxPlayerDistance: range + 0.5,
      });
    }

    for (const attempt of attempts) {
      for (const dir of attempt.dirs) {
        if (!dir || dir.lengthSq() < 0.001) continue;
        const raycaster = new THREE.Raycaster(attempt.origin, dir.normalize(), 0.05, attempt.rayRange);
        const hit = this.game.world.terrainMesh.raycast(raycaster, attempt.origin, attempt.rayRange + 2);
        if (!hit?.point) continue;
        if (hit.point.distanceTo(playerFocus) > attempt.maxPlayerDistance) continue;
        const target = this._buildTerrainMiningStatusFromHit(hit, isPickaxe);
        if (target) return target;
      }
    }

    if (this.game.cameraMode === 'iso' || this.game.cameraMode === 'topDown') {
      const underfootTarget = this.findUnderfootTarget(isPickaxe);
      if (underfootTarget) return underfootTarget;
    }

    return null;
  }

  findUnderfootTarget(isPickaxe) {
    if (!this.game.world?.terrainMesh) return null;
    const base = this.game.player.position;
    const offsets = [
      [0, 0],
      [0.34, 0],
      [-0.34, 0],
      [0, 0.34],
      [0, -0.34],
    ];

    for (const [ox, oz] of offsets) {
      const x = base.x + ox;
      const z = base.z + oz;
      const zone = getZoneAtPosition(x, z);
      if (!zone) continue;

      const groundY = this.game.world.getGroundHeightAt(x, z, base.y + 0.4);
      if (!Number.isFinite(groundY) || groundY <= -998) continue;

      const center = new THREE.Vector3(x, groundY - 0.45, z);
      if (!this.game.world.terrainMesh.isSolidAt(center.x, center.y, center.z)) {
        center.y = groundY - 0.85;
      }
      if (!this.game.world.terrainMesh.isSolidAt(center.x, center.y, center.z)) continue;

      return this._buildTerrainMiningStatusFromCenter(center, zone.id, isPickaxe);
    }

    return null;
  }

  _buildTerrainMiningStatusFromHit(hit, isPickaxe) {
    const zone = getZoneAtPosition(hit.point.x, hit.point.z);
    if (!zone) return null;
    const normal = hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);
    normal.transformDirection(hit.object.matrixWorld).normalize();
    let brushCenter = hit.point.clone().addScaledVector(normal, -0.45);
    if (!this.game.world.terrainMesh.isSolidAt(brushCenter.x, brushCenter.y, brushCenter.z)) {
      brushCenter = hit.point.clone().addScaledVector(normal, 0.45);
    }
    return this._buildTerrainMiningStatusFromCenter(brushCenter, zone.id, isPickaxe, hit.point.clone());
  }

  _buildTerrainMiningStatusFromCenter(brushCenter, zoneId, isPickaxe, hitPoint = brushCenter.clone()) {
    const cellX = Math.floor(brushCenter.x);
    const cellY = Math.floor(brushCenter.y);
    const cellZ = Math.floor(brushCenter.z);
    const cellState = this.game.world.terrainMesh.getCellState?.(cellX, cellY, cellZ);
    const typeKey = cellState?.type || 'dirt';
    const proxy = {
      typeKey,
      position: hitPoint.clone(),
      zoneId,
      isFloating: false,
      isTerrain: true,
      mineable: cellState?.properties?.mineable !== false,
      destroyed: false,
      tier: 1,
    };
    const status = this.getStatus(proxy, { isPickaxe });
    status.isTerrain = true;
    status.gridPos = { x: brushCenter.x, y: brushCenter.y, z: brushCenter.z };
    status.hitPoint = hitPoint.clone();
    status.brushCenter = brushCenter;
    status.terrainCell = { type: typeKey, zoneId };
    return status;
  }

  getStatus(block, options = {}) {
    const isPickaxe = options.isPickaxe ?? (this.game.player.weapons[this.game.player.currentSlot]?.data?.id === 'pickaxe');

    if (block.isFloating && !isPickaxe) {
      return {
        allowed: false,
        block,
        reason: 'wrong_weapon',
        icon: '⛏',
        requiredTier: 1,
        currentTier: this.game.progression.getPickaxeWidth(),
      };
    }

    const properties = getBlockProperties(block.typeKey);
    if (block.mineable === false || properties.mineable === false) {
      return {
        allowed: false,
        block,
        reason: 'not_mineable',
        icon: '',
        requiredTier: 1,
        currentTier: this.game.progression.getPickaxeWidth(),
      };
    }

    return {
      allowed: true,
      block,
      reason: 'ok',
      requiredTier: 1,
      currentTier: this.game.progression.getPickaxeWidth(),
    };
  }

  getDamage(block) {
    return 999;
  }

  getBrushRadius(zoneId) {
    const width = this.game.progression.getPickaxeWidth();
    // Scale brush radius with pickaxe width — gets ridiculous
    return Math.min(20, 0.85 + width * 0.25);
  }

  mineExtraTerrain(miningTarget, zoneId, budget) {
    if (!miningTarget?.brushCenter || budget <= 0) return 0;
    // Cap extra blocks for performance even at ridiculous widths
    budget = Math.min(budget, 500);
    const base = miningTarget.brushCenter;
    const radius = this.getBrushRadius(zoneId);
    const brushes = [];
    for (let i = 0; i < budget; i++) {
      const angle = (Math.PI * 2 * i) / Math.max(1, budget);
      const ring = 0.85 + Math.floor(i / 6) * 0.45;
      const center = base.clone().add(new THREE.Vector3(Math.cos(angle) * ring, 0, Math.sin(angle) * ring));
      brushes.push({
        center,
        zoneId,
        type: miningTarget.terrainCell?.type || 'dirt',
        radius,
      });
    }

    const batch = this.game.world.mineTerrainBrushes(brushes, {
      zoneId,
      type: miningTarget.terrainCell?.type || 'dirt',
      radius,
    });

    let mined = 0;
    for (const result of batch.brushResults || []) {
      if (!result?.meaningful) continue;
      mined++;
      const hitPos = result.center.clone();
      this.game.blocksMined++;
      this.game.progression.recordMined(result.zoneId || zoneId || this.game.zoneManager.currentZoneId, 1);
      this.game.particles.dust(hitPos, 4);
      this.awardTerrainDigRewards(result, hitPos, result.zoneId || zoneId);
    }
    if (mined > 0) {
      this.game.floorTimer += GAME.TIME_BONUS_MINING * mined;
    }
    return mined;
  }

  mineExtraFloating(originBlock, zoneId, budget) {
    if (!originBlock || budget <= 0) return 0;
    budget = Math.min(budget, 500);
    const candidates = [];
    for (const block of this.game.world.blocks.values()) {
      if (!block || block === originBlock || block.destroyed || !block.isFloating) continue;
      const dist = block.position.distanceTo(originBlock.position);
      if (dist <= 3.25) candidates.push({ block, dist });
    }
    candidates.sort((a, b) => a.dist - b.dist);

    let mined = 0;
    for (const { block } of candidates) {
      if (mined >= budget) break;
      const status = this.getStatus(block, { isPickaxe: true });
      if (!status.allowed) continue;
      if (!block.takeDamage(999)) continue;

      const blockPos = block.position.clone();
      blockPos.y += 0.3;
      const typeKey = block.typeKey;
      const blockZoneId = block.zoneId || zoneId || this.game.zoneManager.currentZoneId;
      this.game.world.mineBlock(block, this.game.particles, audio);
      this.game.blocksMined++;
      this.game.progression.recordMined(blockZoneId, 1);
      mined++;

      this.game.particles.dust(blockPos, 8);
      this.game.particles.spark(blockPos, 5);
      const table = BLOCK_LOOT_TABLES[typeKey];
      if (table) this.game.loot.spawnFromTable(blockPos, table);

      if (Math.random() < this.game.progression.getLetterDropChance('floating')) {
        const letter = this.game._pickLetterForZone(blockZoneId);
        if (letter) {
          this.game.letterDrops.spawn(blockPos, letter);
          this.game.ui.showFloatingText(`Letter ${letter}!`, 0xfacc15);
        }
      }

      const blockDef = BLOCK_TYPES[typeKey];
      if (blockDef?.resource) {
        this.game.resources.add(blockDef.resource, 1);
      }
    }
    if (mined > 0) {
      this.game.floorTimer += GAME.TIME_BONUS_MINING * mined;
    }
    return mined;
  }

  awardTerrainDigRewards(result, hitPos, zoneId) {
    if (!result?.meaningful) return;

    const width = this.game.progression.getPickaxeWidth();
    const depth = result.depth || 0;
    const luck = this.game.progression.state.letterDropLevel || 0;
    const volumeBonus = Math.min(3, Math.floor((result.removedVolume || 0) / 10));
    const amount = Math.max(1, Math.min(4, 1 + Math.floor((width - 1) / 2) + volumeBonus));
    const resourceType = this._pickDigJunkResource(depth, width, luck);

    if (this.game.resources.add(resourceType, amount)) {
      this.batchResourceText(resourceType, amount, 0x9bd47a);
    }

    for (const node of result.revealedLetters || []) {
      const spawnPos = node.position.clone();
      this.enqueueRewardFeedback({ kind: 'letterDrop', position: spawnPos, letter: node.letter });
      this.enqueueRewardFeedback({ kind: 'text', text: `Letter ${node.letter}!`, color: 0xfacc15 });
    }

    if (Math.random() < this.game.progression.getLetterDropChance('terrain')) {
      const letter = this.game._pickLetterForZone(zoneId || result.zoneId || this.game.zoneManager.currentZoneId);
      if (letter) {
        this.enqueueRewardFeedback({ kind: 'letterDrop', position: hitPos.clone(), letter });
        this.enqueueRewardFeedback({ kind: 'text', text: `Letter ${letter}!`, color: 0xfacc15 });
      }
    }
  }

  _pickDigJunkResource(depth, tier, luck) {
    const roll = Math.random() + luck * 0.02 + tier * 0.015;
    if (depth > 12 && roll > 0.82) return 'old_junk';
    if (depth > 5 && roll > 0.55) return 'scrap_stone';
    if (roll > 0.45) return 'gravel_bits';
    return 'loose_dirt';
  }

  enqueueRewardFeedback(job) {
    if (!job) return;
    const readyAt = (performance.now?.() || Date.now()) + 45;
    this._rewardFeedbackQueue.push({ ...job, readyAt });
    if (this._rewardFeedbackQueue.length > 32) {
      this._rewardFeedbackQueue.splice(0, this._rewardFeedbackQueue.length - 32);
    }
  }

  processRewardFeedbackQueue(maxJobs = 3) {
    if (!this._rewardFeedbackQueue.length) return;
    const now = performance.now?.() || Date.now();
    let processed = 0;
    for (let i = 0; i < this._rewardFeedbackQueue.length && processed < maxJobs;) {
      const job = this._rewardFeedbackQueue[i];
      if (job.readyAt > now) {
        i++;
        continue;
      }
      this._rewardFeedbackQueue.splice(i, 1);
      processed++;
      if (job.kind === 'text') {
        this.game.ui.showFloatingText(job.text, job.color);
      } else if (job.kind === 'letterDrop') {
        this.game.letterDrops.spawn(job.position, job.letter);
      }
    }
  }

  batchResourceText(type, amount = 1, color = 0x88ccff, displayName = null) {
    const entry = this._resourceTextBatcher.get(type);
    if (entry) {
      entry.count += amount;
      entry.timer = this._RESOURCE_TEXT_FLUSH_DELAY;
      if (entry.count >= this._RESOURCE_TEXT_IMMEDIATE_FLUSH) {
        this.flushResourceType(type);
      }
    } else {
      this._resourceTextBatcher.set(type, {
        count: amount,
        timer: this._RESOURCE_TEXT_FLUSH_DELAY,
        color,
        displayName,
      });
    }
  }

  flushResourceType(type) {
    const entry = this._resourceTextBatcher.get(type);
    if (!entry) return;
    const name = entry.displayName || entry.count + ' ' + type.replace(/_/g, ' ');
    const text = entry.displayName ? `+${entry.count} ${entry.displayName}` : `+${name}`;
    this.game.ui.showFloatingText(text, entry.color);
    this._resourceTextBatcher.delete(type);
  }

  flushResourceTexts(dt) {
    for (const [type, entry] of this._resourceTextBatcher) {
      entry.timer -= dt;
      if (entry.timer <= 0) {
        this.flushResourceType(type);
      }
    }
  }
}
