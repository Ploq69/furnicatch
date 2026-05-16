import { GAME, UPGRADES, PET_LEVELS } from './constants.js';
import { SFXMapper } from './SFXMapper.js';
import { settings } from './SettingsManager.js';
import { LoadoutPreview } from './LoadoutPreview.js';
import { ELEMENTS, DEFAULT_ELEMENT, ALL_TEXTURE_KEYS, VFX_PRESETS, PRESET_KEYS, getElementConfig, saveCustomConfig, resetCustomConfig, getWeaponVFX, saveWeaponVFX, getWeaponVFXConfig, saveRecipeOverride, getRecipeWithOverride, resetRecipeOverride } from './ElementalVFX.js';
import {
  DEFAULT_LOADOUT,
  KAYKIT_CHARACTERS,
  SLOT_LABELS,
  clearKayKitItemGripPreset,
  cloneLoadout,
  getKayKitItem,
  getKayKitItemsForSlot,
} from './KayKitLoadout.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.upgradeLevels = {};
    this.loadoutState = cloneLoadout(DEFAULT_LOADOUT);
    this.loadoutOpen = false;
    this.progressionOpen = false;
    this.loadoutBusy = false;
    this.preview = null;
    this.calibrationEnabled = false;
    this.calibrationSlot = 'rightHand';
    this.vfxPreviewEnabled = false;
    this.selectedElement = DEFAULT_ELEMENT;
    this._floatingTextCount = 0;
    this._lastFloatingText = { text: '', at: 0 };
    this._zoneLetterCards = new Map();
    this._activeLetterFlyers = 0;
    for (const cat of Object.keys(UPGRADES)) {
      for (const u of UPGRADES[cat]) {
        this.upgradeLevels[u.id] = 0;
      }
    }
    this._bindElements();
    this._bindHotbar();
    this._bindCamp();
    this._bindLoadout();
    this._bindPetDen();
  }

  _bindElements() {
    this.elHp = document.getElementById('hp-bar');
    this.elHpText = document.getElementById('hp-text');
    this.elStamina = document.getElementById('stamina-bar');
    this.elFuel = document.getElementById('fuel-bar');
    this.elFuelWrapper = document.getElementById('fuel-bar-wrapper');
    this.elFloor = document.getElementById('floor-display');
    this.elCoin = document.getElementById('coin-display');
    this.elCoinRate = document.getElementById('coin-rate');
    this.elFloorIndicator = document.getElementById('floor-indicator');
    this.elExitOpen = document.getElementById('exit-open');
    this.elTimer = document.getElementById('timer-display');
    this.elLevel = document.getElementById('level-display');
    this.elKills = document.getElementById('kills-display');
    this.elLoading = document.getElementById('loading');
    this.elLoadingBar = document.getElementById('loading-bar-fill');
    this.elLoadingText = document.getElementById('loading-text');
    this.elHud = document.getElementById('hud');
    this.elCrosshair = document.getElementById('crosshair');
    this.elHotbar = document.getElementById('hotbar');
    this.elCamp = document.getElementById('camp-ui');
    this.elBrightness = document.getElementById('brightness-control');
    this.elBrightnessSlider = document.getElementById('brightness-slider');
    this.elZoom = document.getElementById('zoom-control');
    this.elZoomSlider = document.getElementById('zoom-slider');
    this.elFps = document.getElementById('fps-display');
    this.elLoadout = document.getElementById('loadout-ui');
    this.elLoadoutPreview = document.getElementById('loadout-preview');
    this.elLoadoutCharacters = document.getElementById('loadout-characters');
    this.elLoadoutEquipment = document.getElementById('loadout-equipment');
    this.elLoadoutClose = document.getElementById('loadout-close');
    this.elLoadoutStatus = document.getElementById('loadout-status');
    this.elCalibrationPanel = document.getElementById('calibration-panel');
    this.elCalibrationToggle = document.getElementById('calibration-toggle');
    this.elCalibrationSlot = document.getElementById('calibration-slot');
    this.elCalibrationMark = document.getElementById('calibration-mark');
    this.elCalibrationReset = document.getElementById('calibration-reset');
    this.elCalibrationReadout = document.getElementById('calibration-readout');
    this.elCalibrationScaleSlider = document.getElementById('calibration-scale-slider');
    this.onBrightnessChange = null;
    this.onCameraZoomChange = null;

    // Pet UI elements
    this.elPetHud = document.getElementById('pet-hud');
    this.elPetHudLetter = document.getElementById('pet-hud-letter');
    this.elPetHudLevel = document.getElementById('pet-hud-level');
    this.elPetEquippedLetter = document.getElementById('pet-equipped-letter');
    this.elPetEquippedLevel = document.getElementById('pet-equipped-level');
    this.elPetLetterGrid = document.getElementById('pet-letter-grid');
    this.elPetProgressFill = document.getElementById('pet-progress-fill');
    this.elPetProgressText = document.getElementById('pet-progress-text');

    // Pet Den overlay elements
    this.elPetDenOverlay = document.getElementById('pet-den-overlay');
    this.elPetOverlayLetter = document.getElementById('pet-overlay-letter');
    this.elPetOverlayLevel = document.getElementById('pet-overlay-level');
    this.elPetOverlayGrid = document.getElementById('pet-overlay-grid');
    this.elPetOverlayProgressFill = document.getElementById('pet-overlay-progress-fill');
    this.elPetOverlayProgressText = document.getElementById('pet-overlay-progress-text');
    this.elPetOverlayPreview = document.getElementById('pet-overlay-preview');
    this.elPetPreview = document.getElementById('pet-preview');
    this.elPetOverlayClose = document.getElementById('pet-den-close');
    this.petDenOpen = false;

    // Touch controls
    this.elTouchControls = document.getElementById('touch-controls');

    // Pause menu
    this.elPause = document.getElementById('pause-overlay');
    this._bindPause();

    // Spelling overlay elements
    this.elSpellingOverlay = document.getElementById('spelling-overlay');
    this.elSpellingProgress = document.getElementById('spelling-progress');
    this.elSpellingBigLetter = document.getElementById('spelling-big-letter');
    this.elSpellingPlayBtn = document.getElementById('spelling-play-btn');
    this.elSpellingHintCount = document.getElementById('spelling-hint-count');
    this.elSpellingHintArea = document.getElementById('spelling-hint-area');
    this.elSpellingInput = document.getElementById('spelling-input');
    this.elSpellingRevealBtn = document.getElementById('spelling-reveal-btn');
    this.elSpellingCheckBtn = document.getElementById('spelling-check-btn');
    this.elSpellingFeedback = document.getElementById('spelling-feedback');
    this.elSpellingWordlistGrid = document.getElementById('spelling-wordlist-grid');
    this.elSpellingClose = document.getElementById('spelling-close');
    this._bindSpellingEvents();

    // Zone select overlay
    this.elZoneSelect = document.getElementById('zone-select-overlay');
    this.elZoneSelectGrid = document.getElementById('zone-select-grid');
    this.elBrightnessSlider.addEventListener('input', (e) => {
      if (this.onBrightnessChange) this.onBrightnessChange(parseFloat(e.target.value));
    });
    this.elZoomSlider.addEventListener('input', (e) => {
      if (this.onCameraZoomChange) this.onCameraZoomChange(parseFloat(e.target.value));
    });
  }

  _bindLoadout() {
    if (this.elLoadoutClose) {
      this.elLoadoutClose.addEventListener('click', () => this.hideLoadout());
    }
    if (this.elCalibrationToggle) {
      this.elCalibrationToggle.addEventListener('click', () => this._toggleCalibration());
    }
    this.elVfxPreviewToggle = document.getElementById('vfx-preview-toggle');
    if (this.elVfxPreviewToggle) {
      this.elVfxPreviewToggle.addEventListener('click', () => this._toggleVfxPreview());
    }
    this.elElementSelector = document.getElementById('element-selector');
    if (this.elElementSelector) {
      this.elElementSelector.value = this.selectedElement;
      this.elElementSelector.addEventListener('change', (e) => {
        this.selectedElement = e.target.value;
        this._syncVFXPanel();
        this._setLoadoutStatus();
        SFXMapper.uiClick();
      });
    }
    this.elElementTryBtn = document.getElementById('element-try-btn');
    if (this.elElementTryBtn) {
      this.elElementTryBtn.addEventListener('click', () => this._tryElementVFX());
    }
    this._bindVFXPanel();
    if (this.elCalibrationSlot) {
      this.elCalibrationSlot.addEventListener('change', () => this._setCalibrationSlot(this.elCalibrationSlot.value));
    }
    if (this.elCalibrationReset) {
      this.elCalibrationReset.addEventListener('click', () => this._resetCalibration());
    }
    if (this.elCalibrationMark) {
      this.elCalibrationMark.addEventListener('click', () => this._saveCalibration());
    }
    if (this.elCalibrationScaleSlider) {
      this.elCalibrationScaleSlider.addEventListener('input', (e) => {
        this._setCalibrationScale(parseFloat(e.target.value));
      });
    }
    this._bindNudgeButtons();
  }

  _bindSpellingEvents() {
    if (!this.elSpellingOverlay) return;

    this.elSpellingPlayBtn?.addEventListener('click', () => {
      if (this.onSpellingPlay) this.onSpellingPlay();
    });

    this.elSpellingCheckBtn?.addEventListener('click', () => {
      if (this.onSpellingCheck) this.onSpellingCheck(this.elSpellingInput.value);
    });

    this.elSpellingRevealBtn?.addEventListener('click', () => {
      if (this.onSpellingReveal) this.onSpellingReveal();
    });

    this.elSpellingClose?.addEventListener('click', () => {
      if (this.onSpellingClose) this.onSpellingClose();
    });

    this.elSpellingInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.onSpellingCheck) this.onSpellingCheck(this.elSpellingInput.value);
      }
    });
  }

  showSpellingChallenge(letter, wordObj, progressText, wordList) {
    if (!this.elSpellingOverlay) return;
    this._setTouchControlsVisible(false);
    this.elSpellingOverlay.classList.add('active');
    this.elSpellingOverlay.classList.remove('sound-match');
    this.elSpellingBigLetter.textContent = letter.toUpperCase();
    this.elSpellingProgress.innerHTML = progressText;
    this.elSpellingHintCount.textContent = '';
    this.elSpellingHintArea.textContent = '';
    this.elSpellingInput.value = '';
    this.elSpellingFeedback.textContent = '';
    this.elSpellingFeedback.className = 'spelling-feedback';
    this.elSpellingRevealBtn.style.display = 'none';
    this.elSpellingInput.disabled = true;
    this.elSpellingInput.focus();
    const inputRow = this.elSpellingInput?.closest('.spelling-input-row');
    if (inputRow) inputRow.style.display = 'flex';
    const wordListBox = this.elSpellingWordlistGrid?.closest('.spelling-wordlist');
    if (wordListBox) wordListBox.style.display = 'block';

    // Render word list chips
    if (this.elSpellingWordlistGrid) {
      this.elSpellingWordlistGrid.innerHTML = '';
      for (const w of wordList || []) {
        const chip = document.createElement('div');
        chip.className = 'spelling-word-chip';
        chip.textContent = w;
        chip.addEventListener('click', () => {
          if (this.onSpellingPlayWord) this.onSpellingPlayWord(w);
        });
        this.elSpellingWordlistGrid.appendChild(chip);
      }
    }
  }

  showSoundQuiz(letter, choices, progressText, subtitle) {
    if (!this.elSpellingOverlay) return;
    this._setTouchControlsVisible(false);
    this.elSpellingOverlay.classList.add('active', 'sound-match');
    this.elSpellingBigLetter.textContent = '?';
    this.elSpellingProgress.innerHTML = progressText || '';
    this.elSpellingHintCount.textContent = subtitle || '';
    this.elSpellingHintArea.textContent = 'Pick the letter you hear.';
    this.elSpellingFeedback.textContent = '';
    this.elSpellingFeedback.className = 'spelling-feedback';
    const inputRow = this.elSpellingInput?.closest('.spelling-input-row');
    if (inputRow) inputRow.style.display = 'none';
    const wordListBox = this.elSpellingWordlistGrid?.closest('.spelling-wordlist');
    if (wordListBox) wordListBox.style.display = 'block';

    if (this.elSpellingWordlistGrid) {
      this.elSpellingWordlistGrid.innerHTML = '';
      for (const choice of choices || []) {
        const btn = document.createElement('button');
        btn.className = 'spelling-word-chip sound-choice';
        btn.type = 'button';
        btn.textContent = choice;
        btn.addEventListener('click', () => {
          if (this.game?._resolveLetterSoundQuiz) this.game._resolveLetterSoundQuiz(choice);
        });
        this.elSpellingWordlistGrid.appendChild(btn);
      }
    }
  }

  hideSpellingChallenge() {
    if (!this.elSpellingOverlay) return;
    this.elSpellingOverlay.classList.remove('active');
    this.elSpellingOverlay.classList.remove('sound-match');
    this._setTouchControlsVisible(true);
  }

  enableSpellingInput() {
    if (this.elSpellingInput) {
      this.elSpellingInput.disabled = false;
      this.elSpellingInput.focus();
    }
  }

  updateSpellingHint(hintStr, countStr) {
    if (this.elSpellingHintArea) this.elSpellingHintArea.textContent = hintStr;
    if (this.elSpellingHintCount) this.elSpellingHintCount.textContent = countStr || '';
  }

  setSpellingRevealVisible(visible) {
    if (this.elSpellingRevealBtn) {
      this.elSpellingRevealBtn.style.display = visible ? 'inline-block' : 'none';
    }
  }

  setSpellingFeedback(text, isCorrect) {
    if (!this.elSpellingFeedback) return;
    this.elSpellingFeedback.textContent = text;
    this.elSpellingFeedback.className = 'spelling-feedback ' + (isCorrect ? 'correct' : 'wrong');
  }

  updateSpellingProgress(progressText) {
    if (this.elSpellingProgress) this.elSpellingProgress.innerHTML = progressText;
  }

  _bindHotbar() {
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach(slot => {
      slot.addEventListener('click', () => {
        const s = parseInt(slot.dataset.slot);
        this.game.player.equipWeapon(s);
        this.setHotbarSlot(s);
        SFXMapper.hotbarSelect();
      });
    });
  }

  _bindCamp() {
    this.elDescendBtn = document.getElementById('btn-descend');
    this.elDescendBtn.addEventListener('click', () => {
      SFXMapper.uiClick();
      this.hideCamp();
      this.game.startDescent(this._campFromDeath);
    });

    // Shop button
    this.elShopBtn = document.getElementById('btn-shop');
    if (this.elShopBtn) {
      this.elShopBtn.addEventListener('click', () => {
        SFXMapper.uiClick();
        this.showShop();
      });
    }

    for (const id of ['blacksmith-upgrades', 'combat-upgrades', 'spirit-upgrades']) {
      const container = document.getElementById(id);
      if (container) container.innerHTML = '<div class="camp-empty-note">Use the Progression console for upgrades.</div>';
    }
  }

  _buyUpgrade(cat, upgrade, btn) {
    const lvl = this.upgradeLevels[upgrade.id] || 0;
    if (lvl >= upgrade.max) {
      SFXMapper.upgradeMaxed();
      return;
    }
    const cost = upgrade.cost(lvl);
    if (this.game.player.coins < cost) {
      btn.style.animation = 'none';
      btn.offsetHeight;
      btn.style.animation = 'shake 0.3s';
      SFXMapper.uiDenied();
      return;
    }
    this.game.player.coins -= cost;
    this.upgradeLevels[upgrade.id] = lvl + 1;
    this._updateUpgradeButton(upgrade, btn);
    this.updateStats();
    SFXMapper.upgradeBuy();
  }

  _updateUpgradeButton(upgrade, btn) {
    const lvl = this.upgradeLevels[upgrade.id] || 0;
    if (lvl >= upgrade.max) {
      btn.disabled = true;
      btn.innerHTML = `<strong>${upgrade.name}</strong><br><small style="color:#4ade80">MAXED</small>`;
      return;
    }
    const cost = upgrade.cost(lvl);
    btn.innerHTML = `<strong>${upgrade.name}</strong> <span style="color:#4ade80">Lv.${lvl}</span><br><small style="opacity:0.7">${upgrade.desc}</small><br><small style="color:#fbbf24">💰 ${cost}</small>`;
  }

  setLoadingProgress(current, total) {
    const pct = Math.round((current / total) * 100);
    this.elLoadingBar.style.width = pct + '%';
    this.elLoadingText.textContent = `Loading assets... ${current}/${total}`;
  }

  _setTouchControlsVisible(visible) {
    if (!this.elTouchControls) return;
    const tc = this.elTouchControls;
    if (!visible) {
      tc.style.display = 'none';
      return;
    }
    if (settings.shouldShowTouchControls()) {
      tc.style.display = 'block';
    } else {
      tc.style.display = 'none';
    }
  }

  _bindPause() {
    document.getElementById('pause-resume')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('pause-resume'));
    });
    document.getElementById('pause-settings')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('pause-settings'));
    });
    document.getElementById('pause-quit')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('pause-quit'));
    });
  }

  showPauseMenu() {
    if (this.elPause) this.elPause.classList.add('active');
    this._setTouchControlsVisible(false);
  }

  hidePauseMenu() {
    if (this.elPause) this.elPause.classList.remove('active');
    this._setTouchControlsVisible(true);
  }

  showLoading(text = 'Loading...') {
    if (this.elLoadingText) this.elLoadingText.textContent = text;
    this.elLoading.style.display = 'flex';
    this.elHud.style.display = 'none';
    this.elCrosshair.style.display = 'none';
    this.elHotbar.style.display = 'none';
    this.elFloorIndicator.style.display = 'none';
    if (this.elFps) this.elFps.style.display = 'none';
    if (this.elBrightness) this.elBrightness.style.display = 'none';
    if (this.elZoom) this.elZoom.style.display = 'none';
  }

  hideLoading() {
    this.elLoading.style.display = 'none';
    this.elHud.style.display = 'block';
    this.elCrosshair.style.display = 'block';
    this.elHotbar.style.display = 'flex';
    this.elFloorIndicator.style.display = 'block';
    this._updatePetHud();
    if (this.elFps) this.elFps.style.display = 'block';
    if (this.elBrightness) this.elBrightness.style.display = 'flex';
    if (this.elZoom) this.elZoom.style.display = 'flex';
  }

  async toggleLoadout() {
    if (this.loadoutBusy) return;
    if (this.loadoutOpen) {
      await this.hideLoadout();
    } else {
      await this.showLoadout();
    }
  }

  async showLoadout() {
    if (!this.elLoadout || this.loadoutOpen || this.loadoutBusy) return;
    this._setTouchControlsVisible(false);
    this.loadoutBusy = true;
    this.loadoutState = cloneLoadout(this.game.player.loadout || DEFAULT_LOADOUT);
    this._renderLoadout();
    this.elLoadout.classList.add('active');
    this.loadoutOpen = true;

    if (!this.preview) {
      this.preview = new LoadoutPreview(this.elLoadoutPreview);
      await this.preview.init(this.loadoutState);
    } else {
      this.preview.resize();
      await this.preview.setLoadout(this.loadoutState);
    }

    this._setLoadoutStatus();
    this._syncCalibrationPanel();
    this._renderCalibrationReadout(this.preview?.getCalibrationSnapshot?.());
    this.loadoutBusy = false;
    SFXMapper.uiClick();
  }

  async hideLoadout() {
    if (!this.elLoadout || !this.loadoutOpen || this.loadoutBusy) return;
    this._setTouchControlsVisible(true);
    this.loadoutBusy = true;
    await this.game.player.applyLoadout(this.loadoutState);
    this.elLoadout.classList.remove('active');
    this.loadoutOpen = false;
    this.calibrationEnabled = false;
    this.preview?.setCalibrationEnabled(false, this.calibrationSlot);
    this._syncCalibrationPanel();
    this._renderCalibrationReadout(this.preview?.getCalibrationSnapshot?.());
    this.loadoutBusy = false;
    SFXMapper.uiClick();
  }

  update(dt) {
    if (this.loadoutOpen && this.preview) {
      this.preview.resize();
      this.preview.update(dt);
    }
  }

  _renderLoadout() {
    this._renderCharacterGrid();
    this._renderEquipmentGrid();
    this._setLoadoutStatus();
    this._syncWeaponVFXSection();
  }

  _renderCharacterGrid() {
    if (!this.elLoadoutCharacters) return;
    this.elLoadoutCharacters.innerHTML = '';
    for (const character of KAYKIT_CHARACTERS) {
      const btn = document.createElement('button');
      btn.className = 'loadout-option';
      btn.classList.toggle('active', this.loadoutState.characterId === character.id);
      btn.textContent = character.name;
      btn.addEventListener('click', async () => {
        this.loadoutState.characterId = character.id;
        this._renderLoadout();
        await this.preview?.setLoadout(this.loadoutState);
        if (this.calibrationEnabled) {
          this._renderCalibrationReadout(this.preview?.setCalibrationEnabled(true, this.calibrationSlot));
        }
      });
      this.elLoadoutCharacters.appendChild(btn);
    }
  }

  _renderEquipmentGrid() {
    if (!this.elLoadoutEquipment) return;
    this.elLoadoutEquipment.innerHTML = '';
    for (const slot of ['rightHand', 'leftHand', 'back']) {
      const section = document.createElement('section');
      section.className = 'loadout-slot-section';

      const title = document.createElement('h3');
      title.textContent = SLOT_LABELS[slot];
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'loadout-item-grid';

      const empty = this._createItemButton('Empty', !this.loadoutState[slot], async () => {
        this.loadoutState[slot] = null;
        this._renderLoadout();
        await this.preview?.setLoadout(this.loadoutState);
        this._refreshCalibrationAfterLoadout(slot);
        this._syncWeaponVFXSection();
      });
      grid.appendChild(empty);

      for (const item of getKayKitItemsForSlot(slot)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'loadout-item-wrapper';

        const btn = this._createItemButton(item.name, this.loadoutState[slot] === item.id, async () => {
          this.loadoutState[slot] = item.id;
          this._renderLoadout();
          // Reset calibration nudge before loading new item so it doesn't inherit the old item's offset
          if (this.calibrationEnabled && this.preview) {
            this.preview.resetCalibrationOffset();
          }
          await this.preview?.setLoadout(this.loadoutState);
          this._refreshCalibrationAfterLoadout(slot);
          this._syncWeaponVFXSection();
        });
        wrapper.appendChild(btn);

        // Try button for rightHand/leftHand items (weapons/tools)
        if ((slot === 'rightHand' || slot === 'leftHand') && this.vfxPreviewEnabled) {
          const tryBtn = document.createElement('button');
          tryBtn.className = 'loadout-try-btn';
          tryBtn.textContent = '✨ Try';
          tryBtn.title = `Preview ${ELEMENTS[this.selectedElement]?.name || ''} VFX`;
          tryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.preview?.playElementVFX(this.selectedElement);
          });
          wrapper.appendChild(tryBtn);
        }

        grid.appendChild(wrapper);
      }

      section.appendChild(grid);
      this.elLoadoutEquipment.appendChild(section);
    }
  }

  _createItemButton(label, active, onClick) {
    const btn = document.createElement('button');
    btn.className = 'loadout-option loadout-item';
    btn.classList.toggle('active', active);
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _setLoadoutStatus() {
    if (!this.elLoadoutStatus) return;
    const character = KAYKIT_CHARACTERS.find(c => c.id === this.loadoutState.characterId);
    const slots = ['rightHand', 'leftHand', 'back']
      .map(slot => this.loadoutState[slot] ? SLOT_LABELS[slot] : null)
      .filter(Boolean)
      .join(' / ');
    let text = `${character?.name || 'Character'} · ${slots || 'No items'}`;
    if (this.vfxPreviewEnabled) {
      const el = ELEMENTS[this.selectedElement];
      const layers = this._buildVFXConfig().particleLayers;
      const layerNames = layers.map(l => l.texture || '?').join(', ');
      text = `${el?.name || ''} · ${layerNames || 'no layers'}`;
    }
    this.elLoadoutStatus.textContent = text;
  }

  _toggleCalibration() {
    if (!this.preview) return;
    this.calibrationEnabled = !this.calibrationEnabled;
    this._syncCalibrationPanel();
    const snapshot = this.preview.setCalibrationEnabled(this.calibrationEnabled, this.calibrationSlot);
    this._syncScaleSlider(snapshot);
    this._renderCalibrationReadout(snapshot);
  }

  _toggleVfxPreview() {
    this.vfxPreviewEnabled = !this.vfxPreviewEnabled;
    this._syncCalibrationPanel();
    this._renderLoadout();
    SFXMapper.uiClick();
  }

  _tryElementVFX(playSound = true) {
    if (!this.preview) return;
    const config = this._buildVFXConfig();
    this.preview.playElementVFX(config);
    if (playSound) SFXMapper.uiClick();
  }

  _bindVFXPanel() {
    this.elVFXParams = document.getElementById('vfx-params');
    this.elVFXLightIntensity = document.getElementById('vfx-light-intensity');
    this.elVFXLightVal = document.getElementById('vfx-light-val');
    this.elVFXPlayBtn = document.getElementById('vfx-play-btn');
    this.elVFXSaveBtn = document.getElementById('vfx-save-btn');
    this.elVFXResetBtn = document.getElementById('vfx-reset-btn');

    // Build texture dropdowns for each layer (alpha textures + flipbook spritesheets)
    document.querySelectorAll('.vfx-texture').forEach(sel => {
      sel.innerHTML = '<option value="">(none)</option>' +
        ALL_TEXTURE_KEYS.map(k => {
          const label = k.startsWith('fb_') ? '📖 ' + k.slice(3) : k;
          return `<option value="${k}">${label}</option>`;
        }).join('');
    });

    // Build recipe dropdown
    this.elVFXRecipe = document.getElementById('vfx-recipe');
    this.elVFXRecipeStatus = document.getElementById('vfx-recipe-status');
    if (this.elVFXRecipe) {
      this.elVFXRecipe.innerHTML = '<option value="">(custom)</option>' +
        PRESET_KEYS.map(k => `<option value="${k}">${VFX_PRESETS[k].name}</option>`).join('');
      this.elVFXRecipe.addEventListener('change', (e) => {
        const preset = getRecipeWithOverride(e.target.value);
        if (preset) {
          this._applyPresetToLayers(preset);
          this._syncRecipeStatus(e.target.value);
          this._debouncedVFXPlay();
        }
      });
    }

    // Recipe save/reset buttons
    const elRecipeSave = document.getElementById('vfx-recipe-save-btn');
    const elRecipeReset = document.getElementById('vfx-recipe-reset-btn');
    if (elRecipeSave) {
      elRecipeSave.addEventListener('click', () => {
        const key = this.elVFXRecipe?.value;
        if (!key) {
          this._showToast('Select a recipe first!');
          return;
        }
        const config = this._buildVFXConfig();
        saveRecipeOverride(key, config);
        this._syncRecipeStatus(key);
        this._showToast(`${VFX_PRESETS[key]?.name || key} override saved!`);
        SFXMapper.uiClick();
      });
    }
    if (elRecipeReset) {
      elRecipeReset.addEventListener('click', () => {
        const key = this.elVFXRecipe?.value;
        if (!key) {
          this._showToast('Select a recipe first!');
          return;
        }
        resetRecipeOverride(key);
        const preset = VFX_PRESETS[key];
        if (preset) this._applyPresetToLayers(preset);
        this._syncRecipeStatus(key);
        this._showToast(`${VFX_PRESETS[key]?.name || key} reset to default`);
        SFXMapper.uiClick();
      });
    }

    // Export hardcoded recipes
    const elExportBtn = document.getElementById('vfx-export-btn');
    const elExportModal = document.getElementById('vfx-export-modal');
    const elExportTextarea = document.getElementById('vfx-export-textarea');
    const elExportClose = document.getElementById('vfx-export-close');
    if (elExportBtn && elExportModal && elExportTextarea) {
      elExportBtn.addEventListener('click', () => {
        const code = this._generateHardcodedRecipes();
        elExportTextarea.value = code;
        elExportModal.classList.add('active');
        SFXMapper.uiClick();
      });
      elExportClose?.addEventListener('click', () => {
        elExportModal.classList.remove('active');
      });
      elExportModal.addEventListener('click', (e) => {
        if (e.target === elExportModal) elExportModal.classList.remove('active');
      });
    }

    // Weapon VFX attachment
    this.elVFXWeaponName = document.getElementById('vfx-weapon-name');
    this.elVFXWeaponStatus = document.getElementById('vfx-weapon-status');
    this.elVFXWeaponAttach = document.getElementById('vfx-weapon-attach-btn');
    if (this.elVFXWeaponAttach) {
      this.elVFXWeaponAttach.addEventListener('click', () => {
        const weaponId = this._getEquippedWeaponId();
        if (!weaponId) {
          this._showToast('Equip a weapon first!');
          return;
        }
        const config = this._buildVFXConfig();
        saveWeaponVFX(weaponId, config);
        this._syncWeaponVFXSection();
        this._showToast(`Config attached to ${getKayKitItem(weaponId)?.name || weaponId}!`);
        SFXMapper.uiClick();
      });
    }

    // Bind all range sliders to show their values + auto-play
    document.querySelectorAll('.vfx-range').forEach(input => {
      input.addEventListener('input', (e) => {
        const layer = e.target.closest('.vfx-layer');
        if (layer) {
          layer.querySelector(`.vfx-val[data-field="${e.target.dataset.field}"]`).textContent = e.target.value;
        }
        this._debouncedVFXPlay();
      });
    });

    if (this.elVFXLightIntensity) {
      this.elVFXLightIntensity.addEventListener('input', (e) => {
        if (this.elVFXLightVal) this.elVFXLightVal.textContent = e.target.value;
        this._debouncedVFXPlay();
      });
    }

    // Auto-play on control changes
    document.querySelectorAll('.vfx-texture').forEach(sel => {
      sel.addEventListener('change', () => this._debouncedVFXPlay());
    });
    document.querySelectorAll('.vfx-color').forEach(inp => {
      inp.addEventListener('input', () => this._debouncedVFXPlay());
    });
    document.querySelectorAll('.vfx-blend').forEach(sel => {
      sel.addEventListener('change', () => this._debouncedVFXPlay());
    });
    document.querySelectorAll('.vfx-loop').forEach(inp => {
      inp.addEventListener('change', () => this._debouncedVFXPlay());
    });

    // Duplicate layer buttons
    document.querySelectorAll('.vfx-duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sourceLayer = btn.closest('.vfx-layer');
        const sourceIndex = parseInt(sourceLayer.dataset.layer);
        const targetIndex = sourceIndex + 1;
        const targetLayer = document.querySelector(`.vfx-layer[data-layer="${targetIndex}"]`);
        if (!targetLayer) return;
        // Copy texture
        const srcTex = sourceLayer.querySelector('.vfx-texture');
        const tgtTex = targetLayer.querySelector('.vfx-texture');
        if (srcTex && tgtTex) tgtTex.value = srcTex.value;
        // Copy color
        const srcColor = sourceLayer.querySelector('.vfx-color');
        const tgtColor = targetLayer.querySelector('.vfx-color');
        if (srcColor && tgtColor) tgtColor.value = srcColor.value;
        // Copy sliders and labels
        ['count','size','life','speed','gravity'].forEach(field => {
          const srcRange = sourceLayer.querySelector(`.vfx-range[data-field="${field}"]`);
          const tgtRange = targetLayer.querySelector(`.vfx-range[data-field="${field}"]`);
          const tgtLabel = targetLayer.querySelector(`.vfx-val[data-field="${field}"]`);
          if (srcRange && tgtRange) tgtRange.value = srcRange.value;
          if (tgtLabel) tgtLabel.textContent = srcRange?.value || '';
        });
        // Copy offsets
        ['offsetX','offsetY','offsetZ'].forEach(field => {
          const srcLabel = sourceLayer.querySelector(`.vfx-val[data-field="${field}"]`);
          const tgtLabel = targetLayer.querySelector(`.vfx-val[data-field="${field}"]`);
          if (srcLabel && tgtLabel) tgtLabel.textContent = srcLabel.textContent;
        });
        // Copy blend and loop
        const srcBlend = sourceLayer.querySelector('.vfx-blend');
        const tgtBlend = targetLayer.querySelector('.vfx-blend');
        if (srcBlend && tgtBlend) tgtBlend.value = srcBlend.value;
        const srcLoop = sourceLayer.querySelector('.vfx-loop');
        const tgtLoop = targetLayer.querySelector('.vfx-loop');
        if (srcLoop && tgtLoop) tgtLoop.checked = srcLoop.checked;
        this._debouncedVFXPlay();
      });
    });

    // Per-layer offset nudge buttons
    document.querySelectorAll('.vfx-layer').forEach(layer => {
      layer.querySelectorAll('.vfx-nudge').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const field = btn.dataset.nudgeField;
          const delta = parseFloat(btn.dataset.nudgeDelta);
          const label = layer.querySelector(`.vfx-val[data-field="${field}"]`);
          let val = parseFloat(label?.textContent || '0') + delta;
          val = Math.round(val * 100) / 100;
          if (label) label.textContent = val;
          this._debouncedVFXPlay();
        });
      });
    });

    if (this.elVFXPlayBtn) {
      this.elVFXPlayBtn.addEventListener('click', () => this._tryElementVFX());
    }
    if (this.elVFXSaveBtn) {
      this.elVFXSaveBtn.addEventListener('click', () => this._saveVFXConfig());
    }
    if (this.elVFXResetBtn) {
      this.elVFXResetBtn.addEventListener('click', () => this._resetVFXConfig());
    }
  }

  _debouncedVFXPlay() {
    if (this._vfxDebounceTimer) clearTimeout(this._vfxDebounceTimer);
    this._vfxDebounceTimer = setTimeout(() => {
      if (this.vfxPreviewEnabled) this._tryElementVFX(false);
    }, 300);
  }

  _syncVFXPanel() {
    if (!this.elVFXParams) return;

    // Toggle equipment vs VFX panel in right sidebar
    const equipHeading = document.getElementById('loadout-right-heading');
    const equipGrid = document.getElementById('loadout-equipment');
    if (this.vfxPreviewEnabled) {
      this.elVFXParams.style.display = 'flex';
      if (equipHeading) equipHeading.style.display = 'none';
      if (equipGrid) equipGrid.style.display = 'none';
    } else {
      this.elVFXParams.style.display = 'none';
      if (equipHeading) equipHeading.style.display = '';
      if (equipGrid) equipGrid.style.display = '';
      return;
    }

    // Load current element config (with custom overrides if any)
    const config = getElementConfig(this.selectedElement);

    // Sync light
    if (this.elVFXLightIntensity) {
      this.elVFXLightIntensity.value = config.intensity || 5;
      if (this.elVFXLightVal) this.elVFXLightVal.textContent = config.intensity || 5;
    }

    // Reset recipe dropdown to custom since saved configs may not match a preset
    if (this.elVFXRecipe) this.elVFXRecipe.value = '';

    // Sync particle layers from saved config (not hardcoded defaults)
    const savedLayers = config.particleLayers || [];
    const defaultParticles = config.particles || [];
    document.querySelectorAll('.vfx-layer').forEach((layer, i) => {
      const saved = savedLayers[i] || {};
      const tex = saved.texture || defaultParticles[i] || '';
      const color = saved.color || config.color || '#ffffff';
      const selTex = layer.querySelector('.vfx-texture');
      const selColor = layer.querySelector('.vfx-color');
      if (selTex) selTex.value = tex;
      if (selColor) selColor.value = color;

      // Restore saved slider values, or use defaults if never saved
      const defaults = { count: 16, size: 0.35, life: 1.0, speed: 5, gravity: 6 };
      const offsets = { offsetX: 0.6, offsetY: 0, offsetZ: 0.6 };
      Object.entries(defaults).forEach(([field, defVal]) => {
        const range = layer.querySelector(`.vfx-range[data-field="${field}"]`);
        const label = layer.querySelector(`.vfx-val[data-field="${field}"]`);
        const val = saved[field] !== undefined ? saved[field] : defVal;
        if (range) range.value = val;
        if (label) label.textContent = val;
      });
      Object.entries(offsets).forEach(([field, defVal]) => {
        const label = layer.querySelector(`.vfx-val[data-field="${field}"]`);
        const val = saved[field] !== undefined ? saved[field] : defVal;
        if (label) label.textContent = val;
      });

      // Restore blend and loop
      const blendSel = layer.querySelector('.vfx-blend');
      const loopCheck = layer.querySelector('.vfx-loop');
      if (blendSel) blendSel.value = saved.blend || 'normal';
      if (loopCheck) loopCheck.checked = saved.loop || false;
    });

    // Sync weapon VFX section
    this._syncWeaponVFXSection();
  }

  _getEquippedWeaponId() {
    // In loadout preview, use the loadout state; in game, use player's loadout
    const loadout = this.loadoutState || this.game?.player?.loadout;
    return loadout?.rightHand || loadout?.leftHand || null;
  }

  _syncWeaponVFXSection() {
    const weaponId = this._getEquippedWeaponId();
    const item = weaponId ? getKayKitItem(weaponId) : null;
    if (this.elVFXWeaponName) {
      this.elVFXWeaponName.textContent = item?.name || 'No weapon equipped';
    }
    if (this.elVFXWeaponStatus) {
      const cfg = getWeaponVFXConfig(weaponId);
      this.elVFXWeaponStatus.textContent = cfg ? '✓ Config attached' : '';
    }
    if (this.elVFXWeaponAttach) {
      this.elVFXWeaponAttach.textContent = `Attach Current Config${item ? ` to ${item.name}` : ''}`;
    }
  }

  _syncRecipeStatus(recipeKey) {
    if (!this.elVFXRecipeStatus) return;
    const override = recipeKey ? getRecipeOverride(recipeKey) : null;
    this.elVFXRecipeStatus.textContent = override ? '✓ Override saved' : '';
  }

  _generateHardcodedRecipes() {
    const lines = ['export const VFX_PRESETS = {'];
    for (const key of PRESET_KEYS) {
      const preset = getRecipeWithOverride(key);
      if (!preset) continue;
      lines.push(`  ${key}: {`);
      lines.push(`    name: '${preset.name}',`);
      lines.push(`    particleLayers: [`);
      for (const layer of preset.particleLayers || []) {
        const props = [];
        if (layer.texture) props.push(`texture: '${layer.texture}'`);
        if (layer.color) props.push(`color: '${layer.color}'`);
        if (layer.count !== undefined) props.push(`count: ${layer.count}`);
        if (layer.size !== undefined) props.push(`size: ${layer.size}`);
        if (layer.life !== undefined) props.push(`life: ${layer.life}`);
        if (layer.speed !== undefined) props.push(`speed: ${layer.speed}`);
        if (layer.gravity !== undefined) props.push(`gravity: ${layer.gravity}`);
        if (layer.offsetX !== undefined) props.push(`offsetX: ${layer.offsetX}`);
        if (layer.offsetY !== undefined) props.push(`offsetY: ${layer.offsetY}`);
        if (layer.offsetZ !== undefined) props.push(`offsetZ: ${layer.offsetZ}`);
        if (layer.blend) props.push(`blend: '${layer.blend}'`);
        if (layer.loop) props.push(`loop: ${layer.loop}`);
        lines.push(`      { ${props.join(', ')} },`);
      }
      lines.push(`    ],`);
      if (preset.color) lines.push(`    color: '${preset.color}',`);
      if (preset.intensity !== undefined) lines.push(`    intensity: ${preset.intensity},`);
      lines.push(`  },`);
    }
    lines.push('};');
    return lines.join('\n');
  }

  _buildVFXConfig() {
    const particleLayers = [];
    document.querySelectorAll('.vfx-layer').forEach(layer => {
      const tex = layer.querySelector('.vfx-texture')?.value;
      if (!tex) return;
      particleLayers.push({
        texture: tex,
        color: layer.querySelector('.vfx-color')?.value || '#ffffff',
        count: parseInt(layer.querySelector('.vfx-range[data-field="count"]')?.value || 16, 10),
        size: parseFloat(layer.querySelector('.vfx-range[data-field="size"]')?.value || 0.35),
        life: parseFloat(layer.querySelector('.vfx-range[data-field="life"]')?.value || 1.0),
        speed: parseFloat(layer.querySelector('.vfx-range[data-field="speed"]')?.value || 5),
        gravity: parseFloat(layer.querySelector('.vfx-range[data-field="gravity"]')?.value || 6),
        offsetX: parseFloat(layer.querySelector('.vfx-val[data-field="offsetX"]')?.textContent || 0.6),
        offsetY: parseFloat(layer.querySelector('.vfx-val[data-field="offsetY"]')?.textContent || 0),
        offsetZ: parseFloat(layer.querySelector('.vfx-val[data-field="offsetZ"]')?.textContent || 0.6),
        blend: layer.querySelector('.vfx-blend')?.value || 'normal',
        loop: layer.querySelector('.vfx-loop')?.checked || false,
      });
    });

    return {
      name: ELEMENTS[this.selectedElement]?.name || 'Custom',
      particleLayers,
      color: particleLayers[0]?.color || '#ffffff',
      intensity: parseFloat(this.elVFXLightIntensity?.value || 5),
    };
  }

  _saveVFXConfig() {
    const config = this._buildVFXConfig();
    saveCustomConfig(this.selectedElement, config);
    SFXMapper.uiClick();
    this._showToast(`${ELEMENTS[this.selectedElement]?.name || 'Custom'} saved!`);
    if (this.elVFXSaveBtn) {
      const orig = this.elVFXSaveBtn.textContent;
      this.elVFXSaveBtn.textContent = '✓ Saved';
      setTimeout(() => this.elVFXSaveBtn.textContent = orig, 1000);
    }
  }

  _resetVFXConfig() {
    resetCustomConfig(this.selectedElement);
    this._syncVFXPanel();
    this._showToast('Reset to default');
    SFXMapper.uiClick();
  }

  _applyPresetToLayers(preset) {
    const layers = document.querySelectorAll('.vfx-layer');
    const defaults = { count: 16, size: 0.35, life: 1.0, speed: 5, gravity: 6, offsetX: 0.6, offsetY: 0, offsetZ: 0.6, blend: 'normal', loop: false };
    layers.forEach((layer, i) => {
      const cfg = preset.particleLayers?.[i] || {};
      // Texture
      const texSel = layer.querySelector('.vfx-texture');
      if (texSel) texSel.value = cfg.texture || '';
      // Color
      const colorInp = layer.querySelector('.vfx-color');
      if (colorInp) colorInp.value = cfg.color || '#ffffff';
      // Blend
      const blendSel = layer.querySelector('.vfx-blend');
      if (blendSel) blendSel.value = cfg.blend || defaults.blend;
      // Loop
      const loopCheck = layer.querySelector('.vfx-loop');
      if (loopCheck) loopCheck.checked = cfg.loop || defaults.loop;
      // Sliders
      ['count','size','life','speed','gravity'].forEach(field => {
        const range = layer.querySelector(`.vfx-range[data-field="${field}"]`);
        const label = layer.querySelector(`.vfx-val[data-field="${field}"]`);
        const val = cfg[field] !== undefined ? cfg[field] : defaults[field];
        if (range) range.value = val;
        if (label) label.textContent = val;
      });
      // Offsets
      ['offsetX','offsetY','offsetZ'].forEach(field => {
        const label = layer.querySelector(`.vfx-val[data-field="${field}"]`);
        const val = cfg[field] !== undefined ? cfg[field] : defaults[field];
        if (label) label.textContent = val;
      });
    });
    // Light intensity
    if (this.elVFXLightIntensity && preset.intensity !== undefined) {
      this.elVFXLightIntensity.value = preset.intensity;
      if (this.elVFXLightVal) this.elVFXLightVal.textContent = preset.intensity;
    }
  }

  _showToast(msg) {
    let toast = document.getElementById('vfx-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'vfx-toast';
      toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 16px;background:rgba(0,0,0,0.8);color:#7ed6ab;border:1px solid rgba(126,214,171,0.5);border-radius:6px;font-size:12px;font-weight:800;z-index:9999;pointer-events:none;transition:opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1500);
  }

  _syncCalibrationPanel() {
    this.elCalibrationToggle?.classList.toggle('active', this.calibrationEnabled);
    this.elVfxPreviewToggle?.classList.toggle('active', this.vfxPreviewEnabled);
    this.elCalibrationPanel?.classList.toggle('active', this.calibrationEnabled);
    this._syncVFXPanel();
  }

  _bindNudgeButtons() {
    const startRepeat = (btn) => {
      const field = btn.dataset.calField;
      const delta = parseFloat(btn.dataset.calDelta);
      if (this._nudgeInterval) clearInterval(this._nudgeInterval);
      this._adjustCalibration(field, delta);
      this._nudgeInterval = setInterval(() => {
        this._adjustCalibration(field, delta);
      }, 80);
    };
    const stopRepeat = () => {
      if (this._nudgeInterval) {
        clearInterval(this._nudgeInterval);
        this._nudgeInterval = null;
      }
    };
    document.querySelectorAll('[data-cal-field]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); startRepeat(btn); });
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); startRepeat(btn); });
      btn.addEventListener('mouseup', stopRepeat);
      btn.addEventListener('mouseleave', stopRepeat);
      btn.addEventListener('touchend', stopRepeat);
      btn.addEventListener('touchcancel', stopRepeat);
    });
  }

  _setCalibrationSlot(slot) {
    this.calibrationSlot = slot;
    if (!this.preview) return;
    const snapshot = this.calibrationEnabled
      ? this.preview.setCalibrationSlot(slot)
      : this.preview.setCalibrationEnabled(false, slot);
    this._renderCalibrationReadout(snapshot);
  }

  _adjustCalibration(field, delta) {
    if (!this.preview || !this.calibrationEnabled) return;
    const snapshot = this.preview.adjustCalibration(field, delta);
    this._syncScaleSlider(snapshot);
    this._renderCalibrationReadout(snapshot);
  }

  _setCalibrationScale(value) {
    if (!this.preview || !this.calibrationEnabled) return;
    const snapshot = this.preview.setCalibration('scale', value);
    this._renderCalibrationReadout(snapshot);
  }

  _syncScaleSlider(snapshot) {
    if (!this.elCalibrationScaleSlider || !snapshot || !snapshot.enabled) return;
    if (snapshot.offset && typeof snapshot.offset.scale === 'number') {
      this.elCalibrationScaleSlider.value = snapshot.offset.scale;
    }
  }

  _resetCalibration() {
    if (!this.preview) return;
    const snapshot = this.preview.getCalibrationSnapshot();
    const itemId = snapshot?.itemId;
    const slot = snapshot?.slot;
    if (itemId && slot) {
      clearKayKitItemGripPreset(itemId, slot);
    }
    const resetSnapshot = this.preview.resetCalibrationOffset();
    this._syncScaleSlider(resetSnapshot);
    this._renderCalibrationReadout(resetSnapshot);
  }

  _saveCalibration() {
    if (!this.preview) return;
    this.preview.player.saveCalibrationOffset();
    this._syncScaleSlider(this.preview.getCalibrationSnapshot());
    this._renderCalibrationReadout(this.preview.getCalibrationSnapshot(), true);
    this._flashReadout('✓ Saved');
  }

  _refreshCalibrationAfterLoadout(slot) {
    if (!this.preview || !this.calibrationEnabled) return;
    const nextSlot = slot || this.calibrationSlot;
    this.calibrationSlot = nextSlot;
    if (this.elCalibrationSlot) this.elCalibrationSlot.value = nextSlot;
    const snapshot = this.preview.setCalibrationSlot(nextSlot);
    this._syncScaleSlider(snapshot);
    this._renderCalibrationReadout(snapshot);
  }

  _flashReadout(message) {
    if (!this.elCalibrationReadout) return;
    const originalBg = this.elCalibrationReadout.style.background;
    this.elCalibrationReadout.style.background = 'rgba(126,214,171,0.25)';
    this.elCalibrationReadout.dataset.flashMsg = message;
    this._renderCalibrationReadout(this.preview?.getCalibrationSnapshot?.() || null, false, null, message);
    setTimeout(() => {
      if (this.elCalibrationReadout) {
        this.elCalibrationReadout.style.background = originalBg || '';
        delete this.elCalibrationReadout.dataset.flashMsg;
        this._renderCalibrationReadout(this.preview?.getCalibrationSnapshot?.() || null);
      }
    }, 1500);
  }

  _renderCalibrationReadout(snapshot, marked = false, message = null) {
    if (!this.elCalibrationReadout) return;
    if (!snapshot || !snapshot.enabled) {
      this.elCalibrationReadout.textContent = 'Calibration off';
      return;
    }
    const itemName = snapshot.itemId || 'none';
    const hasSaved = snapshot.itemGripPreset && Object.keys(snapshot.itemGripPreset.offset || {}).some(k => snapshot.itemGripPreset.offset[k] !== 0 && snapshot.itemGripPreset.offset[k] !== 1);
    const savedTag = hasSaved ? ' [SAVED]' : '';
    const prefix = marked ? '✓ SAVED ' : '';
    const msgLine = message ? ` → ${message}` : '';
    const zoomLine = this.preview && this.preview.zoom !== 1.0 ? `  zoom ${this.preview.zoom.toFixed(1)}x` : '';

    const o = snapshot.offset || {};
    this.elCalibrationReadout.textContent =
      `${prefix}${itemName} · ${snapshot.slot}${savedTag}${zoomLine}${msgLine}\n` +
      `pos ${o.x},${o.y},${o.z}  rot ${o.rx},${o.ry},${o.rz}  scale ${o.scale}`;
  }

  updateStats() {
    const p = this.game.player;
    const hpWidth = `${(p.hp / p.maxHp * 100).toFixed(1)}%`;
    const hpText = `${Math.ceil(p.hp)}/${p.maxHp}`;
    const staminaWidth = `${(p.stamina / (p.maxStamina || GAME.MAX_STAMINA) * 100).toFixed(1)}%`;
    const floorText = String(this.game.world.floor);
    const coinText = String(p.coins);
    const levelText = String(p.level);
    const killsText = String(this.game.killCount);

    if (this.elHp && this._lastHpWidth !== hpWidth) {
      this.elHp.style.width = hpWidth;
      this._lastHpWidth = hpWidth;
    }
    if (this.elHpText && this._lastHpText !== hpText) {
      this.elHpText.textContent = hpText;
      this._lastHpText = hpText;
    }
    if (this.elStamina && this._lastStaminaWidth !== staminaWidth) {
      this.elStamina.style.width = staminaWidth;
      this._lastStaminaWidth = staminaWidth;
    }
    // Rocket boots fuel bar
    const hasBoots = p.equippedBoots === 'rocket_boots';
    if (this.elFuelWrapper) {
      this.elFuelWrapper.style.display = hasBoots ? 'block' : 'none';
    }
    if (hasBoots && this.elFuel) {
      const fuelWidth = `${(p.rocketBootsFuel / p.rocketBootsMaxFuel * 100).toFixed(1)}%`;
      if (this._lastFuelWidth !== fuelWidth) {
        this.elFuel.style.width = fuelWidth;
        this._lastFuelWidth = fuelWidth;
      }
      // Flash red when empty
      if (p.rocketBootsFuel <= 0.01 && !this.elFuelWrapper.classList.contains('fuel-bar-empty')) {
        this.elFuelWrapper.classList.add('fuel-bar-empty');
      } else if (p.rocketBootsFuel > 0.01 && this.elFuelWrapper.classList.contains('fuel-bar-empty')) {
        this.elFuelWrapper.classList.remove('fuel-bar-empty');
      }
    }
    if (this.elFloor && this._lastFloorText !== floorText) {
      this.elFloor.textContent = floorText;
      this._lastFloorText = floorText;
    }
    if (this.elCoin && this._lastCoinText !== coinText) {
      this.elCoin.textContent = coinText;
      this._lastCoinText = coinText;
    }
    if (this.elLevel && this._lastLevelText !== levelText) {
      this.elLevel.textContent = levelText;
      this._lastLevelText = levelText;
    }
    if (this.elKills && this._lastKillsText !== killsText) {
      this.elKills.textContent = killsText;
      this._lastKillsText = killsText;
    }
  }

  setTimer(seconds) {
    if (!this.elTimer) return;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    this.elTimer.textContent = `${m}:${s}`;
    // Countdown styling
    if (seconds <= 10) {
      this.elTimer.style.color = '#ff4444';
      this.elTimer.style.animation = 'pulse 0.5s infinite';
    } else if (seconds <= 20) {
      this.elTimer.style.color = '#ffaa00';
      this.elTimer.style.animation = 'none';
    } else {
      this.elTimer.style.color = '#fff';
      this.elTimer.style.animation = 'none';
    }
  }

  showTimeBonus(text) {
    this.showFloatingText(text, 0x44aaff);
  }

  // inventoryGrid: show player inventory as a grid
  showInventoryGrid(items) {
    // Minimal inventory grid — rendered as floating text rows for now
    const container = document.getElementById('inventory-grid');
    if (!container) return;
    container.innerHTML = '';
    for (const [item, qty] of Object.entries(items)) {
      const el = document.createElement('div');
      el.className = 'inv-grid-item';
      el.textContent = `${item}: ${qty}`;
      container.appendChild(el);
    }
  }

  // consumable: handle consumable item usage
  onConsumableUse(item, player) {
    if (item === 'health_meat' || item === 'health_scifi') {
      player.hp = Math.min(player.maxHp, player.hp + 20);
      return true;
    }
    return false;
  }

  showFloatingText(text, color = 0xffffff) {
    const now = performance.now?.() || Date.now();
    if (this._floatingTextCount >= 8) return;
    if (this._lastFloatingText.text === text && now - this._lastFloatingText.at < 120) return;
    this._lastFloatingText = { text, at: now };

    const el = document.createElement('div');
    el.className = 'floating-loot';
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '45%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.color = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
    el.style.fontWeight = 'bold';
    el.style.fontSize = '18px';
    el.style.pointerEvents = 'none';
    el.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
    el.style.transition = 'all 1s ease-out';
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.top = '35%';
      el.style.opacity = '0';
    });
    this._floatingTextCount++;
    setTimeout(() => {
      el.remove();
      this._floatingTextCount = Math.max(0, this._floatingTextCount - 1);
    }, 1000);
  }

  showExitOpen(show) {
    if (this.elExitOpen) {
      this.elExitOpen.style.display = show ? 'block' : 'none';
    }
  }

  setFloorText(text) {
    this.elFloorIndicator.textContent = text;
  }

  setHotbarSlot(slot) {
    document.querySelectorAll('.hotbar-slot').forEach((el, i) => {
      el.classList.toggle('active', i === slot);
    });
  }

  showDamageNumber(pos, amount, isCrit = false) {
    const el = document.createElement('div');
    el.className = 'damage-number';
    el.textContent = amount;
    el.style.left = '50%';
    el.style.top = '40%';
    el.style.color = isCrit ? '#fbbf24' : '#fff';
    el.style.fontSize = isCrit ? '28px' : '20px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  showCamp(fromDeath = false) {
    this._campFromDeath = fromDeath;
    if (document.pointerLockElement) document.exitPointerLock();
    this._setTouchControlsVisible(false);
    this._setZoneLetterHudVisible(false);
    this.elCamp.classList.add('active');
    this.elHud.style.display = 'none';
    this.elCrosshair.style.display = 'none';
    this.elHotbar.style.display = 'none';
    this.elFloorIndicator.style.display = 'none';
    if (this.elBrightness) this.elBrightness.style.display = 'none';
    if (this.elZoom) this.elZoom.style.display = 'none';
    if (this.elFps) this.elFps.style.display = 'none';
    if (this.elExitOpen) this.elExitOpen.style.display = 'none';
    if (this.elDescendBtn) {
      this.elDescendBtn.textContent = fromDeath ? 'TRY AGAIN' : 'DESCEND';
    }
    this._renderPetDen();
  }

  hideCamp() {
    this.elCamp.classList.remove('active');
    this._setTouchControlsVisible(true);
    this._setZoneLetterHudVisible(true);
    this.elHud.style.display = 'block';
    this.elCrosshair.style.display = 'block';
    this.elHotbar.style.display = 'flex';
    this.elFloorIndicator.style.display = 'block';
    if (this.elBrightness) this.elBrightness.style.display = 'flex';
    if (this.elZoom) this.elZoom.style.display = 'flex';
    if (this.elFps) this.elFps.style.display = 'block';
    this._updatePetHud();
  }

  showShop() {
    this._ensureProgressionOverlay();
    this.progressionOpen = true;
    this._progressionOverlay.classList.add('active');
    this._renderProgressionOverlay();
  }

  hideShop() {
    this.progressionOpen = false;
    if (this._progressionOverlay) this._progressionOverlay.classList.remove('active');
  }

  _ensureProgressionOverlay() {
    if (this._progressionOverlay) return;
    const el = document.createElement('div');
    el.id = 'progression-overlay';
    el.className = 'shop-overlay progression-overlay';
    el.innerHTML = `
      <div class="shop-panel progression-panel">
        <div class="shop-header">
          <h2>Progression</h2>
          <div class="shop-header-actions">
            <button class="shop-appearance-btn" id="progression-appearance-btn" title="Customize appearance">Appearance</button>
            <div class="shop-coins">Coins <span id="progression-coin-display">0</span></div>
          </div>
          <button class="shop-close" id="progression-close-btn" title="Close">x</button>
        </div>
        <div class="progression-summary" id="progression-summary"></div>
        <div class="shop-content progression-content" id="progression-content"></div>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('#progression-close-btn')?.addEventListener('click', () => {
      SFXMapper.uiClick();
      this.hideShop();
    });
    el.querySelector('#progression-appearance-btn')?.addEventListener('click', () => {
      SFXMapper.uiClick();
      this.hideShop();
      this.showLoadout();
    });
    this._progressionOverlay = el;
  }

  _renderProgressionOverlay() {
    const progression = this.game.progression;
    const coinEl = this._progressionOverlay.querySelector('#progression-coin-display');
    if (coinEl) coinEl.textContent = this.game.player.coins;

    const zone = this.game.zoneManager.getCurrentZone();
    const mined = progression.getZoneMined(zone?.id);
    const target = progression.getZoneMiningTarget(zone);
    const summary = this._progressionOverlay.querySelector('#progression-summary');
    if (summary) {
      summary.innerHTML = `
        <div><strong>${zone?.name || 'Zone'}</strong><span>Mining ${Math.min(mined, target)} / ${target}</span></div>
        <div><strong>Pickaxe</strong><span>${progression.getPickaxeWidth()} block swing</span></div>
        <div><strong>Grenades</strong><span>${progression.state.grenade.unlocked ? `${progression.state.grenade.charges}/${progression.getGrenadeChargeCap()} charges` : 'Locked'}</span></div>
        <div><strong>Strike</strong><span>${progression.state.missile.unlocked ? `${progression.state.missile.charges}/2 beacons` : 'Locked'}</span></div>
      `;
    }

    // Add reset pickaxe button if width > 1
    let resetBtn = this._progressionOverlay.querySelector('#pickaxe-reset-btn');
    if (progression.getPickaxeWidth() > 1) {
      if (!resetBtn) {
        resetBtn = document.createElement('button');
        resetBtn.id = 'pickaxe-reset-btn';
        resetBtn.className = 'pickaxe-reset-btn';
        resetBtn.textContent = '⛏ Reset Pickaxe';
        resetBtn.title = 'Reset pickaxe to width 1 and refund all coins spent';
        const header = this._progressionOverlay.querySelector('.shop-header-actions');
        if (header) header.appendChild(resetBtn);
        resetBtn.addEventListener('click', () => {
          SFXMapper.uiClick();
          this.game.resetPickaxeUpgrades();
          this._renderProgressionOverlay();
        });
      }
      resetBtn.style.display = '';
    } else if (resetBtn) {
      resetBtn.style.display = 'none';
    }

    const content = this._progressionOverlay.querySelector('#progression-content');
    if (!content) return;
    content.innerHTML = '';
    const groups = new Map();
    for (const card of progression.getCards()) {
      if (!groups.has(card.category)) groups.set(card.category, []);
      groups.get(card.category).push(card);
    }

    for (const [category, cards] of groups) {
      const section = document.createElement('section');
      section.className = 'progression-section';
      section.innerHTML = `<h3>${category}</h3>`;
      const grid = document.createElement('div');
      grid.className = 'shop-grid progression-grid';
      for (const card of cards) {
        const cost = card.cost;
        const item = document.createElement('article');
        item.className = 'shop-card progression-card' + (cost == null ? ' maxed' : '');
        item.innerHTML = `
          <div class="shop-card-name">${card.name}</div>
          <div class="shop-card-desc">${card.desc}</div>
          <div class="shop-card-level">${card.value}</div>
          <button class="shop-buy-btn" data-id="${card.id}" ${cost == null || this.game.player.coins < cost ? 'disabled' : ''}>
            ${cost == null ? 'Done' : `Buy ${cost}`}
          </button>
        `;
        item.querySelector('button')?.addEventListener('click', () => {
          const result = this.game.buyProgressionUpgrade(card.id);
          if (result.success) {
            SFXMapper.upgradeBuy();
            this.updateStats();
            this._renderProgressionOverlay();
          } else {
            SFXMapper.uiDenied();
          }
        });
        grid.appendChild(item);
      }
      section.appendChild(grid);
      content.appendChild(section);
    }

    this._renderResourceSeller(content);
  }

  _renderResourceSeller(content) {
    const resources = this.game.resources?.getAll?.() || [];
    const section = document.createElement('section');
    section.className = 'progression-section';
    section.innerHTML = '<h3>Resources</h3>';

    if (resources.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'camp-empty-note';
      empty.textContent = 'No dirt, gravel, scrap, or other mined junk to sell yet.';
      section.appendChild(empty);
      content.appendChild(section);
      return;
    }

    const totalValue = resources.reduce((sum, res) => sum + res.count * res.value, 0);
    const header = document.createElement('div');
    header.className = 'progression-resource-total';
    header.textContent = `Sell value in bag: ${totalValue} coins`;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'shop-grid progression-grid resource-sell-grid';

    for (const res of resources) {
      const card = document.createElement('article');
      card.className = 'shop-card progression-card resource-sell-card';
      card.innerHTML = `
        <div class="shop-card-name">${res.name}</div>
        <div class="shop-card-desc">Owned ${res.count} · ${res.value} coin${res.value === 1 ? '' : 's'} each</div>
        <div class="resource-sell-row">
          <button class="shop-buy-btn" data-type="${res.type}" data-amount="1">Sell 1</button>
          <button class="shop-buy-btn" data-type="${res.type}" data-amount="${res.count}">Sell All</button>
        </div>
      `;

      card.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const amount = Number(btn.dataset.amount || 1);
          const result = this.game.sellResource(btn.dataset.type, amount);
          if (result.success) {
            SFXMapper.upgradeBuy();
            this.showFloatingText(`+${result.coins} coins`, 0xfbbf24);
            this.updateStats();
            this._renderProgressionOverlay();
          } else {
            SFXMapper.uiDenied();
          }
        });
      });

      grid.appendChild(card);
    }

    section.appendChild(grid);
    content.appendChild(section);
  }

  // Gateway indicator UI
  showGatewayIndicator(zoneName, locked, requirements) {
    if (!this._gatewayIndicator) {
      this._gatewayIndicator = document.createElement('div');
      this._gatewayIndicator.className = 'gateway-indicator';
      document.body.appendChild(this._gatewayIndicator);
    }
    const icon = locked ? '🔒' : '✅';
    const text = locked ? requirements.join(' ') : '✅';
    this._gatewayIndicator.innerHTML = `<div>${icon} ${zoneName}</div><div class="gateway-req">${text}</div>`;
    this._gatewayIndicator.style.display = 'block';
  }

  hideGatewayIndicator() {
    if (this._gatewayIndicator) {
      this._gatewayIndicator.style.display = 'none';
    }
  }

  // Burn warning indicator
  showBurnWarning(show) {
    this.showHazardWarning('burn', show);
  }

  showHazardWarning(type = 'hazard', show = true) {
    if (!this._hazardWarning) {
      this._hazardWarning = document.createElement('div');
      this._hazardWarning.className = 'hazard-warning hazardIcon';
      document.body.appendChild(this._hazardWarning);
    }
    const icons = { burn: '🔥', toxic: '☠️', freeze: '❄️', heat: '☀️', quicksand: '🌀', curse: '🔮', hazard: '⚠️' };
    this._hazardWarning.textContent = show ? (icons[type] || icons.hazard) : '';
    this._hazardWarning.style.display = show ? 'block' : 'none';
  }

  showMiningBlocked(status, blockDef) {
    this.showBlockLocked(status, blockDef);
  }

  showBlockLocked(status, blockDef) {
    const current = Math.max(0, status?.currentTier || 0);
    const required = Math.max(1, status?.requiredTier || blockDef?.tier || 1);
    const pickaxePip = Array.from({ length: 4 }, (_, i) => i < current ? '●' : (i < required ? '○' : '·')).join('');
    const icon = status?.reason === 'wrong_weapon' ? '⛏️' : '🔒';
    this.showFloatingText(`${icon} ${pickaxePip}`, 0xff4444);
  }

  updateObjectiveHud(state) {
    if (!state) return;
    if (!this._objectiveHud) {
      this._objectiveHud = document.createElement('div');
      this._objectiveHud.className = 'objective-hud';
      document.body.appendChild(this._objectiveHud);
    }
    const lettersDone = state.letters?.done || 0;
    const lettersTotal = state.letters?.total || 0;
    const miningCurrent = state.mining?.current || 0;
    const miningTarget = state.mining?.target || 0;
    const pips = Array.from({ length: 6 }, (_, i) => i < (state.pickaxeTier || 0) ? '●' : '○').join('');
    const grenadeText = state.grenade?.unlocked
      ? `G ${state.grenade.charges}/${state.grenade.cap}${state.grenade.cooldown > 0 ? ` ${state.grenade.cooldown.toFixed(0)}s` : ''}`
      : 'G locked';
    const missileText = state.missile?.unlocked
      ? `Q ${state.missile.charges}/2${state.missile.cooldown > 0 ? ` ${state.missile.cooldown.toFixed(0)}s` : ''}`
      : 'Q locked';
    const signature = [
      state.zoneId,
      lettersDone,
      lettersTotal,
      miningCurrent,
      miningTarget,
      state.pickaxeTier || 0,
      grenadeText,
      missileText,
      state.completed ? 1 : 0,
    ].join('|');
    if (signature === this._objectiveHudSignature) {
      return;
    }
    this._objectiveHudSignature = signature;
    this._objectiveHud.innerHTML = `
      <span title="Letters">🔤 ${lettersDone}/${lettersTotal}</span>
      <span title="Mining">⛏ ${Math.min(miningCurrent, miningTarget)}/${miningTarget}</span>
      <span class="pickaxe-tier" title="Pickaxe">⛏ ${pips}</span>
      <span title="Grenades">${grenadeText}</span>
      <span title="Missile Strike">${missileText}</span>
      <span title="Gate">${state.completed ? '🔓' : '🔒'}</span>
    `;
    this.updateZoneLetterHud(state.zoneId);
  }

  updateZoneLetterHud(zoneId = this.game?.zoneManager?.currentZoneId) {
    const progression = this.game?.progression;
    if (!progression || !zoneId) return;
    const letters = progression.getZoneLetterProgress(zoneId);
    if (!letters.length) return;
    this._ensureZoneLetterHud();

    const signature = letters
      .map(item => [
        item.letter,
        item.level,
        Math.round(item.percent),
        item.dropsTowardQuiz,
        item.quizThreshold,
        item.quizReady ? 1 : 0,
        item.passed ? 1 : 0,
        item.maxed ? 1 : 0,
      ].join(':'))
      .join('|');
    if (signature === this._zoneLetterHudSignature) return;
    this._zoneLetterHudSignature = signature;

    this._zoneLetterHud.innerHTML = '';
    this._zoneLetterCards.clear();
    for (const item of letters) {
      const card = document.createElement('div');
      card.className = [
        'zone-letter-card',
        item.quizReady ? 'ready' : '',
        item.passed ? 'passed' : '',
        item.maxed ? 'maxed' : '',
      ].filter(Boolean).join(' ');
      card.dataset.letter = item.letter;

      const levelText = item.maxed ? 'MAX' : `Lv.${item.level}`;
      const quizText = item.maxed
        ? 'MASTERED'
        : `${item.dropsTowardQuiz}/${Number.isFinite(item.quizThreshold) ? item.quizThreshold : '-'}`;
      const xpText = item.maxed ? '' : `${Math.round(item.percent)}%`;

      card.innerHTML = `
        <div class="zone-letter-top">
          <span class="zone-letter-symbol">${item.letter}</span>
          <span class="zone-letter-level">${levelText}</span>
        </div>
        <div class="zone-letter-bar"><div class="zone-letter-fill" style="width:${item.percent.toFixed(1)}%"></div></div>
        <div class="zone-letter-meta">
          <span>${quizText}</span>
          <span>${xpText}</span>
        </div>
      `;
      card.title = item.maxed
        ? `${item.letter} mastered at level ${item.level}`
        : `${item.letter} level ${item.level}: ${item.xp}/${item.nextXp} XP, quiz ${item.dropsTowardQuiz}/${item.quizThreshold}`;
      this._zoneLetterHud.appendChild(card);
      this._zoneLetterCards.set(item.letter, card);
    }
  }

  animateLetterPickup(letter, worldPosition, zoneId = this.game?.zoneManager?.currentZoneId) {
    const targetLetter = String(letter || '').toUpperCase()[0];
    if (!targetLetter) return 0;
    const card = this._zoneLetterCards?.get(targetLetter)
      || this._zoneLetterHud?.querySelector(`.zone-letter-card[data-letter="${targetLetter}"]`);
    if (!card) return 0;

    if (this.game?.cameraMode === 'thirdPerson' || this._activeLetterFlyers > 0) {
      card.classList.remove('letter-fill-pop');
      requestAnimationFrame(() => card.classList.add('letter-fill-pop'));
      setTimeout(() => card.classList.remove('letter-fill-pop'), 360);
      return 180;
    }

    const endRect = card.getBoundingClientRect();
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;
    const start = this._worldToScreen(worldPosition);
    const startX = Number.isFinite(start?.x) ? start.x : window.innerWidth / 2;
    const startY = Number.isFinite(start?.y) ? start.y : window.innerHeight * 0.58;
    const midX = startX + (endX - startX) * 0.44;
    const midY = Math.min(startY, endY) - 82;

    const flyer = document.createElement('div');
    flyer.className = 'letter-pickup-flyer';
    flyer.textContent = targetLetter;
    flyer.style.left = '0';
    flyer.style.top = '0';
    document.body.appendChild(flyer);
    this._activeLetterFlyers++;

    const duration = 720;
    const animation = flyer.animate([
      { transform: `translate3d(${startX - 17}px, ${startY - 17}px, 0) scale(1) rotate(-6deg)`, opacity: 1, offset: 0 },
      { transform: `translate3d(${midX - 17}px, ${midY - 17}px, 0) scale(1.18) rotate(8deg)`, opacity: 1, offset: 0.48 },
      { transform: `translate3d(${endX - 17}px, ${endY - 17}px, 0) scale(0.42) rotate(0deg)`, opacity: 0.28, offset: 1 },
    ], {
      duration,
      easing: 'cubic-bezier(.18,.82,.22,1)',
      fill: 'forwards',
    });

    animation.onfinish = () => {
      flyer.remove();
      this._activeLetterFlyers = Math.max(0, this._activeLetterFlyers - 1);
      const freshCard = this._zoneLetterCards?.get(targetLetter)
        || this._zoneLetterHud?.querySelector(`.zone-letter-card[data-letter="${targetLetter}"]`);
      if (freshCard) {
        freshCard.classList.remove('letter-fill-pop');
        freshCard.offsetHeight;
        freshCard.classList.add('letter-fill-pop');
        setTimeout(() => freshCard.classList.remove('letter-fill-pop'), 520);
      }
    };

    return duration;
  }

  _worldToScreen(worldPosition) {
    if (!worldPosition || !this.game?.camera) return null;
    const projected = worldPosition.clone();
    projected.y += 0.65;
    projected.project(this.game.camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z > 1) return null;
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  _ensureZoneLetterHud() {
    if (this._zoneLetterHud) return;
    this._zoneLetterHud = document.createElement('div');
    this._zoneLetterHud.className = 'zone-letter-hud';
    document.body.appendChild(this._zoneLetterHud);
  }

  _setZoneLetterHudVisible(visible) {
    if (!this._zoneLetterHud) return;
    this._zoneLetterHud.style.display = visible ? 'flex' : 'none';
  }

  setFPS(fps, perfStats = null) {
    if (!this.elFps) return;
    if (!perfStats) {
      this.elFps.textContent = fps + ' FPS';
      return;
    }
    const timings = ` | ms w:${perfStats.worldMs.toFixed(1)} vis:${perfStats.terrainVisibilityMs.toFixed(1)} cam:${perfStats.cameraCollisionMs.toFixed(1)} ui:${(perfStats.uiMs || 0).toFixed(1)} render:${perfStats.renderMs.toFixed(1)}`;
    const ray = ` | rays ${perfStats.raycasts}/${perfStats.raycastMs.toFixed(1)} recompute ${perfStats.visibilityRecomputed}`;
    const scale = perfStats.renderScale && perfStats.renderScale < 0.99 ? ` | scale ${perfStats.renderScale.toFixed(2)}` : '';
    const terrainGuard = perfStats.terrainTruncatedSlots ? ` | TRUNC ${perfStats.terrainTruncatedSlots} maxV ${perfStats.terrainMaxUploadedVertices}` : '';
    const live = ` | scene ${perfStats.sceneChildren} geo ${perfStats.geometries} tex ${perfStats.textures} fx ${perfStats.shaderEffects} dom ${perfStats.flyers} audio ${perfStats.audioBuffers}/${perfStats.audioLoading}`;
    this.elFps.textContent = `${fps} FPS | calls ${perfStats.calls} | tris ${perfStats.triangles} | terrain ${perfStats.visibleChunks}/${perfStats.liveChunks} | dirty ${perfStats.dirtyChunks} cells ${perfStats.modifiedCells} | rebuild ${perfStats.terrainRebuildMs.toFixed(1)}ms${timings}${ray}${scale}${terrainGuard}${live}`;
  }

  // ===== Pet Den UI =====

  _bindPetDen() {
    if (this.elPetOverlayClose) {
      this.elPetOverlayClose.addEventListener('click', () => this.hidePetDenOverlay());
    }
  }

  togglePetDen() {
    if (this.petDenOpen) {
      this.hidePetDenOverlay();
    } else {
      this.showPetDenOverlay();
    }
  }

  showPetDenOverlay() {
    if (!this.elPetDenOverlay || this.petDenOpen) return;
    this._setTouchControlsVisible(false);
    this.petDenOpen = true;
    this.elPetDenOverlay.classList.add('active');
    this._renderPetDenOverlay();
  }

  hidePetDenOverlay() {
    if (!this.elPetDenOverlay || !this.petDenOpen) return;
    this.elPetDenOverlay.classList.remove('active');
    this.petDenOpen = false;
    this._setTouchControlsVisible(true);
    SFXMapper.uiClick();
  }

  _renderPetDen() {
    this._renderPetPanel(
      this.elPetEquippedLetter, this.elPetEquippedLevel,
      this.elPetLetterGrid, this.elPetProgressFill, this.elPetProgressText,
      this.elPetPreview
    );
  }

  _renderPetDenOverlay() {
    if (!this.petDenOpen) return;
    this._renderPetPanel(
      this.elPetOverlayLetter, this.elPetOverlayLevel,
      this.elPetOverlayGrid, this.elPetOverlayProgressFill, this.elPetOverlayProgressText,
      this.elPetOverlayPreview
    );
  }

  _renderPetPanel(letterEl, levelEl, gridEl, fillEl, textEl, previewEl) {
    const pm = this.game.petManager;
    if (!pm || !gridEl) return;

    const equipped = pm.getEquippedPet();
    const pets = pm.getAllPets();

    // Update equipped display
    if (equipped) {
      const cfg = PET_LEVELS.find(l => l.level === equipped.level) || PET_LEVELS[0];
      if (letterEl) {
        letterEl.textContent = equipped.letter;
        letterEl.style.color = '#' + cfg.color.toString(16).padStart(6, '0');
      }
      if (levelEl) {
        levelEl.textContent = `Lv.${equipped.level} ${cfg.label}`;
      }
      // Progress bar
      const nextReq = pm.getCapturesForNextLevel(equipped.captures);
      const prevReq = equipped.level > 1
        ? (PET_LEVELS.find(l => l.level === equipped.level - 1)?.capturesRequired || 0)
        : 0;
      const progress = equipped.level >= 7 ? 100
        : Math.min(100, ((equipped.captures - prevReq) / (nextReq - prevReq)) * 100);
      if (fillEl) fillEl.style.width = progress + '%';
      if (textEl) {
        textEl.textContent = equipped.level >= 7
          ? `${equipped.captures} captures — MAX LEVEL`
          : `${equipped.captures} / ${nextReq} to Lv.${equipped.level + 1}`;
      }
    } else {
      if (letterEl) {
        letterEl.textContent = '?';
        letterEl.style.color = '#666';
      }
      if (levelEl) levelEl.textContent = 'No pet equipped';
      if (fillEl) fillEl.style.width = '0%';
      if (textEl) textEl.textContent = '';
    }

    // Render letter grid
    gridEl.innerHTML = '';
    for (const pet of pets) {
      const card = document.createElement('div');
      card.className = 'pet-letter-card';

      if (!pet.unlocked) {
        card.classList.add('locked');
        // Show unlock progress overlay
        const progress = pm.getUnlockProgress(pet.letter);
        card.innerHTML = `
          <span class="pet-card-letter">${pet.letter}</span>
          <span class="pet-card-progress">${progress.current}/${progress.required}</span>
        `;
        card.title = `Spell ${pet.letter} words: ${progress.current}/${progress.required}`;
      } else {
        card.textContent = pet.letter;
        const cfg = PET_LEVELS.find(l => l.level === pet.level) || PET_LEVELS[0];
        const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');
        card.style.color = colorHex;
        card.style.background = colorHex + '22';
        card.style.boxShadow = `inset 0 0 8px ${colorHex}33`;
        if (equipped && equipped.letter === pet.letter) {
          card.classList.add('equipped');
        }
        card.addEventListener('click', () => {
          pm.equip(pet.letter);
          SFXMapper.uiClick();
          this._renderPetDen();
          this._renderPetDenOverlay();
          this._updatePetHud();
          // Spawn pet immediately if mid-run
          if (this.game.state === 'playing') {
            this.game._spawnPet();
          }
        });
      }
      gridEl.appendChild(card);
    }

    // Render level preview toggle
    this._renderPreviewLevels(previewEl, equipped);
  }

  _renderPreviewLevels(containerEl, equipped) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const pet = this.game.pet;
    const inGame = this.game.state === 'playing' && pet && equipped && pet.letter === equipped.letter;

    const label = document.createElement('div');
    label.className = 'pet-preview-label';
    label.textContent = 'Preview Level';
    containerEl.appendChild(label);

    const actualLevel = equipped?.level ?? 1;
    const visualLevel = pet?.visualLevel ?? actualLevel;

    for (let lv = 1; lv <= 7; lv++) {
      const cfg = PET_LEVELS.find(l => l.level === lv);
      const btn = document.createElement('button');
      btn.className = 'pet-level-btn';
      btn.textContent = lv;
      const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');
      btn.style.borderColor = colorHex;
      btn.style.color = colorHex;

      if (lv === actualLevel) {
        btn.classList.add('actual');
      }
      if (lv === visualLevel) {
        btn.classList.add('active');
        btn.style.background = colorHex;
        btn.style.color = '#000';
      }

      if (!inGame) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          pet.setVisualLevel(lv);
          this._renderPetDen();
          this._renderPetDenOverlay();
        });
      }
      containerEl.appendChild(btn);
    }

    if (inGame && visualLevel !== actualLevel) {
      const restore = document.createElement('button');
      restore.className = 'pet-restore-btn';
      restore.textContent = 'Restore';
      restore.addEventListener('click', () => {
        pet.clearVisualLevel();
        this._renderPetDen();
        this._renderPetDenOverlay();
      });
      containerEl.appendChild(restore);
    } else if (!inGame) {
      const hint = document.createElement('div');
      hint.className = 'pet-preview-hint';
      hint.textContent = 'Preview available in-game';
      containerEl.appendChild(hint);
    }
  }

  _updatePetHud() {
    const pm = this.game.petManager;
    if (!pm || !this.elPetHud) return;
    const equipped = pm.getEquippedPet();
    if (equipped) {
      this.elPetHud.classList.add('active');
      if (this.elPetHudLetter) this.elPetHudLetter.textContent = equipped.letter;
      if (this.elPetHudLevel) this.elPetHudLevel.textContent = `Lv.${equipped.level}`;
    } else {
      this.elPetHud.classList.remove('active');
    }
  }
}
