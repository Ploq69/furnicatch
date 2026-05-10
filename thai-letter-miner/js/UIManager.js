import { UPGRADES } from './constants.js';
import { SFXMapper } from './SFXMapper.js';
import { UPGRADE_DEFS, upgradeCost } from './config.js';
import { THAI_BY_ID, THAI_ITEMS, audioPathFor } from './thaiManifest.js';
import { ThaiModelPreview } from './ThaiModelPreview.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.currentBundle = null;
    this.previewRenderers = [];
    this.upgradeLevels = {};
    for (const cat of Object.keys(UPGRADES)) {
      for (const u of UPGRADES[cat]) {
        this.upgradeLevels[u.id] = 0;
      }
    }
    this._bindElements();
    this._bindHotbar();
    this._bindCamp();
    this._bindThaiPanels();
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
    this.elThaiTrash = document.getElementById('thai-trash-count');
    this.elThaiQueue = document.getElementById('thai-queue-count');
    this.elThaiStage = document.getElementById('thai-stage-name');
    this.elThaiPets = document.getElementById('thai-pet-count');
    this.elQuiz = document.getElementById('thai-quiz');
    this.elQuizTitle = document.getElementById('thai-quiz-title');
    this.elQuizSubtitle = document.getElementById('thai-quiz-subtitle');
    this.elQuizChoices = document.getElementById('thai-quiz-choices');
    this.elReplayAudio = document.getElementById('thai-replay-audio');
    this.elSurvey = document.getElementById('thai-survey');
    this.elSurveyList = document.getElementById('thai-survey-list');
    this.elCloseSurvey = document.getElementById('thai-close-survey');
    this.elThaiUpgrades = document.getElementById('thai-upgrades');
    this.elStudyChests = document.getElementById('thai-study-chests');
    this.elCollection = document.getElementById('thai-collection-grid');
    this.elPrestige = document.getElementById('thai-prestige-btn');
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

  _bindThaiPanels() {
    this.elReplayAudio?.addEventListener('click', () => this.playCurrentAudio());
    this.elCloseSurvey?.addEventListener('click', () => this.hideSurvey());
    this.elPrestige?.addEventListener('click', () => this.game.tonePrestige());
    window.addEventListener('keydown', (event) => {
      if (!this.currentBundle) return;
      if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
        this._answerQuiz(Number(event.code.replace('Digit', '')) - 1);
      }
    });
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
    this.updateThaiStats();
  }

  updateThaiStats() {
    if (!this.game.save) return;
    const save = this.game.save.data;
    if (this.elThaiTrash) this.elThaiTrash.textContent = save.trash;
    if (this.elThaiQueue) this.elThaiQueue.textContent = this.game.discoveryQueue?.size?.() ?? 0;
    if (this.elThaiStage) this.elThaiStage.textContent = this.game.stage?.name || 'Scrappy Quarry';
    if (this.elThaiPets) this.elThaiPets.textContent = `${this.game.petSystem?.pets?.length || 0}/${this.game.save.petSlots()}`;
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
    this._renderThaiCamp();
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

  _renderThaiCamp() {
    this.updateThaiStats();
    this._renderThaiUpgrades();
    this._renderStudyChests();
    this._renderThaiCollection();
    if (this.elPrestige) this.elPrestige.disabled = !this.game.save?.data?.tonePrestigeReady;
  }

  _renderThaiUpgrades() {
    if (!this.elThaiUpgrades || !this.game.save) return;
    this.elThaiUpgrades.innerHTML = '';
    for (const def of UPGRADE_DEFS) {
      const level = this.game.save.upgradeLevel(def.id);
      const cost = upgradeCost(def, level);
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn thai-upgrade-btn';
      btn.disabled = level >= def.max || this.game.save.data.trash < cost;
      btn.innerHTML = `<strong>${def.name}</strong> <span style="color:#4ade80">Lv.${level}/${def.max}</span><br><small style="opacity:0.7">${def.desc}</small><br><small style="color:#fbbf24">${level >= def.max ? 'MAXED' : `${cost} trash`}</small>`;
      btn.addEventListener('click', () => {
        this.game.buyThaiUpgrade(def);
        this._renderThaiCamp();
      });
      this.elThaiUpgrades.appendChild(btn);
    }
  }

  _renderStudyChests() {
    if (!this.elStudyChests || !this.game.save) return;
    this.elStudyChests.innerHTML = '';
    const chests = this.game.save.data.studyChests;
    if (!chests.length) {
      this.elStudyChests.innerHTML = '<small style="opacity:0.55">No Study Chests waiting.</small>';
      return;
    }
    for (const chest of chests) {
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      btn.innerHTML = `<strong>${chest.title}</strong><br><small style="opacity:0.7">${chest.rewardCount} queued finds</small>`;
      btn.addEventListener('click', () => this.game.openStudyChest(chest));
      this.elStudyChests.appendChild(btn);
    }
  }

  _renderThaiCollection() {
    if (!this.elCollection || !this.game.save) return;
    this.elCollection.innerHTML = '';
    for (const item of THAI_ITEMS) {
      const record = this.game.save.getRecord(item.id);
      const cell = document.createElement('div');
      cell.className = `thai-collection-cell ${record.captures > 0 ? 'owned' : ''}`;
      cell.innerHTML = `<span>${item.glyph}</span><small>${record.captures || ''}</small>`;
      this.elCollection.appendChild(cell);
    }
  }

  showQuiz(bundle, onAnswer) {
    if (!this.elQuiz) throw new Error('Thai quiz overlay is missing');
    this._disposePreviews();
    this.currentBundle = bundle;
    this.onQuizAnswer = onAnswer;
    const item = THAI_BY_ID[bundle.targetId];
    const choices = this._buildChoices(item);
    bundle.choices = choices;
    this.elQuizTitle.textContent = bundle.title;
    this.elQuizSubtitle.textContent = `Listen and choose the Thai 3D model. Worth ${bundle.rewardCount} capture progress.`;
    this.elQuizChoices.innerHTML = '';
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'thai-quiz-choice';
      button.dataset.choiceId = choice.id;
      button.innerHTML = `<b>${index + 1}</b><div class="thai-model-preview"></div><span>${choice.glyph}</span><small>${choice.romanizedName}</small>`;
      const previewHost = button.querySelector('.thai-model-preview');
      const preview = new ThaiModelPreview(previewHost, this.game.thaiAssets, choice);
      this.previewRenderers.push(preview);
      button.addEventListener('click', () => this._answerQuiz(index));
      this.elQuizChoices.appendChild(button);
    });
    this.elQuiz.classList.add('active');
    setTimeout(() => this.playCurrentAudio(), 120);
  }

  playCurrentAudio() {
    if (!this.currentBundle) return;
    const item = THAI_BY_ID[this.currentBundle.targetId];
    const clip = new Audio(audioPathFor(item));
    clip.play().catch((err) => {
      throw new Error(`Thai audio failed for ${item.id}: ${err?.message || err}`);
    });
  }

  _answerQuiz(index) {
    const choice = this.currentBundle?.choices?.[index];
    if (!choice) return;
    const bundle = this.currentBundle;
    const correct = choice.id === bundle.targetId;
    this.currentBundle = null;
    this.elQuiz.classList.remove('active');
    this._disposePreviews();
    this.onQuizAnswer?.(bundle, correct);
  }

  _buildChoices(target) {
    const same = THAI_ITEMS.filter((item) => item.id !== target.id && item.confuserGroup === target.confuserGroup);
    const category = THAI_ITEMS.filter((item) => item.id !== target.id && item.category === target.category && !same.includes(item));
    const pool = [...same, ...category, ...THAI_ITEMS.filter((item) => item.id !== target.id)];
    const choices = [target];
    for (const item of pool) {
      if (choices.length >= 3) break;
      if (!choices.includes(item)) choices.push(item);
    }
    return choices.sort(() => Math.random() - 0.5);
  }

  showSurvey(bundles) {
    if (!this.elSurvey) throw new Error('Thai survey overlay is missing');
    this.elSurveyList.innerHTML = '';
    if (!bundles.length) {
      this.elSurveyList.innerHTML = '<small style="opacity:0.6">No queued finds. Clean run.</small>';
    } else {
      for (const bundle of bundles) {
        const item = THAI_BY_ID[bundle.targetId];
        const btn = document.createElement('button');
        btn.className = 'survey-row';
        btn.innerHTML = `<span>${item.glyph}</span><strong>${bundle.title}</strong><small>${bundle.rewardCount} capture progress</small>`;
        btn.addEventListener('click', () => {
          btn.disabled = true;
          this.game.startBundleQuiz(bundle);
        });
        this.elSurveyList.appendChild(btn);
      }
    }
    this.elSurvey.classList.add('active');
  }

  hideSurvey() {
    if (this.elSurvey) this.elSurvey.classList.remove('active');
    this.showCamp();
  }

  _disposePreviews() {
    for (const preview of this.previewRenderers) preview.dispose();
    this.previewRenderers = [];
  }
}
