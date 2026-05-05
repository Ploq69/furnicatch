export class UIManager {
  constructor() {
    this.hud = document.getElementById('hud');
    this.staminaBar = document.getElementById('stamina-bar');
    this.orbCount = document.getElementById('orb-count');
    this.coinCount = document.getElementById('coin-count');
    this.capturedCount = document.getElementById('captured-count');
    this.crosshair = document.getElementById('crosshair');
    
    this.vocabModal = document.getElementById('vocab-modal');
    this.vocabTargetName = document.getElementById('vocab-target-name');
    this.vocabInputDisplay = document.getElementById('vocab-input-display');
    this.vocabTimerBar = document.getElementById('vocab-timer-bar');
    this.vocabTimerText = document.getElementById('vocab-timer-text');
    this.vocabTimer = document.querySelector('.vocab-timer');
    this.vocabStreak = document.getElementById('vocab-streak');
    this.vocabPreview = document.getElementById('vocab-preview');
    this.vocabInstruction = document.getElementById('vocab-instruction');
    this.speakerRow = document.getElementById('speaker-row');
    this.speakerButtons = [...document.querySelectorAll('.speaker-btn')];
    this.speakerAnswerRow = document.getElementById('speaker-answer-row');
    this.speakerAnswerButtons = [...document.querySelectorAll('.speaker-answer-btn')];
    
    this.feedbackOverlay = document.getElementById('feedback-overlay');
    this.feedbackText = document.getElementById('feedback-text');
    
    this.startScreen = document.getElementById('start-screen');
    this.loading = document.getElementById('loading');
    this.loadingText = document.getElementById('loading-text');
    this.baseScreen = document.getElementById('base-screen');
    this.baseCollectionCount = document.getElementById('base-collection-count');
    this.baseCoinCount = document.getElementById('base-coin-count');
    this.baseIncome = document.getElementById('base-income');
    this.btnExpedition = document.getElementById('btn-expedition');
    
    this.upgradeCards = {
      satchel: document.getElementById('upgrade-satchel'),
      boots: document.getElementById('upgrade-boots'),
      orb: document.getElementById('upgrade-orb'),
    };
    
    // Character select
    this.charSelectScreen = document.getElementById('char-select-screen');
    this.btnCharConfirm = document.getElementById('btn-char-confirm');
    this.btnCharPrev = document.getElementById('char-prev');
    this.btnCharNext = document.getElementById('char-next');
    this.charName = document.getElementById('char-name');
    this.charTags = document.getElementById('char-tags');
    this.charNote = document.getElementById('char-note');
    this.charDots = document.getElementById('char-dots');
    this.charIndex = 0;
    
    // Power meter
    this.powerMeter = document.getElementById('power-meter');
    this.powerFill = document.getElementById('power-fill');
    this.powerText = document.getElementById('power-text');

    this.onType = null;
    this.onSpeakerPlay = null;
    this.onSpeakerChoice = null;
    this.onHint = null;
    this.streak = 1;

    this.speakerButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (this.onSpeakerPlay) this.onSpeakerPlay(Number(button.dataset.index));
      });
    });

    this.speakerAnswerButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (this.onSpeakerChoice) this.onSpeakerChoice(Number(button.dataset.index));
      });
    });
  }

  showStart() { this.startScreen.style.display = 'flex'; }
  hideStart() { this.startScreen.style.display = 'none'; }
  showLoading(text = 'Loading...') {
    this.loading.style.display = 'flex';
    this.loadingText.textContent = text;
  }
  hideLoading() { this.loading.style.display = 'none'; }
  showHud() {
    this.hud.style.display = 'flex';
    this.crosshair.style.display = 'block';
    document.body.style.cursor = 'none';
  }

  updateHud(player, coins = 0, captured = 0) {
    const staminaPct = (player.stamina / 100) * 100;
    this.staminaBar.style.width = `${staminaPct}%`;
    this.staminaBar.style.background = staminaPct < 25 ? '#ef4444' : staminaPct < 50 ? '#fbbf24' : '#4ade80';
    
    this.orbCount.textContent = '∞';
    this.coinCount.textContent = coins;
    this.capturedCount.textContent = captured;
  }

  showVocabChallenge(vocabEntry, trappedMesh, streak = 1, quizMode = { showWord: true, revealPending: true, label: 'Type the English word' }, level = 1, hintsUsed = 0) {
    this.streak = streak;
    this.quizMode = quizMode;
    document.body.style.cursor = 'auto';
    this.vocabModal.classList.add('active');
    this.vocabTargetName.textContent = quizMode.showWord ? vocabEntry.word.toUpperCase() : `LEVEL ${level}`;
    this.vocabTargetName.style.color = '#a5b4fc';
    this.vocabStreak.textContent = `Streak: x${streak} · Mastery Lv ${level}`;
    this.vocabInstruction.textContent = quizMode.label || 'Type the English word to capture it!';
    this.speakerRow.style.display = 'none';
    this.speakerAnswerRow.style.display = 'none';
    this._renderInputDisplay(vocabEntry.word, '', quizMode.revealPending, []);
    this.setTimerVisible(false);
    this.vocabTimerBar.style.width = '100%';
    this.vocabTimerBar.style.background = '#fbbf24';
    this.vocabTimerText.textContent = '';
    this._ensureHintButton(vocabEntry.word, hintsUsed);
    
    // Clone the furniture mesh for preview
    this.vocabPreview.innerHTML = '';
    this.vocabPreview.classList.remove('vocab-preview-3d');
    if (trappedMesh) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e1e3f';
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(80, 80, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(quizMode.showWord ? vocabEntry.word[0].toUpperCase() : '?', 80, 80);
      this.vocabPreview.appendChild(canvas);
    }
  }

  showLetterChallenge(letter, options, streak = 1, level = 1, hintsUsed = 0) {
    this.streak = streak;
    this.quizMode = { revealPending: false };
    document.body.style.cursor = 'auto';
    this.vocabModal.classList.add('active');
    this.vocabTargetName.textContent = `LETTER ${letter}`;
    this.vocabTargetName.style.color = '#facc15';
    this.vocabStreak.textContent = `Streak: x${streak} · Letter Lv ${level}`;
    this.vocabInstruction.textContent = 'Tap speakers to listen. Then choose 1, 2, or 3.';
    this.setTimerVisible(false);
    this.vocabTimerBar.style.width = '100%';
    this.vocabTimerBar.style.background = '#fbbf24';
    this.vocabTimerText.textContent = '';
    this.vocabInputDisplay.innerHTML = '';
    this.vocabPreview.innerHTML = '';
    this.vocabPreview.classList.remove('vocab-preview-3d');
    const preview = document.createElement('div');
    preview.textContent = letter;
    preview.style.cssText = 'font-size:72px; font-weight:900; color:#facc15; text-shadow:0 0 22px rgba(250,204,21,0.65);';
    this.vocabPreview.appendChild(preview);
    this.speakerRow.style.display = 'grid';
    this.speakerAnswerRow.style.display = 'grid';
    this.speakerButtons.forEach((button, index) => {
      button.className = 'speaker-btn';
      button.disabled = false;
      button.title = `Speaker ${index + 1}`;
      button.setAttribute('aria-label', `Play speaker ${index + 1}`);
    });
    this.speakerAnswerButtons.forEach((button, index) => {
      button.className = 'speaker-answer-btn';
      button.disabled = false;
      button.textContent = String(index + 1);
      button.title = `Choose option ${index + 1}`;
      button.setAttribute('aria-label', `Choose option ${index + 1}`);
    });
    this.letterOptions = options || [];
    this._removeHintButton();
  }

  showLetterSpelling(word, hintsUsed = 0) {
    this.speakerRow.style.display = 'none';
    this.speakerAnswerRow.style.display = 'none';
    this.vocabInstruction.textContent = 'Now spell the word you heard for a bonus.';
    this.setTimerVisible(false);
    this._renderInputDisplay(word, '', false, []);
    this._ensureHintButton(word, hintsUsed);
  }

  updateSpeakerState(index, state) {
    const button = this.speakerButtons[index];
    if (!button) return;
    button.classList.remove('playing', 'correct', 'wrong');
    if (state) button.classList.add(state);
  }

  updateSpeakerAnswerState(index, state) {
    const button = this.speakerAnswerButtons[index];
    if (!button) return;
    button.classList.remove('correct', 'wrong');
    if (state) button.classList.add(state);
  }

  bindSpeakerPlay(callback) {
    this.onSpeakerPlay = callback;
  }

  bindSpeakerChoice(callback) {
    this.onSpeakerChoice = callback;
  }

  bindHint(callback) {
    this.onHint = callback;
  }

  hideVocabChallenge() {
    this.vocabModal.classList.remove('active');
    this.vocabPreview.classList.remove('vocab-preview-3d');
    this.speakerRow.style.display = 'none';
    this.speakerAnswerRow.style.display = 'none';
    this.speakerButtons.forEach((button) => {
      button.className = 'speaker-btn';
      button.disabled = false;
    });
    this.speakerAnswerButtons.forEach((button) => {
      button.className = 'speaker-answer-btn';
      button.disabled = false;
    });
    this.setTimerVisible(true);
    this._removeHintButton();
    document.body.style.cursor = 'none';
  }

  ensureVocabChallengeVisible() {
    this.vocabModal.classList.add('active');
    document.body.style.cursor = 'auto';
  }

  setTimerVisible(visible) {
    if (!this.vocabTimer) return;
    this.vocabTimer.classList.toggle('hidden', !visible);
  }

  updateVocabTimer(remaining, max) {
    const pct = (remaining / max) * 100;
    this.vocabTimerBar.style.width = `${pct}%`;
    this.vocabTimerText.textContent = `${remaining.toFixed(1)}s`;
    if (pct < 30) {
      this.vocabTimerBar.style.background = '#ef4444';
    }
  }

  updateVocabInput(word, typed, hintedIndices = []) {
    this._renderInputDisplay(word, typed, this.quizMode?.revealPending ?? true, hintedIndices);
  }

  _renderInputDisplay(word, typed, revealPending = true, hintedIndices = []) {
    let html = '';
    for (let i = 0; i < word.length; i++) {
      const target = word[i].toLowerCase();
      const input = typed[i]?.toLowerCase();
      if (input === undefined) {
        if (hintedIndices.includes(i)) {
          html += `<span class="letter-hinted">${target}</span>`;
        } else {
          html += `<span class="letter-pending">${revealPending ? target : '_'}</span>`;
        }
      } else if (input === target) {
        html += `<span class="letter-correct">${input}</span>`;
      } else {
        html += `<span class="letter-wrong">${input}</span>`;
      }
    }
    this.vocabInputDisplay.innerHTML = html;
  }

  updateHintStatus(hintsUsed, maxHints, bonusPct) {
    const hintBtn = document.getElementById('hint-btn');
    const hintStatus = document.getElementById('hint-status');
    if (hintBtn) {
      hintBtn.disabled = hintsUsed >= maxHints;
      hintBtn.textContent = `Hint (${hintsUsed}/${maxHints})`;
    }
    if (hintStatus) {
      hintStatus.textContent = `Bonus: ${Math.round(bonusPct * 100)}%`;
    }
  }

  _ensureHintButton(word, hintsUsed = 0) {
    let hintRow = document.getElementById('hint-row');
    if (!hintRow) {
      hintRow = document.createElement('div');
      hintRow.id = 'hint-row';
      hintRow.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:12px; margin-top:12px;';
      const hintBtn = document.createElement('button');
      hintBtn.id = 'hint-btn';
      hintBtn.style.cssText = 'padding:6px 14px; font-size:12px; font-weight:700; color:#fff; background:rgba(99,102,241,0.35); border:1px solid rgba(99,102,241,0.6); border-radius:8px; cursor:pointer; transition:all 0.2s;';
      hintBtn.textContent = 'Hint';
      hintBtn.addEventListener('click', () => {
        if (this.onHint) this.onHint();
      });
      const hintStatus = document.createElement('span');
      hintStatus.id = 'hint-status';
      hintStatus.style.cssText = 'font-size:11px; color:#a5b4fc; opacity:0.8;';
      hintStatus.textContent = 'Bonus: 100%';
      hintRow.appendChild(hintBtn);
      hintRow.appendChild(hintStatus);
      this.vocabInputDisplay.parentNode.insertBefore(hintRow, this.vocabInputDisplay.nextSibling);
    }
    this.updateHintStatus(hintsUsed, Math.max(0, word.length - 1), 1);
  }

  _removeHintButton() {
    const hintRow = document.getElementById('hint-row');
    if (hintRow) hintRow.remove();
  }

  showFeedback(text, color = '#4ade80') {
    this.feedbackText.textContent = text;
    this.feedbackText.style.color = color;
    this.feedbackOverlay.style.display = 'flex';
    setTimeout(() => {
      this.feedbackOverlay.style.display = 'none';
    }, 1000);
  }

  shakeScreen() {
    const target = document.querySelector('canvas') || document.body;
    target.style.transform = 'translateX(4px)';
    setTimeout(() => target.style.transform = 'translateX(-4px)', 50);
    setTimeout(() => target.style.transform = 'translateX(3px)', 100);
    setTimeout(() => target.style.transform = 'translateX(0)', 150);
  }

  showBase(collectionCount, totalWords, coins, incomePerSec) {
    this.baseScreen.style.display = 'block';
    this.hud.style.display = 'none';
    this.crosshair.style.display = 'none';
    document.body.style.cursor = 'auto';
    this.baseCollectionCount.textContent = `${collectionCount} / ${totalWords}`;
    this.baseCoinCount.textContent = Math.floor(coins);
    this.baseIncome.textContent = `+${incomePerSec.toFixed(1)}`;
  }

  hideBase() {
    this.baseScreen.style.display = 'none';
    this.hud.style.display = 'flex';
    this.crosshair.style.display = 'block';
    document.body.style.cursor = 'none';
  }

  setUpgradeEnabled(key, enabled) {
    const card = this.upgradeCards[key];
    if (card) {
      card.style.opacity = enabled ? '1' : '0.4';
      card.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  }

  bindBaseClick(key, callback) {
    const card = this.upgradeCards[key];
    if (card) card.addEventListener('click', callback);
  }

  bindExpedition(callback) {
    this.btnExpedition.addEventListener('click', callback);
  }

  showCharSelect(characters, startIndex, onChange, onConfirm) {
    this.charSelectScreen.style.display = 'block';
    document.body.style.cursor = 'auto';
    this.charIndex = startIndex;
    this._renderCharInfo(characters[startIndex]);
    this._renderDots(characters, startIndex);

    this.btnCharPrev.onclick = () => {
      const idx = (this.charIndex - 1 + characters.length) % characters.length;
      this.charIndex = idx;
      this._renderCharInfo(characters[idx]);
      this._renderDots(characters, idx);
      onChange(idx);
    };

    this.btnCharNext.onclick = () => {
      const idx = (this.charIndex + 1) % characters.length;
      this.charIndex = idx;
      this._renderCharInfo(characters[idx]);
      this._renderDots(characters, idx);
      onChange(idx);
    };

    this.btnCharConfirm.onclick = () => {
      onConfirm(this.charIndex);
    };
  }

  _renderCharInfo(char) {
    this.charName.textContent = char.name;
    this.charTags.textContent = (char.tags || []).join(' · ').toUpperCase();
    this.charNote.textContent = char.note || '';
  }

  _renderDots(characters, activeIndex) {
    this.charDots.innerHTML = '';
    for (let i = 0; i < characters.length; i++) {
      const dot = document.createElement('div');
      const isActive = i === activeIndex;
      dot.style.cssText = `width:${isActive ? 10 : 6}px; height:${isActive ? 10 : 6}px; border-radius:50%; background:${isActive ? '#6366f1' : 'rgba(255,255,255,0.3)'}; transition:all 0.2s;`;
      this.charDots.appendChild(dot);
    }
  }

  hideCharSelect() {
    this.charSelectScreen.style.display = 'none';
  }

  showStart() { 
    this.startScreen.style.display = 'flex'; 
    document.body.style.cursor = 'auto';
  }

  updatePowerMeter(power, min, max) {
    const pct = ((power - min) / (max - min)) * 100;
    this.powerFill.style.width = `${pct}%`;
    this.powerText.textContent = power;
  }

  showPowerMeter() {
    this.powerMeter.style.display = 'block';
  }

  updateCrosshair(x, y, locked = false) {
    this.crosshair.style.left = `${x}px`;
    this.crosshair.style.top = `${y}px`;
    this.crosshair.style.transform = 'translate(-50%, -50%)';
    this.crosshair.classList.toggle('locked', locked);
  }

  bindTyping(callback) {
    this._typeHandler = (e) => {
      if (this.vocabModal.classList.contains('active')) {
        e.preventDefault();
        callback(e.key);
      }
    };
    window.addEventListener('keydown', this._typeHandler);
  }

  unbindTyping() {
    if (this._typeHandler) {
      window.removeEventListener('keydown', this._typeHandler);
      this._typeHandler = null;
    }
  }
}
