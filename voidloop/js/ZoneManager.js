// ==========================================
// Voidloop — Zone State Manager
// ==========================================

import { ZONES, getZoneById, getZoneAtPosition } from './ZoneData.js';

const SAVE_KEY = 'voidloop_progress_v1';

export class ZoneManager {
  constructor() {
    this.unlockedZones = new Set(['forest']);
    this.completedZones = new Set();
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

  isZoneCompleted(zoneId) {
    return this.completedZones.has(zoneId);
  }

  markZoneCompleted(zoneId) {
    const zone = getZoneById(zoneId);
    if (!zone) return false;
    if (this.completedZones.has(zoneId)) return false;
    this.completedZones.add(zoneId);
    this._save();
    return true;
  }

  getCurrentZone() {
    return getZoneById(this.currentZoneId);
  }

  setCurrentZone(zoneId) {
    if (!this.isZoneUnlocked(zoneId)) return false;
    this.currentZoneId = zoneId;
    this._save();
    return true;
  }

  getPreviousZoneId(zoneId) {
    const zone = getZoneById(zoneId);
    if (!zone || zone.order <= 1) return null;
    const previous = ZONES.find(z => z.order === zone.order - 1);
    return previous ? previous.id : null;
  }

  getZoneForPosition(x, z) {
    return getZoneAtPosition(x, z);
  }

  checkGateway(zoneId, inventory) {
    const zone = getZoneById(zoneId);
    if (!zone) return { allowed: false, missing: [{ type: 'zone', item: zoneId, label: '❓' }] };
    if (zone.id === 'forest') return { allowed: true, missing: [] };
    if (this.isZoneUnlocked(zoneId)) return { allowed: true, missing: [] };

    const missing = [];
    const previousZoneId = this.getPreviousZoneId(zoneId);

    if (previousZoneId && !this.isZoneCompleted(previousZoneId)) {
      missing.push({ type: 'complete', item: previousZoneId, label: '✅' });
    }
    if (zone.pickaxeId && !inventory.isEquipped(zone.pickaxeId)) {
      missing.push({ type: 'pickaxe', item: zone.pickaxeId, label: '⛏️' });
    }
    if (zone.suitId && !inventory.isEquipped(zone.suitId)) {
      missing.push({ type: 'suit', item: zone.suitId, label: '🛡️' });
    }
    if (zone.staffId && !inventory.isEquipped(zone.staffId)) {
      missing.push({ type: 'weapon', item: zone.staffId, label: '🔱' });
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
      completed: this.isZoneCompleted(z.id),
    }));
  }

  _save() {
    try {
      const data = {
        unlockedZones: Array.from(this.unlockedZones),
        completedZones: Array.from(this.completedZones),
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
        this.completedZones = new Set(saved.zones.completedZones || []);
        this.currentZoneId = saved.zones.currentZoneId || 'forest';
      }
    } catch (e) {
      console.warn('[ZoneManager] Failed to load:', e);
    }
  }

  reset() {
    this.unlockedZones = new Set(['forest']);
    this.completedZones = new Set();
    this.currentZoneId = 'forest';
    this._save();
  }
}
