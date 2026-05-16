export const DEFAULT_BLOCK_PROPERTIES = Object.freeze({
  solid: true,
  fluid: null,
  transparent: false,
  friction: 8,
  falling: false,
  hazard: null,
  mineable: true,
  renderLayer: 'opaque',
});

const BLOCK_PROPERTY_OVERRIDES = Object.freeze({
  air: {
    solid: false,
    transparent: true,
    mineable: false,
    renderLayer: 'none',
  },
  water: {
    solid: false,
    fluid: { type: 'water', swim: true, drag: 0.62 },
    transparent: true,
    friction: 2,
    mineable: false,
    renderLayer: 'transparent',
  },
  lava: {
    solid: false,
    fluid: { type: 'lava', swim: false, drag: 0.45 },
    transparent: true,
    friction: 3,
    falling: false,
    hazard: { type: 'burn', damagePerSecond: 12 },
    mineable: false,
    renderLayer: 'transparent',
  },
  ice: {
    transparent: true,
    friction: 1,
    renderLayer: 'transparent',
  },
  packed_ice: {
    transparent: true,
    friction: 1,
    renderLayer: 'transparent',
  },
  blue_ice: {
    transparent: true,
    friction: 1,
    renderLayer: 'transparent',
  },
  sand_A: {
    friction: 6,
    falling: true,
  },
  sand_B: {
    friction: 6,
    falling: true,
  },
  sand: {
    friction: 6,
    falling: true,
  },
  red_sand: {
    friction: 6,
    falling: true,
  },
  gravel: {
    friction: 7,
    falling: true,
  },
  // Leaves are non-solid for gameplay, but render as depth-writing alpha cutouts.
  birch_leaves: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  oak_leaves: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  jungle_leaves: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  acacia_leaves: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  dark_oak_leaves: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  // Decorations are non-solid
  tall_grass: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  flower_red: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  flower_yellow: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  dead_bush: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  mushroom: {
    solid: false,
    transparent: true,
    mineable: true,
    renderLayer: 'cutout',
  },
  cactus: {
    solid: true,
    transparent: true,
    hazard: { type: 'burn', damagePerSecond: 3 },
    renderLayer: 'cutout',
  },
});

const BLOCK_PROPERTIES = Object.freeze(Object.fromEntries(
  Object.entries(BLOCK_PROPERTY_OVERRIDES).map(([typeKey, overrides]) => [
    typeKey,
    Object.freeze({
      ...DEFAULT_BLOCK_PROPERTIES,
      ...overrides,
    }),
  ])
));

const DEFAULT_RESOLVED_BLOCK_PROPERTIES = DEFAULT_BLOCK_PROPERTIES;

export function getBlockProperties(typeKey) {
  return BLOCK_PROPERTIES[typeKey] || DEFAULT_RESOLVED_BLOCK_PROPERTIES;
}

export function isBlockSolid(typeKey) {
  return getBlockProperties(typeKey).solid;
}

export function isBlockFluid(typeKey) {
  return !!getBlockProperties(typeKey).fluid;
}

export function isBlockMineable(typeKey) {
  return !!getBlockProperties(typeKey).mineable;
}
