// ==========================================
// Voidloop SFX Mapper — Full Sound Effect Mapping
// Maps every gameplay event to Helton Yan Pixel Combat WAV files
// Each sound has 6 variants; random variant selected per play
// ==========================================

import { audio } from './AudioManager.js';

const SFX_DIR = 'audio/sfx';

function variantPath(prefix, baseName, n) {
  return `${SFX_DIR}/${prefix}_${baseName}_HY_PC-00${n}.wav`;
}

function playVariant(prefix, baseName, opts = {}) {
  const n = Math.floor(Math.random() * 2) + 1; // only variants 1-2 are shipped
  const path = variantPath(prefix, baseName, n);
  audio.playPath(path, opts);
}

// Helper: pick random from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const SFXMapper = {
  // === PLAYER MOVEMENT ===
  footstep(surface = 'generic') {
    const map = {
      grass: ['FEETMisc', 'STEP-Boots on Grass'],
      dirt: ['FEETMisc', 'STEP-Boots on Grass'],
      stone: ['FEETMisc', 'STEP-Boots on Concrete'],
      metal: ['FEETMisc', 'STEP-Boots on Metal'],
      sand: ['FEETMisc', 'STEP-Boots on Sand'],
      generic: ['FEETMisc', 'STEP-Boots on Generic Ground 1'],
    };
    const [pre, name] = map[surface] || map.generic;
    playVariant(pre, name, { volume: 0.25, pitch: 0.9 + Math.random() * 0.2 });
  },

  jump() {
    playVariant('DSGNTonl', 'MOVEMENT-Retro Jump', { volume: 0.4 });
  },

  dodge() {
    playVariant('WHSH', 'MOVEMENT-Simple Whoosh', { volume: 0.5 });
  },

  land() {
    playVariant('DSGNMisc', 'MOVEMENT-Mecha Medium Jump', { volume: 0.3 });
  },

  waterSplash(strength = 1) {
    playVariant('MAGSpel', 'CAST-Underwater', {
      volume: 0.16 + Math.min(1, Math.max(0, strength)) * 0.16,
      pitch: 0.92 + Math.random() * 0.16,
    });
  },

  sprint() {
    playVariant('WHSH', 'MOVEMENT-Phase Sweeps', { volume: 0.2 });
  },

  // === MINING ===
  mineSwing(pickaxeTier = 'wood') {
    playVariant('WHSH', 'MOVEMENT-Simple Whoosh', { volume: 0.35 });
  },

  mineHit(blockType) {
    const map = {
      dirt: ['DSGNImpt', 'EXPLOSION-Thud'],
      grass: ['DSGNImpt', 'EXPLOSION-Thud'],
      stone: ['DSGNImpt', 'EXPLOSION-Thud'],
      brick: ['DSGNImpt', 'EXPLOSION-Thud'],
      coal: ['DSGNImpt', 'EXPLOSION-Thud'],
      metal: ['DSGNImpt', 'EXPLOSION-Thud'],
      crystal: ['DSGNImpt', 'EXPLOSION-Thud'],
      diamond: ['DSGNImpt', 'EXPLOSION-Thud'],
      ice: ['DSGNImpt', 'EXPLOSION-Thud'],
      snow: ['DSGNImpt', 'EXPLOSION-Thud'],
    };
    const [pre, name] = map[blockType] || map.stone;
    playVariant(pre, name, { volume: 0.35 });
  },

  swingMiss() {
    playVariant('WHSH', 'MOVEMENT-Simple Whoosh', { volume: 0.4 });
  },

  mineBreak(blockType) {
    if (blockType === 'crystal' || blockType === 'diamond') {
      playVariant('DSGNImpt', 'EXPLOSION-Magisplosion', { volume: 0.5 });
    } else {
      playVariant('DSGNImpt', 'EXPLOSION-Grainy Burst', { volume: 0.4 });
    }
  },

  collectOre() {
    playVariant('DSGNTonl', 'USABLE-Coin Toss', { volume: 0.4, pitch: 1.1 });
  },

  collectGem() {
    playVariant('MAGSpel', 'CAST-Tweety Cast', { volume: 0.5, pitch: 1.2 });
  },

  collectRare() {
    playVariant('MAGAngl', 'BUFF-Buff Drop', { volume: 0.6, pitch: 1.1 });
  },

  // === MELEE COMBAT ===
  meleeSwing(weaponId) {
    const map = {
      pickaxe: ['DSGNTonl', 'USABLE-Generic Item'],
      sword: ['DSGNTonl', 'MELEE-Sword Critical'],
      cutlass: ['SWSH', 'MOVEMENT-Bamboo Whip'],
    };
    const [pre, name] = map[weaponId] || map.sword;
    playVariant(pre, name, { volume: 0.5 });
  },

  meleeHit() {
    playVariant('FGHTImpt', 'HIT-Strong Punch', { volume: 0.5 });
  },

  meleeCrit() {
    playVariant('DSGNTonl', 'MELEE-Sword Critical', { volume: 0.6, pitch: 1.1 });
  },

  // === RANGED COMBAT ===
  gunShot(weaponId) {
    const map = {
      pistol: ['DSGNImpt', 'EXPLOSION-Smaller Flare'],
      rifle: ['DSGNImpt', 'EXPLOSION-Mecha Engine Blast'],
      smg: ['DSGNImpt', 'EXPLOSION-Mecha Multiple Bangs'],
      shotgun: ['DSGNImpt', 'EXPLOSION-Bit Bomb'],
      sniper: ['DSGNImpt', 'EXPLOSION-Phoenix Spark'],
    };
    const [pre, name] = map[weaponId] || map.pistol;
    playVariant(pre, name, { volume: 0.4 });
  },

  projectileHit() {
    playVariant('DSGNMisc', 'SKILL IMPACT-Crunchy Energy', { volume: 0.35 });
  },

  projectileWall() {
    playVariant('DSGNImpt', 'EXPLOSION-Thud', { volume: 0.3 });
  },

  // === THROWN / EXPLOSIONS ===
  grenadeThrow() {
    playVariant('DSGNMisc', 'PROJECTILE-Hollow Point', { volume: 0.4 });
  },

  explosion(size = 'small') {
    const map = {
      small: ['DSGNImpt', 'EXPLOSION-Grainy Burst'],
      large: ['DSGNImpt', 'EXPLOSION-Forced Shutdown'],
      fire: ['DSGNImpt', 'EXPLOSION-Magisplosion'],
      electric: ['DSGNImpt', 'EXPLOSION-Mecha Core Damage'],
    };
    const [pre, name] = map[size] || map.small;
    playVariant(pre, name, { volume: 0.6 });
  },

  grenadeExplosion() {
    audio.playExplosion({ volume: 0.9, freq: 104 });
    playVariant('DSGNImpt', 'EXPLOSION-Forced Shutdown', { volume: 0.82, pitch: 0.92 });
    playVariant('DSGNImpt', 'EXPLOSION-Mecha Core Damage', { volume: 0.62, pitch: 0.82 });
    playVariant('DSGNImpt', 'EXPLOSION-Thud', { volume: 0.72, pitch: 0.75 });
    playVariant('DSGNImpt', 'EXPLOSION-Grainy Burst', { volume: 0.42, pitch: 1.08 });
  },

  missileIncoming() {
    playVariant('WHSH', 'MOVEMENT-Mecha Ship Passby', { volume: 0.55, pitch: 1.22 });
    playVariant('DSGNSynth', 'CAST-Mecha Laser Prepare', { volume: 0.35, pitch: 0.72 });
  },

  missileImpact() {
    audio.playExplosion({ volume: 1.0, freq: 68 });
    playVariant('DSGNImpt', 'EXPLOSION-Forced Shutdown', { volume: 0.95, pitch: 0.68 });
    playVariant('DSGNImpt', 'EXPLOSION-Mecha Core Damage', { volume: 0.8, pitch: 0.72 });
    playVariant('DSGNImpt', 'EXPLOSION-Thud', { volume: 0.9, pitch: 0.58 });
    playVariant('DSGNImpt', 'EXPLOSION-Grainy Burst', { volume: 0.62, pitch: 0.82 });
  },

  // === ENEMY SOUNDS ===
  enemyAlert(type) {
    const map = {
      slime: ['DSGNMisc', 'CAST-Slime Ball'],
      goblin: ['DSGNMisc', 'CAST-Noise Summon'],
      skeleton: ['MAGSpel', 'CAST-Sharp Summon'],
      demon: ['MAGSpel', 'CAST-Panic Energy'],
      yeti: ['DSGNSynth', 'CAST-Mecha Energy Gathering'],
      bat: ['DSGNMisc', 'MOVEMENT-Bats Flying'],
      pirate: ['DSGNMisc', 'INTERFACE-Phasey Swipe'],
      soldier: ['DSGNSynth', 'CAST-Mecha Laser Prepare'],
      zombie: ['MAGSpel', 'CAST-Critter Transformation'],
      space: ['DSGNSynth', 'CAST-Mecha Speeding'],
    };
    const [pre, name] = map[type] || map.goblin;
    playVariant(pre, name, { volume: 0.4 });
  },

  enemyAttack(type) {
    const map = {
      slime: ['DSGNMisc', 'HIT-Bit Kick'],
      goblin: ['FGHTImpt', 'MELEE-Gut Punch'],
      skeleton: ['FGHTImpt', 'MELEE-Swish Hit'],
      demon: ['FGHTImpt', 'MELEE-Crunch Kick'],
      yeti: ['FGHTImpt', 'MELEE-Clap Slapper'],
      bat: ['DSGNMisc', 'PROJECTILE-Clicky Bubbly'],
      pirate: ['DSGNMisc', 'MELEE-Sword Slash'],
      soldier: ['DSGNImpt', 'EXPLOSION-Mecha Engine Blast'],
      zombie: ['DSGNMisc', 'HIT-Gore Pierce'],
      space: ['DSGNMisc', 'PROJECTILE-Laser Bursts'],
    };
    const [pre, name] = map[type] || map.goblin;
    playVariant(pre, name, { volume: 0.45 });
  },

  enemyHurt(type) {
    const map = {
      slime: ['DSGNMisc', 'HIT-Fleeting Hit'],
      goblin: ['FGHTImpt', 'HIT-Smack'],
      skeleton: ['FGHTImpt', 'HIT-Strong Punch'],
      demon: ['FGHTImpt', 'HIT-Strong Smack'],
      yeti: ['DSGNMisc', 'HIT-Mecha Downer'],
      bat: ['DSGNMisc', 'HIT-Noisy Hit'],
      pirate: ['DSGNMisc', 'HIT-Sweep Hit'],
      soldier: ['DSGNMisc', 'HIT-Plastic Zap'],
      zombie: ['DSGNMisc', 'HIT-Hit Noise'],
      space: ['DSGNMisc', 'HIT-Laser Electric Zap'],
    };
    const [pre, name] = map[type] || map.goblin;
    playVariant(pre, name, { volume: 0.4 });
  },

  enemyDeath(type) {
    const map = {
      slime: ['DSGNImpt', 'EXPLOSION-Flare Extinguish'],
      goblin: ['DSGNImpt', 'EXPLOSION-Forced Interruption'],
      skeleton: ['DSGNImpt', 'EXPLOSION-Forced Interruption'],
      demon: ['DSGNImpt', 'EXPLOSION-Forced Shutdown'],
      yeti: ['DSGNImpt', 'EXPLOSION-Bass Hit'],
      bat: ['DSGNImpt', 'EXPLOSION-Flare Extinguish'],
      pirate: ['DSGNImpt', 'EXPLOSION-Forced Interruption'],
      soldier: ['DSGNImpt', 'EXPLOSION-Bit Bomb'],
      zombie: ['DSGNImpt', 'EXPLOSION-Grainy Burst'],
      space: ['DSGNImpt', 'EXPLOSION-Mecha Core Damage'],
    };
    const [pre, name] = map[type] || map.goblin;
    playVariant(pre, name, { volume: 0.5 });
  },

  // === PLAYER DAMAGE ===
  playerHurt() {
    playVariant('DSGNMisc', 'HIT-Mecha Shimmer Damage', { volume: 0.5 });
  },

  playerHurtHeavy() {
    playVariant('DSGNImpt', 'EXPLOSION-Mecha Core Damage', { volume: 0.6 });
  },

  playerDeath() {
    playVariant('DSGNImpt', 'EXPLOSION-Forced Shutdown', { volume: 0.7 });
  },

  playerHeal() {
    playVariant('DSGNSynth', 'BUFF-Invigoration', { volume: 0.4, pitch: 1.1 });
  },

  staminaDepleted() {
    playVariant('UIMisc', 'INTERFACE-Denied', { volume: 0.4 });
  },

  // === MAGIC / SKILLS ===
  skillCast(kind) {
    const map = {
      buff: ['MAGSpel', 'CAST-Aura Rise'],
      attack: ['MAGSpel', 'CAST-Zap Up'],
      heal: ['MAGSpel', 'CAST-Birdsong'],
    };
    const [pre, name] = map[kind] || map.attack;
    playVariant(pre, name, { volume: 0.5 });
  },

  skillReady() {
    playVariant('MAGSpel', 'CAST-Skill Ready', { volume: 0.4 });
  },

  buffApply() {
    playVariant('DSGNSynth', 'BUFF-Generic Buff', { volume: 0.35 });
  },

  buffExpire() {
    playVariant('DSGNSynth', 'BUFF-Failed Buff', { volume: 0.3 });
  },

  levelUp() {
    playVariant('DSGNSynth', 'BUFF-Mecha Level Up', { volume: 0.6, pitch: 1.1 });
  },

  // === UI ===
  uiClick() {
    playVariant('UIClick', 'INTERFACE-Positive Click', { volume: 0.35 });
  },

  uiHover() {
    playVariant('UIClick', 'INTERFACE-Metallic Click', { volume: 0.15 });
  },

  uiDenied() {
    playVariant('UIMisc', 'INTERFACE-Denied', { volume: 0.4 });
  },

  uiSwitch() {
    playVariant('UIMisc', 'INTERFACE-Zap Select', { volume: 0.3 });
  },

  hotbarSelect() {
    playVariant('DSGNTonl', 'USABLE-Scifi Select', { volume: 0.3 });
  },

  upgradeBuy() {
    playVariant('DSGNTonl', 'USABLE-Mecha Upgrade Equip', { volume: 0.4 });
  },

  upgradeMaxed() {
    playVariant('DSGNSynth', 'BUFF-Mecha Lock In', { volume: 0.5 });
  },

  coinPickup() {
    playVariant('DSGNTonl', 'USABLE-Zappy Coin', { volume: 0.35, pitch: 1 + Math.random() * 0.2 });
  },

  coinSpend() {
    playVariant('DSGNTonl', 'USABLE-Coin Spend', { volume: 0.35 });
  },

  chestOpen() {
    playVariant('DSGNTonl', 'USABLE-Generic Item', { volume: 0.4 });
  },

  itemCraft() {
    playVariant('UIGlitch', 'USABLE-Glassy Click', { volume: 0.35 });
  },

  floorComplete() {
    playVariant('MAGSpel', 'CAST-High Powering Up', { volume: 0.6 });
  },

  gameOver() {
    playVariant('DSGNImpt', 'EXPLOSION-Forced Shutdown', { volume: 0.7 });
  },

  campEnter() {
    playVariant('MAGSpel', 'CAST-Underwater', { volume: 0.3 });
  },

  // === AMBIENT ===
  ambientBiome(biomeName) {
    // Ambient sounds are subtle background layers
    const map = {
      'Grassland Caves': ['MAGSpel', 'CAST-Birdsong'],
      'Temple Ruins': ['MAGSpel', 'CAST-Underwater'],
      'Pirate Cove': ['WHSH', 'MOVEMENT-Mecha Ship Passby'],
      'City Ruins': ['DSGNMisc', 'MOVEMENT-Noise Decay'],
      'Void Depths': ['MAGSpel', 'CAST-Hollow Spell'],
    };
    const [pre, name] = map[biomeName];
    if (pre && name) {
      playVariant(pre, name, { volume: 0.08 });
    }
  },
};
