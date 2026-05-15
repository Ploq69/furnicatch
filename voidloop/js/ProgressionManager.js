import { getZoneById } from './ZoneData.js';

const SAVE_KEY = 'voidloop_progress_v2';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const PICKAXE_WIDTH_COSTS = {
  2: 25,
  3: 75,
  4: 350,
  5: 900,
  6: 1800,
};

export const ROUND_TIME_COSTS = [100, 250, 500, 900, 1400, 2100];
export const LETTER_DROP_COSTS = [60, 160, 360, 720, 1200];
export const LETTER_LEVEL_XP = {
  2: 3,
  3: 8,
  4: 18,
  5: 35,
  6: 60,
  7: 100,
};
export const LETTER_QUIZ_THRESHOLDS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  7: Infinity,
};

const DEFAULT_STATE = {
  pickaxeWidth: 1,
  roundTimeLevel: 0,
  letterDropLevel: 0,
  grenade: {
    unlocked: false,
    radiusLevel: 0,
    cooldownLevel: 0,
    chargeCapLevel: 0,
    charges: 0,
  },
  missile: {
    unlocked: false,
    radiusLevel: 0,
    cooldownLevel: 0,
    countLevel: 0,
    charges: 0,
  },
  letters: {},
  quizQueue: [],
  zoneMined: {},
};

