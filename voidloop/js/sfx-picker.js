// ==========================================
// Voidloop SFX Picker — Sound Effect Assignment Tool
// ==========================================

const SFX_CATALOG_URL = './js/sfx_catalog.json';
const CONFIG_STORAGE_KEY = 'voidloop_sfx_config';
const WAV_BASE = '../'; // sfx-picker.html is in voidloop/, WAVs are at project root

// All assignable SFX events
const SFX_EVENTS = [
  { id: 'footstep_grass', name: 'Footstep — Grass', desc: 'Walking on grass/dirt', maxSlots: 3 },
  { id: 'footstep_stone', name: 'Footstep — Stone', desc: 'Walking on stone/concrete', maxSlots: 3 },
  { id: 'footstep_metal', name: 'Footstep — Metal', desc: 'Walking on metal', maxSlots: 3 },
  { id: 'footstep_sand', name: 'Footstep — Sand', desc: 'Walking on sand', maxSlots: 3 },
  { id: 'jump', name: 'Jump', desc: 'Player jump', maxSlots: 3 },
  { id: 'dodge', name: 'Dodge', desc: 'Player dodge/roll', maxSlots: 3 },
  { id: 'mine_swing', name: 'Mine Swing', desc: 'Pickaxe swing', maxSlots: 3 },
  { id: 'mine_hit', name: 'Mine Hit', desc: 'Pickaxe hitting block', maxSlots: 3 },
  { id: 'mine_break', name: 'Mine Break', desc: 'Block destroyed', maxSlots: 3 },
  { id: 'collect_ore', name: 'Collect Ore', desc: 'Picking up ore/coins', maxSlots: 3 },
  { id: 'melee_swing', name: 'Melee Swing', desc: 'Sword/pickaxe swing', maxSlots: 3 },
  { id: 'melee_hit', name: 'Melee Hit', desc: 'Melee connecting', maxSlots: 3 },
  { id: 'gun_shot', name: 'Gun Shot', desc: 'Pistol/rifle/smg/shotgun/sniper', maxSlots: 3 },
  { id: 'projectile_hit', name: 'Projectile Hit', desc: 'Bullet/projectile impact', maxSlots: 3 },
  { id: 'grenade_throw', name: 'Grenade Throw', desc: 'Throwing grenade', maxSlots: 3 },
  { id: 'explosion_small', name: 'Explosion — Small', desc: 'Small explosion', maxSlots: 3 },
  { id: 'explosion_large', name: 'Explosion — Large', desc: 'Large explosion', maxSlots: 3 },
  { id: 'enemy_alert', name: 'Enemy Alert', desc: 'Enemy spots player', maxSlots: 3 },
  { id: 'enemy_attack', name: 'Enemy Attack', desc: 'Enemy attacking', maxSlots: 3 },
  { id: 'enemy_hurt', name: 'Enemy Hurt', desc: 'Enemy taking damage', maxSlots: 3 },
  { id: 'enemy_death', name: 'Enemy Death', desc: 'Enemy dying', maxSlots: 3 },
  { id: 'player_hurt', name: 'Player Hurt', desc: 'Player taking damage', maxSlots: 3 },
  { id: 'player_hurt_heavy', name: 'Player Hurt Heavy', desc: 'Heavy player damage', maxSlots: 3 },
  { id: 'player_death', name: 'Player Death', desc: 'Player death', maxSlots: 3 },
  { id: 'player_heal', name: 'Player Heal', desc: 'Healing', maxSlots: 3 },
  { id: 'skill_cast', name: 'Skill Cast', desc: 'Casting skill/spell', maxSlots: 3 },
  { id: 'level_up', name: 'Level Up', desc: 'Player levels up', maxSlots: 3 },
  { id: 'ui_click', name: 'UI Click', desc: 'Button click', maxSlots: 3 },
  { id: 'ui_denied', name: 'UI Denied', desc: 'Cannot afford/invalid action', maxSlots: 3 },
  { id: 'floor_complete', name: 'Floor Complete', desc: 'All enemies dead / floor cleared', maxSlots: 3 },
  { id: 'camp_enter', name: 'Camp Enter', desc: 'Entering camp', maxSlots: 3 },
];

