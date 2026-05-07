import { UPGRADES } from './constants.js';
import { SFXMapper } from './SFXMapper.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.upgradeLevels = {};
    for (const cat of Object.keys(UPGRADES)) {
      for (const u of UPGRADES[cat]) {
        this.upgradeLevels[u.id] = 0;
      }
    }
    this._bindElements();
    this._bindHotbar();
    this._bindCamp();
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
    this.onBrightnessChange = null;
    this.onCameraZoomChange = null;
    this.elBrightnessSlider.addEventListener('input', (e) => {
      if (this.onBrightnessChange) this.onBrightnessChange(parseFloat(e.target.value));
    });
    this.elZoomSlider.addEventListener('input', (e) => {
      if (this.onCameraZoomChange) this.onCameraZoomChange(parseFloat(e.target.value));
    });
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

  updateStats() {
    const p = this.game.player;
    if (this.elHp) this.elHp.style.width = (p.hp / p.maxHp * 100) + '%';
    if (this.elHpText) this.elHpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
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
