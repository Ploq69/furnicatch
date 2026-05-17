import * as THREE from 'three';
import { SFXMapper } from '../SFXMapper.js';
const STATES = {
  PLAYING: 'playing',
  SPELLING: 'spelling',
};
import { glyph3D } from '../../../js/Glyph3DManager.js';
import { SPELLING_WORDS } from '../SpellingData.js';
import { SpellingChallenge } from '../SpellingEngine.js';

export class SpellingQuizGlue {
  constructor(game) {
    this.game = game;
    this.currentLetterQuiz = null;
    this.pendingLetterLevelUp = null;
    this.spellingReturnCameraMode = null;
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
    this.game.ui.showFloatingText(`${state.letter} ${progress}`, result.queued ? 0x4ade80 : 0xfacc15);
    if (result.queued && pickupAnimMs > 0) {
      setTimeout(() => this.tryStartQuiz(), pickupAnimMs + 120);
    } else {
      this.tryStartQuiz();
    }
  }

  tryStartQuiz() {
    if (this.game.state !== STATES.PLAYING || this.currentLetterQuiz) return false;
    const queued = this.game.progression.peekQuiz();
    if (!queued) return false;
    const zone = this.game.zoneManager.getCurrentZone();
    this.enterLetterSoundQuiz(
      queued.letter,
      this.game.progression.makeQuizChoices(queued.letter, zone?.letters || undefined)
    );
    return true;
  }

  enterLetterSoundQuiz(letter, choices) {
    this._rememberCameraMode();
    this.game.state = STATES.SPELLING;
    this.currentLetterQuiz = { letter, choices };

    if (this.game.spellingGlyphMesh) {
      this.game.scene.remove(this.game.spellingGlyphMesh);
      this.game.spellingGlyphMesh = null;
    }

    const glyph = glyph3D.createGlyph(letter, 'reward');
    if (glyph) {
      glyph.scale.setScalar(1.2);
      glyph.position.set(this.game.player.position.x, 1.5, this.game.player.position.z);
      this.game.scene.add(glyph);
      this.game.spellingGlyphMesh = glyph;
    }

    const zoneLetters = this.game.zoneManager.getCurrentZone()?.letters || [];
    const progressText = zoneLetters
      .map(l => {
        const passed = this.game.progression.hasPassedLetter(l);
        const state = this.game.progression.getLetter(l);
        return `<span class="${passed ? 'spelled' : 'pending'}">${l}${passed ? '✓' : ` Lv${state?.level || 1}`}</span>`;
      })
      .join(' ');

    const state = this.game.progression.getLetter(letter);
    const threshold = this.game.progression.getQuizThreshold(letter);
    const subtitle = `Listen, then choose ${letter}. Meter ${state?.dropsTowardQuiz || 0}/${threshold}.`;
    this.game.ui.showSoundQuiz(letter, choices, progressText, subtitle);
    setTimeout(() => this.onSpellingPlay(), 250);
  }

  resolveLetterSoundQuiz(choice) {
    if (!this.currentLetterQuiz) return;
    const target = this.currentLetterQuiz.letter;
    const correct = String(choice || '').toUpperCase() === target;

    if (!correct) {
      this.game.progression.resolveQuiz(target, false);
      this.game.ui.setSpellingFeedback('Listen again and try one more time.', false);
      SFXMapper.swingMiss();
      this.speakLetter(target);
      return;
    }

    const result = this.game.progression.resolveQuiz(target, true);
    this.game.letterPool.markSpelled(target);
    this.game.petManager.recordMastery?.(target, result.state);
    if (result.levelUp) {
      const levelUpPos = new THREE.Vector3();
      if (this.game.spellingGlyphMesh) {
        this.game.spellingGlyphMesh.getWorldPosition(levelUpPos);
      } else {
        levelUpPos.copy(this.game.player.position).add(new THREE.Vector3(0, 0.75, 0));
      }
      this.pendingLetterLevelUp = {
        letter: target,
        oldLevel: result.oldLevel,
        newLevel: result.newLevel,
        position: levelUpPos,
      };
    }
    if (this.game.pet?.letter === target && result.levelUp) {
      this.game.pet.setLevel(result.newLevel);
      this.game.pet.playLevelUp();
    }
    this.game.player.coins += 10;
    this.game.floorTimer += 3;
    this.game.ui.setSpellingFeedback(`Correct! +${result.xpGained} XP`, true);
    if (!result.levelUp) {
      this.game.ui.showFloatingText(`${target} Lv.${result.newLevel}`, 0xfacc15);
    }
    this.game.mining.batchResourceText('coins', 10, 0xfacc15, '💰');
    this.game.ui.showTimeBonus('+3s LETTER!');
    if (!result.levelUp) SFXMapper.collectOre();
    this.game.ui.updateZoneLetterHud?.(this.game.zoneManager.currentZoneId);
    setTimeout(() => this.exitLetterSoundQuiz(), 650);
  }

