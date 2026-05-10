import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { ASSETS, BIOMES, GAME, LETTER_WORDS, VOCABULARY, PROP_VOCABULARY, CATCHABLE_BY_KEY } from './constants.js';
import { Furniture } from './Furniture.js';
import { LetterCreature } from './LetterCreature.js';
import { PropCreature } from './PropCreature.js';
import { NPC } from './NPC.js';
import { SimplexNoise } from './SimplexNoise.js';

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
    this.tileGeometry = new THREE.BoxGeometry(this.tileSize, this.tileSize, this.tileSize);
    this.tileMaterials = {
      grass: new THREE.MeshStandardMaterial({ color: 0x567c1e, roughness: 0.8 }),
      dirt: new THREE.MeshStandardMaterial({ color: 0x9b7650, roughness: 0.85 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.75 }),
      brick: new THREE.MeshStandardMaterial({ color: 0x9a4b3f, roughness: 0.8 }),
    };
    // Deterministic smooth noise for terrain
    this.simplex = new SimplexNoise(12345);
    // FBM parameters for terrain
    this.terrainScale = 0.012;
    this.terrainOctaves = 4;
    this.terrainPersistence = 0.5;
    this.terrainLacunarity = 2.0;
    this.terrainMinBlockY = -2; // lowest block layer
    this.terrainMaxBlockH = 3;  // highest surface height
    this.terrainHeightRange = this.terrainMaxBlockH - this.terrainMinBlockY + 1; // number of possible surface heights
  }

  async generate(biomeKey = 'meadow') {
    this.biomeKey = biomeKey;
    this._frameCount = 0;
    await this.ensureActiveChunks(new THREE.Vector3(0, 0, 0), true);
  }

  update(dt, playerPos) {
    this.ensureActiveChunks(playerPos);
    this._frameCount = (this._frameCount || 0) + 1;
    // Fade in newly loaded chunks
    for (const chunk of this.chunks.values()) {
      if (chunk.fadeIn < 1.0) {
        chunk.fadeIn = Math.min(1.0, chunk.fadeIn + dt / 0.5);
        const s = 0.2 + 0.8 * chunk.fadeIn; // subtle scale pop
        chunk.group.scale.setScalar(s);
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

  // Terrain height in world units at a given world x,z
  // smooth = true uses bilinear interpolation for smooth walking surfaces
  getTerrainHeight(wx, wz, smooth = true) {
    if (!smooth) {
      const h = this._heightNoise(wx, wz);
      return h * this.tileSize;
    }
    // Bilinear interpolation of the 4 nearest grid columns
    const gx = wx / this.tileSize;
    const gz = wz / this.tileSize;
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const fx = gx - x0;
    const fz = gz - z0;

    const h00 = this._heightNoise(x0 * this.tileSize, z0 * this.tileSize);
    const h10 = this._heightNoise(x1 * this.tileSize, z0 * this.tileSize);
    const h01 = this._heightNoise(x0 * this.tileSize, z1 * this.tileSize);
    const h11 = this._heightNoise(x1 * this.tileSize, z1 * this.tileSize);

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const h = h0 * (1 - fz) + h1 * fz;

    return h * this.tileSize;
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
    const chunk = { key, cx, cz, detail, upgrading: false, fadeIn: 0.0, group: new THREE.Group(), furniture: [], letters: [], props: [], npcs: [], decorations: [] };
    this.chunks.set(key, chunk);
    this.scene.add(chunk.group);

    this._generateTerrain(chunk, biome);
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
    const counts = {};
    for (const block of biome.groundBlocks) counts[block] = 0;
    const choices = [];
    const half = this.chunkSize / 2;

    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const wx = chunk.cx * this.chunkSize * this.tileSize + (x - half + 0.5) * this.tileSize;
        const wz = chunk.cz * this.chunkSize * this.tileSize + (z - half + 0.5) * this.tileSize;
        const surfaceH = this._heightNoise(wx, wz); // block units

        for (let by = this.terrainMinBlockY; by <= surfaceH; by++) {
          let block;
          if (by === surfaceH) {
            block = surfaceH >= 0 ? 'grass' : 'dirt';
          } else if (surfaceH - by <= 2) {
            block = 'dirt';
          } else {
            block = 'stone';
          }
          choices.push({ wx, wz, by, block });
          counts[block] = (counts[block] || 0) + 1;
        }
      }
    }

    const meshes = {};
    for (const [block, count] of Object.entries(counts)) {
      if (count <= 0) continue;
      const mesh = new THREE.InstancedMesh(this.tileGeometry, this.tileMaterials[block] || this.tileMaterials.grass, count);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      meshes[block] = { mesh, index: 0 };
      chunk.group.add(mesh);
      this.tiles.push(mesh);
    }

    for (const tile of choices) {
      const entry = meshes[tile.block];
      if (!entry) continue;
      const worldY = tile.by * this.tileSize - this.tileSize / 2;
      const matrix = new THREE.Matrix4().makeTranslation(tile.wx, worldY, tile.wz);
      entry.mesh.setMatrixAt(entry.index++, matrix);
    }
    for (const entry of Object.values(meshes)) {
      entry.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Deterministic height in block units (integer) using FBM Simplex noise
  _heightNoise(wx, wz) {
    let amplitude = 1.0;
    let frequency = this.terrainScale;
    let value = 0.0;
    let maxValue = 0.0;

    for (let i = 0; i < this.terrainOctaves; i++) {
      value += this.simplex.noise2D(wx * frequency, wz * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= this.terrainPersistence;
      frequency *= this.terrainLacunarity;
    }

    // Normalize from [-1, 1] to [0, 1], then map to block height range
    const normalized = (value / maxValue + 1.0) / 2.0;
    const h = Math.floor(normalized * this.terrainHeightRange) + this.terrainMinBlockY;
    return Math.max(this.terrainMinBlockY, Math.min(this.terrainMaxBlockH, h));
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
      this.tiles = this.tiles.filter(item => !chunk.group.children.includes(item));
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
