import { PET_LEVELS } from './constants.js';

const STORAGE_KEY = 'voidloopPetManagerV1';

function createDefaultPet(letter) {
  return {
    letter,
    unlocked: false,
    level: 1,
    captures: 0,
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

  recordCapture(letter) {
    const pet = this.getPet(letter);
    if (!pet) return { levelUp: false, oldLevel: 1, newLevel: 1 };

    const wasUnlocked = pet.unlocked;
    pet.unlocked = true;
    pet.captures++;

    const oldLevel = pet.level;
    const newLevel = this._computeLevel(pet.captures);
    pet.level = newLevel;

    const levelUp = newLevel > oldLevel;
    this._save();

    return {
      levelUp,
      oldLevel,
      newLevel,
      unlocked: !wasUnlocked,
      letter: pet.letter,
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
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.equippedLetter) this.equippedLetter = data.equippedLetter;
      if (Array.isArray(data.pets)) {
        for (const [letter, petData] of data.pets) {
          const pet = this.pets.get(letter);
          if (pet) {
            pet.unlocked = petData.unlocked ?? false;
            pet.level = petData.level ?? 1;
            pet.captures = petData.captures ?? 0;
          }
        }
      }
    } catch (e) {
      console.warn('[PetManager] Failed to load:', e);
    }
  }
}
