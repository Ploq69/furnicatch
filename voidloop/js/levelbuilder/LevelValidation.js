// ==========================================
// Voidloop Level Builder — Validation & Fix
// ==========================================

import { validateLevel, createBlankLevel } from './LevelSchema.js';

const MAX_TILES = 300;
const MAX_PROPS = 120;
const MAX_FLOAT_BLOCKS = 100;
const MAX_ENEMIES = 20;
const MAX_TOKENS = 40;
const GRID_MAX = 64; // Maximum allowed grid size

export class LevelValidation {
  static validateForPlaytest(doc) {
    const errors = validateLevel(doc);
    if (errors.length > 0) return errors;

    const tCount = (doc.tiles || []).length;
    const pCount = (doc.props || []).length;
    const fbCount = (doc.floatingBlocks || []).length;
    const eCount = (doc.enemies || []).length;
    const toCount = (doc.tokens || []).length;

    if (tCount > MAX_TILES) errors.push(`Too many tiles (${tCount} > ${MAX_TILES})`);
    if (pCount > MAX_PROPS) errors.push(`Too many props (${pCount} > ${MAX_PROPS})`);
    if (fbCount > MAX_FLOAT_BLOCKS) errors.push(`Too many floating blocks (${fbCount} > ${MAX_FLOAT_BLOCKS})`);
    if (eCount > MAX_ENEMIES) errors.push(`Too many enemies (${eCount} > ${MAX_ENEMIES})`);
    if (toCount > MAX_TOKENS) errors.push(`Too many tokens (${toCount} > ${MAX_TOKENS})`);

    // Grid bounds — validate against the level's own declared grid size
    const gw = doc.grid?.width ?? 24;
    const gd = doc.grid?.depth ?? 24;
    for (const t of doc.tiles || []) {
      if (t.x < 0 || t.x >= gw || t.z < 0 || t.z >= gd) {
        errors.push(`Tile out of bounds (${t.x},${t.z}) — grid is ${gw}×${gd}`);
        break;
      }
    }
    if (gw > GRID_MAX || gd > GRID_MAX) {
      errors.push(`Grid size too large (${gw}×${gd}, max ${GRID_MAX}×${GRID_MAX})`);
    }

    // Start and exit must be on tiles
    if (!this._tileAt(doc, doc.start.x, doc.start.z)) errors.push('Start not on a tile');
    if (!this._tileAt(doc, doc.exit.x, doc.exit.z)) errors.push('Exit not on a tile');

    // A* reachability
    if (!this._reachable(doc, doc.start, doc.exit)) errors.push('Exit unreachable from start');

    return errors;
  }

  static autoFix(doc) {
    const changes = [];
    let d = JSON.parse(JSON.stringify(doc));

    // Clamp grid to max allowed
    if ((d.grid?.width || 0) > GRID_MAX) { d.grid.width = GRID_MAX; changes.push('grid width clamped'); }
    if ((d.grid?.depth || 0) > GRID_MAX) { d.grid.depth = GRID_MAX; changes.push('grid depth clamped'); }
    // Ensure minimum grid size
    if ((d.grid?.width || 0) < 8) { d.grid.width = 8; changes.push('grid width minimum set'); }
    if ((d.grid?.depth || 0) < 8) { d.grid.depth = 8; changes.push('grid depth minimum set'); }
    // Remove tiles outside the new grid bounds
    const beforeTiles = d.tiles.length;
    d.tiles = (d.tiles || []).filter(t => t.x >= 0 && t.x < d.grid.width && t.z >= 0 && t.z < d.grid.depth);
    if (d.tiles.length !== beforeTiles) changes.push('out-of-bounds tiles removed');

    // Clamp counts
    if ((d.tiles?.length || 0) > MAX_TILES) { d.tiles.length = MAX_TILES; changes.push('tiles truncated'); }
    if ((d.props?.length || 0) > MAX_PROPS) { d.props.length = MAX_PROPS; changes.push('props truncated'); }
    if ((d.floatingBlocks?.length || 0) > MAX_FLOAT_BLOCKS) { d.floatingBlocks.length = MAX_FLOAT_BLOCKS; changes.push('floating blocks truncated'); }
    if ((d.enemies?.length || 0) > MAX_ENEMIES) { d.enemies.length = MAX_ENEMIES; changes.push('enemies truncated'); }
    if ((d.tokens?.length || 0) > MAX_TOKENS) { d.tokens.length = MAX_TOKENS; changes.push('tokens truncated'); }

    // Ensure start and exit are on tiles
    if (!this._tileAt(d, d.start.x, d.start.z)) {
      const first = d.tiles?.[0];
      if (first) { d.start = { x: first.x, z: first.z, rotation: 0 }; changes.push('start moved to first tile'); }
    }
    if (!this._tileAt(d, d.exit.x, d.exit.z)) {
      const last = d.tiles?.[d.tiles.length - 1];
      if (last) { d.exit = { x: last.x, z: last.z, rotation: 0 }; changes.push('exit moved to last tile'); }
    }

    // Remove orphaned entities
    const before = d.props.length;
    d.props = (d.props || []).filter(p => this._tileAt(d, Math.round(p.x), Math.round(p.z)));
    if (d.props.length !== before) changes.push('orphan props removed');

    const eBefore = d.enemies.length;
    d.enemies = (d.enemies || []).filter(e => this._tileAt(d, Math.round(e.x), Math.round(e.z)));
    if (d.enemies.length !== eBefore) changes.push('orphan enemies removed');

    const tBefore = d.tokens.length;
    d.tokens = (d.tokens || []).filter(t => this._tileAt(d, Math.round(t.x), Math.round(t.z)));
    if (d.tokens.length !== tBefore) changes.push('orphan tokens removed');

    return { doc: d, changes };
  }

  static _tileAt(doc, x, z) {
    return (doc.tiles || []).some(t => t.x === x && t.z === z);
  }

  static _reachable(doc, start, exit) {
    if (!start || !exit) return false;
    const key = (x, z) => `${x},${z}`;
    const tiles = new Set((doc.tiles || []).map(t => key(t.x, t.z)));
    if (!tiles.has(key(start.x, start.z)) || !tiles.has(key(exit.x, exit.z))) return false;

    const q = [{ x: start.x, z: start.z }];
    const visited = new Set([key(start.x, start.z)]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (q.length > 0) {
      const { x, z } = q.shift();
      if (x === exit.x && z === exit.z) return true;
      for (const [dx, dz] of dirs) {
        const nx = x + dx, nz = z + dz;
        const k = key(nx, nz);
        if (tiles.has(k) && !visited.has(k)) {
          visited.add(k);
          q.push({ x: nx, z: nz });
        }
      }
    }
    return false;
  }
}
