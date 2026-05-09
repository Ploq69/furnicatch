import { GAME, UPGRADES } from './constants.js';
import { SFXMapper } from './SFXMapper.js';
import { LoadoutPreview } from './LoadoutPreview.js';
import {
  DEFAULT_LOADOUT,
  KAYKIT_CHARACTERS,
  SLOT_LABELS,
  clearKayKitItemGripPreset,
  cloneLoadout,
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
    for (const cat of Object.keys(UPGRADES)) {
      for (const u of UPGRADES[cat]) {
        this.upgradeLevels[u.id] = 0;
      }
    }
    this._bindElements();
    this._bindHotbar();
    this._bindCamp();
    this._bindLoadout();
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

  hideLoading() {
    this.elLoading.style.display = 'none';
    this.elHud.style.display = 'block';
    this.elCrosshair.style.display = 'block';
    this.elHotbar.style.display = 'flex';
    this.elFloorIndicator.style.display = 'block';
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
      });
      grid.appendChild(empty);

      for (const item of getKayKitItemsForSlot(slot)) {
        const btn = this._createItemButton(item.name, this.loadoutState[slot] === item.id, async () => {
          this.loadoutState[slot] = item.id;
          this._renderLoadout();
          // Reset calibration nudge before loading new item so it doesn't inherit the old item's offset
          if (this.calibrationEnabled && this.preview) {
            this.preview.resetCalibrationOffset();
          }
          await this.preview?.setLoadout(this.loadoutState);
          this._refreshCalibrationAfterLoadout(slot);
        });
        grid.appendChild(btn);
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
    this.elLoadoutStatus.textContent = `${character?.name || 'Character'} · ${slots || 'No items'}`;
  }

  _toggleCalibration() {
    if (!this.preview) return;
    this.calibrationEnabled = !this.calibrationEnabled;
    this._syncCalibrationPanel();
    const snapshot = this.preview.setCalibrationEnabled(this.calibrationEnabled, this.calibrationSlot);
    this._syncScaleSlider(snapshot);
    this._renderCalibrationReadout(snapshot);
  }

  _syncCalibrationPanel() {
    this.elCalibrationToggle?.classList.toggle('active', this.calibrationEnabled);
    this.elCalibrationPanel?.classList.toggle('active', this.calibrationEnabled);
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
  }

  hideCamp() {
    this.elCamp.classList.remove('active');
    this.elHud.style.display = 'block';
    this.elCrosshair.style.display = 'block';
    this.elHotbar.style.display = 'flex';
    this.elFloorIndicator.style.display = 'block';
    if (this.elBrightness) this.elBrightness.style.display = 'flex';
    if (this.elZoom) this.elZoom.style.display = 'flex';
    if (this.elFps) this.elFps.style.display = 'block';
  }

  setFPS(fps) {
    if (this.elFps) this.elFps.textContent = fps + ' FPS';
  }
}
