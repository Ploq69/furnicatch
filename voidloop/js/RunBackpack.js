// ==========================================
// Voidloop — Run Backpack
// Tracks resources carried during a single run.
// Separate from the banked ResourceInventory.
// ==========================================

import { RESOURCE_TYPES, RESOURCE_META } from './ResourceInventory.js';

export const BACKPACK_CONSTANTS = {
  DEFAULT_SLOTS: 6,
  MAX_SLOTS: 20,
  DEFAULT_STACK_SIZE: 20,
  MAX_STACK_SIZE: 99,
};

export class RunBackpack {
  constructor(options = {}) {
    this.slots = [];
    this.maxSlots = options.maxSlots ?? BACKPACK_CONSTANTS.DEFAULT_SLOTS;
    this.maxStackSize = options.maxStackSize ?? BACKPACK_CONSTANTS.DEFAULT_STACK_SIZE;
  }

  /**
   * Try to add a resource to the backpack.
   * @param {string} resourceType
   * @param {number} amount
   * @returns {{ success: boolean, amountAdded: number, overflow: number }}
   */
  add(resourceType, amount = 1) {
    if (!RESOURCE_TYPES.includes(resourceType)) {
      console.warn('[RunBackpack] Unknown resource:', resourceType);
      return { success: false, amountAdded: 0, overflow: amount };
    }

    let remaining = amount;
    let added = 0;

    // First, try to stack into existing slots
    for (const slot of this.slots) {
      if (slot.type === resourceType) {
        const canAdd = Math.min(remaining, this.maxStackSize - slot.count);
        if (canAdd > 0) {
          slot.count += canAdd;
          remaining -= canAdd;
          added += canAdd;
        }
        if (remaining <= 0) break;
      }
    }

    // Then, fill new slots
    while (remaining > 0 && this.slots.length < this.maxSlots) {
      const canAdd = Math.min(remaining, this.maxStackSize);
      this.slots.push({ type: resourceType, count: canAdd });
      remaining -= canAdd;
      added += canAdd;
    }

    const success = added > 0;
    return { success, amountAdded: added, overflow: remaining };
  }

  /**
   * Remove a specific amount of a resource.
   * @param {string} resourceType
   * @param {number} amount
   * @returns {number} amount actually removed
   */
  remove(resourceType, amount = 1) {
    let remaining = amount;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.type === resourceType) {
        const toRemove = Math.min(remaining, slot.count);
        slot.count -= toRemove;
        remaining -= toRemove;
        if (slot.count <= 0) {
          this.slots.splice(i, 1);
        }
        if (remaining <= 0) break;
      }
    }
    return amount - remaining;
  }

  /**
   * Get total count of a resource type.
   */
  getCount(resourceType) {
    return this.slots
      .filter(s => s.type === resourceType)
      .reduce((sum, s) => sum + s.count, 0);
  }

  /**
   * Get total items (sum of all slot counts).
   */
  getTotalItems() {
    return this.slots.reduce((sum, s) => sum + s.count, 0);
  }

  /**
   * Get total slots used.
   */
  getSlotsUsed() {
    return this.slots.length;
  }

  /**
   * Check if backpack is full.
   */
  isFull() {
    if (this.slots.length < this.maxSlots) return false;
    // All slots exist — check if any can stack more
    for (const slot of this.slots) {
      if (slot.count < this.maxStackSize) return false;
    }
    return true;
  }

  /**
   * Get remaining capacity for a specific resource type.
   */
  getRemainingCapacity(resourceType) {
    let remaining = 0;
    // Existing slots of this type that can stack more
    for (const slot of this.slots) {
      if (slot.type === resourceType) {
        remaining += Math.max(0, this.maxStackSize - slot.count);
      }
    }
    // Empty slots
    const emptySlots = Math.max(0, this.maxSlots - this.slots.length);
    remaining += emptySlots * this.maxStackSize;
    return remaining;
  }

  /**
   * Get all resources as an array of { type, count, name, value }.
   */
  getAll() {
    // Merge slots of the same type for display
    const merged = {};
    for (const slot of this.slots) {
      if (!merged[slot.type]) merged[slot.type] = 0;
      merged[slot.type] += slot.count;
    }
    return Object.entries(merged).map(([type, count]) => ({
      type,
      count,
      name: RESOURCE_META[type]?.name || type,
      value: RESOURCE_META[type]?.value || 0,
    }));
  }

  /**
   * Calculate total coin value of all carried resources.
   */
  getTotalValue() {
    return this.slots.reduce((sum, slot) => {
      const value = RESOURCE_META[slot.type]?.value || 0;
      return sum + value * slot.count;
    }, 0);
  }

  /**
   * Clear all slots.
   */
  clear() {
    this.slots = [];
  }

  /**
   * Deposit all resources into a ResourceInventory and return coins earned.
   * @param {ResourceInventory} resourceInventory
   * @returns {{ deposited: Array, totalCoins: number }}
   */
  depositAll(resourceInventory) {
    const deposited = [];
    let totalCoins = 0;
    const merged = {};

    for (const slot of this.slots) {
      if (!merged[slot.type]) merged[slot.type] = 0;
      merged[slot.type] += slot.count;
    }

    for (const [type, count] of Object.entries(merged)) {
      resourceInventory.add(type, count);
      const value = RESOURCE_META[type]?.value || 0;
      const coins = value * count;
      totalCoins += coins;
      deposited.push({ type, count, name: RESOURCE_META[type]?.name || type, coins });
    }

    this.slots = [];
    return { deposited, totalCoins };
  }
}
