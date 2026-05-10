// ==========================================
// Voidloop Level Builder — Asset Catalog
// ==========================================

// Terrain tiles → BLOCK_TYPES keys (must be valid BLOCK_TYPES keys)
export const TILE_CATALOG = {
  grass:     { label: 'Grass',     blockType: 'grass',           color: 0x7cfc00 },
  dirt:      { label: 'Dirt',      blockType: 'dirt',            color: 0x8b4513 },
  stone:     { label: 'Stone',     blockType: 'stone',           color: 0x888888 },
  brick:     { label: 'Brick',     blockType: 'brick',           color: 0xa0522d },
  darkstone: { label: 'Dark Stone',blockType: 'stone_dark',      color: 0x333333 },
  metal:     { label: 'Metal',     blockType: 'metal',           color: 0xb0c4de },
  ice:       { label: 'Ice',       blockType: 'ice',             color: 0xaaddff },
  snow:      { label: 'Snow',      blockType: 'snow',            color: 0xffffff },
  gold:      { label: 'Gold Ore',  blockType: 'stone_with_gold', color: 0xffd700 },
  blue:      { label: 'Blue Deco', blockType: 'decorative_block_blue', color: 0x3355ff },
};

// Curated prop library — verified existing files only
export const PROP_CATALOG = {
  // KayKit Forest Nature Pack
  tree_1:        { label: 'Pine Tree',      model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_1_C_Color1.gltf' },
  tree_2:        { label: 'Oak Tree',       model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_2_C_Color1.gltf' },
  tree_3:        { label: 'Birch Tree',     model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_3_A_Color1.gltf' },
  tree_4:        { label: 'Willow Tree',    model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_4_A_Color1.gltf' },
  tree_bare_1:   { label: 'Bare Tree',      model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_Bare_1_C_Color1.gltf' },
  bush_1:        { label: 'Bush A',         model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_1_D_Color1.gltf' },
  bush_2:        { label: 'Bush B',         model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_2_D_Color1.gltf' },
  rock_1:        { label: 'Rock A',         model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_1_A_Color1.gltf' },
  rock_2:        { label: 'Rock B',         model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_2_A_Color1.gltf' },
  rock_3:        { label: 'Rock C',         model: 'KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_3_C_Color1.gltf' },

  // KayKit Medieval Hexagon Pack — nature
  tree_med_a:    { label: 'Medieval Tree A', model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/tree_single_A.gltf' },
  tree_med_b:    { label: 'Medieval Tree B', model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/tree_single_B.gltf' },
  rock_med_a:    { label: 'Medieval Rock A', model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/rock_single_A.gltf' },
  rock_med_b:    { label: 'Medieval Rock B', model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/rock_single_B.gltf' },
  hill_a:        { label: 'Hill',           model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/hill_single_A.gltf' },
  mountain_a:    { label: 'Mountain',       model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/mountain_A_grass.gltf' },

  // KayKit Medieval Hexagon Pack — props
  barrel:        { label: 'Barrel',         model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/barrel.gltf' },
  crate_big:     { label: 'Crate Big',      model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/crate_A_big.gltf' },
  crate_small:   { label: 'Crate Small',    model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/crate_A_small.gltf' },
  tent:          { label: 'Tent',           model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/tent.gltf' },
  flag_red:      { label: 'Red Flag',       model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/flag_red.gltf' },
  flag_blue:     { label: 'Blue Flag',      model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/flag_blue.gltf' },
  resource_stone:{ label: 'Stone Pile',     model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/resource_stone.gltf' },
  weaponrack:    { label: 'Weapon Rack',    model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/weaponrack.gltf' },
  wheelbarrow:   { label: 'Wheelbarrow',    model: 'KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/props/wheelbarrow.gltf' },

  // KayKit ResourceBits
  fuel_barrel:   { label: 'Fuel Barrel',    model: 'KayKit_ResourceBits_1.0_FREE/Assets/gltf/Fuel_A_Barrel.gltf' },
  copper_bar:    { label: 'Copper Bar',     model: 'KayKit_ResourceBits_1.0_FREE/Assets/gltf/Copper_Bar.gltf' },
  stone_brick:   { label: 'Stone Brick',    model: 'KayKit_ResourceBits_1.0_FREE/Assets/gltf/Stone_Brick.gltf' },

  // Pirate Kit
  palm_tree:     { label: 'Palm Tree',      model: 'Pirate Kit - Nov 2023/glTF/Environment_PalmTree_1.gltf' },
  chest_closed:  { label: 'Chest',          model: 'Pirate Kit - Nov 2023/glTF/Prop_Chest_Closed.gltf' },
  chest_gold:    { label: 'Gold Chest',     model: 'Pirate Kit - Nov 2023/glTF/Prop_Chest_Gold.gltf' },
  pirate_rock:   { label: 'Pirate Rock',    model: 'Pirate Kit - Nov 2023/glTF/Environment_Rock_1.gltf' },

  // Ultimate Space Kit
  sciFi_tree:    { label: 'Alien Tree',     model: 'Ultimate Space Kit - March 2023/Environment/GLTF/Tree_Blob_1.gltf' },
  sciFi_rock:    { label: 'Asteroid Rock',  model: 'Ultimate Space Kit - March 2023/Environment/GLTF/Rock_1.gltf' },
  sciFi_bush:    { label: 'Alien Bush',     model: 'Ultimate Space Kit - March 2023/Environment/GLTF/Bush_1.gltf' },

  // KayKit RPG Tools
  torch:         { label: 'Torch',          model: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/torch.gltf' },
};

// Mineable floating block types — visually interesting, hp >= 1
export const FLOAT_BLOCK_CATALOG = {
  crystal:               { label: 'Crystal',       model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf', glowColor: 0x22ccff },
  decorative_block_red:  { label: 'Red Deco',      model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_red.gltf',  glowColor: 0xff4444 },
  stone_with_gold:       { label: 'Gold Ore',      model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf',       glowColor: 0xffd700 },
  metal:                 { label: 'Metal',         model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf',                 glowColor: 0x8899aa },
  lava:                  { label: 'Lava',          model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/lava.gltf',                  glowColor: 0xff4422 },
  stone:                 { label: 'Stone',         model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf',                 glowColor: 0x777777 },
  brick:                 { label: 'Brick',         model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf',              glowColor: 0xa0522d },
  ice:                   { label: 'Ice',           model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/glass.gltf',                 glowColor: 0xaaddff },
};

export const ENEMY_KINDS = ['goblin', 'skeleton', 'demon', 'yeti', 'Rogue', 'Rogue_Hooded', 'Barbarian'];

export const TOKEN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Themes bundle default terrain palettes + music
export const THEMES = {
  forest:   { name: 'Forest',   terrain: ['grass', 'dirt', 'stone'], ambience: 'forest_ambience' },
  cave:     { name: 'Cave',     terrain: ['darkstone', 'stone', 'metal'], ambience: 'cave_ambience' },
  medieval: { name: 'Medieval', terrain: ['brick', 'stone', 'dirt'], ambience: 'castle_ambience' },
  space:    { name: 'Space',    terrain: ['metal', 'blue', 'darkstone'], ambience: 'space_ambience' },
  city:     { name: 'City',     terrain: ['brick', 'metal', 'stone'], ambience: 'city_ambience' },
  dungeon:  { name: 'Dungeon',  terrain: ['darkstone', 'brick', 'gold'], ambience: 'dungeon_ambience' },
};

export function getTheme(id) {
  return THEMES[id] || THEMES.forest;
}

export function getBlockTypeForTile(tileType) {
  return (TILE_CATALOG[tileType] || TILE_CATALOG.grass).blockType;
}
