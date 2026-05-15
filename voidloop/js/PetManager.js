import { PET_LEVELS } from './constants.js';

const STORAGE_KEY = 'voidloopPetManagerV2';
const SPELLINGS_TO_UNLOCK = 10;

function createDefaultPet(letter) {
  return {
    letter,
    unlocked: false,
    level: 1,
    captures: 0,
    spellingsCorrect: 0,
    spellingsAttempted: 0,
  };
}

export class PetManager {
  constructor() {
    this.equippedLetter = null;
    this.pets = new Map();
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      this.pets.set(letter, createDefaultPet(letter));
    }
    this._load();
  }

  getPet(letter) {
    return this.pets.get(String(letter).toUpperCase());
  }

  getAllPets() {
    return Array.from(this.pets.values());
  }

  getEquippedPet() {
    return this.equippedLetter ? this.getPet(this.equippedLetter) : null;
  }

  equip(letter) {
    const pet = this.getPet(letter);
    if (!pet || !pet.unlocked) return false;
    this.equippedLetter = pet.letter;
    this._save();
    return true;
  }

  unequip() {
    this.equippedLetter = null;
    this._save();
  }

  /**
   * Record a spelling attempt for a letter.
   * @param {string} letter
   * @param {boolean} correct - whether the spelling was correct
   * @returns {object} { unlocked, wasUnlocked, spellingsCorrect, spellingsNeeded, levelUp, oldLevel, newLevel }
   */
  recordSpelling(letter, correct) {
    const pet = this.getPet(letter);
    if (!pet) return { unlocked: false, wasUnlocked: false, spellingsCorrect: 0, spellingsNeeded: SPELLINGS_TO_UNLOCK, levelUp: false, oldLevel: 1, newLevel: 1 };

    const wasUnlocked = pet.unlocked;
    pet.spellingsAttempted++;

    if (correct) {
      pet.spellingsCorrect++;

      // Check unlock at 10 correct spellings
      if (!pet.unlocked && pet.spellingsCorrect >= SPELLINGS_TO_UNLOCK) {
        pet.unlocked = true;
      }

      // Captures for leveling = spellings after unlock
      if (pet.unlocked) {
        pet.captures++;
      }
    }

    const oldLevel = pet.level;
    const newLevel = this._computeLevel(pet.captures);
    pet.level = newLevel;

    const levelUp = newLevel > oldLevel;
    this._save();

    return {
      unlocked: pet.unlocked,
      wasUnlocked,
      spellingsCorrect: pet.spellingsCorrect,
      spellingsNeeded: SPELLINGS_TO_UNLOCK,
      levelUp,
      oldLevel,
      newLevel,
      letter: pet.letter,
    };
  }

  recordMastery(letter, masteryState) {
    const pet = this.getPet(letter);
    if (!pet || !masteryState) {
      return { unlocked: false, wasUnlocked: false, levelUp: false, oldLevel: 1, newLevel: 1 };
    }

    const wasUnlocked = pet.unlocked;
    const oldLevel = pet.level;
    pet.unlocked = (masteryState.correctAnswers || 0) > 0;
    pet.level = masteryState.level || 1;
    pet.captures = masteryState.xp || 0;
    pet.spellingsCorrect = masteryState.correctAnswers || 0;
    pet.spellingsAttempted = masteryState.attempts || 0;
    this._save();

    return {
      unlocked: pet.unlocked,
      wasUnlocked,
      levelUp: pet.level > oldLevel,
      oldLevel,
      newLevel: pet.level,
      letter: pet.letter,
    };
  }

  /**
   * Get unlock progress for a letter.
   * @param {string} letter
   * @returns {object} { current, required, unlocked, pct }
   */
  getUnlockProgress(letter) {
    const pet = this.getPet(letter);
    if (!pet) return { current: 0, required: SPELLINGS_TO_UNLOCK, unlocked: false, pct: 0 };
    return {
      current: pet.spellingsCorrect,
      required: SPELLINGS_TO_UNLOCK,
      unlocked: pet.unlocked,
      pct: Math.min(1, pet.spellingsCorrect / SPELLINGS_TO_UNLOCK),
    };
  }

  getLevelConfig(level) {
    return PET_LEVELS.find(l => l.level === level) || PET_LEVELS[0];
  }

  getCapturesForNextLevel(captures) {
    for (const cfg of PET_LEVELS) {
      if (captures < cfg.capturesRequired) return cfg.capturesRequired;
    }
    return PET_LEVELS[PET_LEVELS.length - 1].capturesRequired;
  }

  _computeLevel(captures) {
    let level = 1;
    for (const cfg of PET_LEVELS) {
      if (captures >= cfg.capturesRequired) level = cfg.level;
      else break;
    }
    return level;
  }

  _save() {
    try {
      const data = {
        equippedLetter: this.equippedLetter,
        pets: Array.from(this.pets.entries()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[PetManager] Failed to save:', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Try migrating from old v1 format
        this._migrateFromV1();
        return;
      }
      const data = JSON.parse(raw);
      if (data.equippedLetter) this.equippedLetter = data.equippedLetter;
      if (Array.isArray(data.pets)) {
        for (const [letter, petData] of data.pets) {
          const pet = this.pets.get(letter);
          if (pet) {
            pet.unlocked = petData.unlocked ?? false;
            pet.level = petData.level ?? 1;
            pet.captures = petData.captures ?? 0;
            pet.spellingsCorrect = petData.spellingsCorrect ?? (petData.captures ?? 0);
            pet.spellingsAttempted = petData.spellingsAttempted ?? (petData.captures ?? 0);
          }
        }
      }
    } catch (e) {
      console.warn('[PetManager] Failed to load:', e);
    }
  }

  _migrateFromV1() {
    try {
      const oldRaw = localStorage.getItem('voidloopPetManagerV1');
      if (!oldRaw) return;
      const oldData = JSON.parse(oldRaw);
      if (oldData.equippedLetter) this.equippedLetter = oldData.equippedLetter;
      if (Array.isArray(oldData.pets)) {
        for (const [letter, petData] of oldData.pets) {
          const pet = this.pets.get(letter);
          if (pet) {
            pet.unlocked = petData.unlocked ?? false;
            pet.level = petData.level ?? 1;
            pet.captures = Math.max(0, (petData.captures ?? 0) - SPELLINGS_TO_UNLOCK);
            pet.spellingsCorrect = petData.captures ?? 0;
            pet.spellingsAttempted = petData.captures ?? 0;
          }
        }
      }
      this._save();
    } catch (e) {
      console.warn('[PetManager] V1 migration failed:', e);
    }
  }
}
