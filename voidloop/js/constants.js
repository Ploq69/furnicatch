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

  JUMP_FORCE: 7,

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
];

export const BLOCK_TYPES = {
  dirt: { hp: 1, color: 0x8B6914, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt.gltf' },
  grass: { hp: 1, color: 0x4a8f29, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt_with_grass.gltf' },
  stone: { hp: 2, color: 0x777777, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf' },
  brick: { hp: 2, color: 0xa0522d, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_A.gltf' },
  bricks_B: { hp: 2, color: 0x8a4525, drop: 'stone', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/bricks_B.gltf' },
  coal: { hp: 2, color: 0x222222, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf' },
  metal: { hp: 3, color: 0x8899aa, drop: 'metal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf' },
  crystal: { hp: 3, color: 0x22ccff, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  diamond: { hp: 3, color: 0x00ffff, drop: 'diamond', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  ice: { hp: 1, color: 0xaaddff, drop: 'ice', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/glass.gltf' },
  snow: { hp: 1, color: 0xeeeeee, drop: 'snow', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/snow.gltf' },
  lava: { hp: 3, color: 0xff4422, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/lava.gltf' },
  water: { hp: 1, color: 0x4488ff, drop: 'ice', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/water.gltf' },
  wood: { hp: 1, color: 0x8B5a2b, drop: 'dirt', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/wood.gltf' },
  stone_dark: { hp: 2, color: 0x333333, drop: 'coal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf' },
  decorative_block_blue: { hp: 3, color: 0x22ccff, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf' },
  decorative_block_red: { hp: 3, color: 0xff4444, drop: 'crystal', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_red.gltf' },
  stone_with_gold: { hp: 3, color: 0xffd700, drop: 'diamond', model: 'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_with_gold.gltf' },
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
    hp: 30, damage: 5, speed: 2, attackCooldown: 1.5,
    model: 'Ultimate Monsters/Blob/glTF/GreenBlob.gltf',
    scale: 0.6,
    sfx: { hurt: 'DSGNMisc_HIT-Fleeting Hit', death: 'DSGNImpt_EXPLOSION-Flare Extinguish' },
    animMap: ANIM_BLOB,
  },
  goblin: {
    name: 'Goblin Scout',
    hp: 45, damage: 8, speed: 4, attackCooldown: 1.5,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb',
    scale: 0.8,
    sfx: { hurt: 'FGHTImpt_HIT-Smack', death: 'DSGNImpt_EXPLOSION-Forced Interruption' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  skeleton: {
    name: 'Skeleton Warrior',
    hp: 50, damage: 10, speed: 3, attackCooldown: 1.5,
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
    hp: 80, damage: 14, speed: 2.5, attackCooldown: 1.8,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
    scale: 1.0,
    sfx: { hurt: 'FGHTImpt_HIT-Strong Smack', death: 'DSGNImpt_EXPLOSION-Crunchy Burst' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  yeti: {
    name: 'Yeti Guard',
    hp: 100, damage: 18, speed: 2, attackCooldown: 2.0,
    model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
    scale: 1.2,
    sfx: { hurt: 'FGHTImpt_MELEE-Clap Slapper', death: 'DSGNImpt_EXPLOSION-Bass Hit' },
    animMap: ANIM_KAYKIT_ENEMY,
  },
  pirate: {
    name: 'Pirate Raider',
    hp: 55, damage: 9, speed: 3.5, attackCooldown: 1.5,
    model: 'Ultimate Animated Character Pack - Nov 2019/glTF/Pirate_Male.gltf',
    scale: 0.9,
    sfx: { hurt: 'FGHTImpt_HIT-Smack', death: 'DSGNImpt_EXPLOSION-Forced Interruption' },
    animMap: ANIM_ULTIMATE_CHAR,
  },
  soldier: {
    name: 'Hazmat Soldier',
    hp: 60, damage: 11, speed: 3, attackCooldown: 1.5,
    model: 'Toon Shooter Game Kit - Dec 2022/Characters/glTF/Character_Hazmat.gltf',
    scale: 0.9,
    sfx: { hurt: 'DSGNMisc_HIT-Bitcrusher', death: 'DSGNImpt_EXPLOSION-Bit Bomb' },
    animMap: ANIM_HAZMAT,
  },
  zombie: {
    name: 'Zombie Miner',
    hp: 70, damage: 12, speed: 2, attackCooldown: 1.8,
    model: 'Ultimate Animated Character Pack - Nov 2019/glTF/Zombie_Male.gltf',
    scale: 0.9,
    sfx: { hurt: 'DSGNMisc_HIT-Hit Noise', death: 'DSGNImpt_EXPLOSION-Grainy Burst' },
    animMap: ANIM_ULTIMATE_CHAR,
  },
  space: {
    name: 'Void Drone',
    hp: 50, damage: 10, speed: 4, attackCooldown: 1.3,
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
    { id: 'pick_tier', name: 'Upgrade Pickaxe', max: 4, cost: (lvl) => 50 * Math.pow(2, lvl), desc: 'Mine faster and harder blocks' },
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
