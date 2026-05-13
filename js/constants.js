// ==========================================
// FurniCatch — Game Constants & Vocabulary
// ==========================================

export const GAME = {
  // Physics
  GRAVITY: -18,
  PLAYER_SPEED: 5,
  PLAYER_SPRINT_SPEED: 9,
  PLAYER_ROTATION_SPEED: 8,
  DODGE_FORCE: 10,
  DODGE_DURATION: 0.4,
  ORB_SPEED: 14,
  ORB_LIFETIME: 3,
  ORB_RADIUS: 0.15,
  ORB_GRAVITY_SCALE: 0.65,
  THROW_POWER_MIN: 4,
  THROW_POWER_MAX: 20,
  THROW_POWER_DEFAULT: 8,
  TRAJECTORY_DOTS: 18,
  AIM_ASSIST_RADIUS: 0.35,
  AIM_MOVE_MULTIPLIER: 0.55,
  
  // Stamina
  MAX_STAMINA: 100,
  SPRINT_DRAIN: 25,
  STAMINA_REGEN: 15,
  DODGE_COST: 20,
  
  // Orbs
  MAX_ORBS: 10,
  ORB_TIERS: ['wood', 'iron', 'gold', 'diamond'],
  
  // Capture
  CAPTURE_TIMER: 10,
  CAPTURE_RADIUS: 0.8,
  
  // Camera
  CAM_DISTANCE: 10,
  CAM_HEIGHT: 3.5,
  CAM_LOOK_AT_HEIGHT: 0.8,
  AIM_EYE_HEIGHT: 1.25,

  // World streaming
  CHUNK_SIZE: 16,
  ACTIVE_CHUNK_RADIUS: 4,
  SIMULATION_CHUNK_RADIUS: 2,
  WORLD_CHUNK_RADIUS: 10,
  DECORATIONS_PER_CHUNK: 2,
  STATIC_PROPS_PER_CHUNK: 6,
  CATCHABLE_PROPS_PER_CHUNK: 4,
  FURNITURE_CLUSTERS_PER_CHUNK: 1,
  LETTER_CLUSTERS_PER_CHUNK: 1,
  NPCS_PER_CHUNK: 0,
  MAX_NPCS: 4,
  // Visibility culling distances (world units)
  ENTITY_CULL_DISTANCE: 22,
  ENTITY_UPDATE_DISTANCE: 18,
  // Jump physics
  JUMP_FORCE: 7,
  GRAVITY: -25,
};

export const FURNITURE_TIERS = {
  common: { catchRate: 0.45, reward: 10, color: '#9ca3af' },
  uncommon: { catchRate: 0.30, reward: 25, color: '#4ade80' },
  rare: { catchRate: 0.15, reward: 60, color: '#38bdf8' },
  epic: { catchRate: 0.08, reward: 150, color: '#a855f7' },
  legendary: { catchRate: 0.03, reward: 500, color: '#fbbf24' },
};

// Prop vocabulary with visual variants (asset array or single asset)
// Multiple entries can share the same word for visual variety while keeping one spelling word.
export const PROP_VOCABULARY = [
  { key: 'tree', word: 'tree', asset: 'tree1', tier: 'common' },
  { key: 'tree_big', word: 'tree', asset: 'tree2', tier: 'common' },
  { key: 'tree_pine', word: 'tree', asset: 'tree3', tier: 'common' },
  { key: 'rock', word: 'rock', asset: 'rock1', tier: 'common' },
  { key: 'rock_big', word: 'rock', asset: 'rock2', tier: 'common' },
  { key: 'bush', word: 'bush', asset: 'bush', tier: 'common' },
  { key: 'flower', word: 'flower', asset: 'flowers1', tier: 'common' },
  { key: 'flower2', word: 'flower', asset: 'flowers2', tier: 'common' },
  { key: 'grass', word: 'grass', asset: 'grassSmall', tier: 'common' },
  { key: 'grass_big', word: 'grass', asset: 'grassBig', tier: 'common' },
  { key: 'mushroom', word: 'mushroom', asset: 'mushroom', tier: 'common' },
  { key: 'bamboo', word: 'bamboo', asset: 'bamboo', tier: 'uncommon' },
  { key: 'bamboo_small', word: 'bamboo', asset: 'bambooSmall', tier: 'uncommon' },
  { key: 'fence', word: 'fence', asset: 'fenceCenter', tier: 'common' },
  { key: 'fence_corner', word: 'fence', asset: 'fenceCorner', tier: 'common' },
  { key: 'chest', word: 'chest', asset: 'chest', tier: 'uncommon' },
  { key: 'cart', word: 'cart', asset: 'cart', tier: 'uncommon' },
  { key: 'crystal', word: 'crystal', asset: 'crystalSmall', tier: 'rare' },
  { key: 'crystal_big', word: 'crystal', asset: 'crystalBig', tier: 'rare' },
  { key: 'plant', word: 'plant', asset: 'plant2', tier: 'common' },
  { key: 'plant3', word: 'plant', asset: 'plant3', tier: 'common' },
  { key: 'door', word: 'door', asset: 'doorClosed', tier: 'common' },
  { key: 'dead_tree', word: 'tree', asset: 'deadTree1', tier: 'common' },
];

