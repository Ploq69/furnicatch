import * as THREE from 'three';

// Loads ourCraft-generated chunk binaries into Voidloop's World format

const BLOCK_MAP = {
  0:  0,   // air -> air
  1:  1,   // grassBlock -> grass
  2:  2,   // dirt -> dirt
  3:  3,   // stone -> stone
  4:  3,   // ice -> stone (for now)
  5:  4,   // woodLog -> wood
  6:  4,   // wooden_plank -> wood
  7:  3,   // cobblestone -> stone
  8:  3,   // gold_block -> stone
  9:  5,   // bricks -> brick
  10: 6,   // sand -> sand
  11: 3,   // sand_stone -> stone
  12: 2,   // snow_dirt -> dirt
  13: 9,   // leaves -> leaves
  14: 10,  // goldOre -> ore
  15: 10,  // copperOre -> ore
  16: 3,   // stoneBrick -> stone
  17: 10,  // ironOre -> ore
  18: 10,  // silverOre -> ore
  19: 4,   // bookShelf -> wood
  20: 4,   // birch_log -> wood
  21: 7,   // gravel -> gravel
  22: 1,   // grass -> grass
  23: 1,   // rose -> grass
  24: 8,   // water -> water
  25: 4,   // jungle_log -> wood
  26: 9,   // jungle_leaves -> leaves
  27: 4,   // palm_log -> wood
  28: 9,   // palm_leaves -> leaves
  29: 1,   // cactus_bud -> grass
  30: 1,   // dead_bush -> grass
  31: 4,   // jungle_planks -> wood
  32: 2,   // clay -> dirt
  33: 5,   // clayBricks -> brick
  34: 2,   // mud -> dirt
  35: 2,   // redClay -> dirt
  36: 5,   // redClayBricks -> brick
  37: 3,   // control1 -> stone
  38: 3,   // control2 -> stone
  39: 3,   // control3 -> stone
  40: 3,   // control4 -> stone
  41: 3,   // snow_block -> stone
  42: 9,   // birch_leaves -> leaves
  43: 4,   // spruce_log -> wood
  44: 9,   // spruce_leaves -> leaves
  45: 9,   // spruce_leaves_red -> leaves
  46: 10,  // glowstone -> ore
  47: 3,   // glass -> stone
  48: 3,   // testBlock -> stone
  49: 3,   // torch -> stone
  50: 10,  // leadOre -> ore
  51: 2,   // coarseDirt -> dirt
  52: 4,   // birchPlanks -> wood
  53: 2,   // pathBlock -> dirt
  54: 5,   // plankedWallBlock -> brick
  55: 5,   // plankedWallBlock_stairs -> brick
  56: 5,   // plankedWallBlock_wall -> brick
  57: 5,   // terracotta -> brick
  58: 5,   // terracotta_stairs -> brick
  59: 5,   // terracotta_slabs -> brick
  60: 5,   // terracotta_wall -> brick
  61: 3,   // glassNotClear -> stone
  62: 3,   // vitral1 -> stone
  63: 3,   // vitral2 -> stone
  64: 3,   // glassNotClear2 -> stone
  65: 3,   // glass2 -> stone
  66: 3,   // mossyCobblestone -> stone
  67: 3,   // magenta_stained_glass -> stone
  68: 3,   // pink_stained_glass -> stone
  69: 5,   // clothBlock -> brick
  70: 5,   // wooden_stairs -> brick
  71: 5,   // wooden_slab -> brick
  72: 5,   // wooden_wall -> brick
  73: 3,   // tiledStoneBricks -> stone
  74: 3,   // stone_stairts -> stone
  75: 3,   // stone_slabs -> stone
  76: 3,   // stone_wall -> stone
  77: 3,   // cobbleStone_stairts -> stone
  78: 3,   // cobbleStone_slabs -> stone
  79: 3,   // cobbleStone_wall -> stone
  80: 3,   // tiledStoneBricks_stairs -> stone
  81: 3,   // tiledStoneBricks_slab -> stone
  82: 3,   // tiledStoneBricks_wall -> stone
  83: 5,   // bricks_stairs -> brick
  84: 5,   // bricks_slabs -> brick
  85: 5,   // bricks_wall -> brick
  86: 3,   // stoneBricks_stairts -> stone
  87: 3,   // stoneBricks_slabs -> stone
  88: 3,   // stoneBricks_wall -> stone
  89: 3,   // structureBase -> stone
  90: 3,   // hardSandStone -> stone
  91: 3,   // hardSandStone_stairs -> stone
  92: 3,   // hardSandStone_slabs -> stone
  93: 3,   // hardSandStone_wall -> stone
  94: 3,   // sandStone_stairts -> stone
  95: 3,   // sandStone_slabs -> stone
  96: 3,   // sandStone_wall -> stone
  97: 5,   // dungeonBricks -> brick
  98: 5,   // dungeonBricks_stairts -> brick
  99: 5,   // dungeonBricks_slabs -> brick
  100: 5,  // dungeonBricks_wall -> brick
  101: 3,  // volcanicHotRock -> stone
  102: 3,  // volcanicRock -> stone
  103: 3,  // volcanicRock_stairts -> stone
  104: 3,  // volcanicRock_slabs -> stone
  105: 3,  // volcanicRock_wall -> stone
  106: 3,  // smoothStone -> stone
  107: 3,  // smoothStone_stairts -> stone
  108: 3,  // smoothStone_slabs -> stone
  109: 3,  // smoothStone_wall -> stone
  110: 3,  // limeStone -> stone
  111: 3,  // smoothLimeStone -> stone
  112: 3,  // smoothLimeStone_stairs -> stone
  113: 3,  // smoothLimeStone_slabs -> stone
  114: 3,  // smoothLimeStone_wall -> stone
  115: 3,  // marbleBlock -> stone
  116: 3,  // marbleBlock_stairs -> stone
  117: 3,  // marbleBlock_slabs -> stone
  118: 3,  // marbleBlock_wall -> stone
  119: 3,  // smoothMarbleBlock -> stone
  120: 5,  // marbleBricks -> brick
  121: 5,  // marbleBricks_stairs -> brick
  122: 5,  // marbleBricks_slabs -> brick
  123: 5,  // marbleBricks_wall -> brick
  124: 3,  // marblePillar -> stone
  125: 5,  // logWall -> brick
  126: 1,  // yellowGrass -> grass
  127: 5,  // blueBricks -> brick
  128: 5,  // blueBricks_stairs -> brick
  129: 5,  // blueBricks_slabs -> brick
  130: 5,  // blueBricks_wall -> brick
  131: 4,  // oakChair -> wood
  132: 4,  // oakLogChair -> wood
  133: 4,  // mug -> wood
  134: 4,  // goblet -> wood
  135: 4,  // wineBottle -> wood
  136: 3,  // skull -> stone
  137: 3,  // skullTorch -> stone
  138: 4,  // book -> wood
  139: 4,  // candleHolder -> wood
  140: 4,  // pot -> wood
  141: 4,  // jar -> wood
  142: 4,  // globe -> wood
  143: 4,  // keg -> wood
  144: 4,  // workBench -> wood
  145: 4,  // oakTable -> wood
  146: 4,  // oakLogTable -> wood
  147: 4,  // craftingItems -> wood
  148: 4,  // oakBigChair -> wood
  149: 4,  // oakLogBigChair -> wood
  150: 4,  // cookingPot -> wood
  151: 4,  // chickenCaracas -> wood
  152: 4,  // chickenWingsPlate -> wood
  153: 4,  // fishPlate -> wood
  154: 5,  // ladder -> brick
  155: 1,  // vines -> grass
  156: 5,  // cloth_stairs -> brick
  157: 5,  // cloth_slabs -> brick
  158: 5,  // cloth_wall -> brick
  159: 5,  // birchPlanks_stairs -> brick
  160: 5,  // birchPlanks_slabs -> brick
  161: 5,  // birchPlanks_wall -> brick
  162: 5,  // oakLogSlab -> brick
  163: 3,  // smallRock -> stone
  164: 4,  // strippedOakLog -> wood
  165: 4,  // strippedBirchLog -> wood
  166: 4,  // strippedSpruceLog -> wood
  167: 4,  // sprucePlank -> wood
  168: 5,  // sprucePlank_stairs -> brick
  169: 5,  // sprucePlank_slabs -> brick
  170: 5,  // sprucePlank_wall -> brick
  171: 3,  // dungeonStone -> stone
  172: 3,  // dungeonStone_stairs -> stone
  173: 3,  // dungeonStone_slabs -> stone
  174: 3,  // dungeonStone_wall -> stone
  175: 3,  // dungeonCobblestone -> stone
  176: 3,  // dungeonCobblestone_stairs -> stone
  177: 3,  // dungeonCobblestone_slabs -> stone
  178: 3,  // dungeonCobblestone_wall -> stone
  179: 3,  // dungeonSmoothStone -> stone
  180: 3,  // dungeonSmoothStone_stairs -> stone
  181: 3,  // dungeonSmoothStone_slabs -> stone
  182: 3,  // dungeonSmoothStone_wall -> stone
  183: 3,  // dungeonPillar -> stone
  184: 3,  // dungeonSkullBlock -> stone
  185: 5,  // chiseledDungeonBrick -> brick
  186: 3,  // dungeonGlass -> stone
  187: 4,  // woddenChest -> wood
  188: 4,  // goblinChest -> wood
  189: 4,  // copperChest -> wood
  190: 4,  // ironChest -> wood
  191: 4,  // silverChest -> wood
  192: 4,  // goldChest -> wood
  193: 4,  // crate -> wood
  194: 4,  // smallCrate -> wood
  195: 4,  // lamp -> wood
  196: 4,  // torchWood -> wood
  197: 3,  // mossyCobblestone_stairs -> stone
  198: 3,  // mossyCobblestone_slab -> stone
  199: 3,  // mossyCobblestone_wall -> stone
  200: 3,  // cobweb -> stone
  201: 4,  // hayBalde -> wood
  202: 4,  // trainingDummy -> wood
  203: 4,  // target -> wood
  204: 3,  // furnace -> stone
  205: 4,  // goblinWorkBench -> wood
  206: 4,  // goblinChair -> wood
  207: 4,  // goblinTable -> wood
  208: 4,  // goblinTorch -> wood
  209: 4,  // goblinStitchingPost -> wood
  210: 5,  // woodenFence -> brick
  211: 5,  // woodenLogFence -> brick
  212: 5,  // spruceFence -> brick
  213: 5,  // spruceLogFence -> brick
  214: 5,  // birchFence -> brick
  215: 5,  // birchLogFence -> brick
};

