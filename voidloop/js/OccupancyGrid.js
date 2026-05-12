/**
 * OccupancyGrid — 3D grid data structure for terrain block occupancy,
 * collision queries, and mining state tracking.
 */

import { BLOCK_TYPES } from './constants.js';

export class OccupancyGrid {
  constructor() {
    this.cells = new Map(); // key: "x,y,z" -> cell data
  }

  _key(x, y, z) {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  /**
   * Store a cell at grid coordinates.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {Object} data — { type, hp?, maxHp?, destroyed?, indestructible?, ... }
   */
  set(x, y, z, data) {
    const key = this._key(x, y, z);
    const def = BLOCK_TYPES[data.type] || BLOCK_TYPES.stone;
    const cell = {
      type: data.type,
      hp: data.hp ?? def.hp ?? 1,
      maxHp: data.maxHp ?? def.hp ?? 1,
      destroyed: data.destroyed ?? false,
      indestructible: data.indestructible ?? false,
      drop: data.drop ?? def.drop ?? null,
      zoneId: data.zoneId ?? null,
      ...data,
    };
    this.cells.set(key, cell);
    return cell;
  }

  get(x, y, z) {
    return this.cells.get(this._key(x, y, z));
  }

  has(x, y, z) {
    return this.cells.has(this._key(x, y, z));
  }

  remove(x, y, z) {
    this.cells.delete(this._key(x, y, z));
  }

  /**
   * Mark a cell as destroyed.
   */
  destroy(x, y, z) {
    const cell = this.get(x, y, z);
    if (cell && !cell.indestructible) {
      cell.destroyed = true;
      cell.hp = 0;
      return true;
    }
    return false;
  }

  /**
   * Apply damage to a cell. Returns true if the cell was destroyed.
   */
  takeDamage(x, y, z, dmg = 1) {
    const cell = this.get(x, y, z);
    if (!cell || cell.destroyed || cell.indestructible) return false;
    cell.hp -= dmg;
    if (cell.hp <= 0) {
      cell.destroyed = true;
      cell.hp = 0;
      return true;
    }
    return false;
  }

  /**
   * Get the top Y of the highest non-destroyed block in a column.
   * Searches from surface (y=0) downward.
   */
  getColumnTop(x, z) {
    for (let y = 0; y >= -10; y--) {
      const cell = this.get(x, y, z);
      if (cell && !cell.destroyed) return y + 1;
    }
    return -999;
  }

  /**
   * Get the highest non-destroyed cell in a column.
   */
  getHighestCell(x, z) {
    for (let y = 0; y >= -10; y--) {
      const cell = this.get(x, y, z);
      if (cell && !cell.destroyed) return cell;
    }
    return null;
  }

  /**
   * Check if a column has any non-destroyed ground.
   */
  hasGround(x, z) {
    return this.getColumnTop(x, z) > -999;
  }

  /**
   * Check if there's a solid block at a specific position.
   */
  isSolid(x, y, z) {
    const cell = this.get(x, y, z);
    return cell && !cell.destroyed;
  }

  *entries() {
    yield* this.cells.entries();
  }

  values() {
    return this.cells.values();
  }

  keys() {
    return this.cells.keys();
  }

  clear() {
    this.cells.clear();
  }

  get size() {
    return this.cells.size;
  }
}
