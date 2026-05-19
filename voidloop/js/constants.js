// ==========================================
// Voidloop — Game Constants
// ==========================================

export const GAME = {
  GRAVITY: -25,
  PLAYER_SPEED: 6,
  PLAYER_SPRINT_SPEED: 9,
  PLAYER_ROTATION_SPEED: 8,
  DODGE_FORCE: 10,
  DODGE_DURATION: 0.4,
  DODGE_COST: 20,

  MAX_HP: 100,
  MAX_STAMINA: 100,
  SPRINT_DRAIN: 25,
  STAMINA_REGEN: 15,

  JUMP_FORCE: 9.0,
  DOUBLE_JUMP_FORCE: 8.0,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER: 0.14,
  JUMP_CUT_MULTIPLIER: 2.0,
  FALL_MULTIPLIER: 1.65,
  JUMP_PEAK_GRAVITY_MULTIPLIER: 0.55,

  // Rocket Boots
  ROCKET_BOOTS_THRUST: 7.0,
  ROCKET_BOOTS_FUEL_BASE: 1.0,
  ROCKET_BOOTS_BURN_RATE: 0.6,
  ROCKET_BOOTS_UPGRADE_FUEL_BONUS: 0.4,
  ROCKET_BOOTS_HORIZ_THRUST: 14.0,
  ROCKET_BOOTS_HOVER_GRAVITY: 0.35,
  ROCKET_BOOTS_AIR_DRAG: 3.0,
  ROCKET_BOOTS_HOVER_DRAIN: 0.35,
  ROCKET_BOOTS_MAX_VERT_SPEED: 10.0,

  // Wall-slide / Wall-jump
  WALL_SLIDE_GRAVITY_MULT: 0.35,
  WALL_JUMP_FORCE: 8.5,
  WALL_JUMP_PUSH: 7.0,

  // Camera
  CAM_DISTANCE: 10,
  CAM_HEIGHT: 3.5,
  CAM_LOOK_AT_HEIGHT: 0.8,

  // Mining
  MINE_RANGE: 2.5,
  BLOCK_SIZE: 1,

  // Combat
  ATTACK_COOLDOWN: 0.35,
  PROJECTILE_SPEED: 20,
  PROJECTILE_LIFETIME: 3,
  GRENADE_RADIUS: 4.25,
  GRENADE_DAMAGE: 55,
  GRENADE_FUSE: 1.2,
  GRENADE_ARM_TIME: 0.25,
  GRENADE_COOLDOWN: 0.2,
  GRENADE_MAX_ACTIVE: 20,
  GRENADE_MAX_TERRAIN_CELLS: 420,
  GRENADE_FLOATING_BLOCK_CAP: 18,
  MISSILE_STRIKE_MIN: 3,
  MISSILE_STRIKE_MAX: 4,
  MISSILE_STRIKE_RADIUS: 7.0,
  MISSILE_STRIKE_DAMAGE: 95,
  MISSILE_STRIKE_COOLDOWN: 9.0,
  MISSILE_STRIKE_MAX_TERRAIN_CELLS: 1150,
  MISSILE_STRIKE_FLOATING_BLOCK_CAP: 32,

  // World
  FLOOR_SIZE: 50,
  FLOOR_HEIGHT: 6,
  BLOCKS_PER_FLOOR: 5000,

  // Timer
  COUNTDOWN_BASE: 60,
  COUNTDOWN_PER_FLOOR: 10,
  TIME_BONUS_KILL: 2,
  TIME_BONUS_MINING: 1,
};

