# Voidloop × ourCraft Demo Level — Technical Plan

## 1. Goal

Generate a **single, self-contained demo level** for Voidloop that uses ourCraft's world-generation philosophy (multi-octave noise stack, 3D density terrain, cave systems, biome blending, surface detail passes) but runs inside Voidloop's existing Three.js + custom WebGL2 renderer. The focus is **deep mining** — the world must be interesting to dig into for hundreds of meters.

**Scope constraint:** One demo biome ("ourCraft Plains") with a finite world size (~16×16 chunks) so we can guarantee 60fps on mid-range hardware.

---

## 2. Architecture Overview

### 2.1 ourCraft → Voidloop Translation Map

| ourCraft Concept | Voidloop Equivalent | Notes |
|------------------|---------------------|-------|
| `ChunkData` (16×256×16 blocks) | `World.chunks` (16×64×16 voxels) | Must expand vertical range |
| `WorldGenerator` (C++, FastNoiseSIMD) | `OurCraftGenerator` (JS, new `FastNoise` class) | Port algorithm, not library |
| `BiomesManager` + region blending | `BiomeProfile` + deterministic interpolation | Simpler: 1 biome for demo |
| `Chunk::bake()` (GPU buffers) | `World._remeshChunk()` (Three.js BufferGeometry) | Already exists, needs optimization |
| `StructureToGenerate` (trees, rocks, houses) | Voidloop `Decoration` + `PropCreature` spawns | Re-use existing entity system |
| Block types (~100) | Expanded `BLOCK` enum (~20 types) | Map to Cube World / Kenney voxel assets |
| Cave noise (3D) + spaghetti caves | 3D simplex noise + threshold carving | New code |
| Water level (y=65) | Water plane at configurable Y | Optional for demo |
| `BlockDataHolder` (chests, etc.) | Not needed for demo | Skip |

### 2.2 Rendering Pipeline

Voidloop already uses a **hybrid renderer**:
1. Custom WebGL2 terrain shader (`UnifiedTerrainRenderer.js`) — *currently not present in this branch but referenced in AGENTS.md*
2. Three.js scene for entities

**Decision:** For the demo level, we will **use the existing `World._remeshChunk()` Three.js meshing** because:
- It already supports vertex colors, AO, face culling
- It already integrates with `setBlock()` / `destroySphere()`
- It already handles chunk dirty-queueing
- Switching to a full ourCraft-style GPU mesher is a 2-month project

**Optimization:** We will add **greedy meshing** and **LOD streaming** to the existing mesher to handle deeper worlds.

---

## 3. Phase-by-Phase Implementation Plan

### Phase 0: Noise Foundation (1 day)

**Problem:** Current `SimplexNoise.js` is 2D only. ourCraft uses 3D noise for caves, overhangs, and density.

**Solution:** Replace `SimplexNoise.js` with a new `FastNoise.js` module that provides:
- `noise2D(x, z)` — continentalness, peaks, hills
- `noise3D(x, y, z)` — density, caves, spaghetti caves, ore veins
- `fbm2D(octaves, persistence, lacunarity)` — convenience wrapper
- `fbm3D(octaves, persistence, lacunarity)` — convenience wrapper
- Seeded initialization

**Implementation:** Port standard 3D simplex noise to JS (public domain implementation ~200 lines). Voidloop has no build step, so it must be a single ES module.

**Files:**
- `js/FastNoise.js` — new
- `js/SimplexNoise.js` — deprecated, redirect import in `World.js`

---

### Phase 1: Deep World Expansion (1 day)

**Problem:** Current world is `voxelHeight = 64`, `voxelMinY = -24`. For "deep af" mining we need Minecraft-scale depth.

**New constants for demo level:**
```js
const DEMO = {
  CHUNK_SIZE: 16,
  VOXEL_HEIGHT: 256,      // 0 = bedrock, 128 = sea level, 255 = sky limit
  VOXEL_MIN_Y: 0,         // bedrock at y=0
  SEA_LEVEL: 128,         // matches ourCraft's waterLevel ≈ 65 scaled up
  WORLD_CHUNK_RADIUS: 8,  // 16×16 chunks = 256×256 blocks world
  ACTIVE_CHUNK_RADIUS: 3, // reduce from 4 to keep FPS solid
  TILE_SIZE: 2,           // keep existing (1 block = 2 world units)
};
```