class SFXPickerApp {
  constructor() {
    this.catalog = null;
    this.sounds = [];
    this.prefixes = [];
    this.selectedEvent = null;
    this.assignments = {}; // { eventId: [soundKey1, soundKey2, ...] }
    this.audioCtx = null;
    this.bufferCache = new Map();
  }

  async init() {
    await this.loadCatalog();
    this.loadSavedConfig();
    this.renderEvents();
    this.renderSounds();
    this.renderPrefixFilter();
    document.getElementById('stats').textContent =
      `${this.sounds.length} sounds · ${SFX_EVENTS.length} events`;
  }

  async loadCatalog() {
    const res = await fetch(SFX_CATALOG_URL);
    const data = await res.json();
    this.catalog = data;
    this.sounds = data.sounds || [];
    this.prefixes = data.prefixes || [];
  }

  loadSavedConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) this.assignments = JSON.parse(saved);
    } catch (e) { /* ignore */ }
  }

  saveConfig() {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.assignments));
    this.showToast('Config saved to localStorage');
  }

  exportConfig() {
    const config = this.buildExportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sfx_config.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Config exported as JSON');
  }

  buildExportConfig() {
    const out = {};
    for (const event of SFX_EVENTS) {
      const keys = this.assignments[event.id] || [];
      if (keys.length === 0) continue;
      out[event.id] = keys.map(key => {
        const s = this.sounds.find(x => `${x.prefix}_${x.category}-${x.name}` === key);
        if (!s) return null;
        return {
          prefix: s.prefix,
          category: s.category,
          name: s.name,
          variants: s.variants.map(v => v.fullPath),
        };
      }).filter(Boolean);
    }
    return out;
  }

  getAudioCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioCtx;
  }

  async playSound(soundKey) {
    const s = this.sounds.find(x => `${x.prefix}_${x.category}-${x.name}` === soundKey);
    if (!s || s.variants.length === 0) return;
    const variant = s.variants[Math.floor(Math.random() * s.variants.length)];
    const path = WAV_BASE + variant.fullPath;

    try {
      const ctx = this.getAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      if (!this.bufferCache.has(path)) {
        const res = await fetch(path);
        const buf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        this.bufferCache.set(path, audioBuf);
      }

      const src = ctx.createBufferSource();
      src.buffer = this.bufferCache.get(path);
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (e) {
      console.warn('Failed to play sound:', path, e);
    }
  }

  selectEvent(eventId) {
    this.selectedEvent = eventId;
    this.renderEvents();
    this.renderEditor();
    document.getElementById('editor').style.display = 'block';
  }

  assignSound(soundKey) {
    if (!this.selectedEvent) return;
    const event = SFX_EVENTS.find(e => e.id === this.selectedEvent);
    if (!event) return;
    const current = this.assignments[this.selectedEvent] || [];
    if (current.includes(soundKey)) return; // already assigned
    if (current.length >= event.maxSlots) {
      this.showToast(`Max ${event.maxSlots} sounds for this event`);
      return;
    }
    current.push(soundKey);
    this.assignments[this.selectedEvent] = current;
    this.renderEvents();
    this.renderEditor();
  }

  removeSound(index) {
    if (!this.selectedEvent) return;
    const current = this.assignments[this.selectedEvent] || [];
    current.splice(index, 1);
    this.assignments[this.selectedEvent] = current;
    this.renderEvents();
    this.renderEditor();
  }

  filterEvents(query) {
    this.renderEvents(query.toLowerCase());
  }

  filterSounds() {
    this.renderSounds();
  }

  renderEvents(filter = '') {
    const container = document.getElementById('events-list');
    container.innerHTML = '';

    for (const event of SFX_EVENTS) {
      if (filter && !event.name.toLowerCase().includes(filter) && !event.id.includes(filter)) continue;
      const assigned = this.assignments[event.id] || [];
      const card = document.createElement('div');
      card.className = 'event-card' + (this.selectedEvent === event.id ? ' active' : '');
      card.innerHTML = `
        <div class="event-name">${event.name}</div>
        <div class="event-desc">${event.desc} · max ${event.maxSlots} sounds</div>
        <div class="slots">
          ${Array.from({ length: event.maxSlots }, (_, i) => {
            const filled = assigned[i];
            if (filled) {
              const s = this.sounds.find(x => `${x.prefix}_${x.category}-${x.name}` === filled);
              const label = s ? `${s.prefix} ${s.name}` : filled;
              return `<div class="slot filled" title="${label}">${label.length > 14 ? label.slice(0, 12) + '…' : label}</div>`;
            }
            return `<div class="slot">empty</div>`;
          }).join('')}
        </div>
      `;
      card.onclick = () => this.selectEvent(event.id);
      container.appendChild(card);
    }
  }

  renderEditor() {
    const title = document.getElementById('editor-title');
    const slotsContainer = document.getElementById('editor-slots');
    if (!this.selectedEvent) {
      document.getElementById('editor').style.display = 'none';
      return;
    }
    const event = SFX_EVENTS.find(e => e.id === this.selectedEvent);
    title.textContent = `${event.name} — assigned sounds`;

    const assigned = this.assignments[this.selectedEvent] || [];
    slotsContainer.innerHTML = assigned.length === 0
      ? '<div style="color:#888;font-size:12px;">Click sounds on the right to assign them to this event</div>'
      : assigned.map((key, i) => {
          const s = this.sounds.find(x => `${x.prefix}_${x.category}-${x.name}` === key);
          const label = s ? `${s.prefix} · ${s.category} · ${s.name}` : key;
          return `
            <div class="editor-slot filled">
              <span>${label}</span>
              <div style="display:flex;gap:4px;">
                <button class="play-btn" onclick="app.playSound('${key}')">▶</button>
                <button class="remove-btn" onclick="app.removeSound(${i})">✕</button>
              </div>
            </div>
          `;
        }).join('');
  }

  renderPrefixFilter() {
    const select = document.getElementById('prefix-filter');
    for (const prefix of this.prefixes) {
      const opt = document.createElement('option');
      opt.value = prefix;
      opt.textContent = prefix;
      select.appendChild(opt);
    }
  }

  renderSounds() {
    const container = document.getElementById('sounds-list');
    container.innerHTML = '';

    const prefixFilter = document.getElementById('prefix-filter').value;
    const search = document.getElementById('sound-search').value.toLowerCase();

    // Group by prefix
    const groups = {};
    for (const s of this.sounds) {
      if (prefixFilter && s.prefix !== prefixFilter) continue;
      const key = `${s.prefix}_${s.category}`;
      const match = !search || s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search) || s.prefix.toLowerCase().includes(search);
      if (!match) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    for (const [key, sounds] of Object.entries(groups)) {
      const group = document.createElement('div');
      group.className = 'sound-group';
      const header = sounds[0];
      group.innerHTML = `<h3>${header.prefix} · ${header.category || 'Uncategorized'}</h3>`;

      for (const s of sounds) {
        const soundKey = `${s.prefix}_${s.category}-${s.name}`;
        const item = document.createElement('div');
        item.className = 'sound-item';
        item.innerHTML = `
          <button class="play-btn" onclick="app.playSound('${soundKey}')">▶</button>
          <span class="sound-name">${s.name}</span>
          <span class="sound-cat">${s.variants.length} variants</span>
          <button class="add-btn primary" onclick="app.assignSound('${soundKey}')">+ Assign</button>
        `;
        group.appendChild(item);
      }

      container.appendChild(group);
    }

    if (Object.keys(groups).length === 0) {
      container.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">No sounds match your filters</div>';
    }
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

const app = new SFXPickerApp();
window.app = app; // Expose to window for inline onclick handlers
app.init();
