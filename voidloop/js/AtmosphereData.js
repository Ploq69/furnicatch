export const VOXEL_SKY = {
  TOP: 0x63b8ff,
  HORIZON: 0xd7f4ff,
  CLOUD: 0xffffff,
  FOG_NEAR: 64,
  FOG_FAR: 260,
  TP_FOG_NEAR: 30,
  TP_FOG_FAR: 70,
};

export const ZONE_ATMOSPHERE = {
  forest: { skyTop: 0x77c7ff, horizon: 0xd8f6ff, fog: 0xbde8d5, sunColor: 0xfff5cf, ambientColor: 0x8abf8a, cloudOpacity: 0.32, hazeStrength: 0.25, groundTint: 0x355f3b, silhouette: 0x17351f },
  fire: { skyTop: 0x2b1d23, horizon: 0xff8158, fog: 0x5a2a22, sunColor: 0xffb05f, ambientColor: 0xb0694a, cloudOpacity: 0.18, hazeStrength: 0.72, groundTint: 0x4b241c, silhouette: 0x130d0b },
  ice: { skyTop: 0xa7dbff, horizon: 0xf2fbff, fog: 0xd8f3ff, sunColor: 0xeaffff, ambientColor: 0x9ebfd8, cloudOpacity: 0.42, hazeStrength: 0.38, groundTint: 0xb8dff0, silhouette: 0x47687a },
  desert: { skyTop: 0x71b7e6, horizon: 0xffdf9b, fog: 0xe8c27e, sunColor: 0xffd17a, ambientColor: 0xc99d62, cloudOpacity: 0.12, hazeStrength: 0.58, groundTint: 0xc28b45, silhouette: 0x6f4720 },
  steelworks: { skyTop: 0x4f7fa4, horizon: 0xc4d1d4, fog: 0x7b8790, sunColor: 0xffb05c, ambientColor: 0x7f8f9d, cloudOpacity: 0.52, hazeStrength: 0.82, groundTint: 0x4d5961, silhouette: 0x1c2328 },
  mire: { skyTop: 0x5f8874, horizon: 0xaec6a1, fog: 0x748b6a, sunColor: 0xe8d69a, ambientColor: 0x668b62, cloudOpacity: 0.46, hazeStrength: 0.68, groundTint: 0x314a35, silhouette: 0x142317 },
  citadel: { skyTop: 0x8fb9de, horizon: 0xf0d3a4, fog: 0xd8b77d, sunColor: 0xffdf9a, ambientColor: 0xb89969, cloudOpacity: 0.24, hazeStrength: 0.34, groundTint: 0x8a7356, silhouette: 0x3f3427 },
  default: { skyTop: VOXEL_SKY.TOP, horizon: VOXEL_SKY.HORIZON, fog: VOXEL_SKY.HORIZON, sunColor: 0xfff5e6, ambientColor: 0x8888aa, cloudOpacity: 0.28, hazeStrength: 0.3, groundTint: 0x4d6b55, silhouette: 0x263344 },
};
