// Simple synthesized audio using Web Audio API
class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  _ensureCtx() {
    if (!this.initialized) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _tone(freq, type, duration, volume = 0.15) {
    this._ensureCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, volume = 0.1) {
    this._ensureCtx();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  playOrbToss() {
    this._tone(600, 'sine', 0.15, 0.08);
    this._tone(900, 'triangle', 0.1, 0.05);
    this._noise(0.08, 0.04);
  }

  playOrbHit() {
    this._tone(200, 'square', 0.1, 0.08);
    this._tone(120, 'sine', 0.12, 0.05);
    this._noise(0.12, 0.08);
  }

  playCaptureSuccess() {
    // Ascending magical chime
    const now = this.ctx?.currentTime || 0;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, 'sine', 0.3, 0.12), i * 80);
    });
  }

  playEscape() {
    this._tone(400, 'sawtooth', 0.3, 0.08);
    setTimeout(() => this._tone(300, 'sawtooth', 0.3, 0.08), 100);
    setTimeout(() => this._tone(200, 'sawtooth', 0.4, 0.08), 200);
    this._noise(0.18, 0.07);
  }

  playTypeCorrect(streak = 1) {
    const base = 440;
    const freq = base + (streak % 8) * 55;
    this._tone(freq, 'sine', 0.08, 0.1);
  }

  playTypeWrong() {
    this._tone(150, 'square', 0.2, 0.12);
    this._noise(0.15, 0.08);
  }

  playCoinPickup() {
    this._tone(1200, 'sine', 0.1, 0.1);
    setTimeout(() => this._tone(1600, 'sine', 0.15, 0.08), 50);
  }

  playAlert() {
    this._tone(800, 'square', 0.1, 0.06);
    setTimeout(() => this._tone(800, 'square', 0.1, 0.06), 100);
  }

  playStep() {
    this._noise(0.05, 0.03);
  }

  playLevelUp() {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this._tone(f, 'triangle', 0.4, 0.1), i * 100);
    });
  }
}

export const audio = new AudioManager();