  exitLetterSoundQuiz() {
    this.currentLetterQuiz = null;
    if (this.game.spellingGlyphMesh) {
      this.game.scene.remove(this.game.spellingGlyphMesh);
      this.game.spellingGlyphMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.dispose) child.material.dispose();
      });
      this.game.spellingGlyphMesh = null;
    }
    this.game.ui.hideSpellingChallenge();
    this.game.state = STATES.PLAYING;
    this._restoreCameraMode();

    this.playPendingLevelUp();
    this.game._checkZoneCompletion();
    this.tryStartQuiz();
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

  playPendingLevelUp() {
    if (!this.pendingLetterLevelUp) return;
    const event = this.pendingLetterLevelUp;
    this.pendingLetterLevelUp = null;
    this.game.shaderFX.playLetterLevelUp(event.letter, event.position, event.oldLevel, event.newLevel);
    this.game.ui.showFloatingText(`${event.letter} Lv.${event.newLevel}!`, 0x4ade80);
    SFXMapper.levelUp();
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

  enterSpellingChallenge(letter) {
    if (this.game.state === STATES.SPELLING) return;
    const wordObj = this.game.letterPool.pickWordForLetter(letter);
    if (!wordObj) return;

    this._rememberCameraMode();
    this.game.state = STATES.SPELLING;
    this.game.spellingChallenge = new SpellingChallenge(wordObj);

    // Spawn a 3D glyph floating above the player
    if (this.game.spellingGlyphMesh) {
      this.game.scene.remove(this.game.spellingGlyphMesh);
      this.game.spellingGlyphMesh = null;
    }
    const glyph = glyph3D.createGlyph(letter, 'reward');
    if (glyph) {
      glyph.scale.setScalar(1.2);
      glyph.position.set(this.game.player.position.x, 1.5, this.game.player.position.z);
      this.game.scene.add(glyph);
      this.game.spellingGlyphMesh = glyph;
    }

    // Build progress text
    const progressText = this.game.letterPool.getProgressText()
      .split(' ')
      .map(token => {
        const isSpelled = token.includes('✓');
        return `<span class="${isSpelled ? 'spelled' : 'pending'}">${token}</span>`;
      })
      .join(' ');

    // Build word list for current level (all words for current letters)
    const currentLetters = this.game.letterPool.getCurrentLetters();
    const wordList = [];
    for (const l of currentLetters) {
      const words = SPELLING_WORDS[l];
      if (words) {
        for (const w of words) wordList.push(w.word);
      }
    }

    this.game.ui.showSpellingChallenge(letter, wordObj, progressText, wordList);

    // Auto-play audio after short delay
    setTimeout(() => {
      this.onSpellingPlay();
    }, 400);
  }

  async onSpellingPlay() {
    if (this.currentLetterQuiz) {
      this.speakLetter(this.currentLetterQuiz.letter);
      return;
    }
    if (!this.game.spellingChallenge) return;
    this.game.ui.elSpellingPlayBtn.disabled = true;
    await this.game.spellingChallenge.playAudio();
    this.game.ui.elSpellingPlayBtn.disabled = false;
    this.game.ui.enableSpellingInput();
  }

  onSpellingPlayWord(word) {
    // Play audio for a specific word from the preview list
    const path = `audio/spelling/${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}_en_word.wav`;
    const player = new Audio(path);
    player.play().catch(() => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    });
  }

  onSpellingCheck(input) {
    if (this.currentLetterQuiz) {
      this.resolveLetterSoundQuiz(input);
      return;
    }
    if (!this.game.spellingChallenge) return;
    const correct = this.game.spellingChallenge.checkAnswer(input);
    if (correct) {
      this.game.ui.setSpellingFeedback('Correct! 🎉', true);
      this.game.ui.setSpellingRevealVisible(false);
      SFXMapper.collectOre(); // reuse positive sound
      // Confetti / floating text
      this.game.ui.showFloatingText('SPELLED!', 0x4ade80);
      setTimeout(() => this.exitSpellingChallenge(true), 1200);
    } else {
      this.game.ui.setSpellingFeedback('Try again!', false);
      SFXMapper.swingMiss(); // reuse negative sound
      const hintLevel = this.game.spellingChallenge.getCurrentHintLevel();
      if (hintLevel >= 1) {
        this.game.ui.updateSpellingHint(
          this.game.spellingChallenge.getHintDisplay(),
          this.game.spellingChallenge.getLetterCountHint()
        );
        this.game.ui.setSpellingRevealVisible(this.game.spellingChallenge.canRevealMore());
      }
      // Shake the input
      this.game.ui.elSpellingInput.style.animation = 'none';
      this.game.ui.elSpellingInput.offsetHeight;
      this.game.ui.elSpellingInput.style.animation = 'shake 0.3s';
    }
  }

  onSpellingReveal() {
    if (!this.game.spellingChallenge) return;
    const revealed = this.game.spellingChallenge.revealNextLetter();
    if (revealed) {
      this.game.ui.updateSpellingHint(
        this.game.spellingChallenge.getHintDisplay(),
        this.game.spellingChallenge.getLetterCountHint()
      );
      this.game.ui.setSpellingRevealVisible(this.game.spellingChallenge.canRevealMore());
    }
  }

  onSpellingClose() {
    if (this.currentLetterQuiz) {
      this.currentLetterQuiz = null;
      if (this.game.spellingGlyphMesh) {
        this.game.scene.remove(this.game.spellingGlyphMesh);
        this.game.spellingGlyphMesh.traverse((child) => {
          if (child.isMesh && child.material && child.material.dispose) child.material.dispose();
        });
        this.game.spellingGlyphMesh = null;
      }
      this.game.ui.hideSpellingChallenge();
      this.game.state = STATES.PLAYING;
      this._restoreCameraMode();
  
      return;
    }
    if (!this.game.spellingChallenge) return;
    this.exitSpellingChallenge(false);
  }

  exitSpellingChallenge(success) {
    if (this.game.spellingChallenge) {
      this.game.spellingChallenge.stopAudio();
      if (success) {
        const letter = this.game.spellingChallenge.word[0].toUpperCase();
        this.game.letterPool.markSpelled(letter);
        // Pet spelling progress
        const result = this.game.petManager.recordSpelling(letter, true);
        if (result.unlocked && !result.wasUnlocked) {
          // First time unlock — big celebration!
          this.game.ui.showFloatingText(`Pet ${letter} Joined You!`, 0xfacc15);
          this.game.particles.spark(this.game.player.position.clone().add(new THREE.Vector3(0, 1, 0)), 20);
          SFXMapper.upgradeBuy();
        } else if (!result.unlocked) {
          // Show progress
          const progress = result.spellingsCorrect;
          const needed = result.spellingsNeeded;
          this.game.ui.showFloatingText(`Pet ${letter}: ${progress}/${needed}`, 0x88ccff);
        } else {
          // Already unlocked — level up check
          if (result.levelUp && this.game.pet && this.game.pet.letter === letter) {
            this.game.pet.setLevel(result.newLevel);
            this.game.pet.playLevelUp();
            this.game.ui.showFloatingText(`Pet ${letter} ➜ Lv${result.newLevel}!`, 0x4ade80);
          }
        }
        // Bonus rewards
        this.game.player.coins += 10;
        this.game.floorTimer += 5;
        this.game.ui.showTimeBonus('+5s SPELLING!');
        this.game.mining.batchResourceText('coins', 10, 0xfacc15, '💰');
      }
      this.game.spellingChallenge = null;
    }

    if (this.game.spellingGlyphMesh) {
      this.game.scene.remove(this.game.spellingGlyphMesh);
      this.game.spellingGlyphMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.dispose) {
          child.material.dispose();
        }
      });
      this.game.spellingGlyphMesh = null;
    }

    this.game.ui.hideSpellingChallenge();
    this.game.state = STATES.PLAYING;
    this._restoreCameraMode();

    // Update progress text on HUD if needed
    if (this.game.letterPool.allSpelledForLevel()) {
      this.game.ui.showFloatingText('All letters found!', 0x4ade80);
    }

    this.game._checkZoneCompletion();
  }
}
