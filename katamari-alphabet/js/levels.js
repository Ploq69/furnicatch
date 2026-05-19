export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const all = (pattern, size = 1, mass = 1) => ({ source: 'all', pattern, size, mass });
const gltf = (path, size = 1, mass = 1) => ({ source: 'gltf', path, size, mass });
const styloo = (file, size = 1, mass = 1) => gltf(`../StylooClassroomAssetPack GLTF & FBX/classroom/GLTF/${file}`, size, mass);

const bounds = (x1, x2, z1, z2) => ({ x1, x2, z1, z2 });

const authoredLevelOne = {
  spawn: { x: -18, z: -19, yaw: Math.PI * 0.18 },
  letters: [
    { letter: 'A', x: -14.2, z: -19.4, scale: 0.72, phaseGate: 0 },
    { letter: 'A', x: -20.7, z: -14.4, scale: 0.74, phaseGate: 0 },
    { letter: 'B', x: -18.4, z: -11.6, scale: 0.8, phaseGate: 0 },
    { letter: 'B', x: -15.4, z: -3.8, scale: 0.86, phaseGate: 1 },
    { letter: 'C', x: -2.2, z: -11.1, scale: 0.9, phaseGate: 1 },
    { letter: 'C', x: 3.8, z: -5.2, scale: 0.96, phaseGate: 1 },
    { letter: 'D', x: 3.2, z: 15.8, scale: 1.02, phaseGate: 2 },
    { letter: 'D', x: 11.5, z: 21.6, scale: 1.08, phaseGate: 2 },
    { letter: 'D', x: -3.8, z: 24.2, scale: 1.08, phaseGate: 2 },
  ],
  distractors: [
    { letter: 'E', x: -8.4, z: -17.2, scale: 0.66, phaseGate: 0 },
    { letter: 'F', x: 13.5, z: 4.2, scale: 0.84, phaseGate: 1 },
    { letter: 'G', x: 20.4, z: 13.2, scale: 0.96, phaseGate: 2 },
    { letter: 'H', x: -21.8, z: 1.6, scale: 0.9, phaseGate: 1 },
  ],
  recipes: [
    { name: 'carpet pencils', count: 8, asset: styloo('pencil.glb', 0.34, 2), area: bounds(-22, -11, -23, -14), phaseGate: 0, pickupRadius: 0.28, tilt: 0.45 },
    { name: 'carpet chalk', count: 6, asset: styloo('chalk.glb', 0.28, 2), area: bounds(-21.5, -11.5, -22.5, -13), phaseGate: 0, pickupRadius: 0.24, tilt: 0.35 },
    { name: 'carpet markers', count: 5, asset: styloo('markers.glb', 0.32, 2), area: bounds(-21, -12, -22, -13.5), phaseGate: 0, pickupRadius: 0.28, tilt: 0.4 },
    { name: 'carpet post-its', count: 8, asset: styloo('postit.glb', 0.28, 2), area: bounds(-22, -10.5, -23, -13), phaseGate: 0, pickupRadius: 0.26, tilt: 0.25 },
    { name: 'snack trail', count: 11, asset: all(/Cookies|Soda|Apple|Banana/i, 0.38, 2), area: bounds(-19, -8, -21, -10), phaseGate: 0, pickupRadius: 0.34, tilt: 0.25 },

    { name: 'bed pillows tiny', count: 8, asset: all(/Pillow(_\d+)?$/i, 0.5, 3), area: bounds(-25, -10, -12, -1), phaseGate: 1, pickupRadius: 0.5, tilt: 0.35 },
    { name: 'bed books', count: 10, asset: all(/Book(_\d+)?|Magazine|Magazines/i, 0.46, 3), area: bounds(-24, -8, -8, 1.2), phaseGate: 1, pickupRadius: 0.42, tilt: 0.3 },
    { name: 'bed snack reward', count: 5, asset: all(/Cookies|Soda|Apple|Banana/i, 0.42, 2), area: bounds(-20, -8, -9, -2), phaseGate: 0, pickupRadius: 0.36, tilt: 0.2 },
    { name: 'bed scenery', count: 3, asset: all(/Bed(_\d+)?$/i, 2.6, 14), positions: [[-25, -5], [-25, -0.4], [-8.8, -1.2]], phaseGate: 3, pickupRadius: 1.6, scenic: true },

    { name: 'desk books', count: 10, asset: styloo('book.glb', 0.42, 3), area: bounds(-4.4, 7.2, -12.6, -3.3), phaseGate: 1, pickupRadius: 0.4, tilt: 0.45 },
    { name: 'desk pens', count: 6, asset: styloo('pen.glb', 0.3, 2), area: bounds(-4, 7, -11.8, -3.5), phaseGate: 1, pickupRadius: 0.28, tilt: 0.5 },
    { name: 'desk cases', count: 2, asset: styloo('pencilcase.glb', 0.52, 4), positions: [[0.5, -6.2], [5.4, -8.1]], phaseGate: 1, pickupRadius: 0.5 },
    { name: 'desk lamps', count: 2, asset: styloo('lamp.glb', 0.95, 7), positions: [[-3.2, -5.1], [6.8, -3.8]], phaseGate: 2, pickupRadius: 0.78 },
    { name: 'desk island', count: 3, asset: styloo('desk.glb', 1.65, 13), positions: [[-2.8, -6.8], [2.5, -6.5], [6.2, -6.7]], phaseGate: 3, pickupRadius: 1.25, scenic: true },
    { name: 'desk chairs', count: 4, asset: styloo('chair.glb', 1.0, 7), positions: [[-4.8, -12.3], [0.4, -12.1], [5.7, -12], [8.1, -9.3]], phaseGate: 2, pickupRadius: 0.8, tilt: 0.12 },

    { name: 'classroom chairs', count: 12, asset: styloo('chair.glb', 0.95, 7), positions: [[6, 0.8], [11, 0.7], [16, 0.9], [21, 0.5], [7, 7.7], [12, 7.5], [17, 7.9], [21, 12.7], [5, 13], [10, 13.4], [15, 13.1], [20, 15]], phaseGate: 2, pickupRadius: 0.75, tilt: 0.1 },
    { name: 'classroom desks', count: 8, asset: styloo('desk.glb', 1.35, 12), positions: [[6, -1.1], [11, -1.2], [16, -1], [21, -1.4], [7, 5.9], [12, 5.8], [17, 6.1], [21, 11]], phaseGate: 3, pickupRadius: 1.08 },
    { name: 'classroom books', count: 10, asset: all(/Book(_\d+)?|Magazine|Magazines/i, 0.5, 3), area: bounds(3, 22, -3.4, 15.6), phaseGate: 1, pickupRadius: 0.45, tilt: 0.4 },
    { name: 'classroom boxes', count: 8, asset: all(/^Box(_0?[1-7])?$|^Box$/i, 0.62, 5), area: bounds(13, 22, -2, 16), phaseGate: 2, pickupRadius: 0.58, tilt: 0.15 },
    { name: 'locker wall', count: 4, asset: styloo('locker.glb', 1.7, 12), positions: [[23.7, -1], [23.7, 4.2], [23.7, 9.4], [23.7, 14.6]], phaseGate: 3, pickupRadius: 1.1, scenic: true },
    { name: 'media rewards', count: 3, asset: styloo('radio.glb', 0.78, 6), positions: [[11.2, 1.4], [18.3, 8.2], [7.1, 13.8]], phaseGate: 2, pickupRadius: 0.65 },

    { name: 'stage chalk', count: 6, asset: styloo('chalk_001.glb', 0.28, 2), area: bounds(-5, 16, 18.3, 25.8), phaseGate: 1, pickupRadius: 0.25, tilt: 0.35 },
    { name: 'stage posters', count: 4, asset: all(/Paintings(_\d+)?|Paintings/i, 0.72, 5), area: bounds(-7, 19, 19, 26), phaseGate: 2, pickupRadius: 0.62 },
    { name: 'stage shelves', count: 2, asset: styloo('shelf.glb', 1.35, 11), positions: [[-6.5, 21.2], [18.3, 22.4]], phaseGate: 3, pickupRadius: 1.05, scenic: true },
    { name: 'teacher desk', count: 1, asset: styloo('desk.glb', 1.8, 16), positions: [[6.8, 22]], phaseGate: 3, pickupRadius: 1.25 },
    { name: 'blackboard scenery', count: 1, asset: styloo('blackboardbig.glb', 3.2, 25), positions: [[5.8, 27.1]], phaseGate: 4, pickupRadius: 1.8, scenic: true },
    { name: 'curtain scenery', count: 2, asset: styloo('curtains.glb', 1.8, 10), positions: [[-9.3, 26], [21.6, 26]], phaseGate: 4, pickupRadius: 1.1, scenic: true },
  ],
};

