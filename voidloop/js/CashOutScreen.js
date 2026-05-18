// ==========================================
// Voidloop — Cash-Out Screen ("The Vacuum")
// 5-phase full-screen overlay animation.
// ==========================================

export class CashOutScreen {
  constructor() {
    this.el = document.getElementById('cash-out-screen');
    this._phase = 0;
    this._running = false;
    this._skipRequested = false;
    this._onComplete = null;
    this._timeouts = [];
    this._rafIds = [];
  }

  start({ deposited = [], totalCoins = 0, letters = [], milestone = null }, onComplete) {
    if (this._running) return;
    this._running = true;
    this._phase = 0;
    this._skipRequested = false;
    this._onComplete = onComplete;
    this._data = { deposited, totalCoins, letters, milestone };
    this._timeouts = [];
    this._rafIds = [];

    if (!this.el) {
      this._buildDOM();
    }

    this.el.classList.add('active');
    this._bindSkip();
    this._runPhase1();
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'cash-out-screen';
    el.innerHTML = `
      <div class="cos-phase" id="cos-phase-1">
        <div class="cos-vortex"></div>
        <div class="cos-suction-icons" id="cos-suction-icons"></div>
        <div class="cos-phase-title">DEPOSITING...</div>
      </div>
      <div class="cos-phase" id="cos-phase-2">
        <div class="cos-panel">
          <div class="cos-panel-title">HAUL DEPOSITED</div>
          <div class="cos-rows" id="cos-rows"></div>
          <div class="cos-running-total" id="cos-running-total">0 coins</div>
        </div>
      </div>
      <div class="cos-phase" id="cos-phase-3">
        <div class="cos-panel">
          <div class="cos-panel-title">LETTERS CAPTURED</div>
          <div class="cos-letters" id="cos-letters"></div>
          <div class="cos-letters-hint">Drill them at camp to unlock pets!</div>
        </div>
      </div>
      <div class="cos-phase" id="cos-phase-4">
        <div class="cos-grand-total" id="cos-grand-total">0</div>
        <div class="cos-grand-label">TOTAL COINS</div>
        <div class="cos-milestone" id="cos-milestone"></div>
      </div>
      <div class="cos-skip-hint" id="cos-skip-hint">Press SPACE to skip</div>
    `;
    document.body.appendChild(el);
    this.el = el;
  }

