/**
 * KenneyAtlas — UV atlas data for Kenney Voxel Pack spritesheet_tiles.png
 * Atlas: 1152 x 1280, tiles: 128 x 128
 */

import * as THREE from 'three';

const ATLAS_W = 1152;
const ATLAS_H = 1280;
const TILE_W = 128;
const TILE_H = 128;

function rect(x, y) {
  return {
    x: x / ATLAS_W,
    y: 1 - ((y + TILE_H) / ATLAS_H),
    w: TILE_W / ATLAS_W,
    h: TILE_H / ATLAS_H,
  };
}

// Ordered tile registry — index = shader atlasRects array index
export const TILES = [
  // 0
  { name: 'wood',           ...rect(0, 128) },
  // 1
  { name: 'wood_red',       ...rect(0, 0) },
  // 2
  { name: 'wheat_stage4',   ...rect(0, 256) },
  // 3
  { name: 'wheat_stage3',   ...rect(0, 384) },
  // 4
  { name: 'wheat_stage2',   ...rect(0, 512) },
  // 5
  { name: 'wheat_stage1',   ...rect(0, 640) },
  // 6
  { name: 'water',          ...rect(0, 768) },
  // 7
  { name: 'trunk_white_top',...rect(0, 896) },
  // 8
  { name: 'trunk_white_side',...rect(0, 1024) },
  // 9
  { name: 'trunk_top',      ...rect(0, 1152) },
  // 10
  { name: 'trunk_side',     ...rect(128, 0) },
  // 11
  { name: 'trunk_mid',      ...rect(128, 128) },
  // 12
  { name: 'trunk_bottom',   ...rect(128, 256) },
  // 13
  { name: 'track_straight_alt',...rect(128, 384) },
  // 14
  { name: 'track_straight', ...rect(128, 512) },
  // 15
  { name: 'track_corner_alt',...rect(128, 640) },
  // 16
  { name: 'track_corner',   ...rect(128, 768) },
  // 17
  { name: 'table',          ...rect(128, 896) },
  // 18
  { name: 'stone_snow',     ...rect(128, 1024) },
  // 19
  { name: 'stone_silver_alt',...rect(128, 1152) },
  // 20
  { name: 'stone_silver',   ...rect(256, 0) },
  // 21
  { name: 'stone_sand',     ...rect(256, 128) },
  // 22
  { name: 'stone_iron_alt', ...rect(256, 256) },
  // 23
  { name: 'stone_iron',     ...rect(256, 384) },
  // 24
  { name: 'stone_grass',    ...rect(256, 512) },
  // 25
  { name: 'stone_gold_alt', ...rect(256, 640) },
  // 26
  { name: 'stone_gold',     ...rect(256, 768) },
  // 27
  { name: 'stone_dirt',     ...rect(256, 896) },
  // 28
  { name: 'stone_diamond_alt',...rect(256, 1024) },
  // 29
  { name: 'stone_diamond',  ...rect(256, 1152) },
  // 30
  { name: 'stone_coal_alt', ...rect(384, 0) },
  // 31
  { name: 'stone_coal',     ...rect(384, 128) },
  // 32
  { name: 'stone_browniron_alt',...rect(384, 256) },
  // 33
  { name: 'stone_browniron',...rect(384, 384) },
  // 34
  { name: 'stone',          ...rect(384, 512) },
  // 35
  { name: 'snow',           ...rect(384, 640) },
  // 36
  { name: 'sand',           ...rect(384, 768) },
  // 37
  { name: 'rock_moss',      ...rect(384, 896) },
  // 38
  { name: 'rock',           ...rect(384, 1024) },
  // 39
  { name: 'redstone_sand',  ...rect(384, 1152) },
  // 40
  { name: 'redstone_emerald_alt',...rect(512, 0) },
  // 41
  { name: 'redstone_emerald',...rect(512, 128) },
  // 42
  { name: 'redsand',        ...rect(512, 384) },
  // 43
  { name: 'redstone',       ...rect(1024, 512) },
  // 44
  { name: 'oven',           ...rect(512, 512) },
  // 45
  { name: 'mushroom_tan',   ...rect(512, 640) },
  // 46
  { name: 'mushroom_red',   ...rect(512, 768) },
  // 47
  { name: 'mushroom_brown', ...rect(512, 896) },
  // 48
  { name: 'leaves_transparent',...rect(512, 1024) },
  // 49
  { name: 'leaves_orange_transparent',...rect(512, 1152) },
  // 50
  { name: 'leaves_orange',  ...rect(640, 0) },
  // 51
  { name: 'leaves',         ...rect(640, 128) },
  // 52
  { name: 'lava',           ...rect(640, 256) },
  // 53
  { name: 'ice',            ...rect(640, 384) },
  // 54
  { name: 'greystone_sand', ...rect(640, 512) },
  // 55
  { name: 'greystone_ruby_alt',...rect(640, 640) },
  // 56
  { name: 'greystone_ruby', ...rect(640, 768) },
  // 57
  { name: 'greystone',      ...rect(640, 896) },
  // 58
  { name: 'greysand',       ...rect(640, 1024) },
  // 59
  { name: 'gravel_stone',   ...rect(640, 1152) },
  // 60
  { name: 'gravel_dirt',    ...rect(768, 0) },
  // 61
  { name: 'grass_top',      ...rect(768, 128) },
  // 62
  { name: 'grass_tan',      ...rect(768, 256) },
  // 63
  { name: 'grass_brown',    ...rect(768, 384) },
  // 64
  { name: 'grass4',         ...rect(768, 512) },
  // 65
  { name: 'grass3',         ...rect(768, 640) },
  // 66
  { name: 'grass2',         ...rect(768, 768) },
  // 67
  { name: 'grass1',         ...rect(768, 896) },
  // 68
  { name: 'glass_frame',    ...rect(768, 1024) },
  // 69
  { name: 'glass',          ...rect(768, 1152) },
  // 70
  { name: 'fence_wood',     ...rect(896, 0) },
  // 71
  { name: 'fence_stone',    ...rect(896, 128) },
  // 72
  { name: 'dirt_snow',      ...rect(896, 256) },
  // 73
  { name: 'dirt_sand',      ...rect(896, 384) },
  // 74
  { name: 'dirt_grass',     ...rect(896, 512) },
  // 75
  { name: 'dirt',           ...rect(896, 640) },
  // 76
  { name: 'cotton_tan',     ...rect(896, 768) },
  // 77
  { name: 'cotton_red',     ...rect(896, 896) },
  // 78
  { name: 'cotton_green',   ...rect(896, 1024) },
  // 79
  { name: 'cotton_blue',    ...rect(896, 1152) },
  // 80
  { name: 'cactus_top',     ...rect(1024, 0) },
  // 81
  { name: 'cactus_side',    ...rect(1024, 128) },
  // 82
  { name: 'cactus_inside',  ...rect(1024, 256) },
  // 83
  { name: 'brick_red',      ...rect(1024, 384) },
  // 84
  { name: 'brick_grey',     ...rect(512, 256) },
];

