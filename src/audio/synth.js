// Web Audio Synthesizer for JS13K with Stutter-Free Smooth Ambient Music & SFX

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.awakenedLevel = 0.0;
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    this.droneOsc = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Gentle, pleasant volume (no loud blasts)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.22;
    this.masterGain.connect(this.ctx.destination);

    this.startDrone();
    this.startMusicSequencer();
    this.isPlaying = true;
  }

  startDrone() {
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = 65.41;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.12;

    this.droneOsc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);
    this.droneOsc.start();

    this.droneFilter = filter;
  }

  startMusicSequencer() {
    setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.step = (this.step + 1) % 16;

      if (this.awakenedLevel > 0.15 && this.step % 2 === 0) {
        const noteIdx = (this.step / 2) % this.scale.length;
        const note = this.scale[noteIdx] * (this.step % 4 === 0 ? 2 : 1);
        this.playPluck(note, 0.12, 0.25);
      }

      if (this.awakenedLevel > 0.45 && (this.step % 4 === 1 || this.step % 4 === 3)) {
        const note = this.scale[(this.step * 3) % this.scale.length] * 2;
        this.playPluck(note, 0.08, 0.15);
      }

      if (this.awakenedLevel > 0.7 && this.step % 8 === 0) {
        [261.63, 329.63, 392.00, 440.00].forEach((freq, i) => {
          this.playPad(freq * (i === 3 ? 0.5 : 1), 3.0, 0.08);
        });
      }
    }, 280);
  }

  playPluck(freq, duration, gainLevel) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPad(freq, duration, gainLevel) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainLevel, this.ctx.currentTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playChime(shardIndex = 0) {
    if (!this.ctx) return;
    const baseFreq = this.scale[shardIndex % this.scale.length] * 2;
    [1, 1.5, 2].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * mult, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.18 / (i + 1), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.8);
    });
  }

  playShockwave() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playAscent() {
    this.playUnicornAscent();
  }

  playUnicornAscent() {
    if (!this.ctx) return;
    const fanfareNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 784.00, 1046.50];
    fanfareNotes.forEach((note, idx) => {
      setTimeout(() => {
        this.playPluck(note, 1.6, 0.25);
        this.playPad(note * 0.5, 2.8, 0.15);
      }, idx * 150);
    });
  }

  setAwakened(val) {
    this.awakenedLevel = val;
    if (this.droneFilter && this.ctx) {
      this.droneFilter.frequency.setValueAtTime(160 + val * 500, this.ctx.currentTime);
    }
  }
}

export const audio = new AudioEngine();
