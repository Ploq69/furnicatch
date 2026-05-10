import * as THREE from 'three';
import { GAME, BIOMES, BLOCK_TYPES, ENEMY_TYPES } from './constants.js';
import { Block } from './Block.js';
import { Enemy } from './Enemy.js';
import { SFXMapper } from './SFXMapper.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.enemies = [];
    this.floor = 1;
    this.biome = BIOMES[0];
    this.exitPosition = null;
    this.exitMesh = null;
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
          this._placeBlock(type, worldX, 0, worldZ);
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
      await enemy.spawn(this.scene);
      this.enemies.push(enemy);
    }

    // Exit position (random edge)
    const exitAngle = Math.random() * Math.PI * 2;
    const exitDist = size - 1;
    this.exitPosition = new THREE.Vector3(
      Math.cos(exitAngle) * exitDist,
      0,
      Math.sin(exitAngle) * exitDist
    );
  }

  _placeBlock(typeKey, x, y, z) {
    const key = `${x},${y},${z}`;
    if (this.blocks.has(key)) return;
    const block = new Block(typeKey, x, y, z);
    block.createMesh(this.scene);
    this.blocks.set(key, block);
  }

  getBlock(x, y, z) {
    const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    return this.blocks.get(key);
  }

  mineBlock(block, particles, audio) {
    if (!block || block.destroyed) return null;
    block.destroy(this.scene, particles);
    const key = `${block.position.x},${block.position.y},${block.position.z}`;
    this.blocks.delete(key);
    return block.drop;
  }

  update(dt, playerPos, particles, audio, player) {
    for (const block of this.blocks.values()) {
      block.update(dt);
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
    for (const enemy of this.enemies) {
      enemy.cleanup(this.scene);
    }
    this.enemies = [];
    this.exitPosition = null;
  }
}
