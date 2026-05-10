// ==========================================
// Voidloop Level Builder — Editor State
// ==========================================

import { createBlankLevel, validateLevel } from './LevelSchema.js';
import { getTheme } from './LevelCatalog.js';

const MAX_HISTORY = 50;

export class LevelEditorState {
  constructor() {
    this.doc = createBlankLevel();
    this.tiles = new Map(); // key: "x,z" → { x, z, y, type, height, rotation }
    this.props = [];
    this.floatingBlocks = [];
    this.enemies = [];
    this.tokens = [];
    this.lights = [];

    this.selected = null; // { kind: 'tile'|'prop'|'enemy'|'token'|'light', id }
    this.brushType = 'grass';
    this.brushProp = null;
    this.brushFloatBlock = 'crystal';
    this.brushFloatBlockYOffset = 2;
    this.brushToken = { kind: 'letter', value: 'A' };

    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    this.autosaveTimer = null;

    this._syncFromDoc();
  }

  // ---------- Document Sync ----------

  _syncFromDoc() {
    this.tiles.clear();
    for (const t of this.doc.tiles) {
      this.tiles.set(`${t.x},${t.z}`, { ...t });
    }
    this.props = this.doc.props.map(p => ({ ...p }));
    this.floatingBlocks = (this.doc.floatingBlocks || []).map(fb => ({ ...fb }));
    this.enemies = this.doc.enemies.map(e => ({ ...e }));
    this.tokens = this.doc.tokens.map(t => ({ ...t }));
    this.lights = this.doc.lights.map(l => ({ ...l }));
  }

  _buildDoc() {
    return {
      ...this.doc,
      tiles: Array.from(this.tiles.values()),
      props: this.props.map(p => ({ ...p })),
      floatingBlocks: this.floatingBlocks.map(fb => ({ ...fb })),
      enemies: this.enemies.map(e => ({ ...e })),
      tokens: this.tokens.map(t => ({ ...t })),
      lights: this.lights.map(l => ({ ...l })),
      updatedAt: Date.now(),
    };
  }

  getDoc() {
    return this._buildDoc();
  }

  loadDoc(doc) {
    this._pushHistory();
    this.doc = { ...doc };
    this._syncFromDoc();
    this.dirty = true;
    this._debounceAutosave();
  }

