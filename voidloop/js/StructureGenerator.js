/**
 * StructureGenerator — Procedural trees, rocks, and decorations for SDF terrain.
 * Inspired by ourCraft's StructuresManager.
 */

import { SeededRNG } from './SeededRNG.js';

const TREE_TYPES = {
  birch: {
    trunk: 'birch_log',
    leaves: 'birch_leaves',
    minHeight: 4,
    maxHeight: 6,
    leafRadius: 2,
    leafHeight: 2,
  },
  oak: {
    trunk: 'oak_log',
    leaves: 'oak_leaves',
    minHeight: 4,
    maxHeight: 6,
    leafRadius: 2,
    leafHeight: 3,
  },
  jungle: {
    trunk: 'jungle_log',
    leaves: 'jungle_leaves',
    minHeight: 6,
    maxHeight: 9,
    leafRadius: 2,
    leafHeight: 2,
  },
  acacia: {
    trunk: 'acacia_log',
    leaves: 'acacia_leaves',
    minHeight: 3,
    maxHeight: 5,
    leafRadius: 2,
    leafHeight: 1,
  },
  dark_oak: {
    trunk: 'dark_oak_log',
    leaves: 'dark_oak_leaves',
    minHeight: 5,
    maxHeight: 7,
    leafRadius: 2,
    leafHeight: 3,
    thickTrunk: true,
  },
  spruce: {
    // Uses dark_oak as pine substitute
    trunk: 'dark_oak_log',
    leaves: 'dark_oak_leaves',
    minHeight: 5,
    maxHeight: 8,
    leafRadius: 2,
    leafHeight: 4,
    cone: true,
  },
  palm: {
    trunk: 'jungle_log',
    leaves: 'jungle_leaves',
    minHeight: 5,
    maxHeight: 7,
    leafRadius: 2,
    leafHeight: 1,
    flatTop: true,
  },
  cactus: {
    trunk: 'cactus',
    leaves: null,
    minHeight: 2,
    maxHeight: 4,
    leafRadius: 0,
    leafHeight: 0,
  },
};

const STRUCTURE_PLACEMENT_DEFAULTS = {
  forest: { maxTrees: 56, maxBoulders: 56, maxDecorations: 220, minTreeSpacing: 7, spawnClearRadius: 9, gatewayClearRadius: 8, fluidClearPadding: 3 },
  fire: { maxTrees: 28, maxBoulders: 64, maxDecorations: 120, minTreeSpacing: 8, spawnClearRadius: 8, gatewayClearRadius: 7, fluidClearPadding: 2 },
  ice: { maxTrees: 42, maxBoulders: 56, maxDecorations: 80, minTreeSpacing: 8, spawnClearRadius: 8, gatewayClearRadius: 7, fluidClearPadding: 2 },
  desert: { maxTrees: 36, maxBoulders: 56, maxDecorations: 120, minTreeSpacing: 7, spawnClearRadius: 8, gatewayClearRadius: 7, fluidClearPadding: 2 },
  mire: { maxTrees: 40, maxBoulders: 48, maxDecorations: 180, minTreeSpacing: 8, spawnClearRadius: 8, gatewayClearRadius: 7, fluidClearPadding: 2 },
  default: { maxTrees: 48, maxBoulders: 56, maxDecorations: 160, minTreeSpacing: 7, spawnClearRadius: 8, gatewayClearRadius: 7, fluidClearPadding: 2 },
};

export class StructureGenerator {
  constructor(terrainMesh) {
    this.terrainMesh = terrainMesh;
  }