**Why 256 height?**
- ourCraft uses 256 (`CHUNK_HEIGHT`)
- Gives us ~128 blocks of underground depth
- Fits in a `Uint8Array` per chunk if we store Y as byte
- Memory per chunk: `16 × 256 × 16 = 65,536` bytes (~64KB)
- 16×16 chunks = ~16MB of voxel data — trivial

**Changes:**
- `World.js`: make `voxelHeight` / `voxelMinY` configurable per biome
- `World._generateTerrain()`: loop `y` from 0..255 instead of minY..surface
- `Game.js`: update void plane, fog distances, camera far plane
- `constants.js`: add `OURCRAFT_DEMO` biome entry

**Performance mitigation:**
- Reduce `ACTIVE_CHUNK_RADIUS` from 4 → 3 (7×7 = 49 chunks vs 9×9 = 81)
- Only render faces below sea level if chunk is near player (cull deep underground chunks)
- `maxRemeshesPerFrame` stays at 2

---

### Phase 2: The Noise Stack — Port ourCraft's Generator (2–3 days)

ourCraft's `worldGenerator.cpp` uses ~15 noise layers. For the demo we port the **essential 8** that create the signature look:

| Noise | Type | Purpose | ourCraft Config |
|-------|------|---------|-----------------|
| Continentalness | 2D | Base terrain height (plains vs mountains) | 2 octaves, splines |
| Peaks & Valleys | 2D | Sharp mountain peaks | 3 octaves, power 2.2 |
| Weirdness | 2D | Controls 3D density contribution | 2 octaves |
| Density (3D) | 3D | Overhangs, floating islands, terrain shape | 3 octaves, Y-biased |
| Caves | 3D | Large cavern systems | 2 octaves, threshold 0.5 |
| Spaghetti (×2) | 3D | Winding narrow caves | 2 octaves, screen-blend |
| Random Hills | 2D | Local height perturbation | 3 octaves |
| Lakes | 2D | Flat basin depressions | 2 octaves, spline |

**New file:** `js/OurCraftTerrainGen.js`

Exports a class `OurCraftTerrainGen` with:
```js
class OurCraftTerrainGen {
  constructor(seed) { /* init all noise layers */ }
  
  // Returns height (0–255) and metadata for a column
  generateColumn(gx, gz, outMeta) { 
    // 1. Sample continentalness + peaks + hills → baseHeight
    // 2. Sample weirdness → densityBlend
    // 3. For each y: sample densityNoise3D, apply Y-bias
    // 4. Threshold density vs weirdness → solid/air
    // 5. Carve caves (caveNoise + spaghetti blended)
    // 6. Pass 1: surface block (grass/dirt/stone/sand)
    // 7. Pass 2: underwater block replacement
    // 8. Return surfaceY + biome info
  }
  
  // Optional: ore vein noise
  getOreType(gx, gy, gz) { /* coal, iron, gold, diamond, redstone */ }
}
```

**Key algorithm from ourCraft (simplified):**
```cpp
// Density with height bias
float density = densityNoise3D(x,y,z);
float heightNorm = (y - startLevel) / heightDiff;
heightNorm = mix(0.1, remap(heightNorm,0,1,0.2,7), weirdness);
density = pow(density, heightNorm);
bool solid = density > weirdnessThreshold;
```

This is what creates the **interesting overhangs and varied terrain** — not just heightmaps.

---

### Phase 3: Block Palette Expansion (1 day)

ourCraft has ~100 block types. For the demo we need ~20 so the underground looks varied.

**New `BLOCK` enum:**
```js
const BLOCK = {
  air: 0,
  bedrock: 1,       // y=0, indestructible
  stone: 2,
  cobblestone: 3,
  dirt: 4,
  grass: 5,
  sand: 6,
  gravel: 7,
  clay: 8,
  water: 9,         // transparent, no mesh faces inside water
  oak_log: 10,
  oak_leaves: 11,
  coal_ore: 12,
  iron_ore: 13,
  gold_ore: 14,
  diamond_ore: 15,
  redstone_ore: 16,
  granite: 17,
  andesite: 18,
  diorite: 19,
  // ... reserve up to 31 for demo
};
```

**Asset mapping:** Use existing asset packs for block visuals.

