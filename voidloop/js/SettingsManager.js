/**
 * SettingsManager — Persistent game settings (localStorage)
 */

const SETTINGS_KEY = 'voidloop_settings_v1';

const DEFAULTS = {
  masterVolume: 100,
  musicVolume: 70,
  sfxVolume: 80,
  touchControls: 'auto', // 'auto', 'on', 'off'
  cameraShake: true,
  showDamageNumbers: true,
  graphicsQuality: 'high', // 'low', 'medium', 'high'
  shadowQuality: 'medium', // 'low', 'medium', 'high', 'ultra'
  playerName: 'Player',
};

export class SettingsManager {
  constructor() {
    this._data = { ...DEFAULTS };
    this._listeners = [];
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._data = { ...DEFAULTS, ...parsed };
      }
    } catch (e) {
      console.warn('[Settings] Failed to load settings:', e);
    }
  }

  _save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('[Settings] Failed to save settings:', e);
    }
  }

  get(key) {
    return this._data[key];
  }

  set(key, value) {
    const old = this._data[key];
    this._data[key] = value;
    this._save();
    for (const cb of this._listeners) {
      cb(key, value, old);
    }
  }

  reset() {
    this._data = { ...DEFAULTS };
    this._save();
    for (const cb of this._listeners) {
      for (const key of Object.keys(DEFAULTS)) {
        cb(key, DEFAULTS[key], undefined);
      }
    }
  }

  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      const i = this._listeners.indexOf(callback);
      if (i >= 0) this._listeners.splice(i, 1);
    };
  }

  applyToAudio(audioManager) {
    if (!audioManager || !audioManager.initialized) return;
    const master = this._data.masterVolume / 100;
    const sfx = this._data.sfxVolume / 100;
    const music = this._data.musicVolume / 100;
    if (audioManager.masterGain) audioManager.masterGain.gain.value = master * 0.8;
    if (audioManager.sfxGain) audioManager.sfxGain.gain.value = sfx * 0.9;
    if (audioManager.musicGain) audioManager.musicGain.gain.value = music * 0.3;
  }

  shouldShowTouchControls() {
    const val = this._data.touchControls;
    if (val === 'on') return true;
    if (val === 'off') return false;
    // auto-detect
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  getChunkRadius() {
    const q = this._data.graphicsQuality;
    if (q === 'low') return 1;
    if (q === 'medium') return 2;
    return 3;
  }

  getShadowMapSize() {
    const q = this._data.shadowQuality;
    if (q === 'low') return 256;
    if (q === 'medium') return 512;
    if (q === 'high') return 1024;
    return 2048; // ultra
  }

  getShadowType() {
    const q = this._data.shadowQuality;
    if (q === 'low') return 'basic';
    return 'pcfsoft'; // medium+
  }

  getTerrainShadowSteps() {
    const q = this._data.shadowQuality;
    if (q === 'low') return 0;
    if (q === 'medium') return 14;
    if (q === 'high') return 20;
    return 24; // ultra
  }
}

export const settings = new SettingsManager();