  newFromTemplate(themeId) {
    const theme = getTheme(themeId);
    const doc = createBlankLevel();
    doc.themeId = themeId;
    doc.title = `${theme.name} Level`;
    doc.gameplay.timerSeconds = 120;
    // Seed a small platform in the center
    const cx = Math.floor(doc.grid.width / 2);
    const cz = Math.floor(doc.grid.depth / 2);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        doc.tiles.push({
          x: cx + dx, z: cz + dz, y: 0,
          type: theme.terrain[0] || 'grass',
          height: 1, rotation: 0,
        });
      }
    }
    doc.start = { x: cx, z: cz + 1, rotation: 0 };
    doc.exit = { x: cx, z: cz - 1, rotation: 0 };
    this.loadDoc(doc);
  }

  // ---------- History ----------

  _pushHistory() {
    const snapshot = JSON.stringify(this._buildDoc());
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const current = JSON.stringify(this._buildDoc());
    this.redoStack.push(current);
    const snapshot = this.undoStack.pop();
    this.doc = JSON.parse(snapshot);
    this._syncFromDoc();
    this.dirty = true;
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const current = JSON.stringify(this._buildDoc());
    this.undoStack.push(current);
    const snapshot = this.redoStack.pop();
    this.doc = JSON.parse(snapshot);
    this._syncFromDoc();
    this.dirty = true;
    return true;
  }

  // ---------- Tile Operations ----------

  paintTile(x, z, type) {
    const key = `${x},${z}`;
    const existing = this.tiles.get(key);
    if (existing) {
      if (existing.type === type) return false;
      this._pushHistory();
      existing.type = type;
    } else {
      this._pushHistory();
      this.tiles.set(key, { x, z, y: 0, type, height: 1, rotation: 0 });
    }
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  raiseTile(x, z) {
    const key = `${x},${z}`;
    const t = this.tiles.get(key);
    if (!t) return false;
    const maxH = this.doc.grid.maxHeight;
    if (t.height >= maxH) return false;
    this._pushHistory();
    t.height += 1;
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  lowerTile(x, z) {
    const key = `${x},${z}`;
    const t = this.tiles.get(key);
    if (!t) return false;
    this._pushHistory();
    t.height -= 1;
    if (t.height <= 0) {
      this.tiles.delete(key);
    }
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  eraseTile(x, z) {
    const key = `${x},${z}`;
    if (!this.tiles.has(key)) return false;
    this._pushHistory();
    this.tiles.delete(key);
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  fillTiles(startX, startZ, type) {
    const startKey = `${startX},${startZ}`;
    const startTile = this.tiles.get(startKey);
    if (!startTile) return false;
    const fromType = startTile.type;
    if (fromType === type) return false;

    this._pushHistory();
    const visited = new Set();
    const queue = [startKey];
    while (queue.length > 0) {
      const key = queue.shift();
      if (visited.has(key)) continue;
      visited.add(key);
      const t = this.tiles.get(key);
      if (!t || t.type !== fromType) continue;
      t.type = type;
      const [x, z] = key.split(',').map(Number);
      queue.push(`${x+1},${z}`, `${x-1},${z}`, `${x},${z+1}`, `${x},${z-1}`);
    }
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  // ---------- Entity Operations ----------

  addProp(prop) {
    this._pushHistory();
    this.props.push({ ...prop, id: generateEntityId('p') });
    this.dirty = true;
    this._debounceAutosave();
    return this.props[this.props.length - 1];
  }

  removeProp(id) {
    const idx = this.props.findIndex(p => p.id === id);
    if (idx < 0) return false;
    this._pushHistory();
    this.props.splice(idx, 1);
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  addFloatingBlock(def) {
    this._pushHistory();
    const fb = {
      ...def,
      id: generateEntityId('fb'),
      hp: def.hp ?? null, // null = use BLOCK_TYPES default
      rotation: def.rotation ?? 0,
      scale: def.scale ?? 1.0,
      glowColor: def.glowColor ?? null,
      bobPhase: def.bobPhase ?? Math.random() * Math.PI * 2,
    };
    this.floatingBlocks.push(fb);
    this.dirty = true;
    this._debounceAutosave();
    return fb;
  }

  removeFloatingBlock(id) {
    const idx = this.floatingBlocks.findIndex(fb => fb.id === id);
    if (idx < 0) return false;
    this._pushHistory();
    this.floatingBlocks.splice(idx, 1);
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  addEnemy(enemy) {
    this._pushHistory();
    this.enemies.push({ ...enemy, id: generateEntityId('e') });
    this.dirty = true;
    this._debounceAutosave();
    return this.enemies[this.enemies.length - 1];
  }

  removeEnemy(id) {
    const idx = this.enemies.findIndex(e => e.id === id);
    if (idx < 0) return false;
    this._pushHistory();
    this.enemies.splice(idx, 1);
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  addToken(token) {
    this._pushHistory();
    this.tokens.push({ ...token, id: generateEntityId('t') });
    this.dirty = true;
    this._debounceAutosave();
    return this.tokens[this.tokens.length - 1];
  }

  removeToken(id) {
    const idx = this.tokens.findIndex(t => t.id === id);
    if (idx < 0) return false;
    this._pushHistory();
    this.tokens.splice(idx, 1);
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  setStart(x, z) {
    this._pushHistory();
    this.doc.start = { x, z, rotation: 0 };
    this.dirty = true;
    this._debounceAutosave();
  }

  setExit(x, z) {
    this._pushHistory();
    this.doc.exit = { x, z, rotation: 0 };
    this.dirty = true;
    this._debounceAutosave();
  }

  setGridSize(width, depth) {
    const w = Math.max(8, Math.min(64, Math.round(width)));
    const d = Math.max(8, Math.min(64, Math.round(depth)));
    if (this.doc.grid.width === w && this.doc.grid.depth === d) return false;
    this._pushHistory();
    this.doc.grid.width = w;
    this.doc.grid.depth = d;
    // Remove tiles outside new bounds
    const before = this.tiles.size;
    for (const [key, t] of this.tiles) {
      if (t.x < 0 || t.x >= w || t.z < 0 || t.z >= d) {
        this.tiles.delete(key);
      }
    }
    // Clamp start/exit to new bounds
    this.doc.start.x = Math.max(0, Math.min(w - 1, this.doc.start.x));
    this.doc.start.z = Math.max(0, Math.min(d - 1, this.doc.start.z));
    this.doc.exit.x = Math.max(0, Math.min(w - 1, this.doc.exit.x));
    this.doc.exit.z = Math.max(0, Math.min(d - 1, this.doc.exit.z));
    this.dirty = true;
    this._debounceAutosave();
    return true;
  }

  // ---------- Selection ----------

  select(kind, id) {
    this.selected = { kind, id };
  }

  clearSelection() {
    this.selected = null;
  }

  getSelectedObject() {
    if (!this.selected) return null;
    const { kind, id } = this.selected;
    if (kind === 'tile') return this.tiles.get(id);
    if (kind === 'prop') return this.props.find(p => p.id === id);
    if (kind === 'enemy') return this.enemies.find(e => e.id === id);
    if (kind === 'token') return this.tokens.find(t => t.id === id);
    if (kind === 'light') return this.lights.find(l => l.id === id);
    return null;
  }

  // ---------- Autosave ----------

  _debounceAutosave() {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this._performAutosave();
    }, 2000);
  }

  _performAutosave() {
    // To be wired by app layer (calls LevelStorage.saveLevel)
    const event = new CustomEvent('levelbuilder:autosave', { detail: this.getDoc() });
    window.dispatchEvent(event);
  }
}

function generateEntityId(prefix) {
  return prefix + Math.random().toString(36).slice(2, 7);
}
