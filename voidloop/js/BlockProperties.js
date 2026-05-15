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

const BLOCK_PROPERTIES = Object.freeze({
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
  gravel: {
    friction: 7,
    falling: true,
  },
});

export function getBlockProperties(typeKey) {
  return {
    ...DEFAULT_BLOCK_PROPERTIES,
    ...(BLOCK_PROPERTIES[typeKey] || null),
  };
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
