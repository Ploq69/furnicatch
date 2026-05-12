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
    this.loadoutBusy = false;
    this.preview = null;
    this.calibrationEnabled = false;
    this.calibrationSlot = 'rightHand';
    this.vfxPreviewEnabled = false;
    this.selectedElement = DEFAULT_ELEMENT;
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

  hideSpellingChallenge() {
    if (!this.elSpellingOverlay) return;
    this.elSpellingOverlay.classList.remove('active');
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

    // Legacy inline upgrades (also accessible via shop)
    const containers = {
      pickaxe: document.getElementById('blacksmith-upgrades'),
      combat: document.getElementById('combat-upgrades'),
      spirit: document.getElementById('spirit-upgrades'),
    };
    for (const [cat, ups] of Object.entries(UPGRADES)) {
      const container = containers[cat];
      if (!container) continue;
      for (const u of ups) {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.dataset.id = u.id;
        btn.innerHTML = `<strong>${u.name}</strong><br><small style="opacity:0.7">${u.desc}</small><br><small style="color:#fbbf24">💰 ${u.cost(0)}</small>`;
        btn.addEventListener('click', () => this._buyUpgrade(cat, u, btn));
        container.appendChild(btn);
      }
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
    if (this.elHp) this.elHp.style.width = (p.hp / p.maxHp * 100) + '%';
    if (this.elHpText) this.elHpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    if (this.elStamina) this.elStamina.style.width = (p.stamina / GAME.MAX_STAMINA * 100) + '%';
    if (this.elFloor) this.elFloor.textContent = this.game.world.floor;
    if (this.elCoin) this.elCoin.textContent = p.coins;
    if (this.elLevel) this.elLevel.textContent = p.level;
    if (this.elKills) this.elKills.textContent = this.game.killCount;
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
    setTimeout(() => el.remove(), 1000);
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
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
      const id = btn.dataset.id;
      for (const cat of Object.values(UPGRADES)) {
        const u = cat.find(x => x.id === id);
        if (u) this._updateUpgradeButton(u, btn);
      }
    });
    this._renderPetDen();
    // Update shop coins if shop UI exists
    if (this.game.shopUI) {
      this.game.shopUI.setCoins(this.game.player.coins);
    }
  }

  hideCamp() {
    this.elCamp.classList.remove('active');
    this._setTouchControlsVisible(true);
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
    if (this.game.shopUI) {
      this.game.shopUI.setCoins(this.game.player.coins);
      this.game.shopUI.show();
    }
  }

  hideShop() {
    if (this.game.shopUI) {
      this.game.shopUI.hide();
    }
  }

  // Gateway indicator UI
  showGatewayIndicator(zoneName, locked, requirements) {
    if (!this._gatewayIndicator) {
      this._gatewayIndicator = document.createElement('div');
      this._gatewayIndicator.className = 'gateway-indicator';
      document.body.appendChild(this._gatewayIndicator);
    }
    const icon = locked ? '🔒' : '✅';
    const text = locked ? `Requires: ${requirements.join(', ')}` : 'Press E to enter';
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
    if (!this._burnWarning) {
      this._burnWarning = document.createElement('div');
      this._burnWarning.className = 'burn-warning';
      this._burnWarning.textContent = '🔥 BURNING! Equip Water Suit!';
      document.body.appendChild(this._burnWarning);
    }
    this._burnWarning.style.display = show ? 'block' : 'none';
  }

  setFPS(fps) {
    if (this.elFps) this.elFps.textContent = fps + ' FPS';
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
