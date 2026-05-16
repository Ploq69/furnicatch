import * as THREE from 'three';

const ATLAS_W = 2048;
const ATLAS_H = 2048;
const TILE_W = 64;
const TILE_H = 64;

function rect(x, y) {
  return {
    x: x / ATLAS_W,
    y: 1 - ((y + TILE_H) / ATLAS_H),
    w: TILE_W / ATLAS_W,
    h: TILE_H / ATLAS_H,
  };
}

export const TILES = [
  { name: 'grass_block_top', ...rect(0, 0) },
  { name: 'grass_block_side', ...rect(64, 0) },
  { name: 'dirt', ...rect(128, 0) },
  { name: 'stone', ...rect(192, 0) },
  { name: 'cobblestone', ...rect(256, 0) },
  { name: 'gravel', ...rect(320, 0) },
  { name: 'sand', ...rect(384, 0) },
  { name: 'red_sand', ...rect(448, 0) },
  { name: 'bricks', ...rect(512, 0) },
  { name: 'ice', ...rect(576, 0) },
  { name: 'snow', ...rect(640, 0) },
  { name: 'coarse_dirt', ...rect(704, 0) },
  { name: 'coal_ore', ...rect(768, 0) },
  { name: 'iron_ore', ...rect(832, 0) },
  { name: 'gold_ore', ...rect(896, 0) },
  { name: 'diamond_ore', ...rect(960, 0) },
  { name: 'birch_log', ...rect(1024, 0) },
  { name: 'birch_log_top', ...rect(1088, 0) },
  { name: 'birch_leaves', ...rect(1152, 0) },
  { name: 'oak_log', ...rect(1216, 0) },
  { name: 'oak_log_top', ...rect(1280, 0) },
  { name: 'oak_leaves', ...rect(1344, 0) },
  { name: 'jungle_log', ...rect(1408, 0) },
  { name: 'jungle_log_top', ...rect(1472, 0) },
  { name: 'jungle_leaves', ...rect(1536, 0) },
  { name: 'acacia_log', ...rect(1600, 0) },
  { name: 'acacia_log_top', ...rect(1664, 0) },
  { name: 'acacia_leaves', ...rect(1728, 0) },
  { name: 'dark_oak_log', ...rect(1792, 0) },
  { name: 'dark_oak_log_top', ...rect(1856, 0) },
  { name: 'dark_oak_leaves', ...rect(1920, 0) },
  { name: 'cactus_side', ...rect(1984, 0) },
  { name: 'cactus_top', ...rect(0, 64) },
  { name: 'dead_bush', ...rect(64, 64) },
  { name: 'mushroom_stem', ...rect(128, 64) },
  { name: 'brown_mushroom', ...rect(192, 64) },
  { name: 'chiseled_stone_bricks', ...rect(256, 64) },
  { name: 'cracked_stone_bricks', ...rect(320, 64) },
  { name: 'mossy_stone_bricks', ...rect(384, 64) },
  { name: 'stone_bricks', ...rect(448, 64) },
  { name: 'blackstone', ...rect(512, 64) },
  { name: 'blackstone_top', ...rect(576, 64) },
  { name: 'nether_bricks', ...rect(640, 64) },
  { name: 'cracked_nether_bricks', ...rect(704, 64) },
  { name: 'blue_ice', ...rect(768, 64) },
  { name: 'water', ...rect(832, 64) },
  { name: 'lava', ...rect(896, 64) },
  { name: 'wood', ...rect(960, 64) },
  { name: 'wood_red', ...rect(1024, 64) },
  { name: 'leaves_transparent', ...rect(1088, 64) },
  { name: 'leaves_orange_transparent', ...rect(1152, 64) },
  { name: 'leaves_orange', ...rect(1216, 64) },
  { name: 'leaves', ...rect(1280, 64) },
  { name: 'wheat_stage4', ...rect(1344, 64) },
  { name: 'mushroom_red', ...rect(1408, 64) },
  { name: 'mushroom_brown', ...rect(1472, 64) },
  { name: 'cotton_red', ...rect(1536, 64) },
  { name: 'cotton_green', ...rect(1600, 64) },
  { name: 'cotton_blue', ...rect(1664, 64) },
  { name: 'cotton_tan', ...rect(1728, 64) },
  { name: 'stone_grass', ...rect(1792, 64) },
  { name: 'stone_snow', ...rect(1856, 64) },
  { name: 'stone_dirt', ...rect(1920, 64) },
  { name: 'stone_gold', ...rect(1984, 64) },
  { name: 'stone_gold_alt', ...rect(0, 128) },
  { name: 'stone_silver', ...rect(64, 128) },
  { name: 'stone_silver_alt', ...rect(128, 128) },
  { name: 'stone_coal', ...rect(192, 128) },
  { name: 'stone_coal_alt', ...rect(256, 128) },
  { name: 'stone_diamond', ...rect(320, 128) },
  { name: 'stone_diamond_alt', ...rect(384, 128) },
  { name: 'stone_iron', ...rect(448, 128) },
  { name: 'stone_iron_alt', ...rect(512, 128) },
  { name: 'stone_browniron', ...rect(576, 128) },
  { name: 'stone_browniron_alt', ...rect(640, 128) },
  { name: 'greystone', ...rect(704, 128) },
  { name: 'greystone_sand', ...rect(768, 128) },
  { name: 'greystone_ruby', ...rect(832, 128) },
  { name: 'greystone_ruby_alt', ...rect(896, 128) },
  { name: 'greysand', ...rect(960, 128) },
  { name: 'gravel_stone', ...rect(1024, 128) },
  { name: 'gravel_dirt', ...rect(1088, 128) },
  { name: 'redstone_emerald', ...rect(1152, 128) },
  { name: 'redstone_emerald_alt', ...rect(1216, 128) },
  { name: 'redstone_sand', ...rect(1280, 128) },
  { name: 'redsand', ...rect(1344, 128) },
  { name: 'rock_moss', ...rect(1408, 128) },
  { name: 'rock', ...rect(1472, 128) },
  { name: 'dirt_snow', ...rect(1536, 128) },
  { name: 'dirt_sand', ...rect(1600, 128) },
  { name: 'dirt_grass', ...rect(1664, 128) },
  { name: 'glass', ...rect(1728, 128) },
  { name: 'glass_frame', ...rect(1792, 128) },
  { name: 'cactus_inside', ...rect(1856, 128) },
  { name: 'brick_red', ...rect(1920, 128) },
  { name: 'brick_grey', ...rect(1984, 128) },
  { name: 'trunk_white_side', ...rect(0, 192) },
  { name: 'trunk_white_top', ...rect(64, 192) },
  { name: 'trunk_side', ...rect(128, 192) },
  { name: 'trunk_top', ...rect(192, 192) },
  { name: 'trunk_mid', ...rect(256, 192) },
  { name: 'trunk_bottom', ...rect(320, 192) },
  { name: 'fence_wood', ...rect(384, 192) },
  { name: 'fence_stone', ...rect(448, 192) },
  { name: 'oven', ...rect(512, 192) },
  { name: 'track_straight', ...rect(576, 192) },
  { name: 'table', ...rect(640, 192) },
];

