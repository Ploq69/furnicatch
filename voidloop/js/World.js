import * as THREE from 'three';
import { GAME, BIOMES, BLOCK_TYPES, ENEMY_TYPES } from './constants.js';
import { ZONES, getZoneById } from './ZoneData.js';
import { Block } from './Block.js';
import { Enemy } from './Enemy.js';
import { SFXMapper } from './SFXMapper.js';
import { assetLoader } from './AssetLoader.js';
import { getBlockTypeForTile, PROP_CATALOG } from './levelbuilder/LevelCatalog.js';
import { SeededRNG } from './SeededRNG.js';
import { BlockInstancer } from './BlockInstancer.js';

// Biome-specific floating block types for procedural generation
const FLOAT_BLOCK_TYPES = {
  'Grassland Caves':  ['crystal', 'stone_with_gold'],
  'Temple Ruins':     ['crystal', 'metal', 'stone_with_gold'],
  'Pirate Cove':      ['crystal', 'metal', 'stone_with_gold', 'lava'],
  'City Ruins':       ['metal', 'stone_with_gold', 'decorative_block_red'],
  'Void Depths':      ['crystal', 'decorative_block_blue', 'decorative_block_red', 'lava'],
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.columnHeights = new Map(); // key: "x,z" → topY (highest y+1)
    this.enemies = [];
    this.floor = 1;
    this.biome = BIOMES[0];
    this.exitPosition = null;
    this.exitMesh = null;
    this.startPosition = null;
    this.authoredMode = false;
    this.authoredDoc = null;
    this.rng = null;
    this._nextEnemyId = 1;
    this.instancer = new BlockInstancer(scene);
  }

  setFloor(floorNum) {
    this.floor = floorNum;
    for (const b of BIOMES) {
      if (floorNum >= b.floors[0] && floorNum <= b.floors[1]) {
        this.biome = b;
        break;
      }
    }
    SFXMapper.ambientBiome(this.biome.name);
  }

  async generateZone(zoneId, seed, spawnEnemies = true) {
    const zone = getZoneById(zoneId);
    if (!zone) throw new Error(`Unknown zone: ${zoneId}`);

    this.rng = seed != null ? new SeededRNG(seed) : null;
    const rng = this.rng || { random: () => Math.random(), rangeInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)), choice: (arr) => arr[Math.floor(Math.random() * arr.length)], shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; } };

    const b = zone.bounds;
    const types = zone.blockTypes;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;

    // Preload block geometries for instancer
    await this.instancer.preloadTypes(types);

    // --- denseCave generation within zone bounds ---
    const gridW = b.maxX - b.minX;
    const gridD = b.maxZ - b.minZ;
    const grid = new Array(gridW * gridD).fill(0);

    // Initialize with random noise (65% chance of block)
    for (let gx = 0; gx < gridW; gx++) {
      for (let gz = 0; gz < gridD; gz++) {
        const worldX = b.minX + gx;
        const worldZ = b.minZ + gz;
        const dx = worldX - (b.minX + b.maxX) / 2;
        const dz = worldZ - (b.minZ + b.maxZ) / 2;
        const dist = Math.max(Math.abs(dx), Math.abs(dz));

        if (dist >= size) {
          grid[gz * gridW + gx] = 1;
        } else if (dist >= size - 1) {
          grid[gz * gridW + gx] = rng.random() < 0.9 ? 1 : 0;
        } else {
          grid[gz * gridW + gx] = rng.random() < 0.65 ? 1 : 0;
        }
      }
    }

    // Smooth with cellular automata (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      const newGrid = new Array(gridW * gridD).fill(0);
      for (let gx = 0; gx < gridW; gx++) {
        for (let gz = 0; gz < gridD; gz++) {
          const worldX = b.minX + gx;
          const worldZ = b.minZ + gz;
          const dx = worldX - (b.minX + b.maxX) / 2;
          const dz = worldZ - (b.minZ + b.maxZ) / 2;
          if (Math.max(Math.abs(dx), Math.abs(dz)) >= size) {
            newGrid[gz * gridW + gx] = 1;
            continue;
          }

          let neighbors = 0;
          for (let nx = -1; nx <= 1; nx++) {
            for (let nz = -1; nz <= 1; nz++) {
              if (nx === 0 && nz === 0) continue;
              const ax = gx + nx;
              const az = gz + nz;
              if (ax >= 0 && ax < gridW && az >= 0 && az < gridD) {
                if (grid[az * gridW + ax]) neighbors++;
              } else {
                neighbors++;
              }
            }
          }

          if (grid[gz * gridW + gx]) {
            newGrid[gz * gridW + gx] = neighbors >= 4 ? 1 : 0;
          } else {
            newGrid[gz * gridW + gx] = neighbors >= 5 ? 1 : 0;
          }
        }
      }
      for (let i = 0; i < grid.length; i++) grid[i] = newGrid[i];
    }

    // Place blocks from grid
    for (let gx = 0; gx < gridW; gx++) {
      for (let gz = 0; gz < gridD; gz++) {
        if (grid[gz * gridW + gx]) {
          const worldX = b.minX + gx;
          const worldZ = b.minZ + gz;
          // Skip spawn area
          const sp = zone.spawnPoint;
          if (Math.abs(worldX - sp.x) <= 1 && Math.abs(worldZ - sp.z) <= 1) continue;
          const type = rng.choice(types);
          this._placeBlock(type, worldX, 0, worldZ, { useInstancer: true, zoneId });
        }
      }
    }

    // Ensure spawn platform
    const sp = zone.spawnPoint;
    for (let sx = -1; sx <= 1; sx++) {
      for (let sz = -1; sz <= 1; sz++) {
        this._placeBlock('stone', sp.x + sx, 0, sp.z + sz, { useInstancer: true, zoneId });
      }
    }

    // Place gateway if this zone has one
    if (zone.exitGateway) {
      this._placeGateway(zone.exitGateway, zone.id);
    }

    // Spawn enemies
    if (spawnEnemies) {
      const enemyCount = Math.min(Math.floor(5 + size / 8), 25);
      const enemyTypes = zone.enemyTypes;
      for (let i = 0; i < enemyCount; i++) {
        const et = rng.choice(enemyTypes);
        let ex, ez, attempts = 0;
        do {
          const angle = rng.random() * Math.PI * 2;
          const dist = 4 + rng.random() * (size - 7);
          ex = sp.x + Math.cos(angle) * dist;
          ez = sp.z + Math.sin(angle) * dist;
          attempts++;
        } while (this.getBlock(ex, 0, ez) && attempts < 20);
        const enemy = new Enemy(et, ex, ez);
        enemy.world = this;
        enemy.zoneId = zone.id;
        enemy._netId = this._nextEnemyId++;
        await enemy.spawn(this.scene);
        this.enemies.push(enemy);
      }
    }

    // Spawn floating blocks
    await this._spawnFloatingBlocksZone(zone, rng);

    this.startPosition = new THREE.Vector3(sp.x, 1, sp.z);
    this.biome = { name: zone.name, blocks: zone.blockTypes, enemies: zone.enemyTypes, fogColor: zone.fogColor, fogNear: zone.fogNear, fogFar: zone.fogFar };
  }

  async generateFloor(seed) {
    // Backward compatibility: delegate to zone generation for forest
    return this.generateZone('forest', seed);
  }

  async _spawnFloatingBlocksZone(zone, rng) {
    const types = zone.floatingBlockTypes || ['crystal'];
    const targetClusters = Math.min(15 + zone.order * 5, 30);
    const b = zone.bounds;
    const sp = zone.spawnPoint;
    const placed = []; // {x, y, z} of all floating blocks for min-distance checks

    // 1. Pick cluster centers with minimum 4-unit separation
    const allColumns = [];
    for (let x = b.minX + 2; x < b.maxX - 2; x++) {
      for (let z = b.minZ + 2; z < b.maxZ - 2; z++) {
        const dSpawn = Math.sqrt((x - sp.x) ** 2 + (z - sp.z) ** 2);
        if (dSpawn < 5) continue;
        if (zone.exitGateway) {
          const gw = zone.exitGateway;
          if (Math.abs(x - gw.x) < 3 && Math.abs(z - gw.z) < 3) continue;
        }
        allColumns.push({ x, z });
      }
    }

    rng.shuffle(allColumns);

    const centers = [];
    for (const col of allColumns) {
      if (centers.length >= targetClusters) break;
      let tooClose = false;
      for (const c of centers) {
        const dx = col.x - c.x;
        const dz = col.z - c.z;
        if (Math.sqrt(dx * dx + dz * dz) < 4.0) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) centers.push(col);
    }

    // 2. Spawn blocks in rings around each center
    for (const center of centers) {
      const clusterY = rng.random() < 0.9 ? 2.0 : 2.5;
      const blockCount = 2 + Math.floor(rng.random() * 3); // 2-4 blocks
      const baseRadius = 1.2 + rng.random() * 0.8; // 1.2-2.0
      const baseAngle = rng.random() * Math.PI * 2;

      for (let i = 0; i < blockCount; i++) {
        const angleStep = (Math.PI * 2) / blockCount;
        const angle = baseAngle + i * angleStep + (rng.random() - 0.5) * 0.5;
        const radius = baseRadius + (rng.random() - 0.5) * 0.3;
        const bx = center.x + Math.cos(angle) * radius;
        const bz = center.z + Math.sin(angle) * radius;
        const by = clusterY;

        // Global minimum distance check against all placed floating blocks
        let tooClose = false;
        for (const p of placed) {
          const dx = bx - p.x;
          const dy = by - p.y;
          const dz = bz - p.z;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.2) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        // Ground block collision check
        if (this.getBlock(bx, by, bz)) continue;

        const type = rng.choice(types);
        await this._placeFloatingBlock({
          x: bx + (rng.random() - 0.5) * 0.2,
          y: by,
          z: bz + (rng.random() - 0.5) * 0.2,
          type,
          rotation: rng.random() * 360,
          scale: 0.9 + rng.random() * 0.2,
        }, rng);

        placed.push({ x: bx, y: by, z: bz });
      }
    }
  }

  _placeGateway(gateway, fromZoneId) {
    const { x, z, targetZone } = gateway;
    // Place a distinctive arch/blocks at gateway
    for (let gy = 0; gy < 3; gy++) {
      this._placeBlock('stone_dark', x, gy, z, { useInstancer: true });
      this._placeBlock('stone_dark', x, gy, z + 1, { useInstancer: true });
      this._placeBlock('stone_dark', x, gy, z - 1, { useInstancer: true });
    }
    // Top arch
    this._placeBlock('stone_dark', x, 3, z, { useInstancer: true });
    this._placeBlock('stone_dark', x, 3, z + 1, { useInstancer: true });
    this._placeBlock('stone_dark', x, 3, z - 1, { useInstancer: true });
  }

  async _spawnFloatingBlocks(floorSize, floorNum, rng) {
    const types = FLOAT_BLOCK_TYPES[this.biome.name] || ['crystal'];
    // Number of clusters scales with floor but capped low for performance
    const clusterCount = Math.min(5 + Math.floor(floorNum / 2), 12);
    const gridSize = floorSize * 2 + 1;

    // Collect all empty columns (no block at y=0)
    const emptyColumns = [];
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const worldX = gx - floorSize;
        const worldZ = gz - floorSize;
        if (!this.getBlock(worldX, 0, worldZ)) {
          emptyColumns.push({ x: worldX, z: worldZ });
        }
      }
    }

    // Shuffle and pick N random empty columns
    rng.shuffle(emptyColumns);
    const selected = emptyColumns.slice(0, clusterCount);

    for (const col of selected) {
      // Single floating block per column — no vertical stacking
      const y = 2 + Math.floor(rng.random() * 3); // y=2 to y=4
      // Skip if something already here
      if (this.getBlock(col.x, y, col.z)) continue;

      const type = rng.choice(types);
      // Slight random offset for visual variety
      const offsetX = (rng.random() - 0.5) * 0.3;
      const offsetZ = (rng.random() - 0.5) * 0.3;

      await this._placeFloatingBlock({
        x: col.x + offsetX,
        y,
        z: col.z + offsetZ,
        type,
        rotation: rng.random() * 360,
        scale: 0.8 + rng.random() * 0.4, // 0.8 - 1.2
      }, rng);
    }
  }

  async loadAuthoredLevel(levelDoc, rendererDeps) {
    this.clear();
    this.authoredMode = true;

    // 1. Place tiles as stacked columns
    for (const t of levelDoc.tiles) {
      const blockType = getBlockTypeForTile(t.type);
      for (let dy = 0; dy < t.height; dy++) {
        this._placeBlock(blockType, t.x, t.y + dy, t.z, { useInstancer: true });
      }
    }

    // 2. Place floating blocks
    for (const fb of levelDoc.floatingBlocks || []) {
      await this._placeFloatingBlock(fb);
    }

    // 3. Place props (simple mesh clones for now)
    for (const p of levelDoc.props) {
      await this._placeProp(p, rendererDeps);
    }

    // 4. Place enemies
    for (const e of levelDoc.enemies) {
      const enemy = new Enemy(e.type, e.x, e.z);
      enemy.world = this;
      enemy._netId = this._nextEnemyId++;
      await enemy.spawn(this.scene);
      const topY = this.getColumnTop(e.x, e.z);
      enemy.position.y = topY > -999 ? topY : 0;
      if (enemy.mesh) {
        enemy.mesh.position.y = enemy.position.y + enemy.groundOffset;
      }
      this.enemies.push(enemy);
    }

    // 5. Place tokens (fixed letter drops)
    if (rendererDeps && rendererDeps.letterDrop) {
      for (const tok of levelDoc.tokens) {
        const topY = this.getColumnTop(tok.x, tok.z);
        const y = topY > -999 ? topY + 0.5 : 0.5;
        rendererDeps.letterDrop.spawn(new THREE.Vector3(tok.x, y, tok.z), tok.value);
      }
    }

    // 6. Start / Exit
    const startTop = this.getColumnTop(levelDoc.start.x, levelDoc.start.z);
    this.startPosition = new THREE.Vector3(
      levelDoc.start.x,
      startTop > -999 ? startTop : 0,
      levelDoc.start.z
    );
    const exitTop = this.getColumnTop(levelDoc.exit.x, levelDoc.exit.z);
    this.exitPosition = new THREE.Vector3(
      levelDoc.exit.x,
      exitTop > -999 ? exitTop : 0,
      levelDoc.exit.z
    );

    // 7. Lights
    if (levelDoc.lights) {
      for (const l of levelDoc.lights) {
        const light = new THREE.PointLight(l.color, l.intensity, 10);
        light.position.set(l.x, l.y, l.z);
        this.scene.add(light);
      }
    }

    this.authoredDoc = levelDoc;
  }

  async _placeFloatingBlock(fb, rng) {
    const key = `${fb.x},${fb.y},${fb.z}`;
    if (this.blocks.has(key)) return;
    const block = new Block(fb.type, fb.x, fb.y, fb.z);
    block.isFloating = true;
    block.bobPhase = fb.bobPhase ?? (rng ? rng.random() * Math.PI * 2 : Math.random() * Math.PI * 2);
    await block.createMesh(this.scene, { noCloneMaterials: true });
    if (block.mesh) {
      block.mesh.rotation.y = (fb.rotation || 0) * (Math.PI / 180);
      // Apply custom scale on top of base visual scale
      const baseScale = 0.5; // from Block.js BLOCK_VISUAL_SCALE
      block.mesh.scale.setScalar(baseScale * (fb.scale || 1));
      // Disable shadows on floating blocks for performance
      block.mesh.traverse(c => {
        if (c.isMesh) {
          c.castShadow = false;
          c.receiveShadow = false;
        }
      });
      // Emissive glow instead of expensive PointLight
      const glowColor = fb.glowColor || BLOCK_TYPES[fb.type]?.color || 0xffffff;
      const glowHex = typeof glowColor === 'number' ? glowColor : new THREE.Color(glowColor).getHex();
      block.mesh.traverse(c => {
        if (c.isMesh && c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            if (m.emissive !== undefined) {
              m.emissive.setHex(glowHex);
              m.emissiveIntensity = 0.4;
            }
          }
        }
      });
    }
    this.blocks.set(key, block);
    // Intentionally do NOT update columnHeights — floating blocks don't affect walkable ground
  }

  async _placeProp(p, rendererDeps) {
    // Resolve model path from catalog using assetId (matches LevelRenderer)
    try {
      const def = PROP_CATALOG[p.assetId];
      const path = def?.model || p.model || p.assetPath;
      if (!path) {
        console.warn('[World] No model path for prop:', p.assetId);
        return;
      }
      await assetLoader.loadGLTF(path);
      const cloned = assetLoader.cloneModel(path);
      if (!cloned || !cloned.scene) return;
      const mesh = cloned.scene;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = (p.rotation || 0) * (Math.PI / 180);
      mesh.scale.setScalar(p.scale || 1);
      this.scene.add(mesh);
    } catch (e) {
      console.warn('[World] Failed to place prop:', p, e);
    }
  }

  _placeBlock(typeKey, x, y, z, options = {}) {
    const key = `${x},${y},${z}`;
    if (this.blocks.has(key)) return;
    const block = new Block(typeKey, x, y, z);
    if (options.zoneId) {
      block.zoneId = options.zoneId;
    }
    if (options.useInstancer) {
      block.createMesh(this.scene, { instancer: this.instancer });
    } else {
      block.createMesh(this.scene);
    }
    this.blocks.set(key, block);
    // Update column height tracking
    const colKey = `${x},${z}`;
    const currentTop = this.columnHeights.get(colKey) || -999;
    const blockTop = y + 1;
    if (blockTop > currentTop) {
      this.columnHeights.set(colKey, blockTop);
    }
  }

  getBlock(x, y, z) {
    const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    return this.blocks.get(key);
  }

  getColumnTop(x, z) {
    const colKey = `${Math.round(x)},${Math.round(z)}`;
    return this.columnHeights.get(colKey) || -999;
  }

  mineBlock(block, particles, audio) {
    if (!block || block.destroyed) return null;
    block.destroy(this.scene, particles);
    const key = `${block.position.x},${block.position.y},${block.position.z}`;
    this.blocks.delete(key);
    // Recompute column height
    const colKey = `${block.position.x},${block.position.z}`;
    let maxY = -999;
    for (const [bk, b] of this.blocks) {
      if (b.position.x === block.position.x && b.position.z === block.position.z) {
        const top = b.position.y + 1;
        if (top > maxY) maxY = top;
      }
    }
    if (maxY > -999) {
      this.columnHeights.set(colKey, maxY);
    } else {
      this.columnHeights.delete(colKey);
    }
    return block.drop;
  }

  update(dt, playerPos, particles, audio, player) {
    // Update chunk visibility based on player position
    this.instancer.updateVisibility(playerPos, 45);

    for (const block of this.blocks.values()) {
      block.update(dt);
      // Floating block bobbing animation
      if (block.isFloating && block.mesh) {
        const bob = Math.sin(Date.now() * 0.0015 + (block.bobPhase || 0)) * 0.08;
        block.mesh.position.y = block.position.y + 0.5 + bob;
        block.mesh.rotation.y += dt * 0.3;
        if (block._glowLight) {
          block._glowLight.position.y = block.position.y + 0.5 + 0.5 + bob;
        }
      }
    }
    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, particles, audio, player);
    }
    // Remove dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead && this.enemies[i].mesh && !this.enemies[i].mesh.visible) {
        this.enemies[i].cleanup(this.scene);
        this.enemies.splice(i, 1);
      }
    }
  }

  checkExit(playerPos) {
    if (!this.exitPosition) return false;
    return playerPos.distanceTo(this.exitPosition) < 1.5;
  }

  clear() {
    this.instancer.clear();
    for (const block of this.blocks.values()) {
      if (block.mesh) this.scene.remove(block.mesh);
    }
    this.blocks.clear();
    this.columnHeights.clear();
    for (const enemy of this.enemies) {
      enemy.cleanup(this.scene);
    }
    this.enemies = [];
    this.exitPosition = null;
    this.startPosition = null;
    this.authoredMode = false;
    this.authoredDoc = null;
  }
}
