// ==========================================
// Voidloop — Zone Definitions
// ==========================================

export const ZONES = [
  {
    id: 'forest',
    name: 'Whispering Forest',
    order: 1,
    description: 'A peaceful forest with basic blocks and goblins.',
    blockTypes: ['grass', 'dirt', 'stone', 'wood'],
    floatingBlockTypes: ['crystal', 'stone_with_gold'],
    enemyTypes: ['goblin', 'slime'],
    fogColor: 0x87ceeb,
    fogNear: 20,
    fogFar: 45,
    bounds: { minX: -60, maxX: 0, minZ: -60, maxZ: 60 },
    spawnPoint: { x: -30, z: 0 },
    exitGateway: { x: -2, z: 0, targetZone: 'fire' },
    letterSet: ['A', 'B', 'C', 'D'],
    blockLootTable: 'forest',
    enemyLootTable: 'forest',
    hazard: null,
  },
  {
    id: 'fire',
    name: 'Ember Wastes',
    order: 2,
    description: 'A scorched landscape. Fire blocks require special gear.',
    blockTypes: ['lava', 'stone_dark', 'coal', 'brick'],
    floatingBlockTypes: ['crystal', 'decorative_block_red', 'stone_with_gold'],
    enemyTypes: ['demon', 'bat'],
    fogColor: 0x2a1a1a,
    fogNear: 14,
    fogFar: 35,
    bounds: { minX: 0, maxX: 60, minZ: -60, maxZ: 60 },
    spawnPoint: { x: 10, z: 0 },
    exitGateway: { x: 58, z: 0, targetZone: 'ice' },
    letterSet: ['E', 'F', 'G', 'H'],
    blockLootTable: 'fire',
    enemyLootTable: 'fire',
    entryRequirements: {
      pickaxe: 'water_pickaxe',
      suit: 'water_suit',
      weapon: 'water_staff',
    },
    hazard: {
      type: 'burn',
      damagePerSecond: 5,
      mitigationItem: 'water_suit',
    },
  },
];

export function getZoneById(id) {
  return ZONES.find(z => z.id === id);
}

export function getZoneAtPosition(x, z) {
  for (const zone of ZONES) {
    const b = zone.bounds;
    if (x >= b.minX && x < b.maxX && z >= b.minZ && z < b.maxZ) {
      return zone;
    }
  }
  return null;
}
