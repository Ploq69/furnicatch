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
    this.stunTimer = 0;
    this.wasInHazard = false;
    this.mitigationItems = ['fire_suit', 'ice_suit', 'desert_suit', 'ventilator_suit', 'wading_boots', 'royal_shield'];
  }

  update(dt) {
    const zone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    if (!zone || !zone.hazard) {
      if (this.wasInHazard) {
        this._exitHazard();
      }
      this.player.setHazardSpeedMultiplier?.(1);
      return;
    }

    const hazard = zone.hazard;
    const mitigated = this._checkMitigation(hazard);

    if (!mitigated) {
      this._applyHazardEffect(zone, hazard, dt);
      if (!this.wasInHazard) {
        this._enterHazard(zone);
      }
    } else {
      this.player.setHazardSpeedMultiplier?.(1);
      if (this.wasInHazard) {
        this._exitHazard();
      }
    }

    this.wasInHazard = true;
  }

  _checkMitigation(hazard) {
    if (hazard.mitigationItem) {
      // Check if fire_suit / ice_suit / desert_suit / ventilator_suit / wading_boots / royal_shield is equipped.
      return this.inventory.isEquipped(hazard.mitigationItem);
    }
    return false;
  }

  _applyHazardEffect(zone, hazard, dt) {
    this.player.setHazardSpeedMultiplier?.(1);

    if (hazard.damagePerSecond) {
      this.burnTimer += dt;
      if (this.burnTimer >= 1.0) {
        this.burnTimer = 0;
        this.player.takeDamage(hazard.damagePerSecond);
        this.ui?.showHazardWarning?.(zone.hazard.type, true);
        this.ui?.showFloatingText?.(`⚠ -${hazard.damagePerSecond}`, 0xff4422);
      }
    }

    if (hazard.slowdownPercent) {
      const multiplier = 1 - hazard.slowdownPercent / 100;
      this.player.setHazardSpeedMultiplier?.(multiplier);
      this.ui?.showHazardWarning?.(zone.hazard.type, true);
    }

    if (hazard.staminaDrainPerSecond) {
      this.player.drainStamina?.(hazard.staminaDrainPerSecond * dt);
      this.ui?.showHazardWarning?.(zone.hazard.type, true);
    }

    if (hazard.stunChancePerSecond) {
      this.stunTimer += dt;
      if (this.stunTimer >= 1.0) {
        this.stunTimer = 0;
        if (Math.random() < hazard.stunChancePerSecond) {
          this.player.stun?.(0.6);
          this.ui?.showHazardWarning?.(zone.hazard.type, true);
          this.ui?.showFloatingText?.('⚠', 0xc084fc);
        }
      }
    }
  }

  _enterHazard(zone) {
    // Could add screen edge effects here
  }

  _exitHazard() {
    this.wasInHazard = false;
    this.burnTimer = 0;
    this.stunTimer = 0;
    this.player.setHazardSpeedMultiplier?.(1);
    this.ui?.showHazardWarning?.('hazard', false);
  }

  isInHazard() {
    const zone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    return !!(zone && zone.hazard);
  }

  getCurrentZone() {
    return getZoneAtPosition(this.player.position.x, this.player.position.z);
  }
}
