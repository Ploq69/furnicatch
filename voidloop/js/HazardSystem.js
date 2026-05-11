// ==========================================
// Voidloop — Environmental Hazard System
// ==========================================

import { getZoneAtPosition } from './ZoneData.js';

export class HazardSystem {
  constructor(scene, player, inventory, ui) {
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.ui = ui;
    this.burnTimer = 0;
    this.wasInHazard = false;
  }

  update(dt) {
    const zone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    if (!zone || !zone.hazard) {
      if (this.wasInHazard) {
        this._exitHazard();
      }
      return;
    }

    const hazard = zone.hazard;
    const mitigated = this._checkMitigation(hazard);

    if (!mitigated) {
      this.burnTimer += dt;
      if (this.burnTimer >= 1.0) {
        this.burnTimer = 0;
        this.player.takeDamage(hazard.damagePerSecond);
        if (this.ui) {
          this.ui.showFloatingText(`🔥 BURNING! -${hazard.damagePerSecond} HP`, 0xff4422);
        }
      }
      if (!this.wasInHazard) {
        this._enterHazard(zone);
      }
    } else {
      if (this.wasInHazard) {
        this._exitHazard();
      }
    }

    this.wasInHazard = true;
  }

  _checkMitigation(hazard) {
    if (hazard.mitigationItem) {
      // Check if water_suit is equipped for burn mitigation
      return this.inventory.isEquipped(hazard.mitigationItem);
    }
    return false;
  }

  _enterHazard(zone) {
    // Could add screen edge effects here
  }

  _exitHazard() {
    this.wasInHazard = false;
    this.burnTimer = 0;
  }

  isInHazard() {
    const zone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    return !!(zone && zone.hazard);
  }

  getCurrentZone() {
    return getZoneAtPosition(this.player.position.x, this.player.position.z);
  }
}
