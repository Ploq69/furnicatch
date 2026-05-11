/**
 * SettingsMenu — In-game and main-menu settings panel
 */

import { settings } from './SettingsManager.js';
import { audio } from './AudioManager.js';

export class SettingsMenu {
  constructor() {
    this._unsub = null;
    this._bindElements();
    this._bindEvents();
    this._syncUI();
  }

  _bindElements() {
    this.elOverlay = document.getElementById('settings-overlay');
    this.elClose = document.getElementById('settings-close');
    this.elReset = document.getElementById('settings-reset');

    this.elMaster = document.getElementById('settings-master');
    this.elMasterVal = document.getElementById('settings-master-val');
    this.elMusic = document.getElementById('settings-music');
    this.elMusicVal = document.getElementById('settings-music-val');
    this.elSfx = document.getElementById('settings-sfx');
    this.elSfxVal = document.getElementById('settings-sfx-val');

    this.elTouch = document.getElementById('settings-touch');
    this.elShake = document.getElementById('settings-shake');
    this.elDamage = document.getElementById('settings-damage');
    this.elQuality = document.getElementById('settings-quality');
    this.elName = document.getElementById('settings-name');
  }

  _bindEvents() {
    this.elClose?.addEventListener('click', () => this.hide());
    this.elReset?.addEventListener('click', () => this._resetDefaults());

    // Sliders
    this.elMaster?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      settings.set('masterVolume', v);
      this.elMasterVal.textContent = v + '%';
      settings.applyToAudio(audio);
    });
    this.elMusic?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      settings.set('musicVolume', v);
      this.elMusicVal.textContent = v + '%';
      settings.applyToAudio(audio);
    });
    this.elSfx?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      settings.set('sfxVolume', v);
      this.elSfxVal.textContent = v + '%';
      settings.applyToAudio(audio);
    });

    // Toggles
    this.elTouch?.addEventListener('change', (e) => settings.set('touchControls', e.target.value));
    this.elShake?.addEventListener('change', (e) => settings.set('cameraShake', e.target.checked));
    this.elDamage?.addEventListener('change', (e) => settings.set('showDamageNumbers', e.target.checked));
    this.elQuality?.addEventListener('change', (e) => settings.set('graphicsQuality', e.target.value));
    this.elName?.addEventListener('change', (e) => settings.set('playerName', e.target.value.trim() || 'Player'));

    // Listen for external show event
    document.addEventListener('show-settings', () => this.show());

    // Escape to close
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    };
    document.addEventListener('keydown', this._onKey);
  }

  _syncUI() {
    if (this.elMaster) this.elMaster.value = settings.get('masterVolume');
    if (this.elMasterVal) this.elMasterVal.textContent = settings.get('masterVolume') + '%';
    if (this.elMusic) this.elMusic.value = settings.get('musicVolume');
    if (this.elMusicVal) this.elMusicVal.textContent = settings.get('musicVolume') + '%';
    if (this.elSfx) this.elSfx.value = settings.get('sfxVolume');
    if (this.elSfxVal) this.elSfxVal.textContent = settings.get('sfxVolume') + '%';

    if (this.elTouch) this.elTouch.value = settings.get('touchControls');
    if (this.elShake) this.elShake.checked = settings.get('cameraShake');
    if (this.elDamage) this.elDamage.checked = settings.get('showDamageNumbers');
    if (this.elQuality) this.elQuality.value = settings.get('graphicsQuality');
    if (this.elName) this.elName.value = settings.get('playerName');
  }

  _resetDefaults() {
    settings.reset();
    this._syncUI();
    settings.applyToAudio(audio);
  }

  show() {
    if (!this.elOverlay) return;
    this._syncUI();
    this.elOverlay.classList.add('active');
    this.isOpen = true;
  }

  hide() {
    if (!this.elOverlay) return;
    this.elOverlay.classList.remove('active');
    this.isOpen = false;
  }

  toggle() {
    if (this.isOpen) this.hide();
    else this.show();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKey);
  }
}
