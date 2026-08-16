// Compact Web Audio Synthesizer for JS13K
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.awakenedLevel = 0.0;
    this.scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.22;
    this.masterGain.connect(this.ctx.destination);

    // Warm sub drone
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const gn = this.ctx.createGain();
    osc.frequency.value = 65.4; flt.frequency.value = 160; gn.gain.value = 0.12;
    osc.connect(flt); flt.connect(gn); gn.connect(this.masterGain);
    osc.start();
    this.droneFilter = flt;

    // Arpeggio & ambient chord sequencer
    setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.step = (this.step + 1) % 16;
      if (this.awakenedLevel > 0.15 && this.step % 2 === 0) {
        const n = this.scale[(this.step / 2) % 8] * (this.step % 4 === 0 ? 2 : 1);
        this.tone('triangle', n, 0.25, 0.12);
      }
      if (this.awakenedLevel > 0.45 && (this.step % 4 === 1 || this.step % 4 === 3)) {
        this.tone('triangle', this.scale[(this.step * 3) % 8] * 2, 0.15, 0.08);
      }
      if (this.awakenedLevel > 0.7 && this.step % 8 === 0) {
        [261.63, 329.63, 392.0, 440.0].forEach((f, i) => this.tone('sine', f * (i === 3 ? 0.5 : 1), 2.8, 0.08, 0, 0.8));
      }
    }, 280);
  }

  tone(type, freq, dur, gainLevel, slideTo = 0, attack = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    if (attack > 0) {
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(gainLevel, t + attack);
    } else {
      g.gain.setValueAtTime(gainLevel, t);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(t + dur);
  }

  playChime(shardIndex = 0) {
    const bf = this.scale[shardIndex % 8] * 2;
    [1, 1.5, 2].forEach((m, i) => this.tone('sine', bf * m, 1.6, 0.18 / (i + 1)));
  }

  playShockwave() {
    this.tone('sine', 240, 1.3, 0.25, 45);
  }

  playAscent() {
    [261.63, 329.63, 392.0, 523.25, 659.25, 784.0, 1046.5].forEach((n, i) => {
      setTimeout(() => { this.tone('triangle', n, 1.6, 0.22); this.tone('sine', n * 0.5, 2.8, 0.15, 0, 0.8); }, i * 150);
    });
  }

  setAwakened(val) {
    this.awakenedLevel = val;
    if (this.droneFilter && this.ctx) this.droneFilter.frequency.setValueAtTime(160 + val * 500, this.ctx.currentTime);
  }
}

export const audio = new AudioEngine();
