const SFX_ROOT = '../voidloop/audio/sfx';
const DRILL_ROOT = '../voidloop/audio/drill';

const SFX = {
  roll: ['DSGNMisc', 'MOVEMENT-Noise Decay'],
  collect: ['DSGNTonl', 'USABLE-Coin Toss'],
  letter: ['MAGAngl', 'BUFF-Buff Pickup'],
  correct: ['DSGNSynth', 'BUFF-Generic Buff'],
  wrong: ['UIMisc', 'INTERFACE-Denied'],
  grow: ['DSGNSynth', 'BUFF-Mecha Level Up'],
  complete: ['MAGSpel', 'CAST-Skill Ready'],
  bump: ['DSGNImpt', 'EXPLOSION-Thud'],
};

function pickVariant() {
  return Math.floor(Math.random() * 2) + 1;
}

function sfxPath([prefix, name]) {
  return `${SFX_ROOT}/${prefix}_${name}_HY_PC-00${pickVariant()}.wav`;
}

export class AudioBus {
  constructor() {
    this.enabled = false;
    this.volume = 0.72;
    this._live = new Set();
    this.rollAudio = null;
  }

  unlock() {
    this.enabled = true;
  }

  playSfx(id, opts = {}) {
    const cfg = SFX[id];
    if (!cfg) return;
    this.playPath(sfxPath(cfg), opts);
  }

  setRollIntensity(intensity = 0, radius = 1) {
    if (!this.enabled) return;
    const target = Math.max(0, Math.min(1, intensity));
    if (!this.rollAudio && target > 0.02) {
      this.rollAudio = new Audio(sfxPath(SFX.roll));
      this.rollAudio.loop = true;
      this.rollAudio.volume = 0;
      this.rollAudio.play().catch(() => {
        this.rollAudio = null;
      });
    }
    if (!this.rollAudio) return;
    this.rollAudio.volume = Math.min(0.22, target * 0.16);
    this.rollAudio.playbackRate = Math.max(0.58, Math.min(1.35, 1.12 - radius * 0.08 + target * 0.25));
    if (target <= 0.01) {
      this.rollAudio.pause();
      this.rollAudio = null;
    }
  }

  playPath(path, opts = {}) {
    if (!this.enabled) return;
    const audio = new Audio(path);
    audio.volume = Math.max(0, Math.min(1, opts.volume ?? this.volume));
    audio.playbackRate = Math.max(0.5, Math.min(1.8, opts.rate ?? 1));
    this._live.add(audio);
    audio.addEventListener('ended', () => this._live.delete(audio), { once: true });
    audio.play().catch(() => this._live.delete(audio));
  }

  playQuestionPrompt(question) {
    if (!question?.promptAudio) return;
    this.playPath(question.promptAudio, { volume: 0.9 });
  }

  playWord(word) {
    const safe = String(word || '').toLowerCase();
    const first = safe.charAt(0).toUpperCase();
    this.playPath(`${DRILL_ROOT}/words/${first}/${safe}.wav`, { volume: 0.95 });
  }

  playLetterChoice(letter) {
    const upper = String(letter || '').toUpperCase()[0];
    this.speak(`Letter ${upper}`);
  }

  speak(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.86;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }
}
