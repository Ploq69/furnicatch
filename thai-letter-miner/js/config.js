export const GAME_CONFIG = {
  storageKey: 'thai-letter-miner.save.v1',
  world: {
    blockSize: 1,
    baseRadius: 4,
    maxRadius: 14,
    baseBlockHp: 1,
    density: 0.72,
  },
  mining: {
    range: 2.35,
    baseDamage: 1,
    baseCooldown: 0.42,
    petTickSeconds: 0.85,
  },
  discovery: {
    baseChance: 0.055,
    forcedQuizMinSeconds: 24,
    surveyReportMaxQuizzes: 3,
    studyChestThreshold: 9,
    wrongBundleKeepRatio: 0.35,
    duplicateConsolidation: true,
    mixedCategoryCaches: true,
  },
  pacing: {
    stages: [
      { name: 'Scrappy Quarry', minRun: 1, unlockTier: 1, radiusBonus: 0, hpBonus: 0, discoveryBonus: 0 },
      { name: 'First Overpower', minRun: 4, unlockTier: 2, radiusBonus: 1, hpBonus: 0, discoveryBonus: 0.01 },
      { name: 'Vowel Burst', minRun: 8, unlockTier: 3, radiusBonus: 2, hpBonus: 1, discoveryBonus: 0.015 },
      { name: 'Chain Mining High', minRun: 13, unlockTier: 4, radiusBonus: 3, hpBonus: 1, discoveryBonus: 0.02 },
      { name: 'Mastery Gate', minRun: 18, unlockTier: 5, radiusBonus: 4, hpBonus: 2, discoveryBonus: 0.025 },
    ],
  },
};

export const UPGRADE_DEFS = [
  { id: 'survey_grid', group: 'mining', name: 'Survey Grid', max: 8, baseCost: 30, costScale: 1.65, desc: 'Adds more blocks to future runs.' },
  { id: 'pick_head', group: 'mining', name: 'Pick Head', max: 10, baseCost: 25, costScale: 1.55, desc: 'Raises player mining damage.' },
  { id: 'swing_rhythm', group: 'mining', name: 'Swing Rhythm', max: 8, baseCost: 35, costScale: 1.55, desc: 'Lowers pickaxe cooldown.' },
  { id: 'twin_strike', group: 'mining', name: 'Twin Strike', max: 4, baseCost: 90, costScale: 2.0, desc: 'Damages extra nearby blocks.' },
  { id: 'chain_crack', group: 'mining', name: 'Chain Crack', max: 5, baseCost: 120, costScale: 1.9, desc: 'Chance to crack neighboring blocks.' },
  { id: 'quarry_burst', group: 'mining', name: 'Quarry Burst', max: 4, baseCost: 180, costScale: 2.1, desc: 'Occasionally pops a cluster.' },
  { id: 'lucky_soil', group: 'discovery', name: 'Lucky Soil', max: 8, baseCost: 45, costScale: 1.6, desc: 'Increases Thai discovery chance.' },
  { id: 'sorted_finds', group: 'discovery', name: 'Sorted Finds', max: 5, baseCost: 75, costScale: 1.75, desc: 'Improves duplicate bundle rewards.' },
  { id: 'study_satchel', group: 'discovery', name: 'Study Satchel', max: 5, baseCost: 80, costScale: 1.8, desc: 'Stores more finds before chests.' },
  { id: 'recall_bell', group: 'discovery', name: 'Recall Bell', max: 4, baseCost: 110, costScale: 2.0, desc: 'Missed bundles can return later.' },
  { id: 'focused_survey', group: 'discovery', name: 'Focused Survey', max: 5, baseCost: 95, costScale: 1.8, desc: 'Favors uncaptured Thai items.' },
  { id: 'pet_slot', group: 'pets', name: 'Pet Slot', max: 5, baseCost: 140, costScale: 2.35, desc: 'Equip another captured script pet.' },
  { id: 'pet_damage', group: 'pets', name: 'Pet Damage', max: 8, baseCost: 70, costScale: 1.6, desc: 'Pets hit blocks harder.' },
  { id: 'pet_speed', group: 'pets', name: 'Pet Speed', max: 8, baseCost: 65, costScale: 1.55, desc: 'Pets move and mine faster.' },
  { id: 'pet_splash', group: 'pets', name: 'Pet Splash', max: 5, baseCost: 115, costScale: 1.85, desc: 'Pets sometimes crack nearby blocks.' },
];

export function upgradeCost(def, level) {
  return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
