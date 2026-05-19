import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { ASSETS, BIOMES, GAME, LETTER_WORDS, VOCABULARY, PROP_VOCABULARY, CATCHABLE_BY_KEY } from './constants.js';
import { Furniture } from './Furniture.js';
import { LetterCreature } from './LetterCreature.js';
import { PropCreature } from './PropCreature.js';
import { NPC } from './NPC.js';
import { SimplexNoise } from './SimplexNoise.js';
import { OurCraftLoader } from './OurCraftLoader.js';

const BLOCK = {
  air: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
  wood: 4,
  brick: 5,
  sand: 6,
  gravel: 7,
  water: 8,
  leaves: 9,
  ore: 10,
  crystal: 11,
};

const BLOCK_COLORS = {
  [BLOCK.grass]: [0x466d25, 0x5f8f2e, 0x78a944],
  [BLOCK.dirt]: [0x7b5436, 0x9b6f45, 0xb78755],
  [BLOCK.stone]: [0x555f6b, 0x737d88, 0x8f98a3],
  [BLOCK.wood]: [0x7a4b28, 0x9b6535, 0xc1844a],
  [BLOCK.brick]: [0x7f3f37, 0xa75145, 0xc76858],
  [BLOCK.sand]: [0xc2b280, 0xd4c4a0, 0xe6d5b8],
  [BLOCK.gravel]: [0x6b7280, 0x7c8798, 0x8e99a8],
  [BLOCK.water]: [0x3b82f6, 0x60a5fa, 0x93c5fd],
  [BLOCK.leaves]: [0x2d5a27, 0x3d7a33, 0x4e9a40],
  [BLOCK.ore]: [0x334155, 0x64748b, 0xfbbf24],
  [BLOCK.crystal]: [0x2563eb, 0x38bdf8, 0xa78bfa],
};

const BIOME_TERRAIN = {
  farm_garden: { top: BLOCK.grass, path: BLOCK.dirt, base: -2, height: 8, roughness: 3, terrace: true },
  food_market: { top: BLOCK.wood, path: BLOCK.brick, base: -2, height: 4, roughness: 1.5, terrace: false },
  space_camp: { top: BLOCK.stone, path: BLOCK.brick, base: -5, height: 13, roughness: 5, terrace: false },
  meadow: { top: BLOCK.grass, path: BLOCK.dirt, base: -2, height: 8, roughness: 3, terrace: true },
};

const AO_LIGHT = [0.48, 0.64, 0.82, 1.0];

const FACE_DEFS = [
  {
    normal: [1, 0, 0],
    corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    aoSides: [[[0, -1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1]]],
  },
  {
    normal: [-1, 0, 0],
    corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    aoSides: [[[0, -1, 0], [0, 0, -1]], [[0, -1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, -1]]],
  },
  {
    normal: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    aoSides: [[[-1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, -1]], [[-1, 0, 0], [0, 0, -1]]],
  },
  {
    normal: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    aoSides: [[[-1, 0, 0], [0, 0, -1]], [[1, 0, 0], [0, 0, -1]], [[1, 0, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1]]],
  },
  {
    normal: [0, 0, 1],
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    aoSides: [[[-1, 0, 0], [0, -1, 0]], [[1, 0, 0], [0, -1, 0]], [[1, 0, 0], [0, 1, 0]], [[-1, 0, 0], [0, 1, 0]]],
  },
  {
    normal: [0, 0, -1],
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    aoSides: [[[1, 0, 0], [0, -1, 0]], [[-1, 0, 0], [0, -1, 0]], [[-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]]],
  },
];

