let ctx = null, masterGain, droneFilter, windFilter, awakenedLevel = 0, step = 0;
const scale = [262, 294, 330, 392, 440, 523, 587, 659];

function tone(type, freq, dur, gainLevel, slideTo = 0) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gainLevel, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(t + dur);
}

const rustle = () => tone('triangle', 320 + Math.random() * 80, 0.04, 0.08);

export const audio = {
  init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.38;
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
    osc.frequency.value = 65.4; flt.frequency.value = 160; gn.gain.value = 0.15;
    osc.connect(flt); flt.connect(gn); gn.connect(masterGain);
    osc.start();
    droneFilter = flt;

    try {
      const b = ctx.createBuffer(1, 4096, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < 4096; i++) d[i] = Math.random() * 2 - 1;
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = b; nSrc.loop = true;
      const wFlt = ctx.createBiquadFilter(), wGn = ctx.createGain();
      wFlt.type = 'bandpass'; wFlt.frequency.value = 380; wFlt.Q.value = 1.8;
      wGn.gain.value = 0.18;
      nSrc.connect(wFlt); wFlt.connect(wGn); wGn.connect(masterGain);
      nSrc.start();
      windFilter = wFlt;
    } catch (_) {}

    setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      step = (step + 1) % 16;
      if (windFilter) windFilter.frequency.value = 340 + Math.sin(performance.now() * 0.0008) * 220;
      if (awakenedLevel > 0.15 && step % 2 === 0) tone('triangle', scale[(step >> 1) % 8] * (step % 4 === 0 ? 2 : 1), 0.25, 0.16);
      if (awakenedLevel > 0.45 && step % 2 === 1) tone('triangle', scale[(step * 3) % 8] * 2, 0.15, 0.12);
    }, 280);
  },
  tone,
  playFootstep() { tone('triangle', 95 + Math.random() * 20, 0.06, 0.14, 45); rustle(); },
  playHoofbeat() {
    tone('triangle', 130 + Math.random() * 20, 0.07, 0.22, 60); rustle();
    setTimeout(() => tone('triangle', 155 + Math.random() * 20, 0.06, 0.16, 70), 75);
  },
  playChime(shardIndex = 0) {
    const bf = scale[shardIndex % 8] * 2;
    [1, 1.5, 2].forEach((m, i) => tone('sine', bf * m, 1.6, 0.26 / (i + 1)));
  },
  playResonate() { tone('triangle', 115, 0.35, 0.32, 135); },
  playRingtone() { [0, 900].forEach(d => setTimeout(() => tone('sine', 440, 0.7, 0.2), d)); },
  playMumble(p = 380) { tone('triangle', p + (Math.random() - 0.5) * 50, 0.08, 0.18, p * 0.9); },
  playPeacefulChords() { [330, 392, 494, 587].forEach((f, i) => setTimeout(() => tone('sine', f, 2.5, 0.08), i * 150)); },
  playPluck(freq, dur, gain) { tone('triangle', freq, dur, gain, freq * 0.5); },
  playAscent() { scale.forEach((n, i) => setTimeout(() => tone('triangle', n, 1.6, 0.22), i * 150)); },
  playFeelGoodEnding() {
    [262, 330, 392, 523, 349, 440, 523, 698, 392, 494, 587, 784, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('sine', f, 1.8, 0.16 / ((i % 4) + 1)), (i >> 2) * 750 + (i % 4) * 120));
  },
  setAwakened(val) {
    awakenedLevel = val;
    if (droneFilter) droneFilter.frequency.value = 160 + val * 640;
  }
};
