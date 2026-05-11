// ==========================================
// Voidloop — Zone State Manager
// ==========================================

import { ZONES, getZoneById, getZoneAtPosition } from './ZoneData.js';

const SAVE_KEY = 'voidloop_progress_v1';

export class ZoneManager {
  constructor() {
    this.unlockedZones = new Set(['forest']);
    this.currentZoneId = 'forest';
    this._load();
  }

  isZoneUnlocked(zoneId) {
    return this.unlockedZones.has(zoneId);
  }

  unlockZone(zoneId) {
    const zone = getZoneById(zoneId);
    if (!zone) return false;
    if (this.unlockedZones.has(zoneId)) return false;
    this.unlockedZones.add(zoneId);
    this._save();
    return true;
  }

  getCurrentZone() {
    return getZoneById(this.currentZoneId);
  }

  setCurrentZone(zoneId) {
    if (!this.isZoneUnlocked(zoneId)) return false;
    this.currentZoneId = zoneId;
    return true;
  }

  getZoneForPosition(x, z) {
    return getZoneAtPosition(x, z);
  }

  checkGateway(zoneId, inventory) {
    const zone = getZoneById(zoneId);
    if (!zone || !zone.entryRequirements) return { allowed: true, missing: [] };
    if (this.isZoneUnlocked(zoneId)) return { allowed: true, missing: [] };

    const missing = [];
    const req = zone.entryRequirements;

    // Check water_pickaxe requirement
    if (req.pickaxe && !inventory.hasItem(req.pickaxe)) {
      missing.push({ type: 'pickaxe', item: req.pickaxe, label: 'Water Pickaxe' });
    }
    // Check water_suit requirement
    if (req.suit && !inventory.hasItem(req.suit)) {
      missing.push({ type: 'suit', item: req.suit, label: 'Water Suit' });
    }
    // Check water_staff requirement
    if (req.weapon && !inventory.hasItem(req.weapon)) {
      missing.push({ type: 'weapon', item: req.weapon, label: 'Water Staff' });
    }

    return { allowed: missing.length === 0, missing };
  }

  getGatewayStatus(zoneId, inventory) {
    const zone = getZoneById(zoneId);
    if (!zone) return null;
    const unlocked = this.isZoneUnlocked(zoneId);
    const check = this.checkGateway(zoneId, inventory);
    return {
      zoneId,
      zoneName: zone.name,
      unlocked,
      canEnter: check.allowed,
      missing: check.missing,
    };
  }

  getAllZones() {
    return ZONES.map(z => ({
      ...z,
      unlocked: this.isZoneUnlocked(z.id),
    }));
  }

  _save() {
    try {
      const data = {
        unlockedZones: Array.from(this.unlockedZones),
        currentZoneId: this.currentZoneId,
      };
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      saved.zones = data;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch (e) {
      console.warn('[ZoneManager] Failed to save:', e);
    }
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (saved.zones) {
        this.unlockedZones = new Set(saved.zones.unlockedZones || ['forest']);
        this.currentZoneId = saved.zones.currentZoneId || 'forest';
      }
    } catch (e) {
      console.warn('[ZoneManager] Failed to load:', e);
    }
  }

  reset() {
    this.unlockedZones = new Set(['forest']);
    this.currentZoneId = 'forest';
    this._save();
  }
}
