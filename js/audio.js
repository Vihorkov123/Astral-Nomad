'use strict';

// Весь звук генерируется WebAudio API — в билде нет ни одного аудиофайла.
const AudioSys = {
  ctx: null,
  master: null, musicGain: null, sfxGain: null,
  _musicTimer: null,
  _step: 0,

  // Вызывается строго после пользовательского жеста (требование браузеров)
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
    this._startMusic();
  },

  applyVolumes() {
    if (!this.ctx) return;
    const v = SaveSys.data ? SaveSys.data.vol : { master: 1, music: 0.6, sfx: 1 };
    this.master.gain.value = v.master;
    this.musicGain.gain.value = v.music * 0.5;
    this.sfxGain.gain.value = v.sfx;
  },

  setVolume(kind, v01) {
    if (SaveSys.data) {
      SaveSys.data.vol[kind] = v01;
      SaveSys.scheduleSave();
    }
    this.applyVolumes();
  },

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume()  { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  // --- Примитивы синтеза ---
  _tone(freq, dur, type, vol, slideTo, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  _noise(dur, vol, freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq || 800;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  },

  // --- Эффекты ---
  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'ui':        this._tone(660, 0.06, 'square', 0.12); break;
      case 'knife':     this._noise(0.08, 0.25, 2400); this._tone(900, 0.05, 'sawtooth', 0.08, 300); break;
      case 'hit':       this._tone(220, 0.12, 'square', 0.2, 80); break;
      case 'hurt':      this._tone(160, 0.25, 'sawtooth', 0.25, 60); this._noise(0.15, 0.2, 400); break;
      case 'dash':      this._tone(300, 0.15, 'sine', 0.15, 700); break;
      case 'chest':     this._tone(330, 0.1, 'triangle', 0.2); this._tone(440, 0.12, 'triangle', 0.2); break;
      case 'loot':      this._tone(523, 0.08, 'sine', 0.18); this._tone(784, 0.14, 'sine', 0.18); break;
      case 'gold':      this._tone(988, 0.07, 'triangle', 0.15); this._tone(1319, 0.12, 'triangle', 0.15); break;
      case 'monster':   this._tone(120, 0.4, 'sawtooth', 0.25, 50); this._noise(0.3, 0.3, 300); break;
      case 'die':       this._tone(140, 0.5, 'sawtooth', 0.2, 40); break;
      case 'death':     this._tone(440, 0.8, 'sine', 0.25, 60); this._noise(0.6, 0.25, 200); break;
      case 'heal':      this._tone(440, 0.1, 'sine', 0.15); this._tone(660, 0.18, 'sine', 0.15); break;
      case 'unlock':    this._tone(523, 0.1, 'triangle', 0.2); this._tone(659, 0.1, 'triangle', 0.2); this._tone(1047, 0.3, 'triangle', 0.2); break;
      case 'guardian':  this._tone(60, 1.2, 'sawtooth', 0.35, 30); this._noise(0.8, 0.3, 150); break;
    }
  },

  // --- Эмбиент-музыка: медленный минорный арпеджиатор ---
  _startMusic() {
    if (this._musicTimer) return;
    const scale = [110, 130.81, 164.81, 196, 220, 261.63, 329.63]; // A-минор
    this._musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this._step++;
      if (this._step % 2 === 0) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        this._tone(note, 2.4, 'sine', 0.08, null, this.musicGain);
        if (this._step % 8 === 0) {
          this._tone(note / 2, 4.0, 'triangle', 0.06, null, this.musicGain);
        }
      }
    }, 900);
  }
};