| Block | Visual Source | Notes |
|-------|--------------|-------|
| grass | Cube World `Block_Grass` | already used |
| dirt | Cube World `Block_Dirt` | already used |
| stone | Cube World `Block_Stone` | already used |
| cobblestone | Kenney voxel-pack `stone` | darker, rougher |
| coal_ore | Kenney voxel-pack `stone_coal` | black speckles |
| iron_ore | Kenney voxel-pack `stone_iron` | tan/rust speckles |
| gold_ore | Kenney voxel-pack `stone_gold` | yellow speckles |
| diamond_ore | Kenney voxel-pack `stone_diamond` | blue speckles |
| oak_log | Cube World `Block_WoodPlanks` | vertical UV variant |
| oak_leaves | Cube World `Leaves` | transparent, face cull |
| bedrock | flat black `#1a1a1a` | no texture needed |
| water | flat blue `#3b82f6` | semi-transparent, no AO |

**Block color system:** Keep `BLOCK_COLORS` but add more ramps. For ores, use the existing `depth > 4 && hash > 0.985` logic but replace with noise-driven ore veins.

---

### Phase 4: Greedy Meshing + Transparency (1–2 days)

**Problem:** Current `_buildChunkGeometryData()` emits one quad per visible face. For 256-height chunks this is too heavy.

**Solution:** Add **greedy meshing** on a per-slice basis.

**Implementation in `World.js`:**
```js
_buildChunkGeometryData(chunk) {
  // Keep existing face culling for simplicity
  // BUT add greedy merging for same-block, same-AO faces
  // Process each axis separately (X, Y, Z)
  // For each slice, build runs of identical blocks with same visibility
  // Emit one large quad per run instead of many 1×1 quads
}
```

**Expected reduction:** 40–60% fewer vertices for solid terrain.

**Transparency handling:**
- Water blocks need special treatment: only render top face, use semi-transparent material
- Leaves: render all faces but with `alphaTest: 0.5`
- For demo: use a separate `transparentMaterial` and `World.transparentTiles` array

**Optimization:** Only greedy-merge on Y-axis first (biggest win for flat layers), keep X/Z as-is if code complexity is a concern.

---

### Phase 5: Structure Generation (1 day)

ourCraft generates trees, rocks, and buildings after the terrain pass. We map these to Voidloop's existing entity system.

**New file:** `js/OurCraftStructures.js`

```js
export class OurCraftStructures {
  generateForChunk(chunk, surfaceMap, rng) {
    // surfaceMap: Uint8Array[16×16] of surface Y per column
    // 1. Trees: white-noise threshold per column
    // 2. Small stones: white-noise threshold near surface
    // 3. Hay bales (ourCraft feature): replace grass in plains
    // Return array of structure objects
  }
  
  // Tree types for demo
  buildNormalTree(rootX, rootY, rootZ) { /* 4-6 block trunk + leaf blob */ }
  buildTallSlimTree(rootX, rootY, rootZ) { /* spruce-like */ }
  buildBirchTree(rootX, rootY, rootZ) { /* white trunk, round leaves */ }
}
```

