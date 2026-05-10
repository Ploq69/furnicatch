import * as THREE from 'three';
import { GAME, BIOMES, BLOCK_TYPES, ENEMY_TYPES } from './constants.js';
import { Block } from './Block.js';
import { Enemy } from './Enemy.js';
import { SFXMapper } from './SFXMapper.js';
import { assetLoader } from './AssetLoader.js';
import { getBlockTypeForTile, PROP_CATALOG } from './levelbuilder/LevelCatalog.js';

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

  async generateFloor() {
    this.clear();

    const size = GAME.FLOOR_SIZE;
    const types = this.biome.blocks;

    // --- denseCave generation: 60-80% block coverage ---
    // Use cellular automata approach for organic caves
    const gridSize = size * 2 + 1;
    const grid = new Array(gridSize * gridSize).fill(0);

    // Initialize with random noise (65% chance of block)
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const dx = gx - size;
        const dz = gz - size;
        const dist = Math.max(Math.abs(dx), Math.abs(dz));

        if (dist >= size) {
          // Always wall at boundary
          grid[gz * gridSize + gx] = 1;
        } else if (dist >= size - 1) {
          // Near boundary: 90% wall
          grid[gz * gridSize + gx] = Math.random() < 0.9 ? 1 : 0;
        } else {
          // Interior: 65% wall chance
          grid[gz * gridSize + gx] = Math.random() < 0.65 ? 1 : 0;
        }
      }
    }

    // Smooth with cellular automata (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      const newGrid = new Array(gridSize * gridSize).fill(0);
      for (let gx = 0; gx < gridSize; gx++) {
        for (let gz = 0; gz < gridSize; gz++) {
          const dx = gx - size;
          const dz = gz - size;
          if (Math.max(Math.abs(dx), Math.abs(dz)) >= size) {
            newGrid[gz * gridSize + gx] = 1;
            continue;
          }

          let neighbors = 0;
          for (let nx = -1; nx <= 1; nx++) {
            for (let nz = -1; nz <= 1; nz++) {
              if (nx === 0 && nz === 0) continue;
              const ax = gx + nx;
              const az = gz + nz;
              if (ax >= 0 && ax < gridSize && az >= 0 && az < gridSize) {
                if (grid[az * gridSize + ax]) neighbors++;
              } else {
                neighbors++; // Out of bounds counts as wall
              }
            }
          }

          if (grid[gz * gridSize + gx]) {
            // Stay alive if enough neighbors
            newGrid[gz * gridSize + gx] = neighbors >= 4 ? 1 : 0;
          } else {
            // Birth if enough neighbors
            newGrid[gz * gridSize + gx] = neighbors >= 5 ? 1 : 0;
          }
        }
      }
      // Copy back
      for (let i = 0; i < grid.length; i++) grid[i] = newGrid[i];
    }

    // Place blocks from grid
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        if (grid[gz * gridSize + gx]) {
          const worldX = gx - size;
          const worldZ = gz - size;
          // Skip exact center for player spawn
          if (Math.abs(worldX) <= 1 && Math.abs(worldZ) <= 1) continue;
          const type = types[Math.floor(Math.random() * types.length)];
          await this._placeBlock(type, worldX, 0, worldZ);
        }
      }
    }

    // Ensure there's a path from center by clearing a radius-3 circle
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const key = `${x},0,${z}`;
        if (this.blocks.has(key)) {
          const b = this.blocks.get(key);
          if (b.mesh) this.scene.remove(b.mesh);
          this.blocks.delete(key);
        }
      }
    }

    // Place a spawn platform so the player doesn't fall into the void
    for (let sx = -1; sx <= 1; sx++) {
      for (let sz = -1; sz <= 1; sz++) {
        await this._placeBlock('stone', sx, 0, sz);
      }
    }
    this.startPosition = new THREE.Vector3(0, 1, 0);

    // Spawn enemies
    const enemyCount = Math.min(3 + Math.floor(this.floor / 3), 12);
    const enemyTypes = this.biome.enemies;
    for (let i = 0; i < enemyCount; i++) {
      const et = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      // Pick a spot that's not blocked (avoid walls)
      let ex, ez, attempts = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * (size - 7);
        ex = Math.cos(angle) * dist;
        ez = Math.sin(angle) * dist;
        attempts++;
      } while (this.getBlock(ex, 0, ez) && attempts < 20);
      const enemy = new Enemy(et, ex, ez);
      enemy.world = this;
      await enemy.spawn(this.scene);
      this.enemies.push(enemy);
    }

    // Spawn floating blocks for kids to mine
    await this._spawnFloatingBlocks(size, this.floor);

    // Exit position (random edge)
    const exitAngle = Math.random() * Math.PI * 2;
    const exitDist = size - 1;
    this.exitPosition = new THREE.Vector3(
      Math.cos(exitAngle) * exitDist,
      0,
      Math.sin(exitAngle) * exitDist
    );
  }

  async _spawnFloatingBlocks(floorSize, floorNum) {
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
    for (let i = emptyColumns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyColumns[i], emptyColumns[j]] = [emptyColumns[j], emptyColumns[i]];
    }
    const selected = emptyColumns.slice(0, clusterCount);

    for (const col of selected) {
      // Single floating block per column — no vertical stacking
      const y = 2 + Math.floor(Math.random() * 3); // y=2 to y=4
      // Skip if something already here
      if (this.getBlock(col.x, y, col.z)) continue;

      const type = types[Math.floor(Math.random() * types.length)];
      // Slight random offset for visual variety
      const offsetX = (Math.random() - 0.5) * 0.3;
      const offsetZ = (Math.random() - 0.5) * 0.3;

      await this._placeFloatingBlock({
        x: col.x + offsetX,
        y,
        z: col.z + offsetZ,
        type,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.4, // 0.8 - 1.2
      });
    }
  }

  async loadAuthoredLevel(levelDoc, rendererDeps) {
    this.clear();
    this.authoredMode = true;

    // 1. Place tiles as stacked columns
    for (const t of levelDoc.tiles) {
      const blockType = getBlockTypeForTile(t.type);
      for (let dy = 0; dy < t.height; dy++) {
        await this._placeBlock(blockType, t.x, t.y + dy, t.z);
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

  async _placeFloatingBlock(fb) {
    const key = `${fb.x},${fb.y},${fb.z}`;
    if (this.blocks.has(key)) return;
    const block = new Block(fb.type, fb.x, fb.y, fb.z);
    block.isFloating = true;
    block.bobPhase = fb.bobPhase ?? Math.random() * Math.PI * 2;
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

  async _placeBlock(typeKey, x, y, z) {
    const key = `${x},${y},${z}`;
    if (this.blocks.has(key)) return;
    const block = new Block(typeKey, x, y, z);
    await block.createMesh(this.scene);
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