export class OurCraftLoader {
  constructor(world) {
    this.world = world;
    this.chunkDir = 'demo_world/chunks/';
    this.loaded = new Map();
  }

  static mapBlock(ourCraftId) {
    return BLOCK_MAP[ourCraftId] ?? 3; // default to stone
  }

  async loadChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.loaded.has(key)) {
      return this.loaded.get(key);
    }

    let response;
    try {
      response = await fetch(`${this.chunkDir}${cx},${cz}.bin`);
    } catch (e) {
      return null;
    }
    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    let offset = 0;

    const fileCx = view.getInt32(offset, true);
    offset += 4;
    const fileCz = view.getInt32(offset, true);
    offset += 4;

    // Surface height map (256 bytes)
    const heightMap = new Uint8Array(buffer, offset, 256);
    offset += 256;

    // Block data: uint16_t per block
    const blockCount = 16 * 256 * 16;
    const voxels = new Uint8Array(16 * 256 * 16);
    for (let i = 0; i < blockCount; i++) {
      const ourCraftId = view.getUint16(offset, true);
      offset += 2;
      voxels[i] = OurCraftLoader.mapBlock(ourCraftId);
    }

    const chunk = {
      key,
      cx: fileCx,
      cz: fileCz,
      detail: 'full',
      upgrading: false,
      fadeIn: 0.0,
      group: new THREE.Group(),
      furniture: [],
      letters: [],
      props: [],
      npcs: [],
      decorations: [],
      voxels,
      heightMap: new Int16Array(256),
      terrainMesh: null,
      dirty: false,
    };

    // Convert Uint8 heightMap to Int16 for Voidloop
    for (let i = 0; i < 256; i++) {
      chunk.heightMap[i] = heightMap[i];
    }

    this.loaded.set(key, chunk);
    return chunk;
  }
}
