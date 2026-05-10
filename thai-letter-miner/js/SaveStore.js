import { UPGRADE_DEFS } from './config.js';

const DEFAULT_SAVE = {
  trash: 0,
  runsCompleted: 0,
  blocksBroken: 0,
  totalDiscoveries: 0,
  masteryPrestiged: false,
  tonePrestigeReady: false,
  upgrades: {},
  captures: {},
  activePets: [],
  studyChests: [],
  escapedBundles: [],
};

export class SaveStore {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.data = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      const data = { ...DEFAULT_SAVE, ...(parsed || {}) };
      data.upgrades ||= {};
      data.captures ||= {};
      data.activePets ||= [];
      data.studyChests ||= [];
      data.escapedBundles ||= [];
      for (const def of UPGRADE_DEFS) data.upgrades[def.id] ||= 0;
      return data;
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  upgradeLevel(id) {
    return this.data.upgrades[id] || 0;
  }

  setUpgradeLevel(id, level) {
    this.data.upgrades[id] = level;
    this.save();
  }

  addTrash(amount) {
    this.data.trash += Math.max(0, Math.floor(amount));
    this.save();
  }

  spendTrash(amount) {
    if (this.data.trash < amount) return false;
    this.data.trash -= amount;
    this.save();
    return true;
  }

  getRecord(itemId) {
    if (!this.data.captures[itemId]) {
      this.data.captures[itemId] = {
        captures: 0,
        level: 1,
        quizCorrect: 0,
        quizMissed: 0,
        lastSeen: 0,
        category: null,
      };
    }
    return this.data.captures[itemId];
  }

  recordDiscovery(item) {
    const record = this.getRecord(item.id);
    record.lastSeen = Date.now();
    record.category = item.category;
    this.data.totalDiscoveries += 1;
    this.save();
  }

  recordCapture(item, amount = 1) {
    const record = this.getRecord(item.id);
    record.captures += amount;
    record.quizCorrect += 1;
    record.category = item.category;
    record.level = 1 + Math.floor(Math.sqrt(record.captures));
    if (!this.data.activePets.includes(item.id) && this.data.activePets.length < this.petSlots()) {
      this.data.activePets.push(item.id);
    }
    this.checkTonePrestigeReady();
    this.save();
    return record;
  }

  recordMiss(item, bundleSize = 1) {
    const record = this.getRecord(item.id);
    record.quizMissed += 1;
    record.category = item.category;
    this.data.escapedBundles.push({ itemId: item.id, bundleSize, at: Date.now() });
    this.save();
  }

  petSlots() {
    return 1 + this.upgradeLevel('pet_slot');
  }

  completeRun() {
    this.data.runsCompleted += 1;
    this.checkTonePrestigeReady();
    this.save();
  }

  addStudyChest(chest) {
    this.data.studyChests.push({ ...chest, id: `chest_${Date.now()}_${Math.random().toString(16).slice(2)}` });
    this.save();
  }

  removeStudyChest(chestId) {
    this.data.studyChests = this.data.studyChests.filter((chest) => chest.id !== chestId);
    this.save();
  }

  checkTonePrestigeReady() {
    const capturedIds = Object.entries(this.data.captures)
      .filter(([, record]) => record.captures > 0)
      .map(([id]) => id);
    this.data.tonePrestigeReady = capturedIds.length >= 67;
    return this.data.tonePrestigeReady;
  }

  tonePrestige() {
    if (!this.data.tonePrestigeReady) return false;
    const totalCaptures = Object.values(this.data.captures).reduce((sum, item) => sum + item.captures, 0);
    this.data = {
      ...structuredClone(DEFAULT_SAVE),
      masteryPrestiged: true,
      trash: Math.floor(totalCaptures / 3),
      captures: this.data.captures,
      upgrades: Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, 0])),
    };
    this.save();
    return true;
  }
}
