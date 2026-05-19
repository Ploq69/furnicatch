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
    this.elShadow = document.getElementById('settings-shadow');
    this.elName = document.getElementById('settings-name');

    this.elSkyCycle = document.getElementById('settings-skycycle');
    this.elSkySpeed = document.getElementById('settings-skyspeed');
    this.elSkySpeedVal = document.getElementById('settings-skyspeed-val');
    this.elStars = document.getElementById('settings-stars');
    this.elAurora = document.getElementById('settings-aurora');
    this.elStarDensity = document.getElementById('settings-star-density');
    this.elStarDensityVal = document.getElementById('settings-star-density-val');
    this.elStarBrightness = document.getElementById('settings-star-brightness');
    this.elStarBrightnessVal = document.getElementById('settings-star-brightness-val');
    this.elPetLight = document.getElementById('settings-pet-light');
    this.elPetLightVal = document.getElementById('settings-pet-light-val');

    this.elGamepad = document.getElementById('settings-gamepad-enabled');
    this.elLook = document.getElementById('settings-look');
    this.elLookVal = document.getElementById('settings-look-val');
    this.elDeadzone = document.getElementById('settings-deadzone');
    this.elDeadzoneVal = document.getElementById('settings-deadzone-val');
    this.elVibration = document.getElementById('settings-vibration');
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
    this.elSkySpeed?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('skyCycleSpeed', v);
      this.elSkySpeedVal.textContent = v.toFixed(1) + 'x';
    });

    // Toggles
    this.elTouch?.addEventListener('change', (e) => settings.set('touchControls', e.target.value));
    this.elShake?.addEventListener('change', (e) => settings.set('cameraShake', e.target.checked));
    this.elDamage?.addEventListener('change', (e) => settings.set('showDamageNumbers', e.target.checked));
    this.elQuality?.addEventListener('change', (e) => settings.set('graphicsQuality', e.target.value));
    this.elShadow?.addEventListener('change', (e) => settings.set('shadowQuality', e.target.value));
    this.elName?.addEventListener('change', (e) => settings.set('playerName', e.target.value.trim() || 'Player'));
    this.elSkyCycle?.addEventListener('change', (e) => settings.set('skyCycleEnabled', e.target.checked));
    this.elStars?.addEventListener('change', (e) => settings.set('starfieldEnabled', e.target.checked));
    this.elAurora?.addEventListener('change', (e) => settings.set('auroraEnabled', e.target.checked));
    this.elStarDensity?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('starDensity', v);
      this.elStarDensityVal.textContent = v.toFixed(1) + 'x';
    });
    this.elStarBrightness?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('starBrightness', v);
      this.elStarBrightnessVal.textContent = v.toFixed(1) + 'x';
    });
    this.elPetLight?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('petLightIntensity', v);
      this.elPetLightVal.textContent = v.toFixed(1) + 'x';
    });

    this.elGamepad?.addEventListener('change', (e) => settings.set('gamepadEnabled', e.target.checked));
    this.elLook?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('gamepadLookSensitivity', v);
      this.elLookVal.textContent = v.toFixed(1);
    });
    this.elDeadzone?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.set('gamepadDeadZone', v);
      this.elDeadzoneVal.textContent = v.toFixed(2);
    });
    this.elVibration?.addEventListener('change', (e) => settings.set('gamepadVibration', e.target.checked));

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
    if (this.elShadow) this.elShadow.value = settings.get('shadowQuality');
    if (this.elName) this.elName.value = settings.get('playerName');

    if (this.elSkyCycle) this.elSkyCycle.checked = settings.get('skyCycleEnabled');
    if (this.elSkySpeed) this.elSkySpeed.value = settings.get('skyCycleSpeed');
    if (this.elSkySpeedVal) this.elSkySpeedVal.textContent = settings.get('skyCycleSpeed').toFixed(1) + 'x';
    if (this.elStars) this.elStars.checked = settings.get('starfieldEnabled');
    if (this.elAurora) this.elAurora.checked = settings.get('auroraEnabled');
    if (this.elStarDensity) this.elStarDensity.value = settings.get('starDensity');
    if (this.elStarDensityVal) this.elStarDensityVal.textContent = settings.get('starDensity').toFixed(1) + 'x';
    if (this.elStarBrightness) this.elStarBrightness.value = settings.get('starBrightness');
    if (this.elStarBrightnessVal) this.elStarBrightnessVal.textContent = settings.get('starBrightness').toFixed(1) + 'x';
    if (this.elPetLight) this.elPetLight.value = settings.get('petLightIntensity');
    if (this.elPetLightVal) this.elPetLightVal.textContent = settings.get('petLightIntensity').toFixed(1) + 'x';

    if (this.elGamepad) this.elGamepad.checked = settings.get('gamepadEnabled');
    if (this.elLook) this.elLook.value = settings.get('gamepadLookSensitivity');
    if (this.elLookVal) this.elLookVal.textContent = settings.get('gamepadLookSensitivity').toFixed(1);
    if (this.elDeadzone) this.elDeadzone.value = settings.get('gamepadDeadZone');
    if (this.elDeadzoneVal) this.elDeadzoneVal.textContent = settings.get('gamepadDeadZone').toFixed(2);
    if (this.elVibration) this.elVibration.checked = settings.get('gamepadVibration');
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