const NAME_TO_INDEX = new Map(TILES.map((t, i) => [t.name, i]));

export function getTileIndex(name) {
  return NAME_TO_INDEX.get(name) ?? 0;
}

export function buildAtlasRectArray() {
  const arr = [];
  for (let i = 0; i < TILES.length; i++) {
    const t = TILES[i];
    arr.push(new THREE.Vector4(t.x, t.y, t.w, t.h));
  }
  while (arr.length < 256) {
    arr.push(new THREE.Vector4(0, 0, 0, 0));
  }
  return arr;
}

/** Map terrain materialId + faceKind -> atlas tile index
 *  FACE_KIND: top=0, side=1, bottom=2
 */
export const TERRAIN_TILE_MAP = [
  /* 0 grass */      { top: getTileIndex('grass_block_top'), side: getTileIndex('grass_block_side'), bottom: getTileIndex('dirt') },
  /* 1 dirt */       { all: getTileIndex('dirt') },
  /* 2 stone */      { all: getTileIndex('stone') },
  /* 3 stone_dark */ { all: getTileIndex('greystone') },
  /* 4 lava */       { all: getTileIndex('lava') },
  /* 5 coal */       { all: getTileIndex('stone_coal') },
  /* 6 brick */      { all: getTileIndex('brick_red') },
  /* 7 ice */        { all: getTileIndex('ice') },
  /* 8 snow */       { all: getTileIndex('snow') },
  /* 9 water */      { all: getTileIndex('water') },
  /* 10 sand_A */    { all: getTileIndex('sand') },
  /* 11 sand_B */    { all: getTileIndex('redsand') },
  /* 12 prototype */ { all: getTileIndex('stone_iron') },
  /* 13 metal */     { all: getTileIndex('stone_iron') },
  /* 14 gravel */    { all: getTileIndex('gravel') },
  /* 15 wood */      { all: getTileIndex('wood') },
  /* 16 bricks_A */  { all: getTileIndex('brick_red') },
  /* 17 bricks_B */  { all: getTileIndex('brick_grey') },
  /* 18 birch_log */     { top: getTileIndex('birch_log_top'), side: getTileIndex('birch_log'), bottom: getTileIndex('birch_log_top') },
  /* 19 birch_leaves */  { all: getTileIndex('birch_leaves') },
  /* 20 oak_log */       { top: getTileIndex('oak_log_top'), side: getTileIndex('oak_log'), bottom: getTileIndex('oak_log_top') },
  /* 21 oak_leaves */    { all: getTileIndex('oak_leaves') },
  /* 22 jungle_log */    { top: getTileIndex('jungle_log_top'), side: getTileIndex('jungle_log'), bottom: getTileIndex('jungle_log_top') },
  /* 23 jungle_leaves */ { all: getTileIndex('jungle_leaves') },
  /* 24 acacia_log */    { top: getTileIndex('acacia_log_top'), side: getTileIndex('acacia_log'), bottom: getTileIndex('acacia_log_top') },
  /* 25 acacia_leaves */ { all: getTileIndex('acacia_leaves') },
  /* 26 dark_oak_log */  { top: getTileIndex('dark_oak_log_top'), side: getTileIndex('dark_oak_log'), bottom: getTileIndex('dark_oak_log_top') },
  /* 27 dark_oak_leaves */ { all: getTileIndex('dark_oak_leaves') },
  /* 28 cactus */        { top: getTileIndex('cactus_top'), side: getTileIndex('cactus_side'), bottom: getTileIndex('cactus_top') },
  /* 29 dead_bush */     { all: getTileIndex('dead_bush') },
  /* 30 mushroom */      { all: getTileIndex('brown_mushroom') },
  /* 31 cobblestone */   { all: getTileIndex('cobblestone') },
  /* 32 coarse_dirt */   { all: getTileIndex('coarse_dirt') },
  /* 33 mossy_stone */   { all: getTileIndex('mossy_stone_bricks') },
  /* 34 stone_bricks */  { all: getTileIndex('stone_bricks') },
  /* 35 blackstone */    { all: getTileIndex('blackstone') },
  /* 36 blue_ice */      { all: getTileIndex('blue_ice') },
  /* 37 gold_ore */      { all: getTileIndex('gold_ore') },
  /* 38 iron_ore */      { all: getTileIndex('iron_ore') },
  /* 39 diamond_ore */   { all: getTileIndex('diamond_ore') },
  /* 40 red_sand */      { all: getTileIndex('red_sand') },
  /* 41 tall_grass */    { all: getTileIndex('wheat_stage4') },
  /* 42 flower_red */    { all: getTileIndex('cotton_red') },
  /* 43 flower_yellow */ { all: getTileIndex('cotton_tan') },
];