// KA-RAPIER-011: every Level 1 recipe receives an explicit pickupSize.
// KA-RAPIER-012: every Level 1 recipe receives an explicit simplified physics shape and size.
function applyRecipePhysics(level, table) {
  for (const recipe of level.recipes) {
    const cfg = table[recipe.name];
    if (!cfg) throw new Error(`Missing physics metadata for recipe: ${recipe.name}`);
    Object.assign(recipe, cfg);
  }
}

applyRecipePhysics(authoredLevelOne, {
  'carpet pencils': { pickupSize: 0.42, physicsShape: 'capsule', physicsSize: [0.07, 0.72, 0.07], density: 0.35, roughness: 0.9, lopsidedness: 1.9, stickMode: 'long' },
  'carpet chalk': { pickupSize: 0.36, physicsShape: 'capsule', physicsSize: [0.06, 0.38, 0.06], density: 0.28, roughness: 0.55, lopsidedness: 1.2, stickMode: 'long' },
  'carpet markers': { pickupSize: 0.4, physicsShape: 'capsule', physicsSize: [0.07, 0.56, 0.07], density: 0.34, roughness: 0.8, lopsidedness: 1.7, stickMode: 'long' },
  'carpet post-its': { pickupSize: 0.34, physicsShape: 'box', physicsSize: [0.34, 0.03, 0.26], density: 0.16, roughness: 0.35, lopsidedness: 0.8, stickMode: 'flat' },
  'snack trail': { pickupSize: 0.46, physicsShape: 'ball', physicsSize: [0.24], density: 0.42, roughness: 0.45, lopsidedness: 0.9, stickMode: 'compact' },

  'bed pillows tiny': { pickupSize: 0.86, physicsShape: 'box', physicsSize: [0.42, 0.18, 0.34], density: 0.5, roughness: 0.65, lopsidedness: 1.0, stickMode: 'soft' },
  'bed books': { pickupSize: 0.82, physicsShape: 'box', physicsSize: [0.36, 0.08, 0.5], density: 0.72, roughness: 0.75, lopsidedness: 1.35, stickMode: 'flat' },
  'bed snack reward': { pickupSize: 0.52, physicsShape: 'ball', physicsSize: [0.28], density: 0.42, roughness: 0.45, lopsidedness: 0.9, stickMode: 'compact' },
  'bed scenery': { pickupSize: 1.86, physicsShape: 'box', physicsSize: [2.4, 0.56, 1.35], density: 2.4, roughness: 1.0, lopsidedness: 1.2, stickMode: 'heavy', isScenery: true },

  'desk books': { pickupSize: 0.88, physicsShape: 'box', physicsSize: [0.34, 0.08, 0.48], density: 0.7, roughness: 0.75, lopsidedness: 1.35, stickMode: 'flat' },
  'desk pens': { pickupSize: 0.54, physicsShape: 'capsule', physicsSize: [0.06, 0.58, 0.06], density: 0.34, roughness: 0.85, lopsidedness: 1.8, stickMode: 'long' },
  'desk cases': { pickupSize: 0.92, physicsShape: 'box', physicsSize: [0.46, 0.14, 0.28], density: 0.8, roughness: 0.65, lopsidedness: 1.1, stickMode: 'box' },
  'desk lamps': { pickupSize: 1.28, physicsShape: 'box', physicsSize: [0.42, 0.78, 0.42], density: 1.2, roughness: 1.0, lopsidedness: 1.6, stickMode: 'tall' },
  'desk island': { pickupSize: 1.88, physicsShape: 'box', physicsSize: [1.3, 0.72, 0.86], density: 2.0, roughness: 1.1, lopsidedness: 1.2, stickMode: 'heavy', isScenery: true },
  'desk chairs': { pickupSize: 1.32, physicsShape: 'box', physicsSize: [0.55, 0.75, 0.55], density: 1.45, roughness: 1.1, lopsidedness: 1.8, stickMode: 'leggy' },

  'classroom chairs': { pickupSize: 1.34, physicsShape: 'box', physicsSize: [0.55, 0.75, 0.55], density: 1.45, roughness: 1.1, lopsidedness: 1.8, stickMode: 'leggy' },
  'classroom desks': { pickupSize: 1.86, physicsShape: 'box', physicsSize: [1.15, 0.68, 0.72], density: 1.9, roughness: 1.1, lopsidedness: 1.25, stickMode: 'heavy' },
  'classroom books': { pickupSize: 0.9, physicsShape: 'box', physicsSize: [0.36, 0.08, 0.52], density: 0.72, roughness: 0.75, lopsidedness: 1.35, stickMode: 'flat' },
  'classroom boxes': { pickupSize: 1.16, physicsShape: 'box', physicsSize: [0.45, 0.45, 0.45], density: 1.0, roughness: 0.8, lopsidedness: 1.0, stickMode: 'box' },
  'locker wall': { pickupSize: 2.08, physicsShape: 'box', physicsSize: [0.55, 1.5, 0.42], density: 2.4, roughness: 1.2, lopsidedness: 1.6, stickMode: 'tall', isScenery: true },
  'media rewards': { pickupSize: 1.16, physicsShape: 'box', physicsSize: [0.5, 0.36, 0.32], density: 0.85, roughness: 0.8, lopsidedness: 1.1, stickMode: 'box' },

  'stage chalk': { pickupSize: 0.52, physicsShape: 'capsule', physicsSize: [0.06, 0.38, 0.06], density: 0.28, roughness: 0.55, lopsidedness: 1.2, stickMode: 'long' },
  'stage posters': { pickupSize: 1.14, physicsShape: 'box', physicsSize: [0.56, 0.06, 0.42], density: 0.55, roughness: 0.45, lopsidedness: 1.0, stickMode: 'flat' },
  'stage shelves': { pickupSize: 1.92, physicsShape: 'box', physicsSize: [0.8, 1.1, 0.4], density: 1.8, roughness: 1.1, lopsidedness: 1.4, stickMode: 'tall', isScenery: true },
  'teacher desk': { pickupSize: 2.02, physicsShape: 'box', physicsSize: [1.25, 0.72, 0.82], density: 2.1, roughness: 1.1, lopsidedness: 1.25, stickMode: 'heavy' },
  'blackboard scenery': { pickupSize: Infinity, physicsShape: 'box', physicsSize: [2.5, 1.4, 0.18], density: 3.0, roughness: 1.0, lopsidedness: 1.0, stickMode: 'wall', isScenery: true },
  'curtain scenery': { pickupSize: Infinity, physicsShape: 'box', physicsSize: [0.55, 1.2, 0.18], density: 1.0, roughness: 0.65, lopsidedness: 1.0, stickMode: 'wall', isScenery: true },
});

