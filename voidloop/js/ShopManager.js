// ==========================================
// Voidloop — Shop Manager
// Zone-specific pickaxes, suits, staves + global upgrades
// ==========================================

const SAVE_KEY = 'voidloop_progress_v1';

/**
 * Zone-specific items: pickaxes, suits, staves.
 * Each zone (except Forest) requires buying its pickaxe to mine floating blocks there.
 */
export const SHOP_ITEMS = [
  // === Zone 1: Forest (starting gear, not in shop) ===

  // === Zone 2: Fire ===
  { id: 'fire_pickaxe', name: 'Fire Pickaxe', type: 'tool', cost: 5, description: 'Mines fire-zone floating blocks. Required for Ember Wastes.', icon: '🔥⛏️' },
  { id: 'fire_suit', name: 'Fire Suit', type: 'armor', cost: 800, description: 'Prevents burn damage in the Ember Wastes.', icon: '🔥🛡️' },
  { id: 'fire_staff', name: 'Fire Staff', type: 'weapon', cost: 600, description: 'Required to damage fire enemies.', icon: '🔥🔱' },

  // === Zone 3: Ice ===
  { id: 'ice_pickaxe', name: 'Ice Pickaxe', type: 'tool', cost: 5, description: 'Mines ice-zone floating blocks. Required for Frostpeak.', icon: '❄️⛏️' },
  { id: 'ice_suit', name: 'Ice Suit', type: 'armor', cost: 1200, description: 'Prevents freeze slowdown in Frostpeak.', icon: '❄️🛡️' },
  { id: 'ice_staff', name: 'Ice Staff', type: 'weapon', cost: 900, description: 'Required to damage ice enemies.', icon: '❄️🔱' },

  // === Zone 4: Desert ===
  { id: 'desert_pickaxe', name: 'Desert Pickaxe', type: 'tool', cost: 5, description: 'Mines desert-zone floating blocks. Required for Sandscape.', icon: '🏜️⛏️' },
  { id: 'desert_suit', name: 'Desert Suit', type: 'armor', cost: 2000, description: 'Prevents heat stamina drain in Sandscape.', icon: '🏜️🛡️' },
  { id: 'desert_staff', name: 'Desert Staff', type: 'weapon', cost: 1500, description: 'Required to damage desert enemies.', icon: '🏜️🔱' },

  // === Zone 5: Steelworks ===
  { id: 'steel_pickaxe', name: 'Steel Pickaxe', type: 'tool', cost: 5, description: 'Mines steelworks floating blocks. Required for Steelworks.', icon: '⚙️⛏️' },
  { id: 'ventilator_suit', name: 'Ventilator Suit', type: 'armor', cost: 3000, description: 'Prevents toxic fume damage in Steelworks.', icon: '⚙️🛡️' },
  { id: 'tesla_staff', name: 'Tesla Staff', type: 'weapon', cost: 2500, description: 'Required to damage steelworks enemies.', icon: '⚙️🔱' },

  // === Zone 6: Mire ===
  { id: 'mire_pickaxe', name: 'Mire Pickaxe', type: 'tool', cost: 5, description: 'Mines mire floating blocks. Required for Mire.', icon: '🌿⛏️' },
  { id: 'wading_boots', name: 'Wading Boots', type: 'armor', cost: 5000, description: 'Prevents quicksand slowdown in Mire.', icon: '🌿🛡️' },
  { id: 'vine_staff', name: 'Vine Staff', type: 'weapon', cost: 4000, description: 'Required to damage mire enemies.', icon: '🌿🔱' },

  // === Zone 7: Citadel ===
  { id: 'royal_pickaxe', name: 'Royal Pickaxe', type: 'tool', cost: 5, description: 'Mines citadel floating blocks. Required for Citadel.', icon: '👑⛏️' },
  { id: 'royal_shield', name: 'Royal Shield', type: 'armor', cost: 8000, description: 'Prevents curse stuns in Citadel.', icon: '👑🛡️' },
  { id: 'scepter', name: 'Scepter', type: 'weapon', cost: 6000, description: 'Required to damage citadel enemies.', icon: '👑🔱' },
];

/**
 * Pickaxe tier upgrades — bought per-zone after owning the base pickaxe.
 * These are separate from SHOP_ITEMS because they're upgrades, not new items.
 */