export function getTerrainTileIndex(materialId, faceKind) {
  const map = TERRAIN_TILE_MAP[materialId];
  if (!map) return getTileIndex('dirt');
  if (map.all != null) return map.all;
  if (faceKind === 0 && map.top != null) return map.top;
  if (faceKind === 2 && map.bottom != null) return map.bottom;
  return map.side ?? map.top ?? map.bottom ?? getTileIndex('dirt');
}

/** Map block type keys to a primary atlas tile index */
export const BLOCK_TILE_MAP = {
  // Ground / terrain blocks
  dirt: getTileIndex('dirt'),
  grass: getTileIndex('grass_block_side'),
  stone: getTileIndex('stone'),
  brick: getTileIndex('brick_red'),
  bricks_A: getTileIndex('brick_red'),
  bricks_B: getTileIndex('brick_grey'),
  coal: getTileIndex('stone_coal'),
  metal: getTileIndex('stone_iron'),
  ice: getTileIndex('ice'),
  snow: getTileIndex('snow'),
  lava: getTileIndex('lava'),
  water: getTileIndex('water'),
  wood: getTileIndex('wood'),
  stone_dark: getTileIndex('greystone'),
  gravel: getTileIndex('gravel'),
  sand_A: getTileIndex('sand'),
  sand_B: getTileIndex('redsand'),
  prototype: getTileIndex('stone_iron'),
  cobblestone: getTileIndex('cobblestone'),
  coarse_dirt: getTileIndex('coarse_dirt'),
  mossy_stone: getTileIndex('mossy_stone_bricks'),
  stone_bricks: getTileIndex('stone_bricks'),
  blackstone: getTileIndex('blackstone'),
  blue_ice: getTileIndex('blue_ice'),
  gold_ore: getTileIndex('gold_ore'),
  iron_ore: getTileIndex('iron_ore'),
  diamond_ore: getTileIndex('diamond_ore'),
  red_sand: getTileIndex('red_sand'),

  // Trees
  birch_log: getTileIndex('birch_log'),
  birch_leaves: getTileIndex('birch_leaves'),
  oak_log: getTileIndex('oak_log'),
  oak_leaves: getTileIndex('oak_leaves'),
  jungle_log: getTileIndex('jungle_log'),
  jungle_leaves: getTileIndex('jungle_leaves'),
  acacia_log: getTileIndex('acacia_log'),
  acacia_leaves: getTileIndex('acacia_leaves'),
  dark_oak_log: getTileIndex('dark_oak_log'),
  dark_oak_leaves: getTileIndex('dark_oak_leaves'),

  // Decorations
  cactus: getTileIndex('cactus_side'),
  dead_bush: getTileIndex('dead_bush'),
  mushroom: getTileIndex('brown_mushroom'),
  tall_grass: getTileIndex('wheat_stage4'),
  flower_red: getTileIndex('cotton_red'),
  flower_yellow: getTileIndex('cotton_tan'),

  // Legacy floating blocks
  crystal: getTileIndex('glass'),
  diamond: getTileIndex('glass'),
  decorative_block_blue: getTileIndex('cotton_blue'),
  decorative_block_red: getTileIndex('cotton_red'),
  decorative_block_green: getTileIndex('cotton_green'),
  decorative_block_yellow: getTileIndex('cotton_tan'),
  stone_with_gold: getTileIndex('stone_gold'),
  stone_with_copper: getTileIndex('stone_browniron'),
  stone_with_silver: getTileIndex('stone_silver'),
  colored_block_green: getTileIndex('cotton_green'),
  colored_block_yellow: getTileIndex('cotton_tan'),
  striped_block_blue: getTileIndex('cotton_blue'),
  striped_block_yellow: getTileIndex('cotton_tan'),
  tree: getTileIndex('trunk_side'),

  // Zone 1: Forest Floating Blocks
  mossy_stone: getTileIndex('stone_grass'),
  forest_crystal: getTileIndex('leaves'),
  amber_ore: getTileIndex('stone_gold'),
  ancient_wood: getTileIndex('wood'),

  // Zone 2: Fire Floating Blocks
  scorched_rock: getTileIndex('stone_coal'),
  magma_crystal: getTileIndex('lava'),
  obsidian: getTileIndex('greystone'),
  ember_core: getTileIndex('lava'),

  // Zone 3: Ice Floating Blocks
  packed_ice: getTileIndex('snow'),
  frost_crystal: getTileIndex('ice'),
  glacial_ore: getTileIndex('stone_silver'),
  blizzard_core: getTileIndex('glass'),

  // Zone 4: Desert Floating Blocks
  sandstone_block: getTileIndex('sand'),
  desert_crystal: getTileIndex('redsand'),
  desert_gold_ore: getTileIndex('stone_gold'),
  sun_core: getTileIndex('lava'),

  // Zone 5: Steelworks Floating Blocks
  rusted_scrap: getTileIndex('gravel_stone'),
  factory_crystal: getTileIndex('cotton_blue'),
  alloy_ore: getTileIndex('stone_iron'),
  furnace_core: getTileIndex('lava'),

  // Zone 6: Mire Floating Blocks
  mud_clump: getTileIndex('dirt'),
  moss_crystal: getTileIndex('leaves'),
  petrified_log: getTileIndex('wood'),
  heart_of_the_mire: getTileIndex('trunk_side'),

  // Zone 7: Citadel Floating Blocks
  castle_brick: getTileIndex('brick_red'),
  royal_crystal: getTileIndex('cotton_red'),
  citadel_gold_ore: getTileIndex('stone_gold'),
  crown_core: getTileIndex('cotton_tan'),
};