const cityProps = [
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/box_A.gltf', 0.5, 1),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/box_B.gltf', 0.52, 1),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/trash_A.gltf', 0.7, 2),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/trash_B.gltf', 0.72, 2),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/bench.gltf', 1.2, 4),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/firehydrant.gltf', 0.75, 3),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/streetlight.gltf', 1.9, 8),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/trafficlight_A.gltf', 1.8, 8),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/car_hatchback.gltf', 2.2, 16),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/car_sedan.gltf', 2.3, 18),
  gltf('../KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/car_taxi.gltf', 2.4, 20),
];

const forestProps = [
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_1_A_Color1.gltf', 0.35, 1),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_2_B_Color1.gltf', 0.38, 1),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_1_A_Color1.gltf', 0.65, 2),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_3_C_Color1.gltf', 0.78, 2),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_1_A_Color1.gltf', 0.72, 2),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_3_E_Color1.gltf', 1.0, 4),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_1_A_Color1.gltf', 2.2, 13),
  gltf('../KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_4_C_Color1.gltf', 2.45, 16),
  gltf('../all_fences/Fences/low_wooden_fence/wooden_fence_closed.glb', 1.15, 4),
  gltf('../all_fences/Fences/white_picket_fence/white_picket_fence_closed_left.glb', 1.15, 4),
];

