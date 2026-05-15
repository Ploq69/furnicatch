class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map(); // path -> AudioBuffer
    this.loading = new Set();
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.8;
    this.sfxGain.gain.value = 0.9;
    this.musicGain.gain.value = 0.3;
    this.initialized = true;
    // Apply settings asynchronously if available
    import('./SettingsManager.js').then(({ settings }) => {
      settings.applyToAudio(this);
    }).catch(() => {});
  }

  async loadBuffer(path) {
    if (this.buffers.has(path)) return this.buffers.get(path);
    if (this.loading.has(path)) {
      // Wait for existing load
      while (this.loading.has(path)) {
        await new Promise(r => setTimeout(r, 10));
      }
      return this.buffers.get(path);
    }

    this.loading.add(path);
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = await res.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(buf);
      this.buffers.set(path, audioBuf);
      return audioBuf;
    } catch (e) {
      console.warn('Audio load failed:', path, e.message);
      return null;
    } finally {
      this.loading.delete(path);
    }
  }

  playPath(path, opts = {}) {
    if (!this.initialized) this.init();
    const buf = this.buffers.get(path);
    if (buf) {
      this._playBuffer(buf, opts);
      return;
    }
    // Lazy load and then play
    this.loadBuffer(path).then(loaded => {
      if (loaded) this._playBuffer(loaded, opts);
    });
  }

  _playBuffer(buffer, opts) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = opts.volume ?? 0.5;
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.playbackRate.value = opts.pitch ?? 1;
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
    src.start(0);
  }

  play(name, opts = {}) {
    // Legacy direct play (for preloaded sounds)
    if (!this.initialized) this.init();
    const buf = this.buffers.get(name);
    if (buf) {
      this._playBuffer(buf, opts);
      return;
    }
    this._synthFallback(opts);
  }

  getStats() {
    return {
      buffers: this.buffers.size,
      loading: this.loading.size,
    };
  }

  playExplosion(opts = {}) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const volume = opts.volume ?? 0.75;

    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(opts.freq ?? 96, now);
    rumble.frequency.exponentialRampToValueAtTime(34, now + 0.38);
    rumbleGain.gain.setValueAtTime(volume * 0.55, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 0.44);

    const crack = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(170, now);
    crack.frequency.exponentialRampToValueAtTime(58, now + 0.12);
    crackGain.gain.setValueAtTime(volume * 0.22, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    crack.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crack.start(now);
    crack.stop(now + 0.14);
  }

  _synthFallback(opts) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.value = opts.freq || 440;
    gain.gain.value = (opts.volume ?? 0.1) * 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
}

export const audio = new AudioManager();