export const FURNITURE_LEVELS = [
  { level: 1, capturesRequired: 1, color: '#d1d5db', rewardMultiplier: 1.0, catchPenalty: 0.00 },
  { level: 2, capturesRequired: 3, color: '#4ade80', rewardMultiplier: 1.25, catchPenalty: 0.04 },
  { level: 3, capturesRequired: 7, color: '#38bdf8', rewardMultiplier: 1.55, catchPenalty: 0.08 },
  { level: 4, capturesRequired: 15, color: '#a855f7', rewardMultiplier: 2.0, catchPenalty: 0.12 },
  { level: 5, capturesRequired: 30, color: '#fbbf24', rewardMultiplier: 3.0, catchPenalty: 0.16 },
];

export const QUIZ_MODES = {
  spell: { type: 'spell', showWord: false, revealPending: false, playAudio: true, label: 'Listen, then spell the word' },
  choice: { type: 'choice', showWord: false, revealPending: false, playAudio: false, label: 'Listen to the words, then choose the match' },
};

// Vocabulary mapped to asset filenames
// Using Ultimate House Interior Pack - June 2020 OBJ models
export const VOCABULARY = [
  { word: 'chair', model: 'Chair_1', tier: 'common', category: 'living' },
  { word: 'table', model: 'Table_RoundSmall', tier: 'common', category: 'living' },
  { word: 'bed', model: 'Bed_Single', tier: 'common', category: 'bedroom' },
  { word: 'lamp', model: 'Light_Desk', tier: 'common', category: 'living' },
  { word: 'rug', model: 'Carpet_1', tier: 'common', category: 'living' },
  { word: 'stool', model: 'Stool', tier: 'common', category: 'kitchen' },
  { word: 'shelf', model: 'Shelf_1', tier: 'common', category: 'living' },
  { word: 'plant', model: 'Houseplant_1', tier: 'common', category: 'garden' },
  { word: 'couch', model: 'Couch_Small1', tier: 'uncommon', category: 'living' },
  { word: 'closet', model: 'Kitchen_Cabinet1', tier: 'uncommon', category: 'kitchen' },
  { word: 'mirror', model: 'Bathroom_Mirror1', tier: 'uncommon', category: 'bathroom' },
  { word: 'drawer', model: 'Drawer_2', tier: 'uncommon', category: 'bedroom' },
  { word: 'bookshelf', model: 'Bookshelf', tier: 'uncommon', category: 'office' },
  { word: 'bathtub', model: 'Bathroom_Bathtub', tier: 'rare', category: 'bathroom' },
  { word: 'fridge', model: 'Kitchen_Fridge', tier: 'rare', category: 'kitchen' },
  { word: 'oven', model: 'Kitchen_Oven', tier: 'rare', category: 'kitchen' },
  { word: 'sofa', model: 'Couch_Large1', tier: 'rare', category: 'living' },
  { word: 'chandelier', model: 'Light_Chandelier', tier: 'epic', category: 'dining' },
  { word: 'fireplace', model: 'Fireplace', tier: 'epic', category: 'living' },
  { word: 'bunkbed', model: 'Bed_Bunk', tier: 'legendary', category: 'bedroom' },
];

export const LETTER_WORDS = {
  A: ['apple', 'ant', 'arrow', 'airplane', 'anchor', 'artist', 'animal', 'apron', 'acorn', 'alligator'],
  B: ['ball', 'banana', 'bird', 'boat', 'book', 'baby', 'bell', 'bread', 'button', 'basket'],
  C: ['cat', 'cake', 'car', 'cloud', 'clock', 'cup', 'candle', 'castle', 'carrot', 'camera'],
  D: ['dog', 'door', 'duck', 'drum', 'desk', 'doll', 'diamond', 'dragon', 'donut', 'doctor'],
  E: ['egg', 'elephant', 'ear', 'earth', 'eagle', 'engine', 'envelope', 'elbow', 'eraser', 'elf'],
  F: ['fish', 'fan', 'fire', 'frog', 'fork', 'flower', 'farm', 'feather', 'family', 'forest'],
  G: ['goat', 'grape', 'gift', 'garden', 'guitar', 'glove', 'gold', 'gate', 'ghost', 'glass'],
  H: ['hat', 'house', 'horse', 'hand', 'heart', 'hammer', 'honey', 'helicopter', 'hill', 'helmet'],
  I: ['ice', 'igloo', 'insect', 'island', 'ink', 'iron', 'iguana', 'idea', 'image', 'inside'],
  J: ['jam', 'jar', 'jacket', 'jelly', 'jet', 'jewel', 'juice', 'jungle', 'jump', 'jigsaw'],
  K: ['kite', 'key', 'king', 'kangaroo', 'kettle', 'kitten', 'kitchen', 'kiwi', 'knee', 'koala'],
  L: ['lamp', 'leaf', 'lion', 'lemon', 'ladder', 'lake', 'letter', 'lizard', 'lock', 'lunch'],
  M: ['moon', 'mouse', 'milk', 'map', 'monkey', 'mirror', 'music', 'mountain', 'muffin', 'magnet'],
  N: ['nest', 'nose', 'net', 'nurse', 'night', 'needle', 'number', 'napkin', 'necklace', 'notebook'],
  O: ['orange', 'octopus', 'oven', 'owl', 'ocean', 'onion', 'office', 'olive', 'orbit', 'otter'],
  P: ['pen', 'pig', 'pizza', 'pencil', 'panda', 'plant', 'piano', 'pillow', 'pumpkin', 'pocket'],
  Q: ['queen', 'quilt', 'quiz', 'quiet', 'quick', 'quarter', 'question', 'quail'],
  R: ['rain', 'rabbit', 'robot', 'ring', 'rocket', 'river', 'rug', 'radio', 'rainbow', 'ruler'],
  S: ['sun', 'sock', 'star', 'snake', 'shoe', 'sheep', 'shelf', 'sandwich', 'school', 'spoon'],
  T: ['tree', 'table', 'tiger', 'train', 'turtle', 'tomato', 'tower', 'teacher', 'tooth', 'truck'],
  U: ['umbrella', 'unicorn', 'uniform', 'uncle', 'under', 'upstairs', 'utensil', 'ukulele', 'urchin', 'useful'],
  V: ['van', 'vase', 'violin', 'vegetable', 'volcano', 'vest', 'village', 'visitor', 'vacuum', 'valley'],
  W: ['water', 'window', 'watch', 'wolf', 'wagon', 'whale', 'wheel', 'winter', 'woman', 'wood'],
  X: ['xylophone', 'xray', 'xenops', 'xerus', 'xenon', 'xerox'],
  Y: ['yarn', 'yak', 'yellow', 'yoyo', 'yogurt', 'yard', 'yacht', 'year', 'yawn', 'yolk'],
  Z: ['zebra', 'zipper', 'zoo', 'zero', 'zigzag', 'zucchini', 'zone', 'zinnia'],
};