export const PICKAXE_TIERS = [
  { name: 'Wood', damage: 1, speed: 1.0, model: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/pickaxe.gltf', sfx: 'DSGNTonl_USABLE-Generic Item' },
  { name: 'Stone', damage: 2, speed: 1.1, model: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/pickaxe.gltf', sfx: 'DSGNTonl_USABLE-Metallic Item' },
  { name: 'Iron', damage: 2, speed: 1.3, model: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/axe.gltf', sfx: 'FGHTImpt_MELEE-Clap Slapper' },
  { name: 'Gold', damage: 3, speed: 1.5, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/axe_1handed.gltf', sfx: 'MAGSpel_CAST-Zap Up' },
  { name: 'Diamond', damage: 3, speed: 2.0, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/axe_2handed.gltf', sfx: 'DSGNSynth_BUFF-Bonus Crit Chance' },
];

export const WEAPONS = [
  { id: 'pickaxe', name: 'Pickaxe', type: 'melee', slot: 0, damage: 10, model: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf/pickaxe.gltf', sfx: 'DSGNTonl_USABLE-Generic Item', icon: '⛏️' },
  { id: 'sword', name: 'Sword', type: 'melee', slot: 1, damage: 15, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/sword_1handed.gltf', sfx: 'DSGNTonl_MELEE-Sword Critical', icon: '⚔' },
  { id: 'pistol', name: 'Hand Crossbow', type: 'ranged', slot: 2, damage: 12, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/crossbow_1handed.gltf', sfx: 'DSGNImpt_EXPLOSION-Smaller Flare', icon: '🏹' },
  { id: 'grenade', name: 'Smokebomb', type: 'thrown', slot: 3, damage: 40, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/smokebomb.gltf', sfx: 'DSGNImpt_EXPLOSION-Thud', icon: '●' },
  { id: 'ivy_whip', name: 'Ivy Whip', type: 'grapple', slot: 4, damage: 0, model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/wand.gltf', sfx: 'DSGNMisc_MOVEMENT-Watery Laser', icon: '🌿' },
];

export const BLOCK_TYPES = {
  // Ground / terrain blocks (fast break, 1-2 HP)
  dirt: { hp: 1, color: 0x8B6914, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt.gltf' },
  grass: { hp: 1, color: 0x4a8f29, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt_with_grass.gltf' },
  stone: { hp: 2, color: 0x777777, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf' },
  brick: { hp: 2, color: 0xa0522d, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf' },
  bricks_A: { hp: 2, color: 0xa0522d, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf' },
  bricks_B: { hp: 2, color: 0x8a4525, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_B.gltf' },
  coal: { hp: 2, color: 0x222222, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf' },
  metal: { hp: 2, color: 0x8899aa, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf' },
  ice: { hp: 1, color: 0xaaddff, drop: 'ice', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/glass.gltf' },
  snow: { hp: 1, color: 0xeeeeee, drop: 'snow', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/snow.gltf' },
  lava: { hp: 2, color: 0xff4422, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/lava.gltf' },
  water: { hp: 1, color: 0x4488ff, drop: 'ice', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/water.gltf' },
  wood: { hp: 1, color: 0x8B5a2b, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  stone_dark: { hp: 2, color: 0x333333, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf' },
  gravel: { hp: 1, color: 0x666666, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/gravel.gltf' },
  sand_A: { hp: 1, color: 0xe6c288, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/sand_A.gltf' },
  sand_B: { hp: 1, color: 0xd4a574, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/sand_B.gltf' },
  prototype: { hp: 2, color: 0xcccccc, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/prototype.gltf' },

  // New ourCraft-inspired blocks
  cobblestone: { hp: 2, color: 0x777777, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf' },
  coarse_dirt: { hp: 1, color: 0x8B6914, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt.gltf' },
  mossy_stone: { hp: 2, color: 0x6a8a5a, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf' },
  stone_bricks: { hp: 2, color: 0x777777, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf' },
  blackstone: { hp: 2, color: 0x2a2a2a, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf' },
  blue_ice: { hp: 1, color: 0x88ccff, drop: 'ice', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/glass.gltf' },
  gold_ore: { hp: 3, color: 0xffd700, drop: 'gold_nugget', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf' },
  iron_ore: { hp: 3, color: 0xd4a574, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_copper.gltf' },
  diamond_ore: { hp: 4, color: 0x22ccff, drop: 'diamond', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_silver.gltf' },
  red_sand: { hp: 1, color: 0xc4783e, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/sand_B.gltf' },

  // Trees
  birch_log: { hp: 2, color: 0xc4b8a8, drop: 'wood', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  birch_leaves: { hp: 1, color: 0x6a9a4a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },
  oak_log: { hp: 2, color: 0x8B5a2b, drop: 'wood', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  oak_leaves: { hp: 1, color: 0x4a7a2a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },
  jungle_log: { hp: 2, color: 0x5a4a2b, drop: 'wood', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  jungle_leaves: { hp: 1, color: 0x2d5a1a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },
  acacia_log: { hp: 2, color: 0x9a6a3b, drop: 'wood', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  acacia_leaves: { hp: 1, color: 0x6a8a3a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },
  dark_oak_log: { hp: 2, color: 0x3a2a1b, drop: 'wood', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  dark_oak_leaves: { hp: 1, color: 0x2a4a1a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },

  // Decorations (no model = fallback cube)
  cactus: { hp: 1, color: 0x4a8a3a, drop: 'dirt' },
  dead_bush: { hp: 1, color: 0x8a7a4a, drop: 'dirt' },
  mushroom: { hp: 1, color: 0x8a5a3a, drop: 'dirt' },
  tall_grass: { hp: 1, color: 0x66aa33, drop: 'dirt' },
  flower_red: { hp: 1, color: 0xff4444, drop: 'dirt' },
  flower_yellow: { hp: 1, color: 0xffdd44, drop: 'dirt' },

  // Legacy floating blocks (kept for backwards compatibility)
  crystal: { hp: 5, color: 0x22ccff, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  diamond: { hp: 5, color: 0x00ffff, drop: 'diamond', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  decorative_block_blue: { hp: 5, color: 0x22ccff, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  decorative_block_red: { hp: 5, color: 0xff4444, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_red.gltf' },
  decorative_block_green: { hp: 5, color: 0x4ade80, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_green.gltf' },
  decorative_block_yellow: { hp: 5, color: 0xfacc15, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_yellow.gltf' },
  stone_with_gold: { hp: 5, color: 0xffd700, drop: 'diamond', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf' },
  stone_with_copper: { hp: 5, color: 0xb87333, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_copper.gltf' },
  stone_with_silver: { hp: 5, color: 0xc0c0c0, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_silver.gltf' },
  colored_block_green: { hp: 5, color: 0x4ade80, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/colored_block_green.gltf' },
  colored_block_yellow: { hp: 5, color: 0xfacc15, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/colored_block_yellow.gltf' },
  striped_block_blue: { hp: 5, color: 0x7dd3fc, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/striped_block_blue.gltf' },
  striped_block_yellow: { hp: 5, color: 0xfacc15, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/striped_block_yellow.gltf' },
  tree: { hp: 5, color: 0x5a7a3a, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf' },

  // === Zone 1: Forest Floating Blocks (Tier 1-4) ===
  mossy_stone:      { hp: 5, color: 0x6b8e5a, drop: 'moss_chip',      model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf',                 zone: 'forest', tier: 1, resource: 'moss_chip' },
  forest_crystal:   { hp: 7, color: 0x4ade80, drop: 'crystal_shard',  model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_green.gltf', zone: 'forest', tier: 2, resource: 'crystal_shard' },
  amber_ore:        { hp: 10, color: 0xffb700, drop: 'amber',          model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf',      zone: 'forest', tier: 3, resource: 'amber' },
  ancient_wood:     { hp: 12, color: 0x5a3a1a, drop: 'ancient_bark',  model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf',                  zone: 'forest', tier: 4, resource: 'ancient_bark' },

  // === Zone 2: Fire Floating Blocks (Tier 1-4) ===
  scorched_rock:    { hp: 5, color: 0x4a4a4a, drop: 'ash',            model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf',            zone: 'fire', tier: 1, resource: 'ash' },
  magma_crystal:    { hp: 7, color: 0xff6b35, drop: 'magma_shard',    model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_red.gltf',  zone: 'fire', tier: 2, resource: 'magma_shard' },
  obsidian:         { hp: 10, color: 0x1a1a2e, drop: 'obsidian_fragment', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf',         zone: 'fire', tier: 3, resource: 'obsidian_fragment' },
  ember_core:       { hp: 12, color: 0xff4500, drop: 'ember_essence', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/lava.gltf',                  zone: 'fire', tier: 4, resource: 'ember_essence' },

  // === Zone 3: Ice Floating Blocks (Tier 1-4) ===
  packed_ice:       { hp: 5, color: 0xddeeff, drop: 'ice_chunk',      model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/snow.gltf',                  zone: 'ice', tier: 1, resource: 'ice_chunk' },
  frost_crystal:    { hp: 7, color: 0x7dd3fc, drop: 'frost_shard',    model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf', zone: 'ice', tier: 2, resource: 'frost_shard' },
  glacial_ore:      { hp: 10, color: 0xaaddff, drop: 'glacial_metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_silver.gltf',     zone: 'ice', tier: 3, resource: 'glacial_metal' },
  blizzard_core:    { hp: 12, color: 0xe0f0ff, drop: 'blizzard_essence', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/glass.gltf',             zone: 'ice', tier: 4, resource: 'blizzard_essence' },

  // === Zone 4: Desert Floating Blocks (Tier 1-4) ===
  sandstone_block:  { hp: 5, color: 0xe6c288, drop: 'sand',           model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/sand_A.gltf',                zone: 'desert', tier: 1, resource: 'sand' },
  desert_crystal:   { hp: 7, color: 0xfacc15, drop: 'desert_shard',   model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_yellow.gltf', zone: 'desert', tier: 2, resource: 'desert_shard' },
  desert_gold_ore:  { hp: 10, color: 0xffd700, drop: 'gold_nugget',   model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf',       zone: 'desert', tier: 3, resource: 'gold_nugget' },
  sun_core:         { hp: 12, color: 0xffaa00, drop: 'solar_essence', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/colored_block_yellow.gltf',  zone: 'desert', tier: 4, resource: 'solar_essence' },

  // === Zone 5: Steelworks Floating Blocks (Tier 1-4) ===
  rusted_scrap:     { hp: 5, color: 0x8b4513, drop: 'rust_chunk',     model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/gravel.gltf',                zone: 'steelworks', tier: 1, resource: 'rust_chunk' },
  factory_crystal:  { hp: 7, color: 0x7dd3fc, drop: 'gear_shard',     model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/striped_block_blue.gltf',    zone: 'steelworks', tier: 2, resource: 'gear_shard' },
  alloy_ore:        { hp: 10, color: 0x8899aa, drop: 'alloy_ingot',   model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf',                 zone: 'steelworks', tier: 3, resource: 'alloy_ingot' },
  furnace_core:     { hp: 12, color: 0xff5500, drop: 'furnace_ember', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/lava.gltf',                  zone: 'steelworks', tier: 4, resource: 'furnace_ember' },

  // === Zone 6: Mire Floating Blocks (Tier 1-4) ===
  mud_clump:        { hp: 5, color: 0x5a3a1a, drop: 'mud_pie',        model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt.gltf',                  zone: 'mire', tier: 1, resource: 'mud_pie' },
  moss_crystal:     { hp: 7, color: 0x4ade80, drop: 'moss_clump',     model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_green.gltf', zone: 'mire', tier: 2, resource: 'moss_clump' },
  petrified_log:    { hp: 10, color: 0x4a3728, drop: 'petrified_bark', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf',                 zone: 'mire', tier: 3, resource: 'petrified_bark' },
  heart_of_the_mire:{ hp: 12, color: 0x2d5a2d, drop: 'mire_essence',  model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/tree.gltf',                  zone: 'mire', tier: 4, resource: 'mire_essence' },

  // === Zone 7: Citadel Floating Blocks (Tier 1-4) ===
  castle_brick:     { hp: 5, color: 0xcc6666, drop: 'brick_chip',     model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf',              zone: 'citadel', tier: 1, resource: 'brick_chip' },
  royal_crystal:    { hp: 7, color: 0xff4444, drop: 'royal_shard',    model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_red.gltf',  zone: 'citadel', tier: 2, resource: 'royal_shard' },
  citadel_gold_ore: { hp: 10, color: 0xffd700, drop: 'gold_nugget',   model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf',       zone: 'citadel', tier: 3, resource: 'gold_nugget' },
  crown_core:       { hp: 12, color: 0xffee44, drop: 'crown_jewel',   model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/striped_block_yellow.gltf',  zone: 'citadel', tier: 4, resource: 'crown_jewel' },
};

export const BIOMES = [
  {
    name: 'Grassland Caves',
    floors: [1, 4],
    blocks: ['grass', 'dirt', 'stone', 'brick'],
    enemies: ['goblin', 'slime'],
    fogColor: 0x87ceeb,
    fogNear: 20, fogFar: 45,
  },
  {
    name: 'Temple Ruins',
    floors: [5, 8],
    blocks: ['stone', 'brick', 'dirt', 'metal'],
    enemies: ['skeleton', 'slime', 'goblin'],
    fogColor: 0x2a2a4a,
    fogNear: 18, fogFar: 40,
  },
  {
    name: 'Pirate Cove',
    floors: [9, 12],
    blocks: ['dirt', 'stone', 'coal', 'metal'],
    enemies: ['pirate', 'slime', 'bat'],
    fogColor: 0x1a3a4a,
    fogNear: 15, fogFar: 38,
  },
  {
    name: 'City Ruins',
    floors: [13, 16],
    blocks: ['brick', 'metal', 'coal', 'stone'],
    enemies: ['soldier', 'zombie', 'demon'],
    fogColor: 0x2a1a1a,
    fogNear: 14, fogFar: 35,
  },
  {
    name: 'Void Depths',
    floors: [17, 20],
    blocks: ['crystal', 'diamond', 'ice', 'metal'],
    enemies: ['space', 'demon', 'bat', 'yeti'],
    fogColor: 0x0a0a1a,
    fogNear: 12, fogFar: 30,
  },
];

// Animation name mappings per model pack
const ANIM_KAYKIT_ENEMY = { idle: 'Idle_A', walk: 'Walking_A', run: 'Running_A', attack: 'Melee_1H_Attack_Slice_Horizontal', hit: 'Hit_A', death: 'Death_A' };
const ANIM_ULTIMATE_CHAR = { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Punch', hit: 'RecieveHit', death: 'Death' };
const ANIM_BLOB = { idle: 'Idle', walk: 'Walk', run: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death' };
const ANIM_GHOST = { idle: 'Flying_Idle', walk: 'Fast_Flying', run: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death' };
const ANIM_HAZMAT = { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Punch', hit: 'HitReact', death: 'Death' };
const ANIM_SPACE = { idle: 'Flying_Idle', walk: 'Fast_Flying', run: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death' };

export const ENEMY_TYPES = {
  slime: {
    name: 'Slime Miner',
    hp: 20, damage: 5, speed: 2, attackCooldown: 1.5,
    model: 'Ultimate Monsters/Blob/glTF/GreenBlob.gltf',
    scale: 0.6,
    sfx: { hurt: 'DSGNMisc_HIT-Fleeting Hit', death: 'DSGNImpt_EXPLOSION-Flare Extinguish' },
    animMap: ANIM_BLOB,
  },
  goblin: {
    name: 'Goblin Scout',
    hp: 20, damage: 8, speed: 4, attackCooldown: 1.5,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb',
    scale: 0.8,
    sfx: { hurt: 'FGHTImpt_HIT-Smack', death: 'DSGNImpt_EXPLOSION-Forced Interruption' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  skeleton: {
    name: 'Skeleton Warrior',
    hp: 20, damage: 10, speed: 3, attackCooldown: 1.5,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb',
    scale: 0.85,
    sfx: { hurt: 'FGHTImpt_HIT-Strong Punch', death: 'DSGNImpt_EXPLOSION-Forced Interruption' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  bat: {
    name: 'Cave Bat',
    hp: 20, damage: 6, speed: 5, attackCooldown: 1.2,
    model: 'Ultimate Monsters/Flying/glTF/Ghost.gltf',
    scale: 0.5,
    flying: true,
    sfx: { hurt: 'DSGNMisc_HIT-Noisy Hit', death: 'DSGNImpt_EXPLOSION-Flare Extinguish' },
    animMap: ANIM_GHOST,
  },
  demon: {
    name: 'Demon Brute',
    hp: 20, damage: 14, speed: 2.5, attackCooldown: 1.8,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
    scale: 1.0,
    sfx: { hurt: 'FGHTImpt_HIT-Strong Smack', death: 'DSGNImpt_EXPLOSION-Crunchy Burst' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  yeti: {
    name: 'Yeti Guard',
    hp: 20, damage: 18, speed: 2, attackCooldown: 2.0,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
    scale: 1.2,
    sfx: { hurt: 'FGHTImpt_MELEE-Clap Slapper', death: 'DSGNImpt_EXPLOSION-Bass Hit' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  pirate: {
    name: 'Pirate Raider',
    hp: 20, damage: 9, speed: 3.5, attackCooldown: 1.5,
    model: 'Ultimate Animated Character Pack - Nov 2019/glTF/Pirate_Male.gltf',
    scale: 0.9,
    sfx: { hurt: 'FGHTImpt_HIT-Smack', death: 'DSGNImpt_EXPLOSION-Forced Interruption' },
    animMap: ANIM_ULTIMATE_CHAR,
  },
  soldier: {
    name: 'Hazmat Soldier',
    hp: 20, damage: 11, speed: 3, attackCooldown: 1.5,
    model: 'Toon Shooter Game Kit - Dec 2022/Characters/glTF/Character_Hazmat.gltf',
    scale: 0.9,
    sfx: { hurt: 'DSGNMisc_HIT-Bitcrusher', death: 'DSGNImpt_EXPLOSION-Bit Bomb' },
    animMap: ANIM_HAZMAT,
  },
  zombie: {
    name: 'Zombie Miner',
    hp: 20, damage: 12, speed: 2, attackCooldown: 1.8,
    model: 'Ultimate Animated Character Pack - Nov 2019/glTF/Zombie_Male.gltf',
    scale: 0.9,
    sfx: { hurt: 'DSGNMisc_HIT-Hit Noise', death: 'DSGNImpt_EXPLOSION-Grainy Burst' },
    animMap: ANIM_ULTIMATE_CHAR,
  },
  space: {
    name: 'Void Drone',
    hp: 20, damage: 10, speed: 4, attackCooldown: 1.3,
    model: 'Ultimate Space Kit - March 2023/Characters/GLTF/Enemy_Small.gltf',
    scale: 0.85,
    sfx: { hurt: 'DSGNSynth_BUFF-Bonus Crit Chance', death: 'DSGNImpt_EXPLOSION-Electric Hit' },
    animMap: ANIM_SPACE,
  },
};

// Loot tables for blocks and enemies
export const BLOCK_LOOT_TABLES = {
  dirt:   { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  grass:  { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'crystal',count:1}] },
  stone:  { always: [{type:'coin', count:1}], common:[{type:'ore_stone',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  brick:  { always: [{type:'coin', count:1}], common:[{type:'ore_stone',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'key',count:1}] },
  coal:   { always: [{type:'coin', count:1}], common:[{type:'ore_coal',count:1}], uncommon:[{type:'ore_coal',count:2}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'crystal',count:1}] },
  metal:  { always: [{type:'coin', count:1}], common:[{type:'ore_metal',count:1}], uncommon:[{type:'ore_metal',count:1}], rare:[{type:'gem_pink',count:1}], veryRare:[{type:'energy_orb',count:1}] },
  crystal:{ always: [{type:'coin', count:2}], common:[{type:'gem_blue',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'energy_orb',count:1}] },
  diamond:{ always: [{type:'coin', count:3}], common:[{type:'gem_blue',count:1}], uncommon:[{type:'gem_pink',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'energy_orb',count:2}] },
  ice:    { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'health_scifi',count:1}] },
  snow:   { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'health_meat',count:1}] },
};

export const ENEMY_LOOT_TABLES = {
  slime:   { always: [{type:'coin',count:2}], common:[{type:'coin',count:1}], uncommon:[{type:'health_meat',count:1}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  goblin:  { always: [{type:'coin',count:3}], common:[{type:'coin',count:2}], uncommon:[{type:'health_meat',count:1}], rare:[{type:'gem_green',count:1}], veryRare:[{type:'gold_bag',count:1}] },
  skeleton:{ always: [{type:'coin',count:2}], common:[{type:'coin',count:1}], uncommon:[{type:'ore_stone',count:1}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'crystal',count:1}] },
  bat:     { always: [{type:'coin',count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'gem_green',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  demon:   { always: [{type:'coin',count:5}], common:[{type:'coin',count:3}], uncommon:[{type:'gem_pink',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'energy_orb',count:1}] },
  yeti:    { always: [{type:'coin',count:8}], common:[{type:'gold_bag',count:1}], uncommon:[{type:'crystal',count:1}], rare:[{type:'energy_orb',count:1}], veryRare:[{type:'energy_orb',count:2}] },
  pirate:  { always: [{type:'coin',count:4}], common:[{type:'coin',count:2}], uncommon:[{type:'gold_bag',count:1}], rare:[{type:'gem_pink',count:1}], veryRare:[{type:'key',count:1}] },
  soldier: { always: [{type:'coin',count:4}], common:[{type:'ore_metal',count:1}], uncommon:[{type:'health_scifi',count:1}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'energy_orb',count:1}] },
  zombie:  { always: [{type:'coin',count:3}], common:[{type:'coin',count:2}], uncommon:[{type:'health_meat',count:1}], rare:[{type:'gem_green',count:1}], veryRare:[{type:'crystal',count:1}] },
  space:   { always: [{type:'coin',count:3}], common:[{type:'coin',count:2}], uncommon:[{type:'energy_orb',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'gem_pink',count:2}] },
};

export const PET_LEVELS = [
  { level: 1, capturesRequired: 1,  style: 'typed',   color: 0xffd45a, label: 'Apprentice' },
  { level: 2, capturesRequired: 5,  style: 'correct', color: 0x78f7a5, label: 'Adept' },
  { level: 3, capturesRequired: 12, style: 'combo',   color: 0x7dd3fc, label: 'Skilled' },
  { level: 4, capturesRequired: 25, style: 'level',   color: 0xc084fc, label: 'Expert' },
  { level: 5, capturesRequired: 45, style: 'reward',  color: 0xfacc15, label: 'Master' },
  { level: 6, capturesRequired: 75, style: 'ruby',    color: 0xf87171, label: 'Champion' },
  { level: 7, capturesRequired: 120, style: 'evolved', color: 0xffffff, label: 'Legend' },
];

export const PET_ATTACK_RANGE = 3.5;
export const PET_ATTACK_INTERVAL = 1.2;

export const UPGRADES = {
  pickaxe: [
    { id: 'mine_speed', name: 'Mining Speed', max: 5, cost: (lvl) => 30 * (lvl + 1), desc: '+10% mining speed' },
    { id: 'mine_luck', name: 'Miner\'s Luck', max: 5, cost: (lvl) => 40 * (lvl + 1), desc: '+5% rare drop chance' },
  ],
  combat: [
    { id: 'atk_dmg', name: 'Attack Damage', max: 10, cost: (lvl) => 25 * (lvl + 1), desc: '+2 damage per hit' },
    { id: 'atk_speed', name: 'Attack Speed', max: 5, cost: (lvl) => 35 * (lvl + 1), desc: '+8% attack speed' },
    { id: 'crit_chance', name: 'Critical Chance', max: 5, cost: (lvl) => 50 * (lvl + 1), desc: '+3% crit chance' },
  ],
  spirit: [
    { id: 'max_hp', name: 'Max Health', max: 10, cost: (lvl) => 20 * (lvl + 1), desc: '+10 max HP' },
    { id: 'max_stamina', name: 'Max Stamina', max: 5, cost: (lvl) => 20 * (lvl + 1), desc: '+10 max stamina' },
    { id: 'regen', name: 'Health Regen', max: 5, cost: (lvl) => 40 * (lvl + 1), desc: '+1 HP/sec regen' },
  ],
};

// Zone-specific loot tables
export const ZONE_BLOCK_LOOT_TABLES = {
  forest: {
    grass:  { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'crystal',count:1}] },
    dirt:   { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'gem_pink',count:1}] },
    stone:  { always: [{type:'coin', count:1}], common:[{type:'ore_stone',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'gem_pink',count:1}] },
    wood:   { always: [{type:'coin', count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'key',count:1}] },
  },
  fire: {
    lava:        { always: [{type:'coin', count:2}], common:[{type:'ore_coal',count:1}], uncommon:[{type:'gem_pink',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'energy_orb',count:1}] },
    stone_dark:  { always: [{type:'coin', count:1}], common:[{type:'ore_stone',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'gem_pink',count:1}] },
    coal:        { always: [{type:'coin', count:2}], common:[{type:'ore_coal',count:1}], uncommon:[{type:'ore_coal',count:2}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'crystal',count:1}] },
    brick:       { always: [{type:'coin', count:1}], common:[{type:'ore_stone',count:1}], uncommon:[{type:'gem_green',count:1}], rare:[{type:'gold_bag',count:1}], veryRare:[{type:'key',count:1}] },
  },
};

export const ZONE_ENEMY_LOOT_TABLES = {
  forest: {
    goblin: { always: [{type:'coin',count:3}], common:[{type:'coin',count:2}], uncommon:[{type:'health_meat',count:1}], rare:[{type:'gem_green',count:1}], veryRare:[{type:'gold_bag',count:1}] },
    slime:  { always: [{type:'coin',count:2}], common:[{type:'coin',count:1}], uncommon:[{type:'health_meat',count:1}], rare:[{type:'gem_blue',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  },
  fire: {
    demon: { always: [{type:'coin',count:5}], common:[{type:'coin',count:3}], uncommon:[{type:'gem_pink',count:1}], rare:[{type:'crystal',count:1}], veryRare:[{type:'energy_orb',count:1}] },
    bat:   { always: [{type:'coin',count:1}], common:[{type:'coin',count:1}], uncommon:[{type:'gem_blue',count:1}], rare:[{type:'gem_green',count:1}], veryRare:[{type:'gem_pink',count:1}] },
  },
};
