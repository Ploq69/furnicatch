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
import { OccupancyGrid } from './OccupancyGrid.js';
import { TerrainMesh } from './TerrainMesh.js';

// Biome-specific floating block types for procedural generation
const FLOAT_BLOCK_TYPES = {
  'Grassland Caves':  ['crystal', 'stone_with_gold'],
  'Temple Ruins':     ['crystal', 'metal', 'stone_with_gold'],
  'Pirate Cove':      ['crystal', 'metal', 'stone_with_gold', 'lava'],
  'City Ruins':       ['metal', 'stone_with_gold', 'decorative_block_red'],
  'Void Depths':      ['crystal', 'decorative_block_blue', 'decorative_block_red', 'lava'],
};

const ISO_UNDERGROUND_CUTAWAY = {
  DEPTH_START: 0.8,
  DEPTH_FULL: 7.0,
  RADIUS_BOOST: 4.25,
  REACH_BOOST: 6.0,
  HEIGHT_BOOST: 1.15,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

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
    this.occupancyGrid = new OccupancyGrid();
    this.terrainMesh = new TerrainMesh(scene);
    this.waterVolumes = [];
    this.floatingBlocks = new Set();
    this.hiddenLetterNodes = [];
    this._cutawayActive = false;
    this._cutawayAmount = 0;
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
    const rng = this.rng || { random: () => Math.random(), range: (a, b) => a + Math.random() * (b - a), rangeInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)), choice: (arr) => arr[Math.floor(Math.random() * arr.length)], shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; } };

    const b = zone.bounds;
    const types = zone.blockTypes;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const sp = zone.spawnPoint;

    // Preload geometries
    const allTypes = [...new Set([...types, 'stone', 'stone_dark'])];
    await this.instancer.preloadTypes([...new Set([...allTypes, 'stone_dark'])]);
    await this.terrainMesh.preloadTypes(allTypes);
    this.terrainMesh.addZone(zone, seed || 1);
    for (const water of zone.waterVolumes || []) {
      this.waterVolumes.push({ ...water, zoneId: zone.id, zoneName: zone.name });
    }
    this._generateHiddenLetters(zone, rng);

    const gridW = b.maxX - b.minX;
    const gridD = b.maxZ - b.minZ;

    // Helper: cellular automata on a 2D grid
    const runCA = (fillRate) => {
      const g = new Array(gridW * gridD).fill(0);
      for (let gx = 0; gx < gridW; gx++) {
        for (let gz = 0; gz < gridD; gz++) {
          const worldX = b.minX + gx;
          const worldZ = b.minZ + gz;
          const dx = worldX - (b.minX + b.maxX) / 2;
          const dz = worldZ - (b.minZ + b.maxZ) / 2;
          const dist = Math.max(Math.abs(dx), Math.abs(dz));
          if (dist >= size) {
            g[gz * gridW + gx] = 1;
          } else if (dist >= size - 1) {
            g[gz * gridW + gx] = rng.random() < 0.9 ? 1 : 0;
          } else {
            g[gz * gridW + gx] = rng.random() < fillRate ? 1 : 0;
          }
        }
      }
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
                  if (g[az * gridW + ax]) neighbors++;
                } else {
                  neighbors++;
                }
              }
            }
            if (g[gz * gridW + gx]) {
              newGrid[gz * gridW + gx] = neighbors >= 4 ? 1 : 0;
            } else {
              newGrid[gz * gridW + gx] = neighbors >= 5 ? 1 : 0;
            }
          }
        }
        for (let i = 0; i < g.length; i++) g[i] = newGrid[i];
      }
      return g;
    };

    // Generate three vertical layers
    const surfaceGrid = runCA(0.65);
    const subsoilGrid = runCA(0.80);
    const bedrockGrid = runCA(0.90);

    // Surface layer (y = 0)
    for (let gx = 0; gx < gridW; gx++) {
      for (let gz = 0; gz < gridD; gz++) {
        if (surfaceGrid[gz * gridW + gx]) {
          const wx = b.minX + gx;
          const wz = b.minZ + gz;
          if (Math.abs(wx - sp.x) <= 1 && Math.abs(wz - sp.z) <= 1) continue;
          const type = rng.choice(types);
          this.occupancyGrid.set(wx, 0, wz, { type, zoneId: zone.id });
        }
      }
    }

    // Subsoil layer (y = -1)
    for (let gx = 0; gx < gridW; gx++) {
      for (let gz = 0; gz < gridD; gz++) {
        if (subsoilGrid[gz * gridW + gx]) {
          const wx = b.minX + gx;
          const wz = b.minZ + gz;
          this.occupancyGrid.set(wx, -1, wz, { type: 'stone', zoneId: zone.id });
        }
      }
    }

    // Bedrock layer (y = -2)
    for (let gx = 0; gx < gridW; gx++) {
      for (let gz = 0; gz < gridD; gz++) {
        if (bedrockGrid[gz * gridW + gx]) {
          const wx = b.minX + gx;
          const wz = b.minZ + gz;
          this.occupancyGrid.set(wx, -2, wz, { type: 'stone_dark', zoneId: zone.id });
        }
      }
    }

    // Indestructible spawn platform
    for (let sx = -1; sx <= 1; sx++) {
      for (let sz = -1; sz <= 1; sz++) {
        const wx = sp.x + sx;
        const wz = sp.z + sz;
        this.occupancyGrid.remove(wx, 0, wz);
        this.occupancyGrid.remove(wx, -1, wz);
        this.occupancyGrid.remove(wx, -2, wz);
        this.occupancyGrid.set(wx, 0, wz, { type: 'stone', indestructible: true, zoneId: zone.id });
      }
    }

    // Place gateway
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
        } while ((this.getBlock(ex, 0, ez) || this.occupancyGrid.hasGround(ex, ez)) && attempts < 20);
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
    await this.generateZone('forest', seed);
    await this.buildTerrainMesh();
  }

  async buildTerrainMesh() {
    await this.terrainMesh.preloadTypes();
    this.terrainMesh.rebuildAll();
    const stats = this.terrainMesh.getStats();
    console.log(`[World] SDF terrain built: ${stats.chunks.toLocaleString()} chunks, ${stats.triangles.toLocaleString()} triangles`);
  }

  _generateHiddenLetters(zone, rng) {
    const existing = this.hiddenLetterNodes.some(n => n.zoneId === zone.id);
    if (existing || !zone.letters?.length) return;

    const b = zone.bounds;
    const count = Math.max(30, zone.letters.length * 10);
    const nodes = [];
    let attempts = 0;

    while (nodes.length < count && attempts < count * 20) {
      attempts++;
      const x = rng.range(Math.ceil(b.minX) + 4, Math.floor(b.maxX) - 4);
      const z = rng.range(Math.ceil(b.minZ) + 4, Math.floor(b.maxZ) - 4);
      const y = -rng.range(4, 100);

      const tooCloseToSpawn = Math.hypot(x - zone.spawnPoint.x, z - zone.spawnPoint.z) < 7;
      const tooCloseToGateway = zone.exitGateway && Math.hypot(x - zone.exitGateway.x, z - zone.exitGateway.z) < 7;
      if (tooCloseToSpawn || tooCloseToGateway) continue;

      let tooCloseToOther = false;
      for (const node of nodes) {
        if (Math.hypot(x - node.position.x, y - node.position.y, z - node.position.z) < 6) {
          tooCloseToOther = true;
          break;
        }
      }
      if (tooCloseToOther) continue;

      const letter = zone.letters[nodes.length % zone.letters.length];
      nodes.push({
        id: `${zone.id}-hidden-letter-${nodes.length}`,
        zoneId: zone.id,
        letter,
        position: new THREE.Vector3(x, y, z),
        radius: 2.5,
        revealed: false,
      });
    }

    this.hiddenLetterNodes.push(...nodes);
  }

  async _spawnFloatingBlocksZone(zone, rng) {
    const types = zone.floatingBlockTypes || ['crystal'];
    const targetClusters = Math.min(15 + zone.order * 5, 30);
    const b = zone.bounds;
    const sp = zone.spawnPoint;
    const progressionRange = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
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

        const distanceBand = Math.min(0.999, Math.sqrt((center.x - sp.x) ** 2 + (center.z - sp.z) ** 2) / Math.max(1, progressionRange));
        const tierBand = Math.min(3, Math.floor(distanceBand * 4));
        const type = types[tierBand] || types[0];
        await this._placeFloatingBlock({
          x: bx + (rng.random() - 0.5) * 0.2,
          y: by,
          z: bz + (rng.random() - 0.5) * 0.2,
          type,
          zoneId: zone.id,
          tier: tierBand + 1,
          locked: tierBand > 0,
          visible: true,
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
        if (!this.getBlock(worldX, 0, worldZ) && !this._hasGround(worldX, worldZ)) {
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
    block.zoneId = fb.zoneId || BLOCK_TYPES[fb.type]?.zone || null;
    block.tier = fb.tier || BLOCK_TYPES[fb.type]?.tier || 1;
    block.locked = !!fb.locked;
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
    this.floatingBlocks.add(block);
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

  _hasGround(x, z) {
    const colKey = `${Math.round(x)},${Math.round(z)}`;
    return this.terrainMesh.getColumnTop(x, z) > -999 || this.occupancyGrid.hasGround(x, z) || this.columnHeights.has(colKey);
  }

  getColumnTop(x, z) {
    const terrainSurface = this.terrainMesh.getColumnTop(x, z);
    if (terrainSurface > -999) return terrainSurface;
    // Backward compatibility for older block-authored ground
    const terrainTop = this.occupancyGrid.getColumnTop(x, z);
    if (terrainTop > -999) return terrainTop;
    // Fall back to placed blocks (gateways, authored levels)
    const colKey = `${Math.round(x)},${Math.round(z)}`;
    return this.columnHeights.get(colKey) ?? -999;
  }

  getGroundHeightAt(x, z, fromY = 2) {
    const terrainSurface = this.terrainMesh.getColumnTop(x, z, fromY);
    if (terrainSurface > -999) return terrainSurface;
    return this.getColumnTop(x, z);
  }

  hasSdfTerrain() {
    return this.terrainMesh?.zones?.size > 0;
  }

  isPlayerSpaceClear(x, y, z) {
    if (!this.terrainMesh) return true;
    return !this.terrainMesh.isCapsuleBlockedAt(x, y, z, 0.28, 1.45);
  }

  findFloorBelow(x, z, footY, maxDistance = 0.25) {
    if (!this.terrainMesh) return -999;
    return this.terrainMesh.findFloorBelow(x, z, footY, maxDistance);
  }

  getTerrainDepthAtPlayer(position) {
    return Math.max(0, 1 - position.y);
  }

  getWaterVolumeAt(position, options = {}) {
    if (!position) return null;
    const surfaceMargin = options.surfaceMargin ?? 0.45;
    const bottomMargin = options.bottomMargin ?? 1.25;
    for (const water of this.waterVolumes) {
      const radiusX = Math.max(0.1, water.radiusX || 1);
      const radiusZ = Math.max(0.1, water.radiusZ || 1);
      const nx = (position.x - water.x) / radiusX;
      const nz = (position.z - water.z) / radiusZ;
      if (nx * nx + nz * nz > 1) continue;
      if (position.y > (water.surfaceY ?? 1.15) + surfaceMargin) continue;
      if (position.y < (water.bottomY ?? -1.8) - bottomMargin) continue;
      return water;
    }
    return null;
  }

  resolvePlayerTerrain(player, dt, options = {}) {
    if (!this.terrainMesh) return false;

    const radius = 0.28;
    const gravityMultiplier = options.gravityMultiplier || 1;
    const probes = [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
    ];

    player.velocity.y += GAME.GRAVITY * gravityMultiplier * dt;
    player.position.y += player.velocity.y * dt;

    let floorY = -999;
    if (player.velocity.y <= 0) {
      const fallDistance = -player.velocity.y * dt;
      const maxSnapDown = player.isGrounded
        ? 0.6
        : Math.max(2.5, fallDistance * 2.0 + 0.5);
      for (const [dx, dz] of probes) {
        const y = this.findFloorBelow(player.position.x + dx, player.position.z + dz, player.position.y, maxSnapDown);
        if (y > floorY) floorY = y;
      }
    }

    if (floorY > -999 && player.velocity.y <= 0 && player.position.y <= floorY + 0.35) {
      player.position.y = floorY;
      player.velocity.y = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }

    // Ceiling collision
    if (player.velocity.y > 0 && this.terrainMesh.isCapsuleBlockedAt(player.position.x, player.position.y, player.position.z, radius, 1.45)) {
      for (let i = 0; i < 8 && this.terrainMesh.isCapsuleBlockedAt(player.position.x, player.position.y, player.position.z, radius, 1.45); i++) {
        player.position.y -= 0.12;
      }
      player.velocity.y = 0;
    }

    // Stuck recovery: if still inside terrain after vertical resolve, push up until free
    let stuckIter = 0;
    while (this.terrainMesh.isCapsuleBlockedAt(player.position.x, player.position.y, player.position.z, radius, 1.45) && stuckIter < 20) {
      player.position.y += 0.25;
      stuckIter++;
      if (stuckIter >= 20) {
        player.position.y += 1.0; // emergency pop
      }
    }

    // Gently push out of side terrain without changing vertical position.
    const pushSamples = [
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
    ];
    for (const [dx, dz] of pushSamples) {
      const sx = player.position.x + dx;
      const sy = player.position.y + 0.75;
      const sz = player.position.z + dz;
      if (!this.terrainMesh.isSolidAt(sx, sy, sz)) continue;
      player.position.x -= dx * 0.45;
      player.position.z -= dz * 0.45;
    }

    return true;
  }

  mineBlock(block, particles, audio) {
    if (!block || block.destroyed) return null;
    block.destroy(this.scene, particles);
    const key = `${block.position.x},${block.position.y},${block.position.z}`;
    this.blocks.delete(key);
    this.floatingBlocks.delete(block);
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

  /**
   * Mine SDF terrain with a spherical brush.
   * @returns {{destroyed: boolean, meaningful: boolean, removedVolume: number, revealedLetters: Array, cell: Object|null}}
   */
  mineTerrainBlock(x, y, z, damage, options = {}) {
    const center = options.center || new THREE.Vector3(x, y, z);
    const zoneId = options.zoneId || options.cell?.zoneId || null;
    const radius = options.radius || 0.9;
    const result = this.terrainMesh.applyDigBrush(center, radius, 1, zoneId);
    const revealedLetters = result.meaningful
      ? this._revealHiddenLetters(result.center, result.radius, result.zoneId)
      : [];

    return {
      destroyed: result.meaningful,
      meaningful: result.meaningful,
      removedVolume: result.removedVolume,
      removedCells: result.removedCells,
      depth: result.depth,
      radius: result.radius,
      center: result.center,
      zoneId: result.zoneId,
      revealedLetters,
      drop: null,
      cell: {
        type: options.type || 'dirt',
        zoneId: result.zoneId,
        destroyed: result.meaningful,
      },
    };
  }

  explodeTerrain(center, options = {}) {
    if (!this.terrainMesh) {
      return { meaningful: false, removedVolume: 0, removedCells: 0, revealedLetters: [], zoneId: null, center, radius: 0 };
    }
    const radius = options.radius || 3.5;
    const zoneId = options.zoneId || null;
    const result = this.terrainMesh.applyDigBrush(center, radius, 1, zoneId, {
      maxCells: options.maxCells || 0,
    });
    const revealedLetters = result.meaningful
      ? this._revealHiddenLetters(result.center, result.radius, result.zoneId)
      : [];

    return {
      ...result,
      revealedLetters,
      drop: null,
      cell: {
        type: options.type || 'dirt',
        zoneId: result.zoneId,
        destroyed: result.meaningful,
      },
    };
  }

  _revealHiddenLetters(center, radius, zoneId) {
    if (!zoneId) return [];
    const revealed = [];
    for (const node of this.hiddenLetterNodes) {
      if (node.revealed || node.zoneId !== zoneId) continue;
      if (center.distanceTo(node.position) <= radius + node.radius) {
        node.revealed = true;
        revealed.push(node);
      }
    }
    return revealed;
  }

  update(dt, playerPos, particles, audio, player, options = {}) {
    const playerDepth = this.getTerrainDepthAtPlayer(playerPos);
    const allowCutaway = options.cameraMode !== 'thirdPerson';
    if (allowCutaway) {
      if (!this._cutawayActive && playerDepth > 1.2) this._cutawayActive = true;
      if (this._cutawayActive && playerDepth < 0.6) this._cutawayActive = false;
    } else {
      this._cutawayActive = false;
      this._cutawayAmount = 0;
    }
    const cutawayTarget = allowCutaway && this._cutawayActive ? 1 : 0;
    const cutawayRate = this._cutawayActive ? 8 : 5;
    if (allowCutaway) {
      this._cutawayAmount += (cutawayTarget - this._cutawayAmount) * (1 - Math.exp(-cutawayRate * dt));
    }
    const isoUndergroundT = allowCutaway
      ? clamp01((playerDepth - ISO_UNDERGROUND_CUTAWAY.DEPTH_START) / (ISO_UNDERGROUND_CUTAWAY.DEPTH_FULL - ISO_UNDERGROUND_CUTAWAY.DEPTH_START))
      : 0;
    const cutawayRadius = Math.min(22, 7.5 + playerDepth * 0.34 + ISO_UNDERGROUND_CUTAWAY.RADIUS_BOOST * isoUndergroundT);
    const cutawayReach = Math.min(34, 4 + playerDepth * 1.2 + ISO_UNDERGROUND_CUTAWAY.REACH_BOOST * isoUndergroundT);
    const cutawayHeight = playerPos.y + 2.25 + ISO_UNDERGROUND_CUTAWAY.HEIGHT_BOOST * isoUndergroundT;
    this.terrainMesh.setCutaway(playerPos, this._cutawayAmount, cutawayRadius, cutawayHeight, {
      forward: { x: Math.SQRT1_2, z: Math.SQRT1_2 },
      reach: cutawayReach,
    });
    this.terrainMesh.updateVisibility(playerPos, {
      camera: options.camera,
      cameraMode: options.cameraMode,
    });
    this.terrainMesh.update({ playerPos });

    // Update chunk visibility based on player position
    this.instancer.updateVisibility(playerPos, 45);

    // Update all blocks (handles shake/scale for ground blocks, hp bars, etc.)
    for (const block of this.blocks.values()) {
      block.update(dt);
    }

    // Animate only floating blocks — with distance culling
    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;
    const CULL_DIST_SQ = 35 * 35; // 35 units, now in 3D
    for (const block of this.floatingBlocks) {
      if (!block.mesh) continue;
      const dx = block.position.x - px;
      const dy = block.position.y - py;
      const dz = block.position.z - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const chunkKey = this.terrainMesh.getChunkKeyForPoint(block.position);
      const chunkHot = this.terrainMesh.hotChunkKeys.has(chunkKey) || this.terrainMesh.visibleChunkKeys.has(chunkKey);

      // Distance-based visibility culling
      if (distSq > CULL_DIST_SQ || !chunkHot) {
        if (block.mesh.visible) block.mesh.visible = false;
        continue;
      }
      if (!block.mesh.visible) block.mesh.visible = true;

      // Bobbing animation (only for nearby blocks)
      const bob = Math.sin(Date.now() * 0.0015 + (block.bobPhase || 0)) * 0.08;
      block.mesh.position.y = block.position.y + 0.5 + bob;
      block.mesh.rotation.y += dt * 0.3;
    }
    for (const enemy of this.enemies) {
      if (options.currentZoneId && enemy.zoneId && enemy.zoneId !== options.currentZoneId) {
        if (enemy.mesh) enemy.mesh.visible = false;
        continue;
      }
      const chunkKey = this.terrainMesh.getChunkKeyForPoint(enemy.position);
      const chunkHot = this.terrainMesh.hotChunkKeys.has(chunkKey) || this.terrainMesh.visibleChunkKeys.has(chunkKey);
      if (!chunkHot && enemy.position.distanceToSquared(playerPos) > 28 * 28) {
        if (enemy.mesh) enemy.mesh.visible = false;
        continue;
      }
      if (enemy.mesh && !enemy.dead) enemy.mesh.visible = true;
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
    this.terrainMesh.clear();
    this.occupancyGrid.clear();
    this.waterVolumes = [];
    for (const block of this.blocks.values()) {
      if (block.mesh) this.scene.remove(block.mesh);
    }
    this.blocks.clear();
    this.floatingBlocks.clear();
    this.columnHeights.clear();
    this.hiddenLetterNodes = [];
    this._cutawayActive = false;
    this._cutawayAmount = 0;
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
