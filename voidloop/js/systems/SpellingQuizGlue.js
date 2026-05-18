import * as THREE from 'three';
import { SFXMapper } from '../SFXMapper.js';
const STATES = {
  PLAYING: 'playing',
  SPELLING: 'spelling',
};
import { getWordsForLetter, LETTER_QUIZ_MODE } from '../DrillWordData.js';
import { DrillSession } from '../DrillSession.js';

export class SpellingQuizGlue {
  constructor(game) {
    this.game = game;
    this.currentLetterQuiz = null;
    this.pendingLetterLevelUp = null;
    this.spellingReturnCameraMode = null;
    this._drillSession = null;
  }

  collectLetter(letter, pickupPosition = null) {
    const result = this.game.progression.collectLetter(letter);
    const state = result.state;
    if (!state) return;
    const effectPos = pickupPosition || this.game.player.position.clone();
    SFXMapper.letterPickup();
    const needed = this.game.progression.getQuizThreshold(letter);
    const progress = Number.isFinite(needed) ? `${state.dropsTowardQuiz}/${needed}` : 'mastered';
    this.game.lettersCollected++;
    this.game.ui.updateZoneLetterHud?.(this.game.zoneManager.currentZoneId);
    const pickupAnimMs = this.game.ui.animateLetterPickup?.(state.letter, effectPos, this.game.zoneManager.currentZoneId) || 0;

    if (!this.game.pendingLetters.has(state.letter)) {
      this.game.pendingLetters.add(state.letter);
      this.game.ui.showFloatingText(`${state.letter} captured! Drill at camp.`, 0xfacc15);
    } else {
      this.game.ui.showFloatingText(`${state.letter} ${progress}`, 0xfacc15);
    }
  }

  // Called from showCamp() when pendingLetters is non-empty
  startDrillSession() {
    if (this.game.pendingLetters.size === 0) return;
    this._drillSession = new DrillSession(this.game.pendingLetters);
    this._showNextQuestion();
  }

  _showNextQuestion() {
    const q = this._drillSession?.nextQuestion();
    if (!q) {
      this._finishDrillSession();
      return;
    }

    this._rememberCameraMode();
    this.game.state = STATES.SPELLING;
    this.currentLetterQuiz = { letter: q.targetLetter, type: q.type, correctAnswer: q.correctAnswer };

    if (q.type === 'starts_with') {
      this.game.ui.showDrillWordQuiz(q);
    } else {
      this.game.ui.showIdentifyLetterQuiz(q);
    }
  }

  _onQuestionAnswered(isCorrect) {
    if (!this._drillSession) return;
    this._drillSession.recordAnswer(!!isCorrect);
    this._drillSession.advance();

    if (this._drillSession.isComplete()) {
      this._finishDrillSession();
    } else {
      // Auto-advance after brief delay
      setTimeout(() => this._showNextQuestion(), 600);
    }
  }

  _finishDrillSession() {
    const score = this._drillSession?.getScore() || { stars: 0, correct: 0, total: 0 };

    // Resolve only the originally pending letters (not random fill letters)
    const originallyPending = this._drillSession?._originalPending || new Set();
    for (const letter of originallyPending) {
      this.game.progression.resolveQuiz(letter, true);
      this.game.pendingLetters.delete(letter);
    }

    this._drillSession = null;
    this.currentLetterQuiz = null;
    this.game.ui.hideSpellingChallenge();
    this.game.state = STATES.CAMP;
    this._restoreCameraMode();

    // Show score summary
    this.game.ui.showFloatingText(`Drill complete! ${score.correct}/${score.total}`, 0x4ade80);
    this.game.ui.showCamp(true);
  }

  resolveDrillQuiz(choice) {
    if (!this.currentLetterQuiz) return;
    const { correctAnswer } = this.currentLetterQuiz;
    const isCorrect = choice === correctAnswer;
    if (isCorrect) {
      SFXMapper.collectOre();
      this.game.ui.showFloatingText('Correct!', 0x4ade80);
    } else {
      SFXMapper.swingMiss();
      this.game.ui.showFloatingText(`The answer was "${correctAnswer}"`, 0xf87171);
    }
    this._onQuestionAnswered(isCorrect);
  }

  exitDrillQuiz() {
    this.currentLetterQuiz = null;
    this.game.ui.hideSpellingChallenge();
    this.game.state = STATES.CAMP;
    this._restoreCameraMode();
    this.game.ui.showCamp(true);
  }

  onSpellingClose() {
    if (this.currentLetterQuiz) {
      this.currentLetterQuiz = null;
      this.game.ui.hideSpellingChallenge();
      this.game.state = STATES.CAMP;
      this._restoreCameraMode();
      return;
    }
  }

  onSpellingPlay() {
    if (this.currentLetterQuiz) {
      this.speakLetter(this.currentLetterQuiz.letter);
    }
  }

  onSpellingCheck(input) {
    if (this.currentLetterQuiz) {
      this.resolveDrillQuiz(input);
    }
  }

  speakLetter(letter) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Letter ${letter}`);
      utterance.rate = 0.8;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }

  playPendingLevelUp() {
    if (!this.pendingLetterLevelUp) return;
    const event = this.pendingLetterLevelUp;
    this.pendingLetterLevelUp = null;
    this.game.shaderFX.playLetterLevelUp(event.letter, event.position, event.oldLevel, event.newLevel);
    this.game.ui.showFloatingText(`${event.letter} Lv.${event.newLevel}!`, 0x4ade80);
    SFXMapper.levelUp();
  }

  _rememberCameraMode() {
    if (this.spellingReturnCameraMode) return;
    this.spellingReturnCameraMode = this.game.cameraMode;
  }

  _restoreCameraMode() {
    const mode = this.spellingReturnCameraMode;
    this.spellingReturnCameraMode = null;
    if (mode && mode !== this.game.cameraMode) {
      this.game._setCameraMode(mode, false);
    }
  }
}