const NAME_TO_INDEX = new Map(TILES.map((t, i) => [t.name, i]));

export function getTileIndex(name) {
  return NAME_TO_INDEX.get(name) ?? 75; // default to dirt
}

export function getTileRect(name) {
  const idx = getTileIndex(name);
  return TILES[idx];
}



/** Build an array of THREE.Vector4 for the shader uniform */
export function buildAtlasRectArray() {
  const arr = [];
  for (let i = 0; i < TILES.length; i++) {
    const t = TILES[i];
    arr.push(new THREE.Vector4(t.x, t.y, t.w, t.h));
  }
  // Pad to match the shader declaration size (96) so Three.js doesn't read undefined indices
  while (arr.length < 96) {
    arr.push(new THREE.Vector4(0, 0, 0, 0));
  }
  return arr;
}

/** Map terrain materialId + faceKind -> atlas tile index
 *  FACE_KIND: top=0, side=1, bottom=2
 */
export const TERRAIN_TILE_MAP = [
  /* 0 grass */      { top: getTileIndex('grass_top'), side: getTileIndex('dirt_grass'), bottom: getTileIndex('dirt') },
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
  /* 14 gravel */    { all: getTileIndex('gravel_stone') },
  /* 15 wood */      { all: getTileIndex('wood') },
  /* 16 bricks_A */  { all: getTileIndex('brick_red') },
  /* 17 bricks_B */  { all: getTileIndex('brick_grey') },
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
  grass: getTileIndex('dirt_grass'),
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
  gravel: getTileIndex('gravel_stone'),
  sand_A: getTileIndex('sand'),
  sand_B: getTileIndex('redsand'),
  prototype: getTileIndex('stone_iron'),

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

  // Zone 1: Forest
  mossy_stone: getTileIndex('stone_grass'),
  forest_crystal: getTileIndex('leaves'),
  amber_ore: getTileIndex('stone_gold'),
  ancient_wood: getTileIndex('wood'),

  // Zone 2: Fire
  scorched_rock: getTileIndex('stone_coal'),
  magma_crystal: getTileIndex('lava'),
  obsidian: getTileIndex('greystone'),
  ember_core: getTileIndex('lava'),

  // Zone 3: Ice
  packed_ice: getTileIndex('ice'),
  frost_crystal: getTileIndex('ice'),
  glacial_ore: getTileIndex('stone_silver'),
  blizzard_core: getTileIndex('glass'),

  // Zone 4: Desert
  sandstone_block: getTileIndex('sand'),
  desert_crystal: getTileIndex('redsand'),
  desert_gold_ore: getTileIndex('stone_gold'),
  sun_core: getTileIndex('lava'),

  // Zone 5: Steelworks
  rusted_scrap: getTileIndex('gravel_stone'),
  factory_crystal: getTileIndex('cotton_blue'),
  alloy_ore: getTileIndex('stone_iron'),
  furnace_core: getTileIndex('lava'),

  // Zone 6: Mire
  mud_clump: getTileIndex('dirt'),
  moss_crystal: getTileIndex('leaves'),
  petrified_log: getTileIndex('wood'),
  heart_of_the_mire: getTileIndex('trunk_side'),

  // Zone 7: Citadel
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
  grass: { top: getTileIndex('grass_top'), side: getTileIndex('dirt_grass'), bottom: getTileIndex('dirt') },
  tree: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  ancient_wood: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  petrified_log: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
  heart_of_the_mire: { top: getTileIndex('trunk_top'), side: getTileIndex('trunk_side'), bottom: getTileIndex('trunk_bottom') },
};

export function getBlockFaceTileIndex(typeKey, faceKind) {
  const map = BLOCK_FACE_TILE_MAP[typeKey];
  if (!map) return getBlockTileIndex(typeKey);
  if (map.all != null) return map.all;
  if (faceKind === 0 && map.top != null) return map.top;
  if (faceKind === 2 && map.bottom != null) return map.bottom;
  return map.side ?? map.top ?? map.bottom ?? getBlockTileIndex(typeKey);
}
