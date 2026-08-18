class AudioEngine {
  constructor() {
    this.ctx = null;
    this.awakenedLevel = 0;
    this.scale = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.22;
    this.masterGain.connect(this.ctx.destination);

    // Warm base drone
    const osc = this.ctx.createOscillator(), flt = this.ctx.createBiquadFilter(), gn = this.ctx.createGain();
    osc.frequency.value = 65.4; flt.frequency.value = 160; gn.gain.value = 0.12;
    osc.connect(flt); flt.connect(gn); gn.connect(this.masterGain);
    osc.start();
    this.droneFilter = flt;

    // Ambient wind generator
    try {
      const bLen = this.ctx.sampleRate * 2;
      const nBuf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
      const data = nBuf.getChannelData(0);
      for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = this.ctx.createBufferSource();
      noise.buffer = nBuf; noise.loop = true;
      const wFlt = this.ctx.createBiquadFilter(), wGn = this.ctx.createGain();
      wFlt.type = 'bandpass'; wFlt.frequency.value = 340; wFlt.Q.value = 2.5;
      wGn.gain.value = 0.07;
      noise.connect(wFlt); wFlt.connect(wGn); wGn.connect(this.masterGain);
      noise.start();
      this.windFilter = wFlt;
    } catch (_) {}

    setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.step = (this.step + 1) % 16;
      if (this.windFilter) this.windFilter.frequency.value = 280 + Math.sin(performance.now() * 0.001) * 160;
      if (this.awakenedLevel > 0.15 && this.step % 2 === 0) {
        this.tone('triangle', this.scale[(this.step / 2) % 8] * (this.step % 4 === 0 ? 2 : 1), 0.25, 0.12);
      }
      if (this.awakenedLevel > 0.45 && this.step % 2 === 1) {
        this.tone('triangle', this.scale[(this.step * 3) % 8] * 2, 0.15, 0.08);
      }
    }, 280);
  }

  tone(type, freq, dur, gainLevel, slideTo = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gainLevel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(t + dur);
  }

  playFootstep() {
    this.tone('triangle', 95 + Math.random() * 20, 0.06, 0.08, 45);
  }

  playHoofbeat() {
    this.tone('triangle', 130 + Math.random() * 20, 0.07, 0.15, 60);
    setTimeout(() => this.tone('triangle', 155 + Math.random() * 20, 0.06, 0.11, 70), 75);
  }

  playUnicornJolt() {
    this.tone('sine', 520, 0.22, 0.18, 760);
    this.tone('triangle', 260, 0.28, 0.20, 420);
  }

  playChime(shardIndex = 0) {
    const bf = this.scale[shardIndex % 8] * 2;
    [1, 1.5, 2].forEach((m, i) => this.tone('sine', bf * m, 1.6, 0.18 / (i + 1)));
  }

  playResonate() {
    this.tone('triangle', 115, 0.35, 0.22, 135);
  }

  playRingtone() {
    this.tone('sine', 440, 1.1, 0.14);
    this.tone('sine', 480, 1.1, 0.14);
  }

  playMumble(p = 380) {
    this.tone('triangle', p + (Math.random() - 0.5) * 50, 0.08, 0.11, p * 0.9);
  }

  playPeacefulChords() {
    [329.6, 392, 493.8, 587.3].forEach((f, i) => {
      setTimeout(() => this.tone('sine', f, 3.2, 0.08), i * 160);
    });
  }

  playPluck(freq, dur, gain) {
    this.tone('triangle', freq, dur, gain, freq * 0.5);
  }

  playAscent() {
    [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5].forEach((n, i) => {
      setTimeout(() => this.tone('triangle', n, 1.6, 0.22), i * 150);
    });
  }

  setAwakened(val) {
    this.awakenedLevel = val;
    if (this.droneFilter) this.droneFilter.frequency.value = 160 + val * 640;
  }
}

export const audio = new AudioEngine();