export class World {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.tileSize = 2;
    this.chunkSize = GAME.CHUNK_SIZE;
    this.activeRadius = GAME.ACTIVE_CHUNK_RADIUS;
    this.simulationRadius = GAME.SIMULATION_CHUNK_RADIUS;
    this.worldChunkRadius = GAME.WORLD_CHUNK_RADIUS;
    this.tiles = [];
    this.decorations = [];
    this.furniture = [];
    this.letters = [];
    this.props = [];
    this.npcs = [];
    this.chunks = new Map();
    this.loadingChunks = new Set();
    this.activeChunkKeys = new Set();
    this.biomeKey = 'meadow';
    this.groundY = 0;
    this.getFurnitureLevel = options.getFurnitureLevel || (() => 1);
    this.getLetterLevel = options.getLetterLevel || (() => 1);
    this.getPropLevel = options.getPropLevel || (() => 1);
    this.voxelHeight = 64;
    this.voxelMinY = -24;
    this.chunkHalf = this.chunkSize / 2;
    this.dirtyChunks = new Set();
    this.maxRemeshesPerFrame = 2;
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.02,
    });
    this.debugStats = {
      generatedChunks: 0,
      remeshedChunks: 0,
      lastMeshMs: 0,
      lastEditedBlocks: 0,
    };
    this.blockTypes = BLOCK;
    // Deterministic smooth noise for terrain
    this.simplex = new SimplexNoise(12345);
    this.ourCraftLoader = null;
  }

  async generate(biomeKey = 'meadow') {
    this.biomeKey = biomeKey;
    this._frameCount = 0;
    if (biomeKey === 'ourcraft_demo') {
      this.voxelHeight = 256;
      this.voxelMinY = 0;
      this.worldChunkRadius = 8;
      this.activeRadius = 3;
      this.ourCraftLoader = new OurCraftLoader(this);
    } else {
      this.voxelHeight = 64;
      this.voxelMinY = -24;
      this.worldChunkRadius = GAME.WORLD_CHUNK_RADIUS;
      this.activeRadius = GAME.ACTIVE_CHUNK_RADIUS;
      this.ourCraftLoader = null;
    }
    await this.ensureActiveChunks(new THREE.Vector3(0, 0, 0), true);
  }

  update(dt, playerPos) {
    this.ensureActiveChunks(playerPos);
    this._frameCount = (this._frameCount || 0) + 1;
    this._processDirtyChunks();
    // Keep fade state for chunk lifecycle without scaling absolute terrain meshes.
    for (const chunk of this.chunks.values()) {
      if (chunk.fadeIn < 1.0) {
        chunk.fadeIn = Math.min(1.0, chunk.fadeIn + dt / 0.5);
      }
    }
    // Cull entity visibility by distance (Minecraft-style entity culling)
    this._cullEntityVisibility(playerPos);
    // Update only visible and nearby entities, with throttling for distant ones
    for (const f of this.furniture) {
      if (this._shouldUpdateEntity(f, playerPos, this._frameCount)) {
        f.update(dt, playerPos);
      }
    }
    for (const letter of this.letters) {
      if (this._shouldUpdateEntity(letter, playerPos, this._frameCount)) {
        letter.update(dt, playerPos);
      }
    }
    for (const prop of this.props) {
      if (this._shouldUpdateEntity(prop, playerPos, this._frameCount)) {
        prop.update(dt, playerPos);
      }
    }
    for (const npc of this.npcs) {
      if (this._shouldUpdateEntity(npc, playerPos, this._frameCount)) {
        npc.update(dt, playerPos);
      }
    }
    // Remove inactive entities
    this.furniture = this.furniture.filter(f => {
      if (!f.active && f.state === 'captured') {
        f.dispose();
        return false;
      }
      return true;
    });
    this.letters = this.letters.filter(letter => {
      if (!letter.active && letter.state === 'captured') {
        letter.dispose();
        return false;
      }
      return true;
    });
    this.props = this.props.filter(prop => {
      if (!prop.active && prop.state === 'captured') {
        prop.dispose();
        return false;
      }
      return true;
    });
  }

  getActiveFurniture() {
    return this.furniture.filter(f =>
      f.state === 'idle' || f.state === 'alert' || f.state === 'flee'
    );
  }

  getTrappedFurniture() {
    return this.furniture.find(f => f.state === 'trapped');
  }

  getVisibleEntities() {
    return [...this.furniture, ...this.letters, ...this.props].filter(item => item.container?.visible !== false);
  }

  getSimulatedFurniture(playerPos) {
    const current = this.worldToChunk(playerPos);
    return this.furniture.filter(item => {
      const chunk = this.worldToChunk(item.position);
      return Math.abs(chunk.x - current.x) <= this.simulationRadius &&
        Math.abs(chunk.z - current.z) <= this.simulationRadius;
    });
  }

  getSimulatedLetters(playerPos) {
    const current = this.worldToChunk(playerPos);
    return this.letters.filter(item => {
      const chunk = this.worldToChunk(item.position);
      return Math.abs(chunk.x - current.x) <= this.simulationRadius &&
        Math.abs(chunk.z - current.z) <= this.simulationRadius;
    });
  }

  getSimulatedProps(playerPos) {
    const current = this.worldToChunk(playerPos);
    return this.props.filter(item => {
      const chunk = this.worldToChunk(item.position);
      return Math.abs(chunk.x - current.x) <= this.simulationRadius &&
        Math.abs(chunk.z - current.z) <= this.simulationRadius;
    });
  }

  getSimulatedNPCs(playerPos) {
    const current = this.worldToChunk(playerPos);
    return this.npcs.filter(item => {
      const chunk = this.worldToChunk(item.position);
      return Math.abs(chunk.x - current.x) <= this.simulationRadius &&
        Math.abs(chunk.z - current.z) <= this.simulationRadius;
    });
  }

  clear() {
    for (const chunk of this.chunks.values()) this._disposeChunk(chunk);
    for (const f of this.furniture) f.dispose();
    for (const letter of this.letters) letter.dispose();
    for (const prop of this.props) prop.dispose();
    for (const npc of this.npcs) npc.dispose();
    this.chunks.clear();
    this.loadingChunks.clear();
    this.activeChunkKeys.clear();
    this.dirtyChunks.clear();
    this.tiles = [];
    this.decorations = [];
    this.furniture = [];
    this.letters = [];
    this.props = [];
    this.npcs = [];
  }

  async ensureActiveChunks(playerPos, awaitLoads = false) {
    const current = this.worldToChunk(playerPos);
    const wanted = new Set();
    const loads = [];
    for (let cx = current.x - this.activeRadius; cx <= current.x + this.activeRadius; cx++) {
      for (let cz = current.z - this.activeRadius; cz <= current.z + this.activeRadius; cz++) {
        if (Math.abs(cx) > this.worldChunkRadius || Math.abs(cz) > this.worldChunkRadius) continue;
        const key = this._chunkKey(cx, cz);
        wanted.add(key);
        const distance = Math.max(Math.abs(cx - current.x), Math.abs(cz - current.z));
        const detail = distance <= this.simulationRadius ? 'full' : 'terrain';
        const existing = this.chunks.get(key);
        if (existing && existing.detail === 'terrain' && detail === 'full' && !existing.upgrading) {
          const load = this._populateChunkContent(existing, BIOMES[this.biomeKey]);
          loads.push(load);
        } else if (!existing && !this.loadingChunks.has(key)) {
          const load = this._generateChunk(cx, cz, this.biomeKey, detail);
          loads.push(load);
        }
      }
    }

    for (const chunk of this.chunks.values()) {
      chunk.group.visible = true;
      for (const item of chunk.furniture) {
        if (item.container) item.container.visible = true;
      }
      for (const item of chunk.letters) {
        if (item.container) item.container.visible = true;
      }
      for (const item of chunk.props) {
        if (item.container) item.container.visible = true;
      }
      for (const item of chunk.npcs) {
        if (item.container) item.container.visible = true;
      }
    }
    this.activeChunkKeys = wanted;
    this._unloadDistantChunks(current);

    if (awaitLoads && loads.length) await Promise.all(loads);
  }

  // Terrain height in world units at a given world x,z.
  // smooth=true bilinearly samples nearby voxel columns for stable walking.
  getTerrainHeight(wx, wz, smooth = true) {
    if (!smooth) {
      const { gx, gz } = this._worldToGlobalVoxelXZ(wx, wz);
      return this._getColumnSurfaceWorldY(gx, gz);
    }
    const gx = wx / this.tileSize;
    const gz = wz / this.tileSize;
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const fx = gx - x0;
    const fz = gz - z0;

    const h00 = this._getColumnSurfaceWorldY(x0, z0);
    const h10 = this._getColumnSurfaceWorldY(x1, z0);
    const h01 = this._getColumnSurfaceWorldY(x0, z1);
    const h11 = this._getColumnSurfaceWorldY(x1, z1);

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const h = h0 * (1 - fz) + h1 * fz;

    return h;
  }

  // Sample terrain at multiple points and return the MAX height —
  // treats player as having a small collision footprint instead of a point
  getTerrainHeightForPlayer(wx, wz, radius = 0.35) {
    const samples = [
      this.getTerrainHeight(wx, wz, true),
      this.getTerrainHeight(wx + radius, wz, true),
      this.getTerrainHeight(wx - radius, wz, true),
      this.getTerrainHeight(wx, wz + radius, true),
      this.getTerrainHeight(wx, wz - radius, true),
    ];
    return Math.max(...samples);
  }

  worldToChunk(pos) {
    const chunkWorldSize = this.chunkSize * this.tileSize;
    return {
      x: Math.floor((pos.x + chunkWorldSize / 2) / chunkWorldSize),
      z: Math.floor((pos.z + chunkWorldSize / 2) / chunkWorldSize),
    };
  }

  getWorldBounds() {
    return this.worldChunkRadius * this.chunkSize * this.tileSize;
  }

  async _generateChunk(cx, cz, biomeKey, detail = 'full') {
    const key = this._chunkKey(cx, cz);
    this.loadingChunks.add(key);
    const biome = BIOMES[biomeKey];

    let chunk;
    if (this.ourCraftLoader) {
      const loaded = await this.ourCraftLoader.loadChunk(cx, cz);
      if (loaded) {
        chunk = loaded;
        this.chunks.set(key, chunk);
        this.scene.add(chunk.group);
        this._remeshChunk(chunk);
        this._markNeighborChunksDirty(cx, cz);
        if (detail === 'full') {
          await this._populateChunkContent(chunk, biome);
        }
        this.loadingChunks.delete(key);
        return;
      }
    }

    chunk = {
      key,
      cx,
      cz,
      detail,
      upgrading: false,
      fadeIn: 0.0,
      group: new THREE.Group(),
      furniture: [],
      letters: [],
      props: [],
      npcs: [],
      decorations: [],
      voxels: new Uint8Array(this.chunkSize * this.voxelHeight * this.chunkSize),
      heightMap: new Int16Array(this.chunkSize * this.chunkSize),
      terrainMesh: null,
      dirty: false,
    };
    this.chunks.set(key, chunk);
    this.scene.add(chunk.group);

    this._generateTerrain(chunk, biome);
    this._markNeighborChunksDirty(cx, cz);
    if (detail === 'full') {
      await this._populateChunkContent(chunk, biome);
    }
    this.loadingChunks.delete(key);
  }

  async _populateChunkContent(chunk, biome) {
    chunk.upgrading = true;
    await this._generateDecorations(chunk, biome);
    this._generateFurniture(chunk, biome);
    this._generateLetters(chunk);
    this._generateProps(chunk, biome);
    this._generateNPCs(chunk, biome);
    chunk.detail = 'full';
    chunk.upgrading = false;
  }

  _generateTerrain(chunk, biome) {
    const t0 = performance.now();
    const biomeProfile = BIOME_TERRAIN[this.biomeKey] || BIOME_TERRAIN.farm_garden;
    const minY = this.voxelMinY;
    const maxY = this.voxelMinY + this.voxelHeight - 1;

    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const gx = this._localToGlobalX(chunk.cx, x);
        const gz = this._localToGlobalZ(chunk.cz, z);
        const surfaceY = THREE.MathUtils.clamp(this._terrainSurfaceBlockY(gx, gz, this.biomeKey), minY, maxY);
        chunk.heightMap[this._heightMapIndex(x, z)] = surfaceY;

        for (let gy = minY; gy <= surfaceY; gy++) {
          const localY = gy - this.voxelMinY;
          const depth = surfaceY - gy;
          let blockId = this._blockForDepth(depth, gx, gy, gz, biomeProfile);
          if (depth > 4 && this._voxelHash(gx, gy, gz) > 0.985) {
            blockId = this.biomeKey === 'space_camp' ? BLOCK.crystal : BLOCK.ore;
          }
          chunk.voxels[this._voxelIndex(x, localY, z)] = blockId;
        }
      }
    }

    this._remeshChunk(chunk);
    this.debugStats.generatedChunks += 1;
    this.debugStats.lastMeshMs = performance.now() - t0;
  }

  _remeshChunk(chunk) {
    if (!chunk || !chunk.voxels) return;
    const t0 = performance.now();
    if (chunk.terrainMesh) {
      chunk.group.remove(chunk.terrainMesh);
      this.scene.remove(chunk.terrainMesh);
      chunk.terrainMesh.geometry.dispose();
      this.tiles = this.tiles.filter(mesh => mesh !== chunk.terrainMesh);
      chunk.terrainMesh = null;
    }

    const data = this._buildChunkGeometryData(chunk);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(data.colors), 3));
    geometry.setIndex(data.indices);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.frustumCulled = true;
    chunk.group.add(mesh);
    chunk.terrainMesh = mesh;
    chunk.dirty = false;
    this.tiles.push(mesh);
    this.debugStats.remeshedChunks += 1;
    this.debugStats.lastMeshMs = performance.now() - t0;
  }

  _buildChunkGeometryData(chunk) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let vertexIndex = 0;

    for (let x = 0; x < this.chunkSize; x++) {
      for (let y = 0; y < this.voxelHeight; y++) {
        for (let z = 0; z < this.chunkSize; z++) {
          const blockId = chunk.voxels[this._voxelIndex(x, y, z)];
          if (blockId === BLOCK.air) continue;

          const gx = this._localToGlobalX(chunk.cx, x);
          const gy = this.voxelMinY + y;
          const gz = this._localToGlobalZ(chunk.cz, z);

          for (const face of FACE_DEFS) {
            const [nx, ny, nz] = face.normal;
            if (this._isSolidGlobal(gx + nx, gy + ny, gz + nz)) continue;

            for (let i = 0; i < 4; i++) {
              const corner = face.corners[i];
              positions.push(
                (gx + corner[0]) * this.tileSize,
                (gy + corner[1]) * this.tileSize,
                (gz + corner[2]) * this.tileSize
              );
              normals.push(nx, ny, nz);
              const ao = this._vertexAO(gx, gy, gz, face.normal, face.aoSides[i][0], face.aoSides[i][1]);
              const color = this._blockColor(blockId, gx, gy, gz, face.normal, ao);
              colors.push(color.r, color.g, color.b);
            }

            indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
            vertexIndex += 4;
          }
        }
      }
    }

    return { positions, normals, colors, indices };
  }

  _terrainSurfaceBlockY(gx, gz, biomeKey) {
    const profile = BIOME_TERRAIN[biomeKey] || BIOME_TERRAIN.farm_garden;
    const large = this._fbm2(gx, gz, 0.034, 4, 0.52, 2.0);
    const medium = this._fbm2(gx + 137, gz - 91, 0.095, 3, 0.5, 2.1);
    const ridgeNoise = this.simplex.noise2D(gx * 0.052 + 20.5, gz * 0.052 - 14.25);
    const ridge = 1 - Math.abs(ridgeNoise);
    let height = profile.base + large * profile.height + medium * profile.roughness;

    if (biomeKey === 'farm_garden' || biomeKey === 'meadow') {
      const terraceBand = this.simplex.noise2D(gx * 0.018 - 40, gz * 0.018 + 12);
      if (profile.terrace && terraceBand > 0.2) height = Math.round(height / 2) * 2;
    } else if (biomeKey === 'food_market') {
      const plaza = this.simplex.noise2D(gx * 0.025 + 9, gz * 0.025 - 21);
      if (plaza > 0.42) height = Math.round(height / 2) * 2;
      height += this._pathMask(gx, gz) ? 1 : 0;
    } else if (biomeKey === 'space_camp') {
      const crater = Math.max(0, this.simplex.noise2D(gx * 0.045 - 70, gz * 0.045 + 33));
      height += ridge * 5 - crater * crater * 7;
    }

    return Math.round(height);
  }

  _blockForDepth(depth, gx, gy, gz, profile) {
    if (depth === 0) {
      if (this._pathMask(gx, gz)) return profile.path;
      return profile.top;
    }
    if (depth <= 3) return BLOCK.dirt;
    return BLOCK.stone;
  }

  _pathMask(gx, gz) {
    const roadX = Math.abs(((gx % 18) + 18) % 18 - 9) <= 1;
    const roadZ = Math.abs(((gz % 22) + 22) % 22 - 11) <= 1;
    const softBreak = this.simplex.noise2D(gx * 0.11, gz * 0.11) > -0.35;
    return (roadX || roadZ) && softBreak;
  }

  _fbm2(x, z, scale, octaves, persistence, lacunarity) {
    let amplitude = 1;
    let frequency = scale;
    let value = 0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.simplex.noise2D(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return maxValue > 0 ? value / maxValue : 0;
  }

  _blockColor(blockId, gx, gy, gz, normal, aoLevel) {
    const ramp = BLOCK_COLORS[blockId] || BLOCK_COLORS[BLOCK.stone];
    const pick = Math.min(ramp.length - 1, Math.floor(this._voxelHash(gx, gy, gz) * ramp.length));
    const base = new THREE.Color(ramp[pick]);
    const vertical = normal[1] > 0 ? 1.12 : normal[1] < 0 ? 0.62 : 0.88;
    const variation = 0.92 + this._voxelHash(gx + 17, gy - 11, gz + 23) * 0.16;
    const light = AO_LIGHT[aoLevel] * vertical * variation;
    base.multiplyScalar(light);
    return base;
  }

  _vertexAO(gx, gy, gz, normal, sideA, sideB) {
    const sx = gx + normal[0];
    const sy = gy + normal[1];
    const sz = gz + normal[2];
    const side1 = this._isSolidGlobal(sx + sideA[0], sy + sideA[1], sz + sideA[2]) ? 1 : 0;
    const side2 = this._isSolidGlobal(sx + sideB[0], sy + sideB[1], sz + sideB[2]) ? 1 : 0;
    const corner = this._isSolidGlobal(sx + sideA[0] + sideB[0], sy + sideA[1] + sideB[1], sz + sideA[2] + sideB[2]) ? 1 : 0;
    if (side1 && side2) return 0;
    return 3 - (side1 + side2 + corner);
  }

  _getColumnSurfaceWorldY(gx, gz) {
    const { cx, cz, lx, lz } = this._globalXZToChunkLocal(gx, gz);
    const chunk = this.chunks.get(this._chunkKey(cx, cz));
    if (chunk?.voxels) {
      for (let y = this.voxelHeight - 1; y >= 0; y--) {
        if (chunk.voxels[this._voxelIndex(lx, y, lz)] !== BLOCK.air) {
          return (this.voxelMinY + y + 1) * this.tileSize;
        }
      }
      return this.voxelMinY * this.tileSize;
    }
    return (this._terrainSurfaceBlockY(gx, gz, this.biomeKey) + 1) * this.tileSize;
  }

  getBlock(worldX, worldY, worldZ) {
    const { gx, gy, gz } = this._worldToGlobalVoxel(worldX, worldY, worldZ);
    return this.getBlockAtVoxel(gx, gy, gz);
  }

  getBlockAtVoxel(gx, gy, gz) {
    const local = this._globalToChunkLocal(gx, gy, gz);
    if (!local) return BLOCK.air;
    const chunk = this.chunks.get(this._chunkKey(local.cx, local.cz));
    if (!chunk?.voxels) return BLOCK.air;
    return chunk.voxels[this._voxelIndex(local.lx, local.ly, local.lz)];
  }

  setBlock(worldX, worldY, worldZ, blockId) {
    const { gx, gy, gz } = this._worldToGlobalVoxel(worldX, worldY, worldZ);
    return this.setBlockAtVoxel(gx, gy, gz, blockId);
  }

  setBlockAtVoxel(gx, gy, gz, blockId) {
    const local = this._globalToChunkLocal(gx, gy, gz);
    if (!local) return false;
    const chunk = this.chunks.get(this._chunkKey(local.cx, local.cz));
    if (!chunk?.voxels) return false;
    const index = this._voxelIndex(local.lx, local.ly, local.lz);
    const next = blockId || BLOCK.air;
    if (chunk.voxels[index] === next) return false;
    chunk.voxels[index] = next;
    this._markChunkDirty(local.cx, local.cz);
    if (local.lx === 0) this._markChunkDirty(local.cx - 1, local.cz);
    if (local.lx === this.chunkSize - 1) this._markChunkDirty(local.cx + 1, local.cz);
    if (local.lz === 0) this._markChunkDirty(local.cx, local.cz - 1);
    if (local.lz === this.chunkSize - 1) this._markChunkDirty(local.cx, local.cz + 1);
    return true;
  }

  destroySphere(center, radius, options = {}) {
    const blockRadius = Math.ceil(radius / this.tileSize);
    const { gx, gy, gz } = this._worldToGlobalVoxel(center.x, center.y, center.z);
    const radiusSq = radius * radius;
    let edited = 0;
    const editedChunks = new Set();

    for (let x = gx - blockRadius; x <= gx + blockRadius; x++) {
      for (let y = gy - blockRadius; y <= gy + blockRadius; y++) {
        for (let z = gz - blockRadius; z <= gz + blockRadius; z++) {
          const voxelCenter = this._voxelCenterWorld(x, y, z);
          if (voxelCenter.distanceToSquared(center) > radiusSq) continue;
          const previous = this.getBlockAtVoxel(x, y, z);
          if (previous === BLOCK.air) continue;
          if (options.preserveTop && previous === BLOCK.grass) continue;
          if (this.setBlockAtVoxel(x, y, z, BLOCK.air)) {
            const local = this._globalToChunkLocal(x, y, z);
            if (local) editedChunks.add(this._chunkKey(local.cx, local.cz));
            edited += 1;
          }
        }
      }
    }

    this.debugStats.lastEditedBlocks = edited;
    return { edited, chunks: editedChunks.size };
  }

  raycastVoxel(origin, direction, maxDistance = 60) {
    const dir = direction.clone().normalize();
    const pos = origin.clone();
    let { gx, gy, gz } = this._worldToGlobalVoxel(pos.x, pos.y, pos.z);
    const stepX = dir.x >= 0 ? 1 : -1;
    const stepY = dir.y >= 0 ? 1 : -1;
    const stepZ = dir.z >= 0 ? 1 : -1;
    const nextBoundary = (g, step) => (step > 0 ? (g + 1) * this.tileSize : g * this.tileSize);
    let tMaxX = dir.x !== 0 ? (nextBoundary(gx, stepX) - origin.x) / dir.x : Infinity;
    let tMaxY = dir.y !== 0 ? (nextBoundary(gy, stepY) - origin.y) / dir.y : Infinity;
    let tMaxZ = dir.z !== 0 ? (nextBoundary(gz, stepZ) - origin.z) / dir.z : Infinity;
    const tDeltaX = dir.x !== 0 ? this.tileSize / Math.abs(dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? this.tileSize / Math.abs(dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? this.tileSize / Math.abs(dir.z) : Infinity;
    let distance = 0;
    let normal = new THREE.Vector3();

    while (distance <= maxDistance) {
      const blockId = this.getBlockAtVoxel(gx, gy, gz);
      if (blockId !== BLOCK.air) {
        return {
          blockId,
          voxel: { x: gx, y: gy, z: gz },
          point: origin.clone().addScaledVector(dir, Math.max(0, distance)),
          normal,
          distance,
        };
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        gx += stepX;
        distance = tMaxX;
        tMaxX += tDeltaX;
        normal = new THREE.Vector3(-stepX, 0, 0);
      } else if (tMaxY < tMaxZ) {
        gy += stepY;
        distance = tMaxY;
        tMaxY += tDeltaY;
        normal = new THREE.Vector3(0, -stepY, 0);
      } else {
        gz += stepZ;
        distance = tMaxZ;
        tMaxZ += tDeltaZ;
        normal = new THREE.Vector3(0, 0, -stepZ);
      }
    }
    return null;
  }

  _processDirtyChunks() {
    let remeshed = 0;
    for (const key of [...this.dirtyChunks]) {
      if (remeshed >= this.maxRemeshesPerFrame) break;
      const chunk = this.chunks.get(key);
      this.dirtyChunks.delete(key);
      if (!chunk?.dirty) continue;
      this._remeshChunk(chunk);
      remeshed += 1;
    }
  }

  _markNeighborChunksDirty(cx, cz) {
    this._markChunkDirty(cx - 1, cz);
    this._markChunkDirty(cx + 1, cz);
    this._markChunkDirty(cx, cz - 1);
    this._markChunkDirty(cx, cz + 1);
  }

  _markChunkDirty(cx, cz) {
    const key = this._chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    chunk.dirty = true;
    this.dirtyChunks.add(key);
  }

  _isSolidGlobal(gx, gy, gz) {
    return this.getBlockAtVoxel(gx, gy, gz) !== BLOCK.air;
  }

  _worldToGlobalVoxel(worldX, worldY, worldZ) {
    return {
      gx: Math.floor(worldX / this.tileSize),
      gy: Math.floor(worldY / this.tileSize),
      gz: Math.floor(worldZ / this.tileSize),
    };
  }

  _worldToGlobalVoxelXZ(worldX, worldZ) {
    return {
      gx: Math.floor(worldX / this.tileSize),
      gz: Math.floor(worldZ / this.tileSize),
    };
  }

  _globalToChunkLocal(gx, gy, gz) {
    const ly = gy - this.voxelMinY;
    if (ly < 0 || ly >= this.voxelHeight) return null;
    const xz = this._globalXZToChunkLocal(gx, gz);
    return { ...xz, ly };
  }

  _globalXZToChunkLocal(gx, gz) {
    const cx = Math.floor((gx + this.chunkHalf) / this.chunkSize);
    const cz = Math.floor((gz + this.chunkHalf) / this.chunkSize);
    const lx = gx - cx * this.chunkSize + this.chunkHalf;
    const lz = gz - cz * this.chunkSize + this.chunkHalf;
    return { cx, cz, lx, lz };
  }

  _localToGlobalX(cx, lx) {
    return cx * this.chunkSize + lx - this.chunkHalf;
  }

  _localToGlobalZ(cz, lz) {
    return cz * this.chunkSize + lz - this.chunkHalf;
  }

  _voxelIndex(x, y, z) {
    return y * this.chunkSize * this.chunkSize + z * this.chunkSize + x;
  }

  _heightMapIndex(x, z) {
    return z * this.chunkSize + x;
  }

  _voxelCenterWorld(gx, gy, gz) {
    return new THREE.Vector3(
      (gx + 0.5) * this.tileSize,
      (gy + 0.5) * this.tileSize,
      (gz + 0.5) * this.tileSize
    );
  }

  _voxelHash(x, y, z) {
    const n = Math.sin((x * 127.1 + y * 311.7 + z * 74.7) * 12.9898) * 43758.5453123;
    return n - Math.floor(n);
  }

  async _generateDecorations(chunk, biome) {
    const decoCount = GAME.DECORATIONS_PER_CHUNK;
    const chunkWorldSize = this.chunkSize * this.tileSize;
    for (let i = 0; i < decoCount; i++) {
      const decoKey = biome.decorations[Math.floor(this._noise(chunk.cx, chunk.cz, i + 50, i + 50) * biome.decorations.length)];
      const path = ASSETS.environment[decoKey];
      if (!path) continue;
      try {
        const gltf = await assetLoader.loadGLTF(path);
        const deco = gltf.scene.clone(true);
        const x = chunk.cx * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 10, 0) - 0.5) * chunkWorldSize * 0.9;
        const z = chunk.cz * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 20, 0) - 0.5) * chunkWorldSize * 0.9;
        const y = this.getTerrainHeight(x, z, true);
        deco.position.set(x, y, z);
        deco.scale.setScalar(0.45 + this._noise(chunk.cx, chunk.cz, i + 30, 0) * 0.45);
        deco.rotation.y = this._noise(chunk.cx, chunk.cz, i + 40, 0) * Math.PI * 2;
        deco.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        chunk.group.add(deco);
        chunk.decorations.push(deco);
        this.decorations.push(deco);
      } catch (e) {
        // Decoration is optional.
      }
    }
  }

  _generateFurniture(chunk, biome) {
    const chunkWorldSize = this.chunkSize * this.tileSize;
    const clusters = GAME.FURNITURE_CLUSTERS_PER_CHUNK;
    for (let c = 0; c < clusters; c++) {
      const cx = chunk.cx * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, c + 1, 1) - 0.5) * chunkWorldSize * 0.65;
      const cz = chunk.cz * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, c + 2, 2) - 0.5) * chunkWorldSize * 0.65;
      const clusterSize = 1 + Math.floor(this._noise(chunk.cx, chunk.cz, c + 3, 3) * 2);
      for (let i = 0; i < clusterSize; i++) {
        const wordKey = biome.furniturePool[Math.floor(this._noise(chunk.cx, chunk.cz, c + 10 + i, c + 10 + i) * biome.furniturePool.length)];
        const vocab = VOCABULARY.find(v => v.word === wordKey);
        if (!vocab) continue;
        const pos = new THREE.Vector3(
          cx + (this._noise(chunk.cx, chunk.cz, c + 20 + i, 0) - 0.5) * 7,
          0,
          cz + (this._noise(chunk.cx, chunk.cz, c + 30 + i, 0) - 0.5) * 7
        );
        pos.y = this.getTerrainHeight(pos.x, pos.z, true);
        const level = this.getFurnitureLevel(vocab.word);
        const furniture = new Furniture(this.scene, vocab, pos, { level });
        this._disableEntityShadows(furniture.container);
        chunk.furniture.push(furniture);
        this.furniture.push(furniture);
      }
    }
  }

  _generateLetters(chunk) {
    const chunkWorldSize = this.chunkSize * this.tileSize;
    const letters = Object.keys(LETTER_WORDS);
    const clusters = GAME.LETTER_CLUSTERS_PER_CHUNK;
    for (let c = 0; c < clusters; c++) {
      const cx = chunk.cx * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, c + 50, 1) - 0.5) * chunkWorldSize * 0.7;
      const cz = chunk.cz * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, c + 60, 2) - 0.5) * chunkWorldSize * 0.7;
      const clusterSize = 1 + Math.floor(this._noise(chunk.cx, chunk.cz, c + 70, 3) * 1);
      for (let i = 0; i < clusterSize; i++) {
        const letter = letters[Math.floor(this._noise(chunk.cx, chunk.cz, c + 80 + i, c + 80 + i) * letters.length)];
        const pos = new THREE.Vector3(
          cx + (this._noise(chunk.cx, chunk.cz, c + 90 + i, 0) - 0.5) * 5,
          0,
          cz + (this._noise(chunk.cx, chunk.cz, c + 100 + i, 0) - 0.5) * 5
        );
        pos.y = this.getTerrainHeight(pos.x, pos.z, true);
        const level = this.getLetterLevel(letter);
        const creature = new LetterCreature(this.scene, letter, pos, { level });
        this._disableEntityShadows(creature.container);
        chunk.letters.push(creature);
        this.letters.push(creature);
      }
    }
  }

  _generateProps(chunk, biome) {
    if (!biome.propPool || biome.propPool.length === 0) return;
    const chunkWorldSize = this.chunkSize * this.tileSize;
    const count = GAME.CATCHABLE_PROPS_PER_CHUNK;
    for (let i = 0; i < count; i++) {
      const propKey = biome.propPool[Math.floor(this._noise(chunk.cx, chunk.cz, i + 150, i + 150) * biome.propPool.length)];
      const propConfig = CATCHABLE_BY_KEY[propKey] || PROP_VOCABULARY.find(p => p.key === propKey);
      if (!propConfig) continue;
      const x = chunk.cx * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 160, 0) - 0.5) * chunkWorldSize * 0.75;
      const z = chunk.cz * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 170, 0) - 0.5) * chunkWorldSize * 0.75;
      const pos = new THREE.Vector3(x, 0, z);
      pos.y = this.getTerrainHeight(pos.x, pos.z, true);
      const level = this.getPropLevel(propConfig.word);
      // Random visual variant for tree/rock/etc families
      const assetOverride = this._pickPropVariant(propConfig);
      const prop = new PropCreature(this.scene, propConfig, pos, { level, assetOverride });
      chunk.props.push(prop);
      this.props.push(prop);
    }
  }

  _pickPropVariant(propConfig) {
    // If this propConfig's asset is shared by multiple configs with the same word,
    // randomly pick among all matching configs' assets for visual variety.
    const family = PROP_VOCABULARY.filter(p => p.word === propConfig.word);
    if (family.length <= 1) return undefined;
    const pick = family[Math.floor(Math.random() * family.length)];
    return pick.asset !== propConfig.asset ? pick.asset : undefined;
  }

  _generateNPCs(chunk, biome) {
    if (this.npcs.length >= GAME.MAX_NPCS) return;
    if (GAME.NPCS_PER_CHUNK <= 0) return;
    const chunkWorldSize = this.chunkSize * this.tileSize;
    const count = GAME.NPCS_PER_CHUNK;
    for (let i = 0; i < count; i++) {
      if (this.npcs.length >= GAME.MAX_NPCS) break;
      const x = chunk.cx * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 250, 0) - 0.5) * chunkWorldSize * 0.7;
      const z = chunk.cz * chunkWorldSize + (this._noise(chunk.cx, chunk.cz, i + 260, 0) - 0.5) * chunkWorldSize * 0.7;
      const pos = new THREE.Vector3(x, 0, z);
      pos.y = this.getTerrainHeight(pos.x, pos.z, true);
      const npc = new NPC(this.scene, pos);
      this._disableEntityShadows(npc.container);
      chunk.npcs.push(npc);
      this.npcs.push(npc);
    }
  }

  // Distance-based visibility culling: hide entities far from player
  _cullEntityVisibility(playerPos) {
    const cullDist = GAME.ENTITY_CULL_DISTANCE;
    const cullDistSq = cullDist * cullDist;
    for (const f of this.furniture) {
      if (!f.container) continue;
      const distSq = f.position.distanceToSquared(playerPos);
      const visible = distSq <= cullDistSq;
      f.container.visible = visible;
      f.container.matrixAutoUpdate = visible;
    }
    for (const letter of this.letters) {
      if (!letter.container) continue;
      const distSq = letter.position.distanceToSquared(playerPos);
      const visible = distSq <= cullDistSq;
      letter.container.visible = visible;
      letter.container.matrixAutoUpdate = visible;
    }
    for (const prop of this.props) {
      if (!prop.container) continue;
      const distSq = prop.position.distanceToSquared(playerPos);
      const visible = distSq <= cullDistSq;
      prop.container.visible = visible;
      prop.container.matrixAutoUpdate = visible;
    }
    for (const npc of this.npcs) {
      if (!npc.container) continue;
      const distSq = npc.position.distanceToSquared(playerPos);
      const visible = distSq <= cullDistSq;
      npc.container.visible = visible;
      npc.container.matrixAutoUpdate = visible;
    }
    // Also cull static decorations (cloned GLTF meshes)
    for (const deco of this.decorations) {
      if (!deco) continue;
      const distSq = deco.position.distanceToSquared(playerPos);
      deco.visible = distSq <= cullDistSq;
    }
  }

  // Throttle updates for distant visible entities
  _shouldUpdateEntity(entity, playerPos, frameCount) {
    if (!entity.position) return false;
    const dist = entity.position.distanceTo(playerPos);
    if (dist > GAME.ENTITY_UPDATE_DISTANCE) {
      // Very distant: update every 4th frame
      return frameCount % 4 === 0;
    }
    if (dist > GAME.ENTITY_UPDATE_DISTANCE * 0.6) {
      // Medium distance: update every 2nd frame
      return frameCount % 2 === 0;
    }
    return true;
  }

  // Disable castShadow on all meshes in an entity container (called once at spawn)
  _disableEntityShadows(container) {
    if (!container) return;
    container.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        // Keep receiveShadow for subtle ambient occlusion feel
      }
    });
  }

  _disposeChunk(chunk) {
    this.scene.remove(chunk.group);
    this.dirtyChunks.delete(chunk.key);
    if (chunk.terrainMesh) {
      this.tiles = this.tiles.filter(mesh => mesh !== chunk.terrainMesh);
      chunk.group.remove(chunk.terrainMesh);
      chunk.terrainMesh.geometry.dispose();
      chunk.terrainMesh = null;
    }
    for (const deco of chunk.decorations) chunk.group.remove(deco);
    for (const item of chunk.furniture) item.dispose();
    for (const item of chunk.letters) item.dispose();
    for (const item of chunk.props) item.dispose();
    for (const item of chunk.npcs) item.dispose();
  }

  _unloadDistantChunks(current) {
    const keepRadius = this.activeRadius + 1;
    for (const [key, chunk] of [...this.chunks]) {
      const tooFar = Math.abs(chunk.cx - current.x) > keepRadius || Math.abs(chunk.cz - current.z) > keepRadius;
      if (!tooFar) continue;
      this._disposeChunk(chunk);
      this.chunks.delete(key);
      this.furniture = this.furniture.filter(item => !chunk.furniture.includes(item));
      this.letters = this.letters.filter(item => !chunk.letters.includes(item));
      this.props = this.props.filter(item => !chunk.props.includes(item));
      this.npcs = this.npcs.filter(item => !chunk.npcs.includes(item));
      this.decorations = this.decorations.filter(item => !chunk.decorations.includes(item));
      this.tiles = this.tiles.filter(item => item !== chunk.terrainMesh && !chunk.group.children.includes(item));
    }
  }

  _chunkKey(x, z) {
    return `${x},${z}`;
  }

  // Deterministic pseudo-random [0,1] for decoration/item placement
  _noise(cx, cz, x, z) {
    const n = Math.sin((cx * 928371 + cz * 523721 + x * 19349663 + z * 83492791) * 0.00001) * 43758.5453;
    return n - Math.floor(n);
  }
}
