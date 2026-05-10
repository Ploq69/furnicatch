// ==========================================
// Voidloop Level Builder — Tool Registry
// ==========================================

import { PROP_CATALOG, FLOAT_BLOCK_CATALOG, TOKEN_LETTERS } from './LevelCatalog.js';

export const TOOLS = {
  paint: {
    name: 'Paint Terrain',
    icon: '🎨',
    cursor: 'crosshair',
    configKeys: ['brushType'],
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      return state.paintTile(x, z, state.brushType);
    },
    onPointerDrag(state, hit) {
      const { x, z } = gridSnap(hit.point);
      return state.paintTile(x, z, state.brushType);
    },
  },
  raise: {
    name: 'Raise Height',
    icon: '⬆️',
    cursor: 'ns-resize',
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      return state.raiseTile(x, z);
    },
  },
  lower: {
    name: 'Lower Height',
    icon: '⬇️',
    cursor: 'ns-resize',
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      return state.lowerTile(x, z);
    },
  },
  erase: {
    name: 'Erase',
    icon: '🗑️',
    cursor: 'not-allowed',
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      // Try tile first
      if (state.eraseTile(x, z)) return true;
      // Try floating block
      const fb = nearestFloatingBlock(state, hit.point, 0.8);
      if (fb) return state.removeFloatingBlock(fb.id);
      // Try prop (within 0.5 units)
      const p = nearestProp(state, hit.point, 0.8);
      if (p) return state.removeProp(p.id);
      // Try enemy
      const e = nearestEnemy(state, hit.point, 0.8);
      if (e) return state.removeEnemy(e.id);
      // Try token
      const t = nearestToken(state, hit.point, 0.8);
      if (t) return state.removeToken(t.id);
      return false;
    },
  },
  fill: {
    name: 'Fill Terrain',
    icon: '🪣',
    cursor: 'crosshair',
    configKeys: ['brushType'],
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      return state.fillTiles(x, z, state.brushType);
    },
  },
  prop: {
    name: 'Place Prop',
    icon: '🪑',
    cursor: 'crosshair',
    configKeys: ['brushProp'],
    _ghostPos: null,
    onPointerDown(state, hit) {
      if (!state.brushProp) return false;
      const { x, z } = gridSnap(hit.point);
      const topY = getSurfaceY(state, x, z);
      if (topY === null) return false;
      const def = PROP_CATALOG[state.brushProp];
      if (!def) return false;
      state.addProp({
        assetId: state.brushProp,
        x, y: topY, z,
        rotation: 0, scale: 1,
      });
      return true;
    },
    onPointerMove(state, renderer, hit) {
      if (!state.brushProp) return;
      const { x, z } = gridSnap(hit.point);
      const topY = getSurfaceY(state, x, z);
      if (topY === null) { renderer.hideGhost(); return; }
      const def = PROP_CATALOG[state.brushProp];
      if (!def) return;
      renderer.showGhost(def, x, topY, z, 0, true);
    },
    onDeactivate(state, renderer) {
      renderer.hideGhost();
    },
  },
  token: {
    name: 'Place Token',
    icon: '🔠',
    cursor: 'crosshair',
    configKeys: ['brushToken'],
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      const topY = getSurfaceY(state, x, z);
      if (topY === null) return false;
      state.addToken({
        kind: state.brushToken?.kind || 'letter',
        value: state.brushToken?.value || 'A',
        x, y: topY, z,
      });
      return true;
    },
  },
  start: {
    name: 'Move Start',
    icon: '🏁',
    cursor: 'crosshair',
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      state.setStart(x, z);
      return true;
    },
  },
  exit: {
    name: 'Move Exit',
    icon: '🚪',
    cursor: 'crosshair',
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      state.setExit(x, z);
      return true;
    },
  },
  floatblock: {
    name: 'Place Floating Block',
    icon: '💎',
    cursor: 'crosshair',
    configKeys: ['brushFloatBlock'],
    onPointerDown(state, hit) {
      if (!state.brushFloatBlock) return false;
      const { x, z } = gridSnap(hit.point);
      const surfaceY = getSurfaceY(state, x, z) || 0;
      const yOffset = state.brushFloatBlockYOffset || 2;
      const y = surfaceY + yOffset;
      state.addFloatingBlock({
        x, y, z,
        type: state.brushFloatBlock,
      });
      return true;
    },
    onPointerMove(state, renderer, hit) {
      if (!state.brushFloatBlock) return;
      const { x, z } = gridSnap(hit.point);
      const surfaceY = getSurfaceY(state, x, z);
      if (surfaceY === null) { renderer.hideGhost(); return; }
      const def = FLOAT_BLOCK_CATALOG[state.brushFloatBlock];
      if (!def) return;
      const yOffset = state.brushFloatBlockYOffset || 2;
      renderer.showGhost(def, x, surfaceY + yOffset, z, 0, true);
    },
    onDeactivate(state, renderer) {
      renderer.hideGhost();
    },
  },
  enemy: {
    name: 'Place Enemy',
    icon: '👹',
    cursor: 'crosshair',
    configKeys: ['brushEnemy'],
    onPointerDown(state, hit) {
      const { x, z } = gridSnap(hit.point);
      const topY = getSurfaceY(state, x, z);
      if (topY === null) return false;
      const kind = state.brushEnemy || 'goblin';
      state.addEnemy({
        kind, x, y: topY, z,
        patrol: false,
      });
      return true;
    },
  },
};

// ---------- Utility ----------

export function gridSnap(point) {
  return {
    x: Math.round(point.x),
    z: Math.round(point.z),
  };
}

export function getSurfaceY(state, x, z) {
  const key = `${x},${z}`;
  const t = state.tiles.get(key);
  if (!t) return null;
  return t.y + t.height;
}

function nearestProp(state, point, radius) {
  let best = null, bestD = Infinity;
  for (const p of state.props) {
    const d = Math.hypot(p.x - point.x, p.z - point.z);
    if (d < radius && d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function nearestEnemy(state, point, radius) {
  let best = null, bestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - point.x, e.z - point.z);
    if (d < radius && d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function nearestFloatingBlock(state, point, radius) {
  let best = null, bestD = Infinity;
  for (const fb of state.floatingBlocks) {
    const d = Math.hypot(fb.x - point.x, fb.z - point.z);
    if (d < radius && d < bestD) { bestD = d; best = fb; }
  }
  return best;
}

function nearestToken(state, point, radius) {
  let best = null, bestD = Infinity;
  for (const t of state.tokens) {
    const d = Math.hypot(t.x - point.x, t.z - point.z);
    if (d < radius && d < bestD) { bestD = d; best = t; }
  }
  return best;
}
