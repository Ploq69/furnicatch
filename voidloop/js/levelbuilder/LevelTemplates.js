// ==========================================
// Voidloop Level Builder — Template Library
// ==========================================

import { createBlankLevel } from './LevelSchema.js';
import { getTheme } from './LevelCatalog.js';

const THEME_FLOAT_BLOCKS = {
  forest:   ['crystal', 'stone_with_gold'],
  cave:     ['crystal', 'metal', 'stone_with_gold'],
  medieval: ['brick', 'stone_with_gold', 'decorative_block_red'],
  space:    ['crystal', 'metal', 'decorative_block_blue'],
  city:     ['metal', 'stone_with_gold', 'decorative_block_red'],
  dungeon:  ['lava', 'stone_with_gold', 'decorative_block_red'],
};

function generateFloatingBlocks(themeId, cx, cz) {
  const types = THEME_FLOAT_BLOCKS[themeId] || ['crystal'];
  const blocks = [];
  // Ring pattern
  const ringY = 3;
  const ringRadius = 3;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    blocks.push({
      x: Math.round(cx + Math.cos(angle) * ringRadius),
      y: ringY,
      z: Math.round(cz + Math.sin(angle) * ringRadius),
      type: types[i % types.length],
      rotation: 0, scale: 1,
    });
  }
  // Center cluster
  blocks.push({ x: cx, y: 4, z: cz, type: types[0], rotation: 0, scale: 1.2 });
  // Scattered pairs
  const scatterOffsets = [[-4, -4], [4, -4], [-4, 4], [4, 4]];
  for (const [dx, dz] of scatterOffsets) {
    blocks.push({ x: cx + dx, y: 2, z: cz + dz, type: types[1 % types.length], rotation: 0, scale: 1 });
  }
  return blocks;
}

export function buildTemplate(themeId) {
  const theme = getTheme(themeId);
  const doc = createBlankLevel();
  doc.themeId = themeId;
  doc.title = `${theme.name} Level`;
  doc.gameplay.timerSeconds = 120;

  const cx = Math.floor(doc.grid.width / 2);
  const cz = Math.floor(doc.grid.depth / 2);

  // Seed a 5×5 platform in the center
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      doc.tiles.push({
        x: cx + dx, z: cz + dz, y: 0,
        type: theme.terrain[0] || 'grass',
        height: 1, rotation: 0,
      });
    }
  }
  doc.start = { x: cx, z: cz + 1, rotation: 0 };
  doc.exit = { x: cx, z: cz - 1, rotation: 0 };

  // Auto-generate floating blocks
  doc.floatingBlocks = generateFloatingBlocks(themeId, cx, cz);

  return doc;
}

export const SAMPLE_LEVELS = [
  { id: 'sample_forest',  title: 'Forest Clearing',  themeId: 'forest',   tiles: 25, props: 4, enemies: 2, tokens: 3 },
  { id: 'sample_cave',    title: 'Crystal Cave',     themeId: 'cave',     tiles: 40, props: 6, enemies: 4, tokens: 5 },
  { id: 'sample_castle',  title: 'Castle Rampart',   themeId: 'medieval', tiles: 35, props: 8, enemies: 3, tokens: 4 },
  { id: 'sample_space',   title: 'Orbital Station',  themeId: 'space',    tiles: 30, props: 5, enemies: 5, tokens: 4 },
  { id: 'sample_city',    title: 'Downtown Alley',   themeId: 'city',     tiles: 45, props: 10, enemies: 6, tokens: 6 },
  { id: 'sample_dungeon', title: 'Dungeon Depths',   themeId: 'dungeon',  tiles: 50, props: 7, enemies: 8, tokens: 7 },
];