export const PICKAXE_TIER_UPGRADES = [
  { zoneId: 'forest', tiers: [
    { tier: 2, cost: 150 },
    { tier: 3, cost: 400 },
    { tier: 4, cost: 800 },
  ]},
  { zoneId: 'fire', tiers: [
    { tier: 2, cost: 500 },
    { tier: 3, cost: 1000 },
    { tier: 4, cost: 2000 },
  ]},
  { zoneId: 'ice', tiers: [
    { tier: 2, cost: 1000 },
    { tier: 3, cost: 2000 },
    { tier: 4, cost: 4000 },
  ]},
  { zoneId: 'desert', tiers: [
    { tier: 2, cost: 2000 },
    { tier: 3, cost: 4000 },
    { tier: 4, cost: 8000 },
  ]},
  { zoneId: 'steelworks', tiers: [
    { tier: 2, cost: 4000 },
    { tier: 3, cost: 8000 },
    { tier: 4, cost: 15000 },
  ]},
  { zoneId: 'mire', tiers: [
    { tier: 2, cost: 7000 },
    { tier: 3, cost: 14000 },
    { tier: 4, cost: 25000 },
  ]},
  { zoneId: 'citadel', tiers: [
    { tier: 2, cost: 10000 },
    { tier: 3, cost: 20000 },
    { tier: 4, cost: 40000 },
  ]},
];

export const SHOP_UPGRADES = [
  { id: 'pick_tier', name: 'Upgrade Pickaxe', max: 4, cost: (lvl) => 50 * Math.pow(2, lvl), desc: '+1 mine damage per level. Mine blocks in fewer hits.', category: 'tool' },
  { id: 'mine_speed', name: 'Mining Speed', max: 5, cost: (lvl) => 30 * (lvl + 1), desc: '+10% swing speed per level. Stackable up to +50%.', category: 'tool' },
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
    // Zone pickaxe tiers: which tier (1-4) each zone's pickaxe is at
    this.pickaxeTiers = {};
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
    // Auto-equip pickaxes
    if (item.type === 'tool') this.inventory.equip(itemId, 'tool');
    if (item.type === 'armor') this.inventory.equip(itemId, 'armor');
    if (item.type === 'weapon') this.inventory.equip(itemId, 'weapon');
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

  /**
   * Get the current pickaxe tier for a zone (1-4).
   * Forest starts at tier 1. Other zones start at 0 (no pickaxe).
   */
  getPickaxeTier(zoneId) {
    return this.pickaxeTiers[zoneId] || (zoneId === 'forest' ? 1 : 0);
  }

  /**
   * Upgrade a zone's pickaxe to the next tier.
   */
  upgradePickaxeTier(zoneId) {
    const currentTier = this.getPickaxeTier(zoneId);
    if (currentTier >= 4) return { success: false, error: 'Max tier reached' };

    // Find the upgrade cost
    const zoneUpgrades = PICKAXE_TIER_UPGRADES.find(z => z.zoneId === zoneId);
    if (!zoneUpgrades) return { success: false, error: 'Zone not found' };

    const nextTier = currentTier + 1;
    const tierData = zoneUpgrades.tiers.find(t => t.tier === nextTier);
    if (!tierData) return { success: false, error: 'Tier not found' };

    if (this.coins < tierData.cost) return { success: false, error: 'Not enough coins' };

    this.coins -= tierData.cost;
    this.pickaxeTiers[zoneId] = nextTier;
    this._save();
    return { success: true, zoneId, newTier: nextTier };
  }

  canUpgradePickaxeTier(zoneId) {
    const currentTier = this.getPickaxeTier(zoneId);
    if (currentTier >= 4) return false;
    const zoneUpgrades = PICKAXE_TIER_UPGRADES.find(z => z.zoneId === zoneId);
    if (!zoneUpgrades) return false;
    const tierData = zoneUpgrades.tiers.find(t => t.tier === currentTier + 1);
    if (!tierData) return false;
    return this.coins >= tierData.cost;
  }

  getPickaxeTierStatus(zoneId) {
    const currentTier = this.getPickaxeTier(zoneId);
    const zoneUpgrades = PICKAXE_TIER_UPGRADES.find(z => z.zoneId === zoneId);
    const nextTierData = zoneUpgrades?.tiers.find(t => t.tier === currentTier + 1);
    return {
      zoneId,
      currentTier,
      maxed: currentTier >= 4,
      nextCost: nextTierData ? nextTierData.cost : null,
      canAfford: nextTierData ? this.coins >= nextTierData.cost : false,
    };
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
        pickaxeTiers: this.pickaxeTiers,
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
      if (saved.shop && saved.shop.pickaxeTiers) {
        this.pickaxeTiers = saved.shop.pickaxeTiers;
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
    this.pickaxeTiers = {};
    this._save();
  }
}