// ==========================================
// Ultimate Animated Character Pack
// 51 total, 44 usable (excluded: BaseCharacter, *_Hair, *Helmet, *Hat)
// All share ~16-17 animations on the same base skeleton
// ==========================================

export const ULTIMATE_CHARACTERS = [
  { key: 'Casual_Male', name: 'Casual Guy', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual_Male.gltf', tags: ['human', 'modern'] },
  { key: 'Casual_Female', name: 'Casual Girl', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual_Female.gltf', tags: ['human', 'modern'] },
  { key: 'Casual2_Male', name: 'Casual Guy 2', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual2_Male.gltf', tags: ['human', 'modern'] },
  { key: 'Casual2_Female', name: 'Casual Girl 2', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual2_Female.gltf', tags: ['human', 'modern'] },
  { key: 'Casual3_Male', name: 'Casual Guy 3', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual3_Male.gltf', tags: ['human', 'modern'] },
  { key: 'Casual3_Female', name: 'Casual Girl 3', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual3_Female.gltf', tags: ['human', 'modern'] },
  { key: 'Casual_Bald', name: 'Bald Guy', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Casual_Bald.gltf', tags: ['human', 'modern'], note: 'No Run anim' },
  { key: 'Suit_Male', name: 'Business Man', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Suit_Male.gltf', tags: ['human', 'modern'], note: 'No Punch anim' },
  { key: 'Suit_Female', name: 'Business Woman', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Suit_Female.gltf', tags: ['human', 'modern'] },
  { key: 'OldClassy_Male', name: 'Gentleman', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/OldClassy_Male.gltf', tags: ['human', 'classic'] },
  { key: 'OldClassy_Female', name: 'Lady', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/OldClassy_Female.gltf', tags: ['human', 'classic'] },
  { key: 'Doctor_Male_Young', name: 'Young Doctor', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Doctor_Male_Young.gltf', tags: ['human', 'professional'] },
  { key: 'Doctor_Male_Old', name: 'Old Doctor', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Doctor_Male_Old.gltf', tags: ['human', 'professional'] },
  { key: 'Doctor_Female_Young', name: 'Young Doctor (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Doctor_Female_Young.gltf', tags: ['human', 'professional'] },
  { key: 'Doctor_Female_Old', name: 'Old Doctor (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Doctor_Female_Old.gltf', tags: ['human', 'professional'] },
  { key: 'Worker_Male', name: 'Worker', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Worker_Male.gltf', tags: ['human', 'professional'] },
  { key: 'Worker_Female', name: 'Worker (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Worker_Female.gltf', tags: ['human', 'professional'] },
  { key: 'Chef_Male', name: 'Chef', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Chef_Male.gltf', tags: ['human', 'professional'] },
  { key: 'Chef_Female', name: 'Chef (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Chef_Female.gltf', tags: ['human', 'professional'] },
  { key: 'Soldier_Male', name: 'Soldier', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Soldier_Male.gltf', tags: ['human', 'military'] },
  { key: 'Soldier_Female', name: 'Soldier (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Soldier_Female.gltf', tags: ['human', 'military'] },
  { key: 'BlueSoldier_Male', name: 'Blue Soldier', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/BlueSoldier_Male.gltf', tags: ['human', 'military'] },
  { key: 'BlueSoldier_Female', name: 'Blue Soldier (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/BlueSoldier_Female.gltf', tags: ['human', 'military'] },
  { key: 'Knight_Male', name: 'Knight', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Knight_Male.gltf', tags: ['human', 'fantasy'] },
  { key: 'Knight_Golden_Male', name: 'Golden Knight', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Knight_Golden_Male.gltf', tags: ['human', 'fantasy'] },
  { key: 'Knight_Golden_Female', name: 'Golden Knight (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Knight_Golden_Female.gltf', tags: ['human', 'fantasy'] },
  { key: 'Ninja_Male', name: 'Ninja', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Male.gltf', tags: ['human', 'fantasy'] },
  { key: 'Ninja_Female', name: 'Ninja (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Female.gltf', tags: ['human', 'fantasy'] },
  { key: 'Ninja_Sand', name: 'Sand Ninja', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Sand.gltf', tags: ['human', 'fantasy'] },
  { key: 'Ninja_Sand_Female', name: 'Sand Ninja (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Sand_Female.gltf', tags: ['human', 'fantasy'] },
  { key: 'Elf', name: 'Elf', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Elf.gltf', tags: ['human', 'fantasy'] },
  { key: 'Witch', name: 'Witch', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Witch.gltf', tags: ['human', 'fantasy'] },
  { key: 'Wizard', name: 'Wizard', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Wizard.gltf', tags: ['human', 'fantasy'] },
  { key: 'Viking_Male', name: 'Viking', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Viking_Male.gltf', tags: ['human', 'fantasy'] },
  { key: 'Viking_Female', name: 'Viking (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Viking_Female.gltf', tags: ['human', 'fantasy'] },
  { key: 'Pirate_Male', name: 'Pirate', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Pirate_Male.gltf', tags: ['human', 'fantasy'] },
  { key: 'Pirate_Female', name: 'Pirate (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Pirate_Female.gltf', tags: ['human', 'fantasy'] },
  { key: 'Cowboy_Male', name: 'Cowboy', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Cowboy_Male.gltf', tags: ['human', 'western'] },
  { key: 'Cowboy_Female', name: 'Cowboy (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Cowboy_Female.gltf', tags: ['human', 'western'] },
  { key: 'Zombie_Male', name: 'Zombie', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Zombie_Male.gltf', tags: ['human', 'monster'] },
  { key: 'Zombie_Female', name: 'Zombie (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Zombie_Female.gltf', tags: ['human', 'monster'] },
  { key: 'Goblin_Male', name: 'Goblin', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Goblin_Male.gltf', tags: ['human', 'monster'] },
  { key: 'Goblin_Female', name: 'Goblin (F)', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Goblin_Female.gltf', tags: ['human', 'monster'] },
  { key: 'Kimono_Male', name: 'Kimono Guy', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Kimono_Male.gltf', tags: ['human', 'cultural'] },
  { key: 'Kimono_Female', name: 'Kimono Girl', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Kimono_Female.gltf', tags: ['human', 'cultural'] },
  { key: 'Pug', name: 'Pug', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Pug.gltf', tags: ['animal'], note: 'Dog!' },
  { key: 'Cow', name: 'Cow', path: 'Ultimate Animated Character Pack - Nov 2019/glTF/Cow.gltf', tags: ['animal'], note: 'Moo!' },
];

export const ANIMATION_ACTIONS = {
  idle: { primary: 'Idle', fallbacks: [] },
  walk: { primary: 'Walk', fallbacks: [] },
  sprint: { primary: 'Run', fallbacks: ['Walk'] },
  dodge: { primary: 'Roll', fallbacks: ['Jump', 'Duck'] },
  toss: { primary: 'Shoot_OneHanded', fallbacks: ['Punch', 'PickUp'] },
  victory: { primary: 'Victory', fallbacks: ['Jump', 'Idle'] },
  hurt: { primary: 'RecieveHit', fallbacks: ['Defeat', 'HitReact'] },
  death: { primary: 'Death', fallbacks: ['Defeat'] },
  pickup: { primary: 'PickUp', fallbacks: ['Idle'] },
  sit: { primary: 'SitDown', fallbacks: ['Idle'] },
};

// Asset paths
export const ASSETS = {
  characters: {
    male1: 'Cube World - Aug 2023/Characters/glTF/Character_Male_1.gltf',
    female1: 'Cube World - Aug 2023/Characters/glTF/Character_Female_1.gltf',
  },
  furniturePrefix: 'Ultimate House Interior Pack - June 2020/OBJ/',
  blocks: {
    grass: 'Cube World - Aug 2023/Blocks/glTF/Block_Grass.gltf',
    dirt: 'Cube World - Aug 2023/Blocks/glTF/Block_Dirt.gltf',
    stone: 'Cube World - Aug 2023/Blocks/glTF/Block_Stone.gltf',
    wood: 'Cube World - Aug 2023/Blocks/glTF/Block_WoodPlanks.gltf',
    brick: 'Cube World - Aug 2023/Blocks/glTF/Block_Brick.gltf',
  },
  environment: {
    tree1: 'Cube World - Aug 2023/Environment/glTF/Tree_1.gltf',
    tree2: 'Cube World - Aug 2023/Environment/glTF/Tree_2.gltf',
    tree3: 'Cube World - Aug 2023/Environment/glTF/Tree_3.gltf',
    bush: 'Cube World - Aug 2023/Environment/glTF/Bush.gltf',
    rock1: 'Cube World - Aug 2023/Environment/glTF/Rock1.gltf',
    rock2: 'Cube World - Aug 2023/Environment/glTF/Rock2.gltf',
    chest: 'Cube World - Aug 2023/Environment/glTF/Chest_Closed.gltf',
    flowers1: 'Cube World - Aug 2023/Environment/glTF/Flowers_1.gltf',
    flowers2: 'Cube World - Aug 2023/Environment/glTF/Flowers_2.gltf',
    grassSmall: 'Cube World - Aug 2023/Environment/glTF/Grass_Small.gltf',
    grassBig: 'Cube World - Aug 2023/Environment/glTF/Grass_Big.gltf',
    mushroom: 'Cube World - Aug 2023/Environment/glTF/Mushroom.gltf',
    bamboo: 'Cube World - Aug 2023/Environment/glTF/Bamboo.gltf',
    bambooSmall: 'Cube World - Aug 2023/Environment/glTF/Bamboo_Small.gltf',
    bambooMid: 'Cube World - Aug 2023/Environment/glTF/Bamboo_Mid.gltf',
    fenceCenter: 'Cube World - Aug 2023/Environment/glTF/Fence_Center.gltf',
    fenceCorner: 'Cube World - Aug 2023/Environment/glTF/Fence_Corner.gltf',
    fenceT: 'Cube World - Aug 2023/Environment/glTF/Fence_T.gltf',
    fenceEnd: 'Cube World - Aug 2023/Environment/glTF/Fence_End.gltf',
    cart: 'Cube World - Aug 2023/Environment/glTF/Cart.gltf',
    crystalSmall: 'Cube World - Aug 2023/Environment/glTF/Crystal_Small.gltf',
    crystalBig: 'Cube World - Aug 2023/Environment/glTF/Crystal_Big.gltf',
    plant2: 'Cube World - Aug 2023/Environment/glTF/Plant_2.gltf',
    plant3: 'Cube World - Aug 2023/Environment/glTF/Plant_3.gltf',
    doorClosed: 'Cube World - Aug 2023/Environment/glTF/Door_Closed.gltf',
    railStraight: 'Cube World - Aug 2023/Environment/glTF/Rail_Straight.gltf',
    deadTree1: 'Cube World - Aug 2023/Environment/glTF/DeadTree_1.gltf',
  },
};

const CUBE = 'Cube World - Aug 2023';
const SUSHI = 'Sushi Restaurant Kit - May 2023';
const SPACE = 'Ultimate Space Kit - March 2023';
const TOON = 'Toon Shooter Game Kit - Dec 2022';
const FOOD = 'Ultimate Food Pack - Oct 2019';

const tierForIndex = (index) => {
  if (index >= 46) return 'epic';
  if (index >= 38) return 'rare';
  if (index >= 24) return 'uncommon';
  return 'common';
};

const dropsFor = (resources, index) => {
  const primary = resources[index % resources.length];
  const secondary = resources[(index + 2) % resources.length];
  return [
    { resource: primary, min: 1, max: tierForIndex(index) === 'common' ? 2 : 3 },
    { resource: secondary, min: 0, max: index >= 24 ? 1 : 0 },
  ];
};

const makeCatchables = (biome, words, assetMap, resources) => words.map((word, index) => ({
  key: `${biome}_${word}`,
  word,
  ttsWord: word,
  biome,
  assetPath: assetMap[word] || assetMap.default,
  tier: tierForIndex(index),
  resourceDrops: dropsFor(resources, index),
}));

const FARM_WORDS = [
  'tree', 'flower', 'grass', 'bush', 'mushroom', 'bamboo', 'rock', 'crystal', 'fence', 'gate',
  'chest', 'cart', 'key', 'door', 'plant', 'leaf', 'seed', 'wood', 'soil', 'water',
  'fire', 'apple', 'pumpkin', 'potato', 'radish', 'carrot', 'tomato', 'wheat', 'cabbage', 'beet',
  'corn', 'milk', 'egg', 'fish', 'bird', 'cow', 'sheep', 'chick', 'chicken', 'duck',
  'pig', 'horse', 'cat', 'dog', 'wolf', 'frog', 'rabbit', 'bee', 'butterfly', 'basket',
];

const FOOD_WORDS = [
  'rice', 'fish', 'tuna', 'salmon', 'shrimp', 'squid', 'octopus', 'cucumber', 'avocado', 'egg',
  'milk', 'bread', 'cake', 'pizza', 'sandwich', 'carrot', 'tomato', 'potato', 'pumpkin', 'cabbage',
  'corn', 'wheat', 'berry', 'apple', 'banana', 'orange', 'lemon', 'yogurt', 'water', 'bowl',
  'plate', 'cup', 'bottle', 'pan', 'pot', 'oven', 'fridge', 'sink', 'knife', 'spoon',
  'fork', 'table', 'chair', 'stool', 'bench', 'counter', 'cabinet', 'basket', 'sign', 'truck',
];

const SPACE_WORDS = [
  'moon', 'star', 'planet', 'sun', 'rocket', 'spaceship', 'rover', 'robot', 'astronaut', 'helmet',
  'suit', 'boot', 'glove', 'backpack', 'keycard', 'battery', 'button', 'lever', 'panel', 'solar',
  'antenna', 'radar', 'dome', 'base', 'tower', 'bridge', 'ramp', 'stairs', 'door', 'window',
  'light', 'crate', 'box', 'jar', 'sphere', 'rock', 'crystal', 'metal', 'wire', 'pipe',
  'wheel', 'engine', 'fire', 'smoke', 'cloud', 'map', 'flag', 'tent', 'camera', 'radio',
];

const FARM_ASSETS = {
  default: `${CUBE}/Environment/glTF/Plant_2.gltf`,
  tree: `${CUBE}/Environment/glTF/Tree_1.gltf`,
  flower: `${CUBE}/Environment/glTF/Flowers_1.gltf`,
  grass: `${CUBE}/Environment/glTF/Grass_Small.gltf`,
  bush: `${CUBE}/Environment/glTF/Bush.gltf`,
  mushroom: `${CUBE}/Environment/glTF/Mushroom.gltf`,
  bamboo: `${CUBE}/Environment/glTF/Bamboo.gltf`,
  rock: `${CUBE}/Environment/glTF/Rock1.gltf`,
  crystal: `${CUBE}/Environment/glTF/Crystal_Small.gltf`,
  fence: `${CUBE}/Environment/glTF/Fence_Center.gltf`,
  gate: `${CUBE}/Environment/glTF/Fence_T.gltf`,
  chest: `${CUBE}/Environment/glTF/Chest_Closed.gltf`,
  cart: `${CUBE}/Environment/glTF/Cart.gltf`,
  key: `${CUBE}/Environment/glTF/Key.gltf`,
  door: `${CUBE}/Environment/glTF/Door_Closed.gltf`,
  plant: `${CUBE}/Environment/glTF/Plant_2.gltf`,
  leaf: `${CUBE}/Pixel Blocks/glTF/Leaves.gltf`,
  seed: `${CUBE}/Environment/glTF/Flowers_2.gltf`,
  wood: `${CUBE}/Blocks/glTF/Block_WoodPlanks.gltf`,
  soil: `${CUBE}/Blocks/glTF/Block_Dirt.gltf`,
  water: `${SPACE}/Items/GLTF/Pickup_Sphere.gltf`,
  fire: `${TOON}/Guns/glTF/FireGrenade.gltf`,
  apple: `${FOOD}/OBJ/Apple.obj`,
  pumpkin: `${FOOD}/OBJ/Pumpkin.obj`,
  potato: `${FOOD}/OBJ/Turnip.obj`,
  radish: `${FOOD}/OBJ/Turnip.obj`,
  carrot: `${FOOD}/OBJ/Carrot.obj`,
  tomato: `${FOOD}/OBJ/Tomato.obj`,
  wheat: `${CUBE}/Environment/glTF/Grass_Big.gltf`,
  cabbage: `${FOOD}/OBJ/Lettuce_Whole.obj`,
  beet: `${FOOD}/OBJ/Turnip.obj`,
  corn: `${FOOD}/OBJ/Corndog.obj`,
  milk: `${FOOD}/OBJ/Bottle1.obj`,
  egg: `${FOOD}/OBJ/Egg_Whole.obj`,
  fish: `${FOOD}/OBJ/Fish.obj`,
  bird: 'Ultimate Monsters/Big/glTF/Birb.gltf',
  cow: 'Ultimate Animated Character Pack - Nov 2019/glTF/Cow.gltf',
  sheep: `${CUBE}/Animals/glTF/Sheep.gltf`,
  chick: `${CUBE}/Animals/glTF/Chick.gltf`,
  chicken: `${CUBE}/Animals/glTF/Chicken.gltf`,
  duck: `${CUBE}/Animals/glTF/Chicken.gltf`,
  pig: `${CUBE}/Animals/glTF/Pig.gltf`,
  horse: `${CUBE}/Animals/glTF/Horse.gltf`,
  cat: `${CUBE}/Animals/glTF/Cat.gltf`,
  dog: `${CUBE}/Animals/glTF/Dog.gltf`,
  wolf: `${CUBE}/Animals/glTF/Wolf.gltf`,
  frog: 'Ultimate Monsters/Big/glTF/Frog.gltf',
  rabbit: `${SUSHI}/Characters/Normal/glTF/Rabbit_Grey.gltf`,
  bee: 'Ultimate Monsters/Flying/glTF/Armabee.gltf',
  butterfly: 'Ultimate Monsters/Flying/glTF/Armabee.gltf',
  basket: `${CUBE}/Environment/glTF/Cart.gltf`,
};

const FOOD_ASSETS = {
  default: `${SUSHI}/Food/glTF/Food_Roll.gltf`,
  rice: `${SUSHI}/Food/glTF/FoodIngredient_Rice.gltf`,
  fish: `${FOOD}/OBJ/Fish.obj`,
  tuna: `${SUSHI}/Food/glTF/FoodIngredient_Tuna.gltf`,
  salmon: `${SUSHI}/Food/glTF/FoodIngredient_Salmon.gltf`,
  shrimp: `${SUSHI}/Food/glTF/FoodIngredient_Ebi.gltf`,
  squid: `${SUSHI}/Food/glTF/FoodIngredient_Squid.gltf`,
  octopus: `${SUSHI}/Food/glTF/FoodIngredient_Octopus.gltf`,
  cucumber: `${SUSHI}/Food/glTF/FoodIngredient_Cucumber.gltf`,
  avocado: `${SUSHI}/Food/glTF/FoodIngredient_Avocado.gltf`,
  egg: `${FOOD}/OBJ/Egg_Whole.obj`,
  milk: `${FOOD}/OBJ/Bottle1.obj`,
  bread: `${FOOD}/OBJ/Bread.obj`,
  cake: `${FOOD}/OBJ/Cupcake.obj`,
  pizza: `${FOOD}/OBJ/Pizza.obj`,
  sandwich: `${SUSHI}/Food/glTF/Food_Onigiri.gltf`,
  carrot: `${FOOD}/OBJ/Carrot.obj`,
  tomato: `${FOOD}/OBJ/Tomato.obj`,
  potato: `${FOOD}/OBJ/Turnip.obj`,
  pumpkin: `${FOOD}/OBJ/Pumpkin.obj`,
  cabbage: `${FOOD}/OBJ/Lettuce_Whole.obj`,
  corn: `${FOOD}/OBJ/Corndog.obj`,
  wheat: `${CUBE}/Environment/glTF/Grass_Big.gltf`,
  berry: `${FOOD}/OBJ/Apple_Green.obj`,
  apple: `${FOOD}/OBJ/Apple.obj`,
  banana: `${FOOD}/OBJ/Banana.obj`,
  orange: `${FOOD}/OBJ/Orange.obj`,
  lemon: `${FOOD}/OBJ/Orange.obj`,
  yogurt: `${SUSHI}/Environment/glTF/Environment_Bowl.gltf`,
  water: `${SPACE}/Items/GLTF/Pickup_Sphere.gltf`,
  bowl: `${SUSHI}/Environment/glTF/Environment_Bowl.gltf`,
  plate: `${SUSHI}/Environment/glTF/Environment_Plate.gltf`,
  cup: `${SUSHI}/Environment/glTF/Environment_Bottle.gltf`,
  bottle: `${SUSHI}/Environment/glTF/Environment_Bottle.gltf`,
  pan: `${FOOD}/OBJ/FryingPan.obj`,
  pot: `${FOOD}/OBJ/CookingPot.obj`,
  oven: `${SUSHI}/Environment/glTF/Environment_Oven.gltf`,
  fridge: `${SUSHI}/Environment/glTF/Environment_Fridge.gltf`,
  sink: `${SUSHI}/Environment/glTF/Environment_Counter_Sink.gltf`,
  knife: `${FOOD}/OBJ/Knife.obj`,
  spoon: `${FOOD}/OBJ/Spoon.obj`,
  fork: `${FOOD}/OBJ/Fork.obj`,
  table: `${SUSHI}/Environment/glTF/Environment_Table.gltf`,
  chair: `${SUSHI}/Environment/glTF/Environment_Chair1.gltf`,
  stool: `${SUSHI}/Environment/glTF/Environment_Stool.gltf`,
  bench: `${SUSHI}/Environment/glTF/Environment_Bench.gltf`,
  counter: `${SUSHI}/Environment/glTF/Environment_Counter_Straight.gltf`,
  cabinet: `${SUSHI}/Environment/glTF/Environment_Cabinet_Doors.gltf`,
  basket: `${CUBE}/Environment/glTF/Cart.gltf`,
  sign: `${SUSHI}/Decoration/glTF/Decoration_Sign.gltf`,
  truck: `${SUSHI}/Environment/glTF/Truck.gltf`,
};

const SPACE_ASSETS = {
  default: `${SPACE}/Environment/GLTF/Planet_1.gltf`,
  moon: `${SPACE}/Environment/GLTF/Planet_2.gltf`,
  star: `${SPACE}/Items/GLTF/Pickup_Thunder.gltf`,
  planet: `${SPACE}/Environment/GLTF/Planet_1.gltf`,
  sun: `${SPACE}/Environment/GLTF/Planet_7.gltf`,
  rocket: `${TOON}/Guns/glTF/RocketLauncher.gltf`,
  spaceship: `${SPACE}/Vehicles/GLTF/Spaceship_FinnTheFrog.gltf`,
  rover: `${SPACE}/Vehicles/GLTF/Rover_1.gltf`,
  robot: `${SPACE}/Characters/GLTF/Mech_FinnTheFrog.gltf`,
  astronaut: `${SPACE}/Characters/GLTF/Astronaut_FinnTheFrog.gltf`,
  helmet: 'Ultimate Animated Character Pack - Nov 2019/glTF/VikingHelmet.gltf',
  suit: 'Ultimate Animated Character Pack - Nov 2019/glTF/Suit_Male.gltf',
  boot: `${CUBE}/Characters/glTF/Character_Male_1.gltf`,
  glove: `${CUBE}/Characters/glTF/Character_Male_1.gltf`,
  backpack: `${SPACE}/Items/GLTF/Pickup_Crate.gltf`,
  keycard: `${SPACE}/Items/GLTF/Pickup_KeyCard.gltf`,
  battery: `${SPACE}/Items/GLTF/Pickup_Health.gltf`,
  button: `${CUBE}/Environment/glTF/Button.gltf`,
  lever: `${CUBE}/Environment/glTF/Lever_Left.gltf`,
  panel: `${SPACE}/Environment/GLTF/SolarPanel_Ground.gltf`,
  solar: `${SPACE}/Environment/GLTF/SolarPanel_Structure.gltf`,
  antenna: `${SPACE}/Environment/GLTF/Roof_Antenna.gltf`,
  radar: `${SPACE}/Environment/GLTF/Roof_Radar.gltf`,
  dome: `${SPACE}/Environment/GLTF/GeodesicDome.gltf`,
  base: `${SPACE}/Environment/GLTF/Base_Large.gltf`,
  tower: `${TOON}/Environment/glTF/WaterTank_Platform.gltf`,
  bridge: `${SPACE}/Environment/GLTF/Connector.gltf`,
  ramp: `${SPACE}/Environment/GLTF/Ramp.gltf`,
  stairs: `${SPACE}/Environment/GLTF/Stairs.gltf`,
  door: `${CUBE}/Environment/glTF/Door_Closed.gltf`,
  window: `${SPACE}/Environment/GLTF/House_Open.gltf`,
  light: `${SPACE}/Environment/GLTF/Tree_Light_1.gltf`,
  crate: `${SPACE}/Items/GLTF/Pickup_Crate.gltf`,
  box: `${TOON}/Environment/glTF/CardboardBoxes_1.gltf`,
  jar: `${SPACE}/Items/GLTF/Pickup_Jar.gltf`,
  sphere: `${SPACE}/Items/GLTF/Pickup_Sphere.gltf`,
  rock: `${SPACE}/Environment/GLTF/Rock_1.gltf`,
  crystal: `${CUBE}/Environment/glTF/Crystal_Big.gltf`,
  metal: `${CUBE}/Blocks/glTF/Block_Metal.gltf`,
  wire: `${TOON}/Environment/glTF/Pipes.gltf`,
  pipe: `${TOON}/Environment/glTF/Pipes.gltf`,
  wheel: `${TOON}/Environment/glTF/Debris_Tires.gltf`,
  engine: `${SPACE}/Vehicles/GLTF/Rover_2.gltf`,
  fire: `${TOON}/Guns/glTF/FireGrenade.gltf`,
  smoke: `${TOON}/Environment/glTF/GasTank.gltf`,
  cloud: `${SPACE}/Environment/GLTF/Planet_6.gltf`,
  map: 'Pirate Kit - Nov 2023/glTF/UI_Paper.gltf',
  flag: `${SUSHI}/Decoration/glTF/Decoration_Sign_2.gltf`,
  tent: `${SPACE}/Environment/GLTF/House_Single.gltf`,
  camera: `${SPACE}/Environment/GLTF/Roof_Radar.gltf`,
  radio: `${SPACE}/Environment/GLTF/Roof_Antenna.gltf`,
};

export const ESL_BIOMES = {
  farm_garden: { name: 'Farm & Garden', resources: ['wood', 'seed', 'leaf', 'food', 'crystal'] },
  food_market: { name: 'Food Market', resources: ['food', 'rice', 'fish', 'spice', 'coin'] },
  space_camp: { name: 'Space Camp', resources: ['metal', 'battery', 'crystal', 'star', 'fuel'] },
};

export const CATCHABLE_CATALOG = [
  ...makeCatchables('farm_garden', FARM_WORDS, FARM_ASSETS, ESL_BIOMES.farm_garden.resources),
  ...makeCatchables('food_market', FOOD_WORDS, FOOD_ASSETS, ESL_BIOMES.food_market.resources),
  ...makeCatchables('space_camp', SPACE_WORDS, SPACE_ASSETS, ESL_BIOMES.space_camp.resources),
];

export const CATCHABLE_BY_KEY = Object.fromEntries(CATCHABLE_CATALOG.map(item => [item.key, item]));
export const CATCHABLE_WORDS = [...new Set(CATCHABLE_CATALOG.map(item => item.word))].sort();

export const BIOMES = {
  farm_garden: {
    name: 'Farm & Garden',
    fogColor: 0x87ceeb,
    groundBlocks: ['grass', 'dirt', 'stone', 'wood'],
    decorations: ['grassSmall', 'grassBig', 'flowers1', 'flowers2'],
    furniturePool: [],
    propPool: CATCHABLE_CATALOG.filter(item => item.biome === 'farm_garden').map(item => item.key),
  },
  food_market: {
    name: 'Food Market',
    fogColor: 0xf7c98a,
    groundBlocks: ['wood', 'brick', 'dirt', 'grass'],
    decorations: ['bamboo', 'bambooSmall', 'plant2', 'flowers1'],
    furniturePool: [],
    propPool: CATCHABLE_CATALOG.filter(item => item.biome === 'food_market').map(item => item.key),
  },
  space_camp: {
    name: 'Space Camp',
    fogColor: 0x273469,
    groundBlocks: ['stone', 'brick', 'wood', 'grass'],
    decorations: ['crystalSmall', 'crystalBig', 'rock1', 'rock2'],
    furniturePool: [],
    propPool: CATCHABLE_CATALOG.filter(item => item.biome === 'space_camp').map(item => item.key),
  },
  meadow: null,
};

BIOMES.meadow = BIOMES.farm_garden;