**Placement:** Structures write directly into chunk voxel arrays, then the chunk is remeshed. This is more robust than spawning GLTF decorations because:
- Trees are mineable (they're voxels)
- No extra draw calls
- Integrates with AO system

**Entity spawns:** Only spawn Voidloop catchable entities (furniture, letters, props) on the surface, using existing `_generateFurniture()` etc. but with ourCraft's surface height.

---

### Phase 6: Cave Lighting + Atmosphere (1 day)

ourCraft has a light propagation system. For the demo we fake it cheaply:

**Ambient light gradient by depth:**
```js
// In _blockColor()
const depthBelowSurface = surfaceY - gy;
const caveDarkness = Math.max(0, 1 - depthBelowSurface * 0.04);
light *= caveDarkness;
```

This makes deep caves darker without expensive light propagation.

**Torch / player light:**
- Add a point light to the player (already done? check `Game.js`)
- Make it follow the player but **do not cast shadows** (per AGENTS.md performance rules)
- Increase intensity when underground (detect if `player.y < seaLevel - 10`)

**Fog adjustment:**
- Underground: switch fog to `#0f0f15`, near=2, far=35
- Surface: keep existing sky fog
- Transition smoothly based on player Y

---

### Phase 7: Deep Mining Gameplay Integration (1 day)

**Current mining:** `World.destroySphere()` with raycast.

**Enhancements for demo:**
1. **Pickaxe tiers** affect destroy radius:
   - Wood: radius 1.5 (3×3 area)
   - Stone: radius 2.5 (5×5 area)
   - Iron: radius 3.5 + ore detection highlight
   - Diamond: radius 4.5 + instant-mine soft blocks

2. **Block hardness:** Add `BLOCK_HARDNESS` map
   - Grass/dirt: 0.2s
   - Stone: 0.8s
   - Ore: 1.2s
   - Obsidian/bedrock: ∞ (unmineable)

3. **Mining progress indicator:** UI bar on crosshair showing block damage.

4. **Drop items:** When mining ore, spawn a temporary `PropCreature` ("coal", "iron_ingot") that auto-collects.

5. **Depth tracker:** HUD shows `Y: ###` and depth tier:
   - 128–100: Surface
   - 100–60: Shallow caves
   - 60–30: Deep mines
   - 30–5: Abandoned depths
   - 5–1: Bedrock layer

---

### Phase 8: Demo Level Bootstrap (0.5 day)

**New biome entry in `constants.js`:**
```js
ourcraft_demo: {
  name: 'ourCraft Demo',
  fogColor: 0x87ceeb,
  groundBlocks: ['grass', 'dirt', 'stone', 'cobblestone'],
  decorations: [], // structures are voxel-based now
  furniturePool: ['chair', 'table', 'chest'], // existing vocab
  propPool: ['tree', 'rock', 'mushroom'], // existing props
},
```

**Game.js modification:**
- Add `"ourcraft_demo"` to `biomeKeys` array
- On select: switch `World` to deep-mode constants
- Pre-load Kenney voxel block textures into a texture atlas

**Texture atlas:**
- `scripts/build_ourcraft_atlas.py` already exists — repurpose it to pack Kenney + Cube World block faces into `assets/textures/ourcraft_atlas.png`
- Update `World.terrainMaterial` to use atlas + UV mapping instead of vertex colors
- Fallback: keep vertex colors if atlas build fails

---

## 4. Performance Budget (60 FPS Guarantee)

| System | Budget | Mitigation |
|--------|--------|------------|
| Active chunks | 49 (7×7) | Reduced from 81 |
| Voxel height | 256 | Only iterate 0..surfaceY during gen; mesh only visible faces |
| Vertices per chunk | < 30,000 | Greedy meshing + face culling |
| Remeshes per frame | 2 max | Already enforced |
| Entities | 50 max | Reduce `DECORATIONS_PER_CHUNK` to 0 (use voxel trees) |
| Draw calls | < 80 | One terrain mesh per chunk + entity batches |
| Transparent faces | < 5,000 | Water only renders top face; no glass for demo |
| Shadow maps | 512×512 | Keep existing dynamic resolution |

**Stress test criteria:**
- Fly through world at max speed: no frame drops below 45fps
- Mine 20 blocks in one frame: dirty-queue handles it over 10 frames
- Stand on surface looking at horizon: 55–60fps

---

## 5. File Inventory

### New Files
| File | Lines | Purpose |
|------|-------|---------|
| `js/FastNoise.js` | ~250 | 2D/3D simplex + FBM |
| `js/OurCraftTerrainGen.js` | ~400 | Ported noise stack + column generator |
| `js/OurCraftStructures.js` | ~200 | Tree/rock structure builders |
| `assets/textures/ourcraft_atlas.png` | — | Packed block textures |
| `assets/textures/ourcraft_atlas.json` | — | UV coordinates per block |

### Modified Files
| File | Changes |
|------|---------|
| `js/World.js` | Deep-world constants, greedy meshing, ore logic, transparent material |
| `js/constants.js` | Expanded BLOCK enum, new biome, block hardness |
| `js/Game.js` | Biome selector, depth fog, mining progress UI, pickaxe tiers |
| `js/Player.js` | Mining animation state, pickaxe tier stat |
| `scripts/build_ourcraft_atlas.py` | Build texture atlas from Kenney + Cube World |
| `index.html` | Preload atlas texture |

### Deprecated
| File | Action |
|------|--------|
| `js/SimplexNoise.js` | Replace imports with `FastNoise.js` |

---

## 6. Simplified ourCraft Algorithm (Pseudo-code)

This is the core loop we port from C++ to JS:

```js
for (let x = 0; x < 16; x++)
for (let z = 0; z < 16; z++) {
  const gx = chunk.cx * 16 + x;
  const gz = chunk.cz * 16 + z;
  
  // 2D noises
  const continental = noise.continental(gx, gz);   // 0–1
  const peaks = noise.peaks(gx, gz);               // 0–1
  const hills = noise.hills(gx, gz);               // 0–1
  const weird = noise.weirdness(gx, gz);           // 0–1
  
  // Height level selection (water=0, plains=1, hills=2, mountains=3...)
  const heightLevel = pickHeightLevel(continental);
  
  // Base height
  let start = startValues[heightLevel];
  let max = maxLevels[heightLevel];
  const height = start + continental * (max - start) + hills * hillsAdd;
  
  // 3D density pass
  for (let y = 0; y < 256; y++) {
    let density = noise.density3D(gx, y, gz);
    const hNorm = (y - start) / (max - start);
    const bias = lerp(0.1, remap(hNorm, 0, 1, 0.2, 7), weird);
    density = Math.pow(density, bias);
    
    if (density > weirdThreshold) {
      chunk.set(x, y, z, BLOCK.stone);
    }
  }
  
  // Cave carve pass
  for (let y = 2; y < height; y++) {
    const cave = noise.caves3D(gx, y, gz);
    if (cave < 0.5) chunk.set(x, y, z, BLOCK.air);
    
    const spag1 = noise.spaghetti1(gx, y, gz);
    const spag2 = noise.spaghetti2(gx, y, gz);
    const spag = screenBlend(spag1, spag2);
    const depthBias = lerp(0.25, 0.1, y / 255);
    if (spag < 0.75 - depthBias) chunk.set(x, y, z, BLOCK.air);
  }
  
  // Surface pass
  const surfaceY = findSurface(chunk, x, z);
  applySurfaceBlocks(chunk, x, surfaceY, z, biome);
  
  // Ore pass
  for (let y = 5; y < surfaceY - 3; y++) {
    if (chunk.get(x,y,z) === BLOCK.stone && noise.ore(gx,y,gz) > oreThreshold(y)) {
      chunk.set(x,y,z, pickOreByDepth(y));
    }
  }
}
```

---

## 7. Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| 3D noise too slow in JS | Medium | Use `Float32Array` caches per chunk; pre-fill noise in 16×256×16 slabs |
| 256-height chunks cause frame drops | Medium | Greedy meshing; reduce active radius; LOD for distant chunks |
| Memory bloat (16MB voxel data) | Low | 16MB is fine; use `Uint8Array` not objects |
| Texture atlas build fails | Low | Fallback to vertex colors |
| ourCraft algorithm too complex to port | Low | Port simplified version first (skip rivers/roads/swamps for demo) |
| Mining feels slow with big depth | Low | Add fast-fall / climb mechanics; elevator blocks |

---

## 8. Deliverables

1. **Running demo level** — Select "ourCraft Demo" from biome menu, world generates in < 3 seconds
2. **Mineable terrain** — Player can dig caves, find ore veins, reach bedrock
3. **FPS counter** — In-game debug overlay showing chunk count, vertex count, FPS
4. **Depth tracker** — HUD shows current Y-level and depth tier name
5. **Screenshot-worthy moments** — Overhangs, cave entrances, ore caves, deep pits

---

## 9. Total Estimated Effort

| Phase | Days |
|-------|------|
| 0: Noise Foundation | 1 |
| 1: Deep World | 1 |
| 2: Noise Stack | 2–3 |
| 3: Block Palette | 1 |
| 4: Greedy Meshing | 1–2 |
| 5: Structures | 1 |
| 6: Atmosphere | 1 |
| 7: Mining Gameplay | 1 |
| 8: Bootstrap | 0.5 |
| **Total** | **9.5–11.5 days** |

**Recommended sprint:** 2 weeks with buffer for perf tuning.

---

## 10. Next Step

Approve this plan, then we begin with **Phase 0 + 1** (noise + deep world scaffold) so you can fly around a 256-deep voidloop world immediately. We layer ourCraft's terrain algorithm on top in subsequent PRs.