  _bindSkip() {
    this._skipHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.skip();
      }
    };
    this._clickHandler = () => this.skip();
    window.addEventListener('keydown', this._skipHandler);
    this.el.addEventListener('click', this._clickHandler);
  }

  _unbindSkip() {
    window.removeEventListener('keydown', this._skipHandler);
    this.el.removeEventListener('click', this._clickHandler);
  }

  skip() {
    if (this._skipRequested) return;
    this._skipRequested = true;
    // Clear all pending timeouts + animations
    for (const t of this._timeouts) clearTimeout(t);
    for (const id of this._rafIds) cancelAnimationFrame(id);
    this._timeouts = [];
    this._rafIds = [];
    this._finish();
  }

  _finish() {
    this._unbindSkip();
    this.el.classList.remove('active');
    this._running = false;
    if (this._onComplete) this._onComplete();
    this._onComplete = null;
  }

  _clearPhases() {
    for (let i = 1; i <= 4; i++) {
      const phase = document.getElementById(`cos-phase-${i}`);
      if (phase) phase.classList.remove('active');
    }
  }

  _showPhase(n) {
    this._clearPhases();
    const phase = document.getElementById(`cos-phase-${n}`);
    if (phase) phase.classList.add('active');
  }

  // ── Phase 1: Suction (icons fly into vortex) ──
  _runPhase1() {
    this._phase = 1;
    this._showPhase(1);

    // Build suction icon elements from deposited data
    const container = document.getElementById('cos-suction-icons');
    if (container) {
      container.innerHTML = '';
      for (const item of this._data.deposited) {
        for (let i = 0; i < Math.min(item.count, 12); i++) {
          const icon = document.createElement('div');
          icon.className = 'cos-suction-icon';
          icon.textContent = this._emojiForType(item.type);
          icon.style.left = `${20 + Math.random() * 60}%`;
          icon.style.top = `${20 + Math.random() * 60}%`;
          icon.style.animationDelay = `${Math.random() * 0.8}s`;
          container.appendChild(icon);
        }
      }
    }

    const delay = this._skipRequested ? 0 : 1500;
    this._timeouts.push(setTimeout(() => this._runPhase2(), delay));
  }

  // ── Phase 2: Tally rows ──
  _runPhase2() {
    if (this._skipRequested) { this._runPhase3(); return; }
    this._phase = 2;
    this._showPhase(2);

    const rowsEl = document.getElementById('cos-rows');
    const totalEl = document.getElementById('cos-running-total');
    if (!rowsEl) { this._runPhase3(); return; }

    rowsEl.innerHTML = '';
    let runningTotal = 0;
    const items = this._data.deposited;

    const showNext = (idx) => {
      if (idx >= items.length) {
        this._timeouts.push(setTimeout(() => this._runPhase3(), 600));
        return;
      }
      const item = items[idx];
      const row = document.createElement('div');
      row.className = 'cos-row';
      row.innerHTML = `
        <span class="cos-row-icon">${this._emojiForType(item.type)}</span>
        <span class="cos-row-name">${item.name}</span>
        <span class="cos-row-count">x${item.count}</span>
        <span class="cos-row-arrow">→</span>
        <span class="cos-row-coins" data-target="${item.coins}">0</span>
      `;
      rowsEl.appendChild(row);

      // Slide in animation
      requestAnimationFrame(() => row.classList.add('shown'));

      // Count up coins
      const coinEl = row.querySelector('.cos-row-coins');
      this._countUp(coinEl, item.coins, 400, (val) => {
        runningTotal += val;
        if (totalEl) totalEl.textContent = `${runningTotal} coins`;
      });

      this._timeouts.push(setTimeout(() => showNext(idx + 1), 500));
    };

    if (items.length === 0) {
      rowsEl.innerHTML = '<div class="cos-row-empty">No resources collected</div>';
      this._timeouts.push(setTimeout(() => this._runPhase3(), 800));
    } else {
      showNext(0);
    }
  }

  // ── Phase 3: Letters captured ──
  _runPhase3() {
    if (this._skipRequested) { this._runPhase4(); return; }
    this._phase = 3;
    this._showPhase(3);

    const lettersEl = document.getElementById('cos-letters');
    if (lettersEl) {
      lettersEl.innerHTML = '';
      const letters = this._data.letters;
      if (letters.length === 0) {
        lettersEl.innerHTML = '<div class="cos-letters-empty">No letters captured this run</div>';
      } else {
        for (const letter of letters) {
          const chip = document.createElement('div');
          chip.className = 'cos-letter-chip';
          chip.textContent = letter.toUpperCase();
          lettersEl.appendChild(chip);
          requestAnimationFrame(() => chip.classList.add('shown'));
        }
      }
    }

    this._timeouts.push(setTimeout(() => this._runPhase4(), letters.length > 0 ? 1200 : 600));
  }

  // ── Phase 4: Grand total + milestone ──
  _runPhase4() {
    if (this._skipRequested) { this._finish(); return; }
    this._phase = 4;
    this._showPhase(4);

    const totalEl = document.getElementById('cos-grand-total');
    const milestoneEl = document.getElementById('cos-milestone');

    if (totalEl) {
      this._countUp(totalEl, this._data.totalCoins, 800, null, true);
    }

    if (milestoneEl && this._data.milestone) {
      milestoneEl.innerHTML = `🎉 ${this._data.milestone}`;
      milestoneEl.classList.add('shown');
    }

    this._timeouts.push(setTimeout(() => this._finish(), 2000));
  }

  // ── Count-up helper ──
  _countUp(el, target, durationMs, onTick = null, overshoot = false) {
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      let value = Math.floor(target * eased);
      if (overshoot && progress < 1) {
        value = Math.floor(target * eased * 1.05);
      }
      if (progress >= 1) value = target;
      el.textContent = value;
      if (onTick) onTick(value);
      if (progress < 1) {
        this._rafIds.push(requestAnimationFrame(tick));
      }
    };
    this._rafIds.push(requestAnimationFrame(tick));
  }

  _emojiForType(type) {
    const map = {
      loose_dirt: '🟫', gravel_bits: '⚪', scrap_stone: '🪨', old_junk: '🗑️',
      moss_chip: '🌿', crystal_shard: '🔷', amber: '🍋', ancient_bark: '🪵',
      ash: '⚫', magma_shard: '🔶', obsidian_fragment: '💣', ember_essence: '🔥',
      ice_chunk: '🧊', frost_shard: '❄️', glacial_metal: '⛓️', blizzard_essence: '🌨️',
      sand: '🍪', desert_shard: '💛', gold_nugget: '🪙', solar_essence: '☀️',
      rust_chunk: '🟤', gear_shard: '⚙️', alloy_ingot: '🟨', furnace_ember: '🔥',
      mud_pie: '🥞', moss_clump: '🌿', petrified_bark: '🪵', mire_essence: '💚',
      brick_chip: '🧱', royal_shard: '❤️', crown_jewel: '👑',
    };
    return map[type] || '❓';
  }
}
