// ==========================================
// Voidloop — Player Inventory Manager
// ==========================================

const SAVE_KEY = 'voidloop_progress_v1';

export class Inventory {
  constructor() {
    this.items = {};
    this.equipped = {
      tool: null,
      armor: null,
      weapon: null,
    };
    this._load();
  }

  hasItem(itemId) {
    return !!this.items[itemId]?.owned;
  }

  getItem(itemId) {
    return this.items[itemId] || null;
  }

  addItem(itemId) {
    if (!this.items[itemId]) {
      this.items[itemId] = { owned: true, equipped: false };
    } else {
      this.items[itemId].owned = true;
    }
    this._save();
  }

  equip(itemId, slot) {
    if (!this.hasItem(itemId)) return false;
    // Unequip previous item in slot
    if (this.equipped[slot]) {
      const prev = this.items[this.equipped[slot]];
      if (prev) prev.equipped = false;
    }
    this.equipped[slot] = itemId;
    this.items[itemId].equipped = true;
    this._save();
    return true;
  }

  unequip(slot) {
    if (this.equipped[slot]) {
      const prev = this.items[this.equipped[slot]];
      if (prev) prev.equipped = false;
      this.equipped[slot] = null;
      this._save();
    }
  }

  getEquipped(slot) {
    return this.equipped[slot];
  }

  isEquipped(itemId) {
    return this.items[itemId]?.equipped || false;
  }

  getEquippedTool() {
    return this.equipped.tool;
  }

  getEquippedArmor() {
    return this.equipped.armor;
  }

  getEquippedWeapon() {
    return this.equipped.weapon;
  }

  getAllItems() {
    return { ...this.items };
  }

  reset() {
    this.items = {};
    this.equipped = { tool: null, armor: null, weapon: null };
    this._save();
  }

  _save() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      saved.inventory = {
        items: this.items,
        equipped: this.equipped,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch (e) {
      console.warn('[Inventory] Failed to save:', e);
    }
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (saved.inventory) {
        this.items = saved.inventory.items || {};
        this.equipped = saved.inventory.equipped || { tool: null, armor: null, weapon: null };
      }
    } catch (e) {
      console.warn('[Inventory] Failed to load:', e);
    }
  }
}