  generateForZone(zone, seed) {
    const rng = new SeededRNG(seed + zone.order * 7919);
    const structures = this._structureSettings(zone);

    // Collect valid surface columns
    const columns = this._collectSurfaceColumns(zone, structures);
    if (columns.length === 0) return;

    rng.shuffle(columns);

    // Place trees
    const requestedTrees = Math.floor(columns.length * (structures.treeDensity || 0));
    const treeCount = Math.min(requestedTrees, structures.maxTrees ?? requestedTrees);
    let placed = 0;
    const occupied = new Set();

    for (const col of columns) {
      if (placed >= treeCount) break;
      const key = `${col.x},${col.z}`;
      if (occupied.has(key)) continue;

      const treeType = rng.choice(structures.trees);
      const def = TREE_TYPES[treeType];
      if (!def) continue;

      const surfaceY = this.terrainMesh.getColumnTop(col.x, col.z);
      if (surfaceY < -50) continue;

      // Only place on valid ground types
      const groundType = this.terrainMesh.getCellBlockType(col.x, Math.floor(surfaceY) - 1, col.z);
      if (!this._isValidGroundForTree(groundType, treeType)) continue;

      // Check clearances
      if (!this._canPlaceTree(col.x, surfaceY, col.z, def)) continue;

      this._placeTree(col.x, Math.floor(surfaceY), col.z, def, rng);
      placed++;

      // Mark occupancy radius
      const radius = Math.max(def.leafRadius + 1, Math.floor((structures.minTreeSpacing || 0) / 2));
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          occupied.add(`${col.x + dx},${col.z + dz}`);
        }
      }
    }

    // Place boulders
    const requestedBoulders = Math.floor(columns.length * (structures.boulderDensity || 0));
    const boulderCount = Math.min(requestedBoulders, structures.maxBoulders ?? requestedBoulders);
    let bouldersPlaced = 0;
    for (const col of columns) {
      if (bouldersPlaced >= boulderCount) break;
      if (occupied.has(`${col.x},${col.z}`)) continue;
      if (rng.random() > 0.3) continue;

      const surfaceY = this.terrainMesh.getColumnTop(col.x, col.z);
      if (surfaceY < -50) continue;
      const groundType = this.terrainMesh.getCellBlockType(col.x, Math.floor(surfaceY) - 1, col.z);
      if (!this._isValidGroundForBoulder(groundType)) continue;

      this._placeBoulder(col.x, Math.floor(surfaceY), col.z, rng);
      bouldersPlaced++;
      occupied.add(`${col.x},${col.z}`);
    }

    // Place decorations (flowers, grass, dead bushes)
    const requestedDecors = Math.floor(columns.length * (structures.decorDensity || 0));
    const decorCount = Math.min(requestedDecors, structures.maxDecorations ?? requestedDecors);
    let decorsPlaced = 0;
    for (const col of columns) {
      if (decorsPlaced >= decorCount) break;
      if (occupied.has(`${col.x},${col.z}`)) continue;
      if (rng.random() > 0.4) continue;

      const surfaceY = this.terrainMesh.getColumnTop(col.x, col.z);
      if (surfaceY < -50) continue;
      const groundType = this.terrainMesh.getCellBlockType(col.x, Math.floor(surfaceY) - 1, col.z);

      const decorType = this._pickDecorType(groundType, structures.decorations, rng);
      if (!decorType) continue;

      this.terrainMesh.placeBlock(col.x, Math.floor(surfaceY), col.z, decorType, 0.5);
      decorsPlaced++;
    }
  }

  _structureSettings(zone) {
    const defaults = this._defaultStructures(zone);
    const placement = STRUCTURE_PLACEMENT_DEFAULTS[zone.id] || STRUCTURE_PLACEMENT_DEFAULTS.default;
    return {
      ...placement,
      ...defaults,
      ...(zone.structures || {}),
    };
  }

  _defaultStructures(zone) {
    const defaults = {
      forest: {
        trees: ['birch', 'oak'],
        treeDensity: 0.06,
        decorations: ['tall_grass', 'flower_red', 'flower_yellow', 'mushroom'],
        decorDensity: 0.12,
        boulders: true,
        boulderDensity: 0.015,
      },
      fire: {
        trees: ['dark_oak'],
        treeDensity: 0.02,
        decorations: ['dead_bush'],
        decorDensity: 0.05,
        boulders: true,
        boulderDensity: 0.03,
      },
      ice: {
        trees: ['spruce'],
        treeDensity: 0.04,
        decorations: [],
        decorDensity: 0.0,
        boulders: true,
        boulderDensity: 0.02,
      },
      desert: {
        trees: ['acacia', 'cactus'],
        treeDensity: 0.03,
        decorations: ['dead_bush'],
        decorDensity: 0.04,
        boulders: true,
        boulderDensity: 0.02,
      },
      steelworks: {
        trees: [],
        treeDensity: 0.0,
        decorations: [],
        decorDensity: 0.0,
        boulders: true,
        boulderDensity: 0.04,
      },
      mire: {
        trees: ['dark_oak'],
        treeDensity: 0.03,
        decorations: ['mushroom', 'tall_grass'],
        decorDensity: 0.08,
        boulders: true,
        boulderDensity: 0.01,
      },
      citadel: {
        trees: [],
        treeDensity: 0.0,
        decorations: [],
        decorDensity: 0.0,
        boulders: false,
        boulderDensity: 0.0,
      },
    };
    return defaults[zone.id] || defaults.forest;
  }

  _collectSurfaceColumns(zone, structures = {}) {
    const cols = [];
    const b = zone.bounds;
    const sp = zone.spawnPoint;
    const gw = zone.exitGateway;
    const spawnClearRadius = structures.spawnClearRadius ?? 6;
    const gatewayClearRadius = structures.gatewayClearRadius ?? 5;
    const fluidClearPadding = structures.fluidClearPadding ?? 0;
    for (let x = Math.ceil(b.minX); x < Math.floor(b.maxX); x++) {
      for (let z = Math.ceil(b.minZ); z < Math.floor(b.maxZ); z++) {
        // Avoid spawn and gateway
        if (sp && Math.hypot(x - sp.x, z - sp.z) < spawnClearRadius) continue;
        if (gw && Math.hypot(x - gw.x, z - gw.z) < gatewayClearRadius) continue;
        if (this._insideFluidClearance(zone, x, z, fluidClearPadding)) continue;
        cols.push({ x, z });
      }
    }
    return cols;
  }

  _insideFluidClearance(zone, x, z, padding) {
    if (!zone.fluidBodies?.length) return false;
    for (const body of zone.fluidBodies) {
      const rx = Math.max(0.1, (body.radiusX || body.radius || 0) + padding);
      const rz = Math.max(0.1, (body.radiusZ || body.radius || 0) + padding);
      const dx = (x - body.x) / rx;
      const dz = (z - body.z) / rz;
      if (dx * dx + dz * dz <= 1) return true;
    }
    return false;
  }

  _isValidGroundForTree(groundType, treeType) {
    if (treeType === 'cactus') return groundType === 'sand_A' || groundType === 'sand_B' || groundType === 'sand' || groundType === 'red_sand';
    if (treeType === 'acacia' || treeType === 'palm') return groundType === 'sand_A' || groundType === 'sand_B' || groundType === 'sand' || groundType === 'red_sand' || groundType === 'grass' || groundType === 'dirt';
    if (treeType === 'spruce' || treeType === 'dark_oak') return groundType === 'grass' || groundType === 'dirt' || groundType === 'snow' || groundType === 'coarse_dirt';
    return groundType === 'grass' || groundType === 'dirt' || groundType === 'coarse_dirt';
  }

  _isValidGroundForBoulder(groundType) {
    return groundType === 'grass' || groundType === 'dirt' || groundType === 'stone' || groundType === 'coarse_dirt' || groundType === 'sand_A' || groundType === 'sand_B' || groundType === 'sand' || groundType === 'red_sand';
  }

  _pickDecorType(groundType, decorations, rng) {
    if (!decorations || decorations.length === 0) return null;
    if (groundType === 'grass' || groundType === 'dirt' || groundType === 'coarse_dirt') {
      return rng.choice(decorations);
    }
    if (groundType === 'sand_A' || groundType === 'sand_B' || groundType === 'sand' || groundType === 'red_sand') {
      if (decorations.includes('dead_bush')) return 'dead_bush';
      if (decorations.includes('cactus')) return 'cactus';
    }
    if (groundType === 'snow') {
      // No decorations on snow
      return null;
    }
    return null;
  }

  _canPlaceTree(x, y, z, def) {
    // Check if there's enough vertical clearance
    const height = def.maxHeight + def.leafHeight + 1;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = -def.leafRadius; dx <= def.leafRadius; dx++) {
        for (let dz = -def.leafRadius; dz <= def.leafRadius; dz++) {
          if (this.terrainMesh.isCellRenderable(x + dx, Math.floor(y) + dy, z + dz)) {
            // Allow hitting existing terrain near the bottom for embedding
            if (dy > 1) return false;
          }
        }
      }
    }
    return true;
  }

  _placeTree(rootX, rootY, rootZ, def, rng) {
    const height = rng.rangeInt(def.minHeight, def.maxHeight);

    // Trunk
    if (def.thickTrunk) {
      for (let dy = 0; dy < height; dy++) {
        this.terrainMesh.placeBlock(rootX, rootY + dy, rootZ, def.trunk);
        this.terrainMesh.placeBlock(rootX + 1, rootY + dy, rootZ, def.trunk);
        this.terrainMesh.placeBlock(rootX, rootY + dy, rootZ + 1, def.trunk);
        this.terrainMesh.placeBlock(rootX + 1, rootY + dy, rootZ + 1, def.trunk);
      }
    } else {
      for (let dy = 0; dy < height; dy++) {
        this.terrainMesh.placeBlock(rootX, rootY + dy, rootZ, def.trunk);
      }
    }

    if (!def.leaves) return; // cactus has no leaves

    // Leaves
    const leafStart = rootY + height - 1;
    const trunkCenterX = def.thickTrunk ? rootX + 0.5 : rootX;
    const trunkCenterZ = def.thickTrunk ? rootZ + 0.5 : rootZ;

    if (def.cone) {
      // Spruce: cone-shaped layers
      for (let ly = 0; ly < def.leafHeight + 2; ly++) {
        const radius = Math.max(0, Math.floor((def.leafHeight + 2 - ly) * 0.7));
        const y = leafStart + ly;
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (dx === 0 && dz === 0 && ly < 2) continue; // skip trunk center
            const dist = Math.max(Math.abs(dx), Math.abs(dz));
            const leafX = Math.round(trunkCenterX + dx);
            const leafZ = Math.round(trunkCenterZ + dz);
            if (dist <= radius && !this.terrainMesh.isCellRenderable(leafX, y, leafZ)) {
              this.terrainMesh.placeBlock(leafX, y, leafZ, def.leaves);
            }
          }
        }
      }
    } else if (def.flatTop) {
      // Palm: flat canopy on top
      const y = leafStart + 1;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > 3) continue;
          if (dx === 0 && dz === 0) continue;
          const leafX = Math.round(trunkCenterX + dx);
          const leafZ = Math.round(trunkCenterZ + dz);
          if (!this.terrainMesh.isCellRenderable(leafX, y, leafZ)) {
            this.terrainMesh.placeBlock(leafX, y, leafZ, def.leaves);
          }
        }
      }
    } else {
      // Standard blob canopy
      for (let ly = 0; ly < def.leafHeight; ly++) {
        const y = leafStart + ly;
        const radius = ly === 0 ? def.leafRadius : def.leafRadius - 1;
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (dx === 0 && dz === 0 && ly < 2) continue;
            const distSq = dx * dx + dz * dz;
            const leafX = Math.round(trunkCenterX + dx);
            const leafZ = Math.round(trunkCenterZ + dz);
            if (distSq <= radius * radius + 0.5 && !this.terrainMesh.isCellRenderable(leafX, y, leafZ)) {
              this.terrainMesh.placeBlock(leafX, y, leafZ, def.leaves);
            }
          }
        }
      }
    }
  }

  _placeBoulder(x, y, z, rng) {
    const size = rng.random() < 0.3 ? 2 : 1;
    const stoneType = rng.random() < 0.5 ? 'stone' : 'cobblestone';
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        for (let dz = 0; dz < size; dz++) {
          if (rng.random() < 0.2) continue; // irregular shape
          this.terrainMesh.placeBlock(x + dx, y + dy, z + dz, stoneType);
        }
      }
    }
  }
}
