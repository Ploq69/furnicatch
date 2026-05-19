// ==========================================
// Voidloop — Resource Inventory
// Tracks resources dropped from floating blocks per zone.
// ==========================================

const SAVE_KEY = 'voidloop_progress_v1';

/**
 * All resource types in the game.
 */
export const RESOURCE_TYPES = [
  // Demo / ourCraft resources
  'stone', 'dirt', 'iron_ore', 'copper_ore', 'gold_ore',

  // Dig junk
  'loose_dirt', 'gravel_bits', 'scrap_stone', 'old_junk',

  // Forest
  'moss_chip', 'crystal_shard', 'amber', 'ancient_bark',
  // Fire
  'ash', 'magma_shard', 'obsidian_fragment', 'ember_essence',
  // Ice
  'ice_chunk', 'frost_shard', 'glacial_metal', 'blizzard_essence',
  // Desert
  'sand', 'desert_shard', 'gold_nugget', 'solar_essence',
  // Steelworks
  'rust_chunk', 'gear_shard', 'alloy_ingot', 'furnace_ember',
  // Mire
  'mud_pie', 'moss_clump', 'petrified_bark', 'mire_essence',
  // Citadel
  'brick_chip', 'royal_shard', 'crown_jewel',
];

/**
 * Resource display names and coin values for selling.
 */
export const RESOURCE_META = {
  stone:              { name: 'Stone',              value: 2 },
  dirt:               { name: 'Dirt',               value: 1 },
  iron_ore:           { name: 'Iron Ore',           value: 5 },
  copper_ore:         { name: 'Copper Ore',         value: 4 },
  gold_ore:           { name: 'Gold Ore',           value: 10 },

  loose_dirt:         { name: 'Loose Dirt',         value: 1 },
  gravel_bits:        { name: 'Gravel Bits',        value: 1 },
  scrap_stone:        { name: 'Scrap Stone',        value: 2 },
  old_junk:           { name: 'Old Junk',           value: 3 },

  moss_chip:          { name: 'Moss Chip',          value: 5 },
  crystal_shard:      { name: 'Crystal Shard',      value: 10 },
  amber:              { name: 'Amber',              value: 20 },
  ancient_bark:       { name: 'Ancient Bark',       value: 35 },
  ash:                { name: 'Ash',                value: 8 },
  magma_shard:        { name: 'Magma Shard',        value: 15 },
  obsidian_fragment:  { name: 'Obsidian Fragment',  value: 30 },
  ember_essence:      { name: 'Ember Essence',      value: 50 },
  ice_chunk:          { name: 'Ice Chunk',          value: 10 },
  frost_shard:        { name: 'Frost Shard',        value: 20 },
  glacial_metal:      { name: 'Glacial Metal',      value: 40 },
  blizzard_essence:   { name: 'Blizzard Essence',   value: 65 },
  sand:               { name: 'Sand',               value: 12 },
  desert_shard:       { name: 'Desert Shard',       value: 25 },
  gold_nugget:        { name: 'Gold Nugget',        value: 50 },
  solar_essence:      { name: 'Solar Essence',      value: 80 },
  rust_chunk:         { name: 'Rust Chunk',         value: 15 },
  gear_shard:         { name: 'Gear Shard',         value: 30 },
  alloy_ingot:        { name: 'Alloy Ingot',        value: 60 },
  furnace_ember:      { name: 'Furnace Ember',      value: 100 },
  mud_pie:            { name: 'Mud Pie',            value: 18 },
  moss_clump:         { name: 'Moss Clump',         value: 35 },
  petrified_bark:     { name: 'Petrified Bark',     value: 70 },
  mire_essence:       { name: 'Mire Essence',       value: 120 },
  brick_chip:         { name: 'Brick Chip',         value: 20 },
  royal_shard:        { name: 'Royal Shard',        value: 40 },
  crown_jewel:        { name: 'Crown Jewel',        value: 150 },
};

export class ResourceInventory {
  constructor() {
    this.resources = {};
    this._saveTimer = null;
    for (const r of RESOURCE_TYPES) {
      this.resources[r] = 0;
    }
    this._load();
    if (typeof window !== 'undefined') {
      window.addEventListener?.('pagehide', () => this._flushSave());
      window.addEventListener?.('beforeunload', () => this._flushSave());
    }
  }

  add(resourceType, amount = 1) {
    if (!this.resources.hasOwnProperty(resourceType)) {
      console.warn('[ResourceInventory] Unknown resource:', resourceType);
      return false;
    }
    this.resources[resourceType] += amount;
    this._saveSoon();
    return true;
  }

  remove(resourceType, amount = 1) {
    if (!this.resources.hasOwnProperty(resourceType)) return false;
    if (this.resources[resourceType] < amount) return false;
    this.resources[resourceType] -= amount;
    this._save();
    return true;
  }

  get(resourceType) {
    return this.resources[resourceType] || 0;
  }

  has(resourceType, amount = 1) {
    return (this.resources[resourceType] || 0) >= amount;
  }

  /**
   * Sell a resource for coins.
   * @param {string} resourceType
   * @param {number} amount
   * @returns {number} coins earned, or 0 if failed
   */
  sell(resourceType, amount = 1) {
    const meta = RESOURCE_META[resourceType];
    if (!meta) return 0;
    if (!this.remove(resourceType, amount)) return 0;
    return meta.value * amount;
  }

  getSellValue(resourceType, amount = 1) {
    const meta = RESOURCE_META[resourceType];
    if (!meta) return 0;
    return meta.value * amount;
  }

  getAll() {
    return Object.entries(this.resources)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        name: RESOURCE_META[type]?.name || type,
        value: RESOURCE_META[type]?.value || 0,
      }));
  }

  _save() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      saved.resources = this.resources;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch (e) {
      console.warn('[ResourceInventory] Failed to save:', e);
    }
  }

  _saveSoon(delayMs = 350) {
    if (typeof window === 'undefined') {
      this._save();
      return;
    }
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._save();
    }, delayMs);
  }

  _flushSave() {
    if (!this._saveTimer) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    this._save();
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (saved.resources) {
        for (const key of RESOURCE_TYPES) {
          this.resources[key] = saved.resources[key] || 0;
        }
      }
    } catch (e) {
      console.warn('[ResourceInventory] Failed to load:', e);
    }
  }

  reset() {
    for (const r of RESOURCE_TYPES) {
      this.resources[r] = 0;
    }
    this._save();
  }
}
