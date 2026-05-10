// ==========================================
// Voidloop Level Builder — Main Application
// ==========================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LevelEditorState } from './LevelEditorState.js';
import { LevelRenderer } from './LevelRenderer.js';
import { LevelStorage } from './LevelStorage.js';
import { LevelValidation } from './LevelValidation.js';
import { TOOLS, gridSnap } from './LevelTools.js';
import { getTheme, TILE_CATALOG, PROP_CATALOG, FLOAT_BLOCK_CATALOG, ENEMY_KINDS } from './LevelCatalog.js';

export class LevelBuilderApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    this.state = new LevelEditorState();
    this.levelRenderer = null;
    this.activeTool = 'paint';
    this.isDragging = false;
    this.toolDown = false;
    this.keys = { w: false, a: false, s: false, d: false };
    this.cameraSpeed = 10;
    this.rotateSpeed = 2.0;
    this.zoomDistance = 18;

    this._initThree();
    this._initRenderer();
    this._bindEvents();
    this._bindUI();
    this._bindAutosave();
    this._populateBrushUI();
    this._loop();
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

    this.camera = new THREE.PerspectiveCamera(50, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    this.camera.position.set(8, 10, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    const gw = this.state.doc.grid.width;
    const gd = this.state.doc.grid.depth;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(gw / 2, 0, gd / 2);
    this.camera.position.set(gw / 2, 12, gd / 2 + 10);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    this.scene.add(dir);

    // Visual grid helper (kid-friendly: bright, obvious)
    this._updateGridHelper(gw, gd);
  }

  _updateGridHelper(width, depth) {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
    }
    const size = Math.max(width, depth);
    this.gridHelper = new THREE.GridHelper(size, size, 0x444444, 0xcccccc);
    this.gridHelper.position.set(width / 2 - 0.5, 0.01, depth / 2 - 0.5);
    this.scene.add(this.gridHelper);
  }

  _updateCameraForGrid(width, depth) {
    this.controls.target.set(width / 2, 0, depth / 2);
    this.camera.position.set(width / 2, 12, depth / 2 + 10);
    this.controls.update();
  }

  _initRenderer() {
    this.levelRenderer = new LevelRenderer(this.scene);
    this.levelRenderer.sync(this.state);
  }

  // ---------- Event Handling ----------

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', e => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', e => this._onPointerMove(e));
    window.addEventListener('pointerup', e => this._onPointerUp(e));
    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('keydown', e => this._onKeyDown(e));
    window.addEventListener('keyup', e => this._onKeyUp(e));
  }

  _raycast(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Collect intersectable objects
    const objects = [];
    if (this.levelRenderer.groundPlane) objects.push(this.levelRenderer.groundPlane);
    for (const block of this.levelRenderer.blockMeshes.values()) {
      if (block.mesh) objects.push(block.mesh);
    }

    const hits = raycaster.intersectObjects(objects, false);
    return hits.length > 0 ? hits[0] : null;
  }

  async _onPointerDown(e) {
    if (e.button !== 0) return; // Only left click
    const hit = this._raycast(e.clientX, e.clientY);
    if (!hit) return;
    this.toolDown = true;
    this.isDragging = false;
    this.controls.enabled = false; // Prevent OrbitControls from rotating camera
    const tool = TOOLS[this.activeTool];
    if (tool && tool.onPointerDown) {
      const changed = tool.onPointerDown(this.state, hit);
      if (changed) {
        await this.levelRenderer.sync(this.state);
        this._updateInspector();
      }
    }
  }

  async _onPointerMove(e) {
    if (!this.toolDown) {
      // Hover ghost preview
      const hit = this._raycast(e.clientX, e.clientY);
      if (hit && TOOLS[this.activeTool]?.onPointerMove) {
        TOOLS[this.activeTool].onPointerMove(this.state, this.levelRenderer, hit);
      } else {
        this.levelRenderer.hideGhost();
      }
      return;
    }
    this.isDragging = true;
    const hit = this._raycast(e.clientX, e.clientY);
    if (!hit) return;
    const tool = TOOLS[this.activeTool];
    if (tool && tool.onPointerDrag) {
      const changed = tool.onPointerDrag(this.state, hit);
      if (changed) {
        await this.levelRenderer.sync(this.state);
        this._updateInspector();
      }
    }
  }

  _onPointerUp(e) {
    this.toolDown = false;
    this.isDragging = false;
    this.controls.enabled = true; // Re-enable camera orbit
  }

  _onResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onKeyDown(e) {
    // Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    // Ctrl+Shift+Z / Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      this.redo();
    }
    // Camera movement keys
    if (!e.ctrlKey && !e.metaKey) {
      const lower = e.key.toLowerCase();
      if (lower === 'w') { this.keys.w = true; }
      if (lower === 'a') { this.keys.a = true; }
      if (lower === 's') { this.keys.s = true; }
      if (lower === 'd') { this.keys.d = true; }
      const map = { '1': 'paint', '2': 'raise', '3': 'lower', '4': 'erase', '5': 'fill',
                    '6': 'prop', '7': 'floatblock', '8': 'token', '9': 'start', '0': 'exit',
                    '-': 'enemy' };
      if (map[e.key]) this.setTool(map[e.key]);
    }
  }

  _onKeyUp(e) {
    const lower = e.key.toLowerCase();
    if (lower === 'w') { this.keys.w = false; }
    if (lower === 'a') { this.keys.a = false; }
    if (lower === 's') { this.keys.s = false; }
    if (lower === 'd') { this.keys.d = false; }
  }

  setZoom(distance) {
    this.zoomDistance = distance;
    const target = this.controls.target;
    const pos = this.camera.position;
    const dir = new THREE.Vector3().subVectors(pos, target);
    const currentLen = dir.length();
    if (currentLen > 0.001) {
      dir.normalize().multiplyScalar(distance);
      pos.copy(target).add(dir);
    }
  }

  toggleGrid(show) {
    if (this.gridHelper) {
      this.gridHelper.visible = show;
    }
  }

  // ---------- UI Bindings ----------

  _bindUI() {
    document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('btn-save')?.addEventListener('click', () => this.save());
    document.getElementById('btn-load')?.addEventListener('click', () => this.load());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportJSON());
    document.getElementById('btn-import')?.addEventListener('click', () => this.importJSON());
    document.getElementById('btn-playtest')?.addEventListener('click', () => this.playtest());
    document.getElementById('btn-magic-fix')?.addEventListener('click', () => this.magicFix());
    document.getElementById('btn-new-template')?.addEventListener('click', () => this.newFromTemplate());

    // Tool buttons
    const toolContainer = document.getElementById('tool-rail');
    if (toolContainer) {
      for (const [key, tool] of Object.entries(TOOLS)) {
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.dataset.tool = key;
        btn.title = tool.name + (tool.configKeys ? ' (config below)' : '');
        btn.innerHTML = `<span class="tool-icon">${tool.icon}</span><span class="tool-label">${tool.name}</span>`;
        btn.addEventListener('click', () => this.setTool(key));
        toolContainer.appendChild(btn);
      }
    }

    // Inspector inputs
    document.getElementById('inp-title')?.addEventListener('input', e => {
      this.state.doc.title = e.target.value;
      this.state.dirty = true;
    });
    document.getElementById('inp-timer')?.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      this.state.doc.gameplay.timerSeconds = isNaN(v) ? 120 : v;
      this.state.dirty = true;
    });
    document.getElementById('inp-zoom')?.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      this.setZoom(val);
      const label = document.getElementById('zoom-val');
      if (label) label.textContent = val.toFixed(1);
    });
    document.getElementById('chk-grid')?.addEventListener('change', e => {
      this.toggleGrid(e.target.checked);
    });
    // Grid size inputs
    document.getElementById('inp-grid-w')?.addEventListener('change', e => {
      const w = parseInt(e.target.value, 10);
      const d = this.state.doc.grid.depth;
      if (this.state.setGridSize(w, d)) {
        this._updateGridHelper(w, d);
        this._updateCameraForGrid(w, d);
        this.levelRenderer.resizeGroundPlane(w, d);
        this.levelRenderer.sync(this.state);
        this._updateInspector();
        this._showToast(`Grid resized to ${w}×${d}`);
      }
    });
    document.getElementById('inp-grid-d')?.addEventListener('change', e => {
      const w = this.state.doc.grid.width;
      const d = parseInt(e.target.value, 10);
      if (this.state.setGridSize(w, d)) {
        this._updateGridHelper(w, d);
        this._updateCameraForGrid(w, d);
        this.levelRenderer.resizeGroundPlane(w, d);
        this.levelRenderer.sync(this.state);
        this._updateInspector();
        this._showToast(`Grid resized to ${w}×${d}`);
      }
    });
  }

  _populateBrushUI() {
    // Terrain type picker
    const terrainSel = document.getElementById('sel-terrain');
    if (terrainSel) {
      for (const [id, info] of Object.entries(TILE_CATALOG)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = info.label;
        terrainSel.appendChild(opt);
      }
      terrainSel.addEventListener('change', e => {
        this.state.brushType = e.target.value;
      });
    }

    // Prop picker
    const propSel = document.getElementById('sel-prop');
    if (propSel) {
      for (const [id, info] of Object.entries(PROP_CATALOG)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = info.label;
        propSel.appendChild(opt);
      }
      propSel.addEventListener('change', e => {
        this.state.brushProp = e.target.value;
      });
    }

    // Floating block picker
    const fbSel = document.getElementById('sel-floatblock');
    if (fbSel) {
      for (const [id, info] of Object.entries(FLOAT_BLOCK_CATALOG)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = info.label;
        fbSel.appendChild(opt);
      }
      fbSel.addEventListener('change', e => {
        this.state.brushFloatBlock = e.target.value;
      });
    }

    // Token picker
    const tokenSel = document.getElementById('sel-token');
    if (tokenSel) {
      for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const opt = document.createElement('option');
        opt.value = ch;
        opt.textContent = ch;
        tokenSel.appendChild(opt);
      }
      tokenSel.addEventListener('change', e => {
        this.state.brushToken = { kind: 'letter', value: e.target.value };
      });
    }

    // Enemy picker
    const enemySel = document.getElementById('sel-enemy');
    if (enemySel) {
      for (const k of ENEMY_KINDS) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        enemySel.appendChild(opt);
      }
      enemySel.addEventListener('change', e => {
        this.state.brushEnemy = e.target.value;
      });
    }

    // Template picker
    const tmplSel = document.getElementById('sel-template');
    if (tmplSel) {
      const themes = ['forest', 'cave', 'medieval', 'space', 'city', 'dungeon'];
      for (const t of themes) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        tmplSel.appendChild(opt);
      }
    }

    // Y-offset picker for floating blocks
    const fbYOff = document.getElementById('inp-floatblock-y');
    if (fbYOff) {
      fbYOff.addEventListener('input', e => {
        this.state.brushFloatBlockYOffset = parseFloat(e.target.value) || 2;
      });
    }
  }

  _bindAutosave() {
    window.addEventListener('levelbuilder:autosave', (e) => {
      const doc = e.detail;
      LevelStorage.saveLevel(doc);
      this._showToast('💾 Autosaved');
    });
  }

  // ---------- Actions ----------

  setTool(key) {
    // Deactivate old tool
    const old = TOOLS[this.activeTool];
    if (old && old.onDeactivate) old.onDeactivate(this.state, this.levelRenderer);

    this.activeTool = key;

    // Highlight active tool button
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === key);
    });

    // Update cursor
    const tool = TOOLS[key];
    if (tool && tool.cursor) this.canvas.style.cursor = tool.cursor;

    // Show/hide config panels
    document.getElementById('cfg-terrain')?.classList.toggle('hidden', !tool.configKeys?.includes('brushType'));
    document.getElementById('cfg-prop')?.classList.toggle('hidden', !tool.configKeys?.includes('brushProp'));
    document.getElementById('cfg-floatblock')?.classList.toggle('hidden', !tool.configKeys?.includes('brushFloatBlock'));
    document.getElementById('cfg-token')?.classList.toggle('hidden', !tool.configKeys?.includes('brushToken'));
    document.getElementById('cfg-enemy')?.classList.toggle('hidden', !tool.configKeys?.includes('brushEnemy'));
  }

  async undo() {
    if (this.state.undo()) {
      await this.levelRenderer.sync(this.state);
      this._updateInspector();
      this._showToast('↩️ Undone');
    }
  }

  async redo() {
    if (this.state.redo()) {
      await this.levelRenderer.sync(this.state);
      this._updateInspector();
      this._showToast('↪️ Redone');
    }
  }

  save() {
    const doc = this.state.getDoc();
    const ok = LevelStorage.saveLevel(doc);
    this._showToast(ok ? '💾 Saved locally' : '⚠️ Save failed');
  }

  async load() {
    const id = prompt('Enter level ID to load:');
    if (!id) return;
    const doc = LevelStorage.loadLevel(id);
    if (doc) {
      this.state.loadDoc(doc);
      const gw = this.state.doc.grid.width;
      const gd = this.state.doc.grid.depth;
      this._updateGridHelper(gw, gd);
      this._updateCameraForGrid(gw, gd);
      this.levelRenderer.resizeGroundPlane(gw, gd);
      await this.levelRenderer.sync(this.state);
      this._updateInspector();
      this._showToast(`📂 Loaded ${doc.title}`);
    } else {
      this._showToast('❌ Level not found');
    }
  }

  exportJSON() {
    const doc = this.state.getDoc();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.id || 'level'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._showToast('📤 Exported JSON');
  }

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const doc = JSON.parse(text);
        this.state.loadDoc(doc);
        const gw = this.state.doc.grid.width;
        const gd = this.state.doc.grid.depth;
        this._updateGridHelper(gw, gd);
        this._updateCameraForGrid(gw, gd);
        this.levelRenderer.resizeGroundPlane(gw, gd);
        await this.levelRenderer.sync(this.state);
        this._updateInspector();
        this._showToast(`📥 Imported ${doc.title || file.name}`);
      } catch (e) {
        this._showToast('❌ Invalid JSON');
      }
    };
    input.click();
  }

  playtest() {
    const doc = this.state.getDoc();
    const errors = LevelValidation.validateForPlaytest(doc);
    if (errors.length > 0) {
      this._showToast('🚫 Cannot playtest: ' + errors.join(', '));
      return;
    }
    // Store in localStorage for the game to pick up (matching Game.js key format)
    const key = `voidloopLevelBuilderDraft:${doc.id || 'draft'}`;
    localStorage.setItem(key, JSON.stringify(doc));
    const url = `./index.html?playtest=${doc.id || 'draft'}`;
    window.open(url, '_blank');
  }

  async magicFix() {
    const doc = this.state.getDoc();
    const fixed = LevelValidation.autoFix(doc);
    if (fixed.changes.length === 0) {
      this._showToast('✅ Level looks good — no fixes needed');
      return;
    }
    this.state.loadDoc(fixed.doc);
    await this.levelRenderer.sync(this.state);
    this._showToast(`🪄 Fixed: ${fixed.changes.join(', ')}`);
  }

  async newFromTemplate() {
    const sel = document.getElementById('sel-template');
    const themeId = sel?.value || 'forest';
    this.state.newFromTemplate(themeId);
    const gw = this.state.doc.grid.width;
    const gd = this.state.doc.grid.depth;
    this._updateGridHelper(gw, gd);
    this._updateCameraForGrid(gw, gd);
    this.levelRenderer.resizeGroundPlane(gw, gd);
    await this.levelRenderer.sync(this.state);
    this._updateInspector();
    this._showToast(`🆕 New ${themeId} level created`);
  }

  _updateInspector() {
    const titleInp = document.getElementById('inp-title');
    if (titleInp) titleInp.value = this.state.doc.title || '';
    const timerInp = document.getElementById('inp-timer');
    if (timerInp) timerInp.value = this.state.doc.gameplay?.timerSeconds || 120;
    const gridW = document.getElementById('inp-grid-w');
    if (gridW) gridW.value = this.state.doc.grid.width;
    const gridD = document.getElementById('inp-grid-d');
    if (gridD) gridD.value = this.state.doc.grid.depth;

    // Stats
    const statsEl = document.getElementById('level-stats');
    if (statsEl) {
      const t = this.state.tiles.size;
      const p = this.state.props.length;
      const fb = this.state.floatingBlocks.length;
      const e = this.state.enemies.length;
      const to = this.state.tokens.length;
      statsEl.textContent = `${t} tiles · ${p} props · ${fb} blocks · ${e} enemies · ${to} tokens`;
    }
  }

  _showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('show');
      el.classList.add('hidden');
    }, 2500);
  }

  // ---------- Render Loop ----------

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = this.clock.getDelta();

    // WASD camera movement
    const anyKey = this.keys.w || this.keys.a || this.keys.s || this.keys.d;
    if (anyKey && !this.toolDown) {
      // Temporarily disable OrbitControls so it doesn't fight WASD
      this.controls.enabled = false;
      const target = this.controls.target;
      const pos = this.camera.position;

      // Forward / Back
      if (this.keys.w || this.keys.s) {
        const dir = new THREE.Vector3().subVectors(pos, target);
        dir.y = 0;
        const len = dir.length();
        if (len > 0.001) {
          dir.normalize();
          const move = (this.keys.w ? 1 : -1) * this.cameraSpeed * dt;
          pos.addScaledVector(dir, move);
          target.addScaledVector(dir, move);
        }
      }

      // Rotate left / right around target
      if (this.keys.a || this.keys.d) {
        const offset = new THREE.Vector3().subVectors(pos, target);
        const angle = (this.keys.a ? 1 : -1) * this.rotateSpeed * dt;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const x = offset.x * cos - offset.z * sin;
        const z = offset.x * sin + offset.z * cos;
        pos.set(target.x + x, pos.y, target.z + z);
      }
    } else if (!this.toolDown) {
      this.controls.enabled = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // Animate start/exit markers
    if (this.levelRenderer.startMesh) {
      this.levelRenderer.startMesh.position.y = 0.8 + Math.sin(Date.now() * 0.003) * 0.15;
      this.levelRenderer.startMesh.rotation.y += dt;
    }
    if (this.levelRenderer.exitMesh) {
      this.levelRenderer.exitMesh.position.y = 0.5 + Math.sin(Date.now() * 0.003 + 1) * 0.1;
      this.levelRenderer.exitMesh.rotation.y += dt * 0.5;
    }
  }
}