const spaceProps = [
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/cargo_A.gltf', 0.75, 2),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/cargo_B_stacked.gltf', 0.95, 3),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/containers_A.gltf', 1.45, 6),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/lights.gltf', 0.8, 2),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/rock_A.gltf', 0.85, 2),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/solarpanel.gltf', 1.7, 8),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/landingpad_small.gltf', 2.1, 12),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/spacetruck.gltf', 2.2, 16),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/lander_A.gltf', 2.6, 22),
  gltf('../KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf/basemodule_A.gltf', 3.2, 28),
];

export const LEVELS = [
  {
    id: 'bedroom-classroom',
    name: 'Bedroom To Classroom',
    letters: ['A', 'B', 'C', 'D'],
    sky: 0xb7d9ff,
    ground: 0xd7b17e,
    accent: 0xffd166,
    authored: authoredLevelOne,
    props: [
      all(/Pillow|Book|Magazine|Cookies|Soda|Apple|Banana|Box(?!_cookies)/i, 0.45, 1),
      all(/Bed|Chair|Table|Lamp|Shelf|Paintings/i, 1.1, 4),
      gltf('../StylooClassroomAssetPack GLTF & FBX/classroom/GLTF/pencil.glb', 0.36, 1),
      gltf('../StylooClassroomAssetPack GLTF & FBX/classroom/GLTF/book.glb', 0.42, 1),
      gltf('../StylooClassroomAssetPack GLTF & FBX/classroom/GLTF/desk.glb', 1.4, 6),
      gltf('../StylooClassroomAssetPack GLTF & FBX/classroom/GLTF/blackboardbig.glb', 2.0, 10),
    ],
  },
  {
    id: 'kitchen-cafeteria',
    name: 'Kitchen Cafeteria',
    letters: ['E', 'F', 'G', 'H'],
    sky: 0xffcf9f,
    ground: 0xe7d5a2,
    accent: 0xff8a5c,
    props: [
      all(/Apple|Pear|Grape|Kiwi|Mango|Orange|Strawberry|Cereal|Soda|Cookies|Milk|Egg\b|Dish|Fork|Knife|Spoon/i, 0.46, 1),
      all(/Burger|Hot_dog|Pizza|Donuts|Waffle|Fried_chicken|Potato|Onion|Cucumber|Pumpkin|Cooking_pot|Frying|Sarten/i, 0.86, 3),
      all(/Stove|Refrigerator|Microwave|Toaster|Coffee_maker|Blender|Table|Chair/i, 1.65, 9),
      gltf('../StylooClassroomAssetPack GLTF & FBX/catferia/GLTF/CAFETERIAcake.glb', 0.8, 2),
      gltf('../StylooClassroomAssetPack GLTF & FBX/catferia/GLTF/CAFETERIAvendingmachine.glb', 2.1, 12),
    ],
  },
  {
    id: 'bath-laundry',
    name: 'Bathroom Laundry',
    letters: ['I', 'J', 'K', 'L'],
    sky: 0xa8f0ff,
    ground: 0x9ecad1,
    accent: 0x6ee7f9,
    props: [
      all(/Soap|Hand_soap|toothpaste|Toothbrush|Toilet_paper|Paper_rolls|Shampoo/i, 0.42, 1),
      all(/Basket|Dirty|Chemical|Softener|Soap_powder|Broom|Mop/i, 0.82, 3),
      all(/Toilet|Washbasin|Bathroom_cabinet|Watering_can|Trash_can|Washing_machine/i, 1.55, 8),
    ],
  },
  {
    id: 'living-room',
    name: 'Living Room Media',
    letters: ['M', 'N', 'O', 'P'],
    sky: 0xffc7df,
    ground: 0xb08f82,
    accent: 0xb69cff,
    props: [
      all(/Control|Magazine|Book|Vaso|Bowl|Plants|Lamps/i, 0.5, 1),
      all(/TV|Video_player|Radio|Paintings|Shelf|Drawer|Cajonera/i, 1.0, 4),
      all(/Armchair|Chair|Table|Bed|Pillow/i, 1.45, 8),
    ],
  },
  {
    id: 'office-city',
    name: 'Office City Block',
    letters: ['Q', 'R', 'S', 'T'],
    sky: 0xa9c6ff,
    ground: 0x77818d,
    accent: 0x7df9a8,
    props: [
      all(/Shelf|Drawer|Box|Table|Chair|Trash_can|Book|Magazine|Lamps/i, 0.95, 3),
      ...cityProps,
    ],
  },
  {
    id: 'park-yard',
    name: 'Park Yard',
    letters: ['U', 'V', 'W', 'X'],
    sky: 0x9fe3bb,
    ground: 0x7cb769,
    accent: 0x38d878,
    props: [
      all(/Plants|Watering_can|Broom|Mop|Basket|Trash_can|Apple|Pear|Pumpkin/i, 0.75, 2),
      ...forestProps,
    ],
  },
  {
    id: 'space-base',
    name: 'Space Base Finale',
    letters: ['Y', 'Z'],
    sky: 0x151a2e,
    ground: 0x575a71,
    accent: 0xffd166,
    props: [
      all(/Box|Electronics|TV|Radio|Control|Canned_food|Water|Cereal/i, 0.85, 2),
      ...spaceProps,
    ],
  },
];

export const PHASES = [
  { name: 'Tiny', minMass: 0, radius: 0.52 },
  { name: 'Small', minMass: 20, radius: 0.86 },
  { name: 'Medium', minMass: 58, radius: 1.28 },
  { name: 'Large', minMass: 120, radius: 1.86 },
];
