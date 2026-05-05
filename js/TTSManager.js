export class TTSManager {
  constructor(basePath = 'audio/tts') {
    this.basePath = basePath;
    this.cache = new Map();
    this.missing = new Set();
    this.synth = window.speechSynthesis || null;
    this.preferredVoice = null;
    this._initVoice();
  }

  _initVoice() {
    if (!this.synth) return;
    const pickVoice = () => {
      const voices = this.synth.getVoices();
      // Prefer a clear English voice
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      this.preferredVoice = preferred || null;
    };
    pickVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = pickVoice;
    }
  }

  playWord(word) {
    if (!word) return;
    const lower = word.toLowerCase();

    // Try cached Kokoro audio first
    if (!this.missing.has(lower)) {
      const audio = this._getAudio(lower);
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          this.missing.add(lower);
          this._speakWithSynth(word);
        });
        return;
      }
      return;
    }

    // Fallback to Web Speech API
    this._speakWithSynth(word);
  }

  _speakWithSynth(word) {
    if (!this.synth) return;
    // Cancel any ongoing speech to avoid queue buildup
    this.synth.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate = 0.9;
    utter.pitch = 1.05;
    if (this.preferredVoice) utter.voice = this.preferredVoice;
    this.synth.speak(utter);
  }

  _getAudio(word) {
    if (this.cache.has(word)) return this.cache.get(word);
    const audio = new Audio(`${this.basePath}/${word}.wav`);
    audio.preload = 'auto';
    audio.addEventListener('error', () => this.missing.add(word), { once: true });
    this.cache.set(word, audio);
    return audio;
  }
}

export const tts = new TTSManager();
