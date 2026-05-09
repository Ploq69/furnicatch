// ==========================================
// Voidloop — Spelling Engine (hint + audio)
// Ported from spelling-game-3w logic
// ==========================================

function getAudioPath(word) {
  const safe = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `audio/spelling/${safe}_en_word.wav`;
}

export function generateHintDisplay(word, revealedChars) {
  const revealedSet = new Set((revealedChars || []).map(c => c.toUpperCase()));
  return word
    .split('')
    .map(ch => (revealedSet.has(ch.toUpperCase()) ? ch : '_'))
    .join(' ');
}

export function getNextReveal(word, revealedChars) {
  const revealedSet = new Set((revealedChars || []).map(c => c.toUpperCase()));
  for (const ch of word) {
    const upper = ch.toUpperCase();
    if (!revealedSet.has(upper)) return upper;
  }
  return null;
}

export function getUniqueLetterCount(word) {
  return new Set(word.toUpperCase().split('')).size;
}

export class SpellingChallenge {
  constructor(wordObj) {
    this.wordObj = wordObj;
    this.word = wordObj.word;
    this.audioPath = getAudioPath(this.word);
    this.revealedChars = [];
    this.incorrectCount = 0;
    this.complete = false;
    this.correct = false;
    this.audioPlayer = null;
    this.isAudioPlaying = false;
  }

  playAudio() {
    return new Promise((resolve) => {
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer = null;
      }
      this.isAudioPlaying = true;
      this.audioPlayer = new Audio(this.audioPath);
      this.audioPlayer.play().catch(() => {
        // Fallback to speech synthesis if file missing
        this._speakFallback();
      });
      this.audioPlayer.onended = () => {
        this.isAudioPlaying = false;
        resolve();
      };
      this.audioPlayer.onerror = () => {
        this.isAudioPlaying = false;
        this._speakFallback();
        resolve();
      };
      // Safety timeout
      setTimeout(() => {
        if (this.isAudioPlaying) {
          this.isAudioPlaying = false;
          resolve();
        }
      }, 5000);
    });
  }

  _speakFallback() {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(this.word);
      u.rate = 0.9;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    }
  }

  stopAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    this.isAudioPlaying = false;
  }

  checkAnswer(input) {
    const normalizedInput = (input || '').trim().toLowerCase().replace(/\s+/g, '');
    const normalizedWord = this.word.toLowerCase().replace(/\s+/g, '');
    const correct = normalizedInput === normalizedWord;
    if (!correct) {
      this.incorrectCount++;
      // Auto-reveal first letter after first wrong guess
      if (this.incorrectCount === 1) {
        const first = this.word[0]?.toUpperCase();
        if (first && !this.revealedChars.includes(first)) {
          this.revealedChars.push(first);
        }
      }
    } else {
      this.complete = true;
      this.correct = true;
    }
    return correct;
  }

  revealNextLetter() {
    const next = getNextReveal(this.word, this.revealedChars);
    if (next && !this.revealedChars.includes(next)) {
      this.revealedChars.push(next);
      return next;
    }
    return null;
  }

  getHintDisplay() {
    return generateHintDisplay(this.word, this.revealedChars);
  }

  getLetterCountHint() {
    return `The word has ${this.word.length} letters.`;
  }

  canRevealMore() {
    const uniqueRevealed = new Set(this.revealedChars.map(c => c.toUpperCase()));
    const uniqueTotal = getUniqueLetterCount(this.word);
    return uniqueRevealed.size < uniqueTotal;
  }

  getCurrentHintLevel() {
    if (this.incorrectCount === 0) return 0;
    if (this.incorrectCount === 1) return 1; // letter count + first letter
    return 2; // additional reveals possible
  }
}