function createLetterState(letter) {
  return {
    letter,
    level: 1,
    xp: 0,
    dropsTowardQuiz: 0,
    introduced: false,
    correctAnswers: 0,
    attempts: 0,
  };
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLetter(letter) {
  const upper = String(letter || '').trim().toUpperCase()[0];
  return ALPHABET.includes(upper) ? upper : null;
}

export class ProgressionManager {
  constructor(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
    this.storage = storage;
    this.state = cloneState(DEFAULT_STATE);
    for (const letter of ALPHABET) {
      this.state.letters[letter] = createLetterState(letter);
    }
    this._load();
  }

  getPickaxeWidth() {
    return Math.max(1, Math.min(6, this.state.pickaxeWidth || 1));
  }

  getNextPickaxeWidthCost() {
    return PICKAXE_WIDTH_COSTS[this.getPickaxeWidth() + 1] ?? null;
  }

  getRoundStartTime(baseSeconds) {
    return baseSeconds + (this.state.roundTimeLevel || 0) * 15;
  }

  getLetterDropChance(kind = 'floating') {
    const level = this.state.letterDropLevel || 0;
    const base = kind === 'terrain' ? 0.035 : 0.25;
    return Math.min(kind === 'terrain' ? 0.16 : 0.55, base + level * 0.045);
  }

  getGrenadeCooldown() {
    return Math.max(5, 12 - (this.state.grenade.cooldownLevel || 0) * 1.5);
  }

  getGrenadeRadius() {
    return 4.25 + (this.state.grenade.radiusLevel || 0) * 0.65;
  }

  getGrenadeChargeCap() {
    return 1 + (this.state.grenade.chargeCapLevel || 0);
  }

  getMissileCooldown() {
    return Math.max(18, 45 - (this.state.missile.cooldownLevel || 0) * 5);
  }

  getMissileRadius() {
    return 7 + (this.state.missile.radiusLevel || 0) * 0.9;
  }

  getMissileCountRange() {
    const bonus = this.state.missile.countLevel || 0;
    return { min: 3 + Math.floor(bonus / 2), max: 4 + bonus };
  }

  recordMined(zoneId, count = 1) {
    if (!zoneId) return 0;
    this.state.zoneMined[zoneId] = (this.state.zoneMined[zoneId] || 0) + Math.max(0, count);
    this._save();
    return this.state.zoneMined[zoneId];
  }

  getZoneMined(zoneId) {
    return this.state.zoneMined[zoneId] || 0;
  }

  getZoneMiningTarget(zone) {
    return zone ? 100 + zone.order * 50 : 0;
  }

  getLetter(letter) {
    const upper = normalizeLetter(letter);
    return upper ? this.state.letters[upper] : null;
  }

  getQuizThreshold(letter) {
    const state = this.getLetter(letter);
    if (!state) return Infinity;
    return LETTER_QUIZ_THRESHOLDS[state.level] || Infinity;
  }

  getNextLetterXp(letter) {
    const state = this.getLetter(letter);
    if (!state || state.level >= 7) return null;
    return LETTER_LEVEL_XP[state.level + 1] || null;
  }

  getLetterProgress(letter) {
    const state = this.getLetter(letter);
    if (!state) return null;

    const level = Math.max(1, Math.min(7, state.level || 1));
    const maxed = level >= 7;
    const previousXp = level <= 1 ? 0 : (LETTER_LEVEL_XP[level] || 0);
    const nextXp = maxed ? null : (LETTER_LEVEL_XP[level + 1] || null);
    const xpIntoLevel = Math.max(0, (state.xp || 0) - previousXp);
    const xpNeeded = nextXp == null ? 0 : Math.max(1, nextXp - previousXp);
    const percent = maxed ? 100 : Math.max(0, Math.min(100, (xpIntoLevel / xpNeeded) * 100));
    const quizThreshold = this.getQuizThreshold(letter);
    const dropsTowardQuiz = state.dropsTowardQuiz || 0;
    const quizReady = !maxed && Number.isFinite(quizThreshold) && dropsTowardQuiz >= quizThreshold;

    return {
      letter: state.letter,
      level,
      xp: state.xp || 0,
      previousXp,
      nextXp,
      xpIntoLevel,
      xpNeeded,
      percent,
      dropsTowardQuiz,
      quizThreshold,
      quizReady,
      introduced: !!state.introduced,
      passed: this.hasPassedLetter(letter),
      mastered: maxed,
      maxed,
    };
  }

  getZoneLetterProgress(zoneId) {
    const zone = getZoneById(zoneId);
    return (zone?.letters || [])
      .map(letter => this.getLetterProgress(letter))
      .filter(Boolean);
  }

  collectLetter(letter, count = 1) {
    const state = this.getLetter(letter);
    if (!state || state.level >= 7) return { queued: false, state };

    state.introduced = true;
    state.dropsTowardQuiz += Math.max(1, count);
    const queued = this._queueReadyQuiz(state.letter);
    this._save();
    return { queued, state };
  }

  peekQuiz() {
    return this.state.quizQueue[0] || null;
  }

  hasQueuedQuizFor(letter) {
    const upper = normalizeLetter(letter);
    return upper ? this.state.quizQueue.some(q => q.letter === upper) : false;
  }

  makeQuizChoices(letter, allowedLetters = ALPHABET) {
    const target = normalizeLetter(letter);
    const pool = allowedLetters.map(normalizeLetter).filter(l => l && l !== target);
    while (pool.length < 3) {
      const fallback = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      if (fallback !== target && !pool.includes(fallback)) pool.push(fallback);
    }
    const picks = [];
    while (picks.length < 3 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(index, 1)[0]);
    }
    return [...picks, target].sort(() => Math.random() - 0.5);
  }

  resolveQuiz(letter, correct) {
    const target = normalizeLetter(letter);
    const state = this.getLetter(target);
    if (!state) return { success: false, correct: false, state: null };

    state.attempts++;
    if (!correct) {
      this._save();
      return { success: true, correct: false, state };
    }

    const threshold = Math.min(state.dropsTowardQuiz, this.getQuizThreshold(target));
    state.correctAnswers++;
    state.dropsTowardQuiz = Math.max(0, state.dropsTowardQuiz - threshold);
    state.xp += threshold;
    const oldLevel = state.level;
    while (state.level < 7 && state.xp >= (LETTER_LEVEL_XP[state.level + 1] || Infinity)) {
      state.level++;
    }
    this.state.quizQueue = this.state.quizQueue.filter(q => q.letter !== target);
    this._queueReadyQuiz(target);
    this._save();
    return {
      success: true,
      correct: true,
      xpGained: threshold,
      oldLevel,
      newLevel: state.level,
      levelUp: state.level > oldLevel,
      state,
    };
  }

  hasPassedLetter(letter) {
    const state = this.getLetter(letter);
    return !!state && state.correctAnswers > 0;
  }

  allLettersPassed(letters = []) {
    return letters.every(letter => this.hasPassedLetter(letter));
  }

  spendGrenadeCharge() {
    if ((this.state.grenade.charges || 0) <= 0) return false;
    this.state.grenade.charges--;
    this._save();
    return true;
  }

  spendMissileCharge() {
    if ((this.state.missile.charges || 0) <= 0) return false;
    this.state.missile.charges--;
    this._save();
    return true;
  }

  purchase(id, coins) {
    const cost = this.getPurchaseCost(id);
    if (cost == null) return { success: false, error: 'Unavailable', coins };
    if (coins < cost) return { success: false, error: 'Not enough coins', coins };

    const nextCoins = coins - cost;
    switch (id) {
      case 'pickaxe_width':
        this.state.pickaxeWidth++;
        break;
      case 'grenade_unlock':
        this.state.grenade.unlocked = true;
        break;
      case 'grenade_radius':
        this.state.grenade.radiusLevel++;
        break;
      case 'grenade_cooldown':
        this.state.grenade.cooldownLevel++;
        break;
      case 'grenade_cap':
        this.state.grenade.chargeCapLevel++;
        break;
      case 'grenade_charge':
        this.state.grenade.charges++;
        break;
      case 'missile_unlock':
        this.state.missile.unlocked = true;
        break;
      case 'missile_radius':
        this.state.missile.radiusLevel++;
        break;
      case 'missile_cooldown':
        this.state.missile.cooldownLevel++;
        break;
      case 'missile_count':
        this.state.missile.countLevel++;
        break;
      case 'missile_charge':
        this.state.missile.charges++;
        break;
      case 'round_time':
        this.state.roundTimeLevel++;
        break;
      case 'letter_drop':
        this.state.letterDropLevel++;
        break;
      default:
        return { success: false, error: 'Unavailable', coins };
    }
    this._save();
    return { success: true, cost, coins: nextCoins };
  }

  getPurchaseCost(id) {
    switch (id) {
      case 'pickaxe_width':
        return this.getNextPickaxeWidthCost();
      case 'grenade_unlock':
        return this.getPickaxeWidth() >= 3 && !this.state.grenade.unlocked ? 250 : null;
      case 'grenade_radius':
        return this.state.grenade.unlocked && this.state.grenade.radiusLevel < 4 ? 160 * (this.state.grenade.radiusLevel + 1) : null;
      case 'grenade_cooldown':
        return this.state.grenade.unlocked && this.state.grenade.cooldownLevel < 4 ? 220 * (this.state.grenade.cooldownLevel + 1) : null;
      case 'grenade_cap':
        return this.state.grenade.unlocked && this.state.grenade.chargeCapLevel < 3 ? 300 * (this.state.grenade.chargeCapLevel + 1) : null;
      case 'grenade_charge':
        return this.state.grenade.unlocked && this.state.grenade.charges < this.getGrenadeChargeCap() ? 90 : null;
      case 'missile_unlock':
        return this.getPickaxeWidth() >= 4 && this.state.grenade.unlocked && !this.state.missile.unlocked ? 1500 : null;
      case 'missile_radius':
        return this.state.missile.unlocked && this.state.missile.radiusLevel < 3 ? 700 * (this.state.missile.radiusLevel + 1) : null;
      case 'missile_cooldown':
        return this.state.missile.unlocked && this.state.missile.cooldownLevel < 4 ? 850 * (this.state.missile.cooldownLevel + 1) : null;
      case 'missile_count':
        return this.state.missile.unlocked && this.state.missile.countLevel < 3 ? 1000 * (this.state.missile.countLevel + 1) : null;
      case 'missile_charge':
        return this.state.missile.unlocked && this.state.missile.charges < 2 ? 650 : null;
      case 'round_time':
        return ROUND_TIME_COSTS[this.state.roundTimeLevel] ?? null;
      case 'letter_drop':
        return LETTER_DROP_COSTS[this.state.letterDropLevel] ?? null;
      default:
        return null;
    }
  }

  getCards() {
    return [
      {
        id: 'pickaxe_width',
        category: 'Mining',
        name: `Pickaxe Width ${this.getPickaxeWidth()}`,
        desc: `Break up to ${this.getPickaxeWidth()} block${this.getPickaxeWidth() === 1 ? '' : 's'} per swing.`,
        value: `${this.getPickaxeWidth()}/6`,
        cost: this.getPurchaseCost('pickaxe_width'),
      },
      {
        id: 'round_time',
        category: 'Mining',
        name: 'Longer Rounds',
        desc: `Start each round with +${(this.state.roundTimeLevel || 0) * 15}s.`,
        value: `${this.state.roundTimeLevel}/6`,
        cost: this.getPurchaseCost('round_time'),
      },
      {
        id: 'letter_drop',
        category: 'Alphabet',
        name: 'Letter Drops',
        desc: 'More mining finds become letter-meter fuel.',
        value: `${this.state.letterDropLevel}/5`,
        cost: this.getPurchaseCost('letter_drop'),
      },
      {
        id: 'grenade_unlock',
        category: 'Explosives',
        name: this.state.grenade.unlocked ? 'Grenades Online' : 'Unlock Grenades',
        desc: this.state.grenade.unlocked ? `Cooldown ${this.getGrenadeCooldown().toFixed(1)}s, radius ${this.getGrenadeRadius().toFixed(1)}.` : 'Requires pickaxe width 3.',
        value: this.state.grenade.unlocked ? `${this.state.grenade.charges}/${this.getGrenadeChargeCap()} charges` : 'Locked',
        cost: this.getPurchaseCost('grenade_unlock'),
      },
      {
        id: 'grenade_charge',
        category: 'Explosives',
        name: 'Grenade Charge',
        desc: 'Stored charges bypass the grenade cooldown.',
        value: `${this.state.grenade.charges}/${this.getGrenadeChargeCap()}`,
        cost: this.getPurchaseCost('grenade_charge'),
      },
      {
        id: 'grenade_radius',
        category: 'Explosives',
        name: 'Grenade Radius',
        desc: 'Bigger blast for faster mining bursts.',
        value: `${this.state.grenade.radiusLevel}/4`,
        cost: this.getPurchaseCost('grenade_radius'),
      },
      {
        id: 'grenade_cooldown',
        category: 'Explosives',
        name: 'Grenade Cooldown',
        desc: 'Use grenades more often without spending charges.',
        value: `${this.state.grenade.cooldownLevel}/4`,
        cost: this.getPurchaseCost('grenade_cooldown'),
      },
      {
        id: 'grenade_cap',
        category: 'Explosives',
        name: 'Grenade Bandolier',
        desc: 'Carry more stored grenade charges.',
        value: `${this.getGrenadeChargeCap()} cap`,
        cost: this.getPurchaseCost('grenade_cap'),
      },
      {
        id: 'missile_unlock',
        category: 'Strike',
        name: this.state.missile.unlocked ? 'Missile Strike Online' : 'Unlock Missile Strike',
        desc: this.state.missile.unlocked ? `Cooldown ${this.getMissileCooldown().toFixed(0)}s, radius ${this.getMissileRadius().toFixed(1)}.` : 'Requires pickaxe width 4 and grenades.',
        value: this.state.missile.unlocked ? `${this.state.missile.charges}/2 beacons` : 'Locked',
        cost: this.getPurchaseCost('missile_unlock'),
      },
      {
        id: 'missile_charge',
        category: 'Strike',
        name: 'Strike Beacon',
        desc: 'Stored beacons bypass missile cooldown.',
        value: `${this.state.missile.charges}/2`,
        cost: this.getPurchaseCost('missile_charge'),
      },
      {
        id: 'missile_radius',
        category: 'Strike',
        name: 'Strike Radius',
        desc: 'Widen each missile impact.',
        value: `${this.state.missile.radiusLevel}/3`,
        cost: this.getPurchaseCost('missile_radius'),
      },
      {
        id: 'missile_cooldown',
        category: 'Strike',
        name: 'Strike Cooldown',
        desc: 'Call missile strikes more often.',
        value: `${this.state.missile.cooldownLevel}/4`,
        cost: this.getPurchaseCost('missile_cooldown'),
      },
      {
        id: 'missile_count',
        category: 'Strike',
        name: 'Missile Count',
        desc: 'Add more missiles to each strike call.',
        value: `${this.state.missile.countLevel}/3`,
        cost: this.getPurchaseCost('missile_count'),
      },
    ];
  }

  _queueReadyQuiz(letter) {
    const state = this.getLetter(letter);
    if (!state || state.level >= 7 || this.hasQueuedQuizFor(letter)) return false;
    const threshold = this.getQuizThreshold(letter);
    if (state.dropsTowardQuiz < threshold) return false;
    this.state.quizQueue.push({ letter: state.letter, threshold });
    return true;
  }

  _load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.state = { ...cloneState(DEFAULT_STATE), ...saved };
      this.state.grenade = { ...DEFAULT_STATE.grenade, ...(saved.grenade || {}) };
      this.state.missile = { ...DEFAULT_STATE.missile, ...(saved.missile || {}) };
      this.state.letters = this.state.letters || {};
      for (const letter of ALPHABET) {
        this.state.letters[letter] = { ...createLetterState(letter), ...(this.state.letters[letter] || {}) };
      }
      this.state.quizQueue = Array.isArray(this.state.quizQueue) ? this.state.quizQueue : [];
      this.state.zoneMined = this.state.zoneMined || {};
    } catch (error) {
      console.warn('[ProgressionManager] Failed to load:', error);
    }
  }

  _save() {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[ProgressionManager] Failed to save:', error);
    }
  }

  reset() {
    this.state = cloneState(DEFAULT_STATE);
    for (const letter of ALPHABET) {
      this.state.letters[letter] = createLetterState(letter);
    }
    this._save();
  }
}