export function getBlockTileIndex(typeKey) {
  return BLOCK_TILE_MAP[typeKey] ?? getTileIndex('dirt');
}

/** Map instanced cube block type keys + faceKind to atlas tile index
 *  FACE_KIND: top=0, side=1, bottom=2
 */
export const BLOCK_FACE_TILE_MAP = {
  grass: { top: getTileIndex('grass_block_top'), side: getTileIndex('dirt'), bottom: getTileIndex('dirt') },
  tree: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  ancient_wood: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  petrified_log: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  heart_of_the_mire: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  birch_log: { top: getTileIndex('birch_log_top'), side: getTileIndex('birch_log'), bottom: getTileIndex('birch_log_top') },
  oak_log: { top: getTileIndex('oak_log_top'), side: getTileIndex('oak_log'), bottom: getTileIndex('oak_log_top') },
  jungle_log: { top: getTileIndex('jungle_log_top'), side: getTileIndex('jungle_log'), bottom: getTileIndex('jungle_log_top') },
  acacia_log: { top: getTileIndex('acacia_log_top'), side: getTileIndex('acacia_log'), bottom: getTileIndex('acacia_log_top') },
  dark_oak_log: { top: getTileIndex('dark_oak_log_top'), side: getTileIndex('dark_oak_log'), bottom: getTileIndex('dark_oak_log_top') },
};

export function getBlockFaceTileIndex(typeKey, faceKind) {
  const map = BLOCK_FACE_TILE_MAP[typeKey];
  if (!map) return getBlockTileIndex(typeKey);
  if (map.all != null) return map.all;
  if (faceKind === 0 && map.top != null) return map.top;
  if (faceKind === 2 && map.bottom != null) return map.bottom;
  return map.side ?? map.top ?? map.bottom ?? getBlockTileIndex(typeKey);
}
