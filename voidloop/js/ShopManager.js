// ==========================================
// Voidloop — Shop Manager
// ==========================================

const SAVE_KEY = 'voidloop_progress_v1';

export const SHOP_ITEMS = [
  {
    id: 'water_pickaxe',
    name: 'Water Pickaxe',
    type: 'tool',
    cost: 500,
    description: 'Allows mining fire-zone blocks like lava and coal.',
    icon: '⛏️',
  },
  {
    id: 'water_suit',
    name: 'Water Suit',
    type: 'armor',
    cost: 800,
    description: 'Prevents burn damage in the fire zone. Grants a water aura.',
    icon: '🛡️',
  },
  {
    id: 'water_staff',
    name: 'Water Staff',
    type: 'weapon',
    cost: 600,
    description: 'Required to damage fire enemies. Fires water projectiles.',
    icon: '🔱',
  },
];

export const SHOP_UPGRADES = [
  { id: 'pick_tier', name: 'Upgrade Pickaxe', max: 4, cost: (lvl) => 50 * Math.pow(2, lvl), desc: 'Mine faster and harder blocks', category: 'tool' },
  { id: 'mine_speed', name: 'Mining Speed', max: 5, cost: (lvl) => 30 * (lvl + 1), desc: '+10% mining speed', category: 'tool' },
  { id: 'mine_luck', name: "Miner's Luck", max: 5, cost: (lvl) => 40 * (lvl + 1), desc: '+5% rare drop chance', category: 'tool' },
  { id: 'atk_dmg', name: 'Attack Damage', max: 10, cost: (lvl) => 25 * (lvl + 1), desc: '+2 damage per hit', category: 'combat' },
  { id: 'atk_speed', name: 'Attack Speed', max: 5, cost: (lvl) => 35 * (lvl + 1), desc: '+8% attack speed', category: 'combat' },
  { id: 'crit_chance', name: 'Critical Chance', max: 5, cost: (lvl) => 50 * (lvl + 1), desc: '+3% crit chance', category: 'combat' },
  { id: 'max_hp', name: 'Max Health', max: 10, cost: (lvl) => 20 * (lvl + 1), desc: '+10 max HP', category: 'spirit' },
  { id: 'max_stamina', name: 'Max Stamina', max: 5, cost: (lvl) => 20 * (lvl + 1), desc: '+10 max stamina', category: 'spirit' },
  { id: 'regen', name: 'Health Regen', max: 5, cost: (lvl) => 40 * (lvl + 1), desc: '+1 HP/sec regen', category: 'spirit' },
];

export class ShopManager {
  constructor(inventory) {
    this.inventory = inventory;
    this.coins = 0;
    this.upgradeLevels = {};
    for (const u of SHOP_UPGRADES) {
      this.upgradeLevels[u.id] = 0;
    }
    this._load();
  }

  setCoins(coins) {
    this.coins = coins;
  }

  canBuyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    if (this.inventory.hasItem(itemId)) return false;
    return this.coins >= item.cost;
  }

  buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };
    if (this.inventory.hasItem(itemId)) return { success: false, error: 'Already owned' };
    if (this.coins < item.cost) return { success: false, error: 'Not enough coins' };

    this.coins -= item.cost;
    this.inventory.addItem(itemId);
    this._save();
    return { success: true, item };
  }

  canBuyUpgrade(upgradeId) {
    const upgrade = SHOP_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    const lvl = this.upgradeLevels[upgradeId] || 0;
    if (lvl >= upgrade.max) return false;
    return this.coins >= upgrade.cost(lvl);
  }

  buyUpgrade(upgradeId) {
    const upgrade = SHOP_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return { success: false, error: 'Upgrade not found' };
    const lvl = this.upgradeLevels[upgradeId] || 0;
    if (lvl >= upgrade.max) return { success: false, error: 'Max level reached' };
    const cost = upgrade.cost(lvl);
    if (this.coins < cost) return { success: false, error: 'Not enough coins' };

    this.coins -= cost;
    this.upgradeLevels[upgradeId] = lvl + 1;
    this._save();
    return { success: true, upgrade, newLevel: lvl + 1 };
  }

  getUpgradeLevel(upgradeId) {
    return this.upgradeLevels[upgradeId] || 0;
  }

  getItemStatus(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return null;
    return {
      ...item,
      owned: this.inventory.hasItem(itemId),
      equipped: this.inventory.isEquipped(itemId),
      canAfford: this.coins >= item.cost,
    };
  }

  getUpgradeStatus(upgradeId) {
    const upgrade = SHOP_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return null;
    const lvl = this.upgradeLevels[upgradeId] || 0;
    return {
      ...upgrade,
      level: lvl,
      maxed: lvl >= upgrade.max,
      nextCost: lvl >= upgrade.max ? null : upgrade.cost(lvl),
      canAfford: lvl >= upgrade.max ? false : this.coins >= upgrade.cost(lvl),
    };
  }

  getAllItems() {
    return SHOP_ITEMS.map(i => this.getItemStatus(i.id));
  }

  getAllUpgrades() {
    return SHOP_UPGRADES.map(u => this.getUpgradeStatus(u.id));
  }

  _save() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      saved.shop = {
        upgradeLevels: this.upgradeLevels,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch (e) {
      console.warn('[ShopManager] Failed to save:', e);
    }
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (saved.shop && saved.shop.upgradeLevels) {
        this.upgradeLevels = saved.shop.upgradeLevels;
      }
    } catch (e) {
      console.warn('[ShopManager] Failed to load:', e);
    }
  }

  reset() {
    this.upgradeLevels = {};
    for (const u of SHOP_UPGRADES) {
      this.upgradeLevels[u.id] = 0;
    }
    this._save();
  }
}
