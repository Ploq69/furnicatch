/**
 * OurCraftLoader — Loads ourCraft-generated binary chunk files and
 * converts them into Voidloop terrain data.
 *
 * Binary format (per chunk file):
 *   [int32  cx]         — chunk X coordinate
 *   [int32  cz]         — chunk Z coordinate
 *   [uint8  surfaceY[16*16]] — surface height per column
 *   [uint16 blocks[16*16*256]] — block type per cell (x,z,y order)
 */

// Map ourCraft block IDs → Voidloop block type strings
const OURCRAFT_TO_VOIDLOOP = {
  0:  'air',           // air
  1:  'grass',         // grassBlock
  2:  'dirt',          // dirt
  3:  'stone',         // stone
  4:  'ice',           // ice
  5:  'oak_log',       // woodLog
  6:  'wood',          // wooden_plank
  7:  'cobblestone',   // cobblestone
  8:  'metal',         // gold_block → mapped to metal
  9:  'brick',         // bricks
  10: 'sand_A',        // sand
  11: 'sand_B',        // sand_stone
  12: 'snow',          // snow_dirt
  13: 'oak_leaves',    // leaves
  14: 'gold_ore',      // goldOre
  15: 'iron_ore',      // copperOre → mapped to iron
  16: 'stone_bricks',  // stoneBrick
  17: 'iron_ore',      // ironOre
  18: 'diamond_ore',   // silverOre → mapped to diamond
  19: 'wood',          // bookShelf
  20: 'birch_log',     // birch_log
  21: 'gravel',        // gravel
  22: 'grass',         // grass (tall grass mesh)
  23: 'flower_red',    // rose
  24: 'water',         // water
  25: 'jungle_log',    // jungle_log
  26: 'jungle_leaves', // jungle_leaves
  27: 'wood',          // palm_log
  28: 'oak_leaves',    // palm_leaves
  29: 'cactus',        // cactus_bud
  30: 'dead_bush',     // dead_bush
  31: 'wood',          // jungle_planks
  32: 'dirt',          // clay → mapped to dirt (no clay block)
  33: 'brick',         // clayBricks
  34: 'dirt',          // mud
  35: 'red_sand',      // redClay
  36: 'red_sand',      // redClayBricks
};

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;

export class OurCraftLoader {
  constructor(chunkBaseUrl = '/demo_world/chunks/') {
    this.chunkBaseUrl = chunkBaseUrl;
    this._cache = new Map(); // "cx,cz" -> chunk data
    this._failedLoads = [];
  }

  async loadChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const url = `${this.chunkBaseUrl}${cx},${cz}.bin`;
    let response;
    try {
      response = await fetch(url);
    } catch (e) {
      if (this._failedLoads.length < 8) this._failedLoads.push({ cx, cz, url, error: String(e?.message || e) });
      return null;
    }
    if (!response.ok) {
      if (this._failedLoads.length < 8) this._failedLoads.push({ cx, cz, url, status: response.status });
      return null;
    }

    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    let offset = 0;

    const fileCx = view.getInt32(offset, true); offset += 4;
    const fileCz = view.getInt32(offset, true); offset += 4;

    // Surface height map (uint8[256])
    const surfaceY = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      surfaceY[i] = view.getUint8(offset++);
    }

    // Block data (uint16[16*16*256])
    const blockCount = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;
    const ourCraftBlocks = new Uint16Array(blockCount);
    for (let i = 0; i < blockCount; i++) {
      ourCraftBlocks[i] = view.getUint16(offset, true); offset += 2;
    }

    const chunk = {
      cx: fileCx,
      cz: fileCz,
      surfaceY,
      ourCraftBlocks,
    };
    this._cache.set(key, chunk);
    return chunk;
  }

  /**
   * Get the Voidloop block type string for a world position.
   * @param {number} wx — world X
   * @param {number} wy — world Y (already shifted)
   * @param {number} wz — world Z
   * @returns {string|null} — block type or null if not in ourCraft data
   */
  getBlockType(wx, wy, wz) {
    const ix = Math.floor(wx);
    const iy = Math.floor(wy);
    const iz = Math.floor(wz);
    const cx = Math.floor(ix / CHUNK_SIZE);
    const cz = Math.floor(iz / CHUNK_SIZE);
    const chunk = this._cache.get(`${cx},${cz}`);
    if (!chunk) return null;

    const lx = ((ix % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((iz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = iy;
    if (ly < 0 || ly >= CHUNK_HEIGHT) return 'air';

    const idx = (lx * CHUNK_SIZE + lz) * CHUNK_HEIGHT + ly;
    const ourCraftId = chunk.ourCraftBlocks[idx];
    return OURCRAFT_TO_VOIDLOOP[ourCraftId] || 'stone';
  }

  /**
   * Check if a world position is solid in ourCraft data.
   */
  isSolid(wx, wy, wz) {
    const type = this.getBlockType(wx, wy, wz);
    return type !== null && type !== 'air' && type !== 'water';
  }

  /**
   * Pre-load all chunks in a radius.
   */
  async preloadChunks(radius = 4) {
    console.log('[MiningDebug] OurCraft preload start', { radius, chunkBaseUrl: this.chunkBaseUrl });
    const promises = [];
    for (let cx = -radius; cx < radius; cx++) {
      for (let cz = -radius; cz < radius; cz++) {
        promises.push(this.loadChunk(cx, cz));
      }
    }
    const results = await Promise.all(promises);
    const loaded = results.filter(Boolean).length;
    console.log('[MiningDebug] OurCraft preload complete', {
      loaded,
      requested: promises.length,
      chunkBaseUrl: this.chunkBaseUrl,
      failures: this._failedLoads,
    });
    return loaded;
  }
}
