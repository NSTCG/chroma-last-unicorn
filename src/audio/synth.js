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

let currentVoice = null;
let currentBGM = null;
let targetBgmVol = 0.28;

export const audio = {
  init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.30;
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
    osc.frequency.value = 65.4; flt.frequency.value = 160; gn.gain.value = 0.10;
    osc.connect(flt); flt.connect(gn); gn.connect(masterGain);
    osc.start();
    droneFilter = flt;

    // Gentle, soothing procedural grass sway (low-mid bandpass, non-piercing)
    try {
      const b = ctx.createBuffer(1, 4096, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < 4096; i++) d[i] = Math.random() * 2 - 1;
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = b; nSrc.loop = true;
      const wFlt = ctx.createBiquadFilter(), wGn = ctx.createGain();
      wFlt.type = 'bandpass'; wFlt.frequency.value = 320; wFlt.Q.value = 1.4;
      wGn.gain.value = 0.06;
      nSrc.connect(wFlt); wFlt.connect(wGn); wGn.connect(masterGain);
      nSrc.start();
      windFilter = wFlt;
    } catch (_) {}

    setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      step = (step + 1) % 16;
      if (windFilter) windFilter.frequency.value = 310 + Math.sin(performance.now() * 0.0006) * 90;
      if (awakenedLevel > 0.15 && step % 2 === 0) tone('triangle', scale[(step >> 1) % 8] * (step % 4 === 0 ? 2 : 1), 0.25, 0.16);
      if (awakenedLevel > 0.45 && step % 2 === 1) tone('triangle', scale[(step * 3) % 8] * 2, 0.15, 0.12);
    }, 280);
  },
  tone,

  playBGM(trackKey) {
    const levelNames = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
    let filename = trackKey;
    if (typeof trackKey === 'number') {
      filename = `bgm_level${trackKey}_${levelNames[trackKey] || 'red'}`;
    } else if (trackKey === 'intro') {
      filename = 'bgm_intro';
    } else if (trackKey === 'finale') {
      filename = 'bgm_finale';
    }

    if (currentBGM && currentBGM.dataset?.track === filename) return;

    if (currentBGM) {
      const oldBgm = currentBGM;
      const fadeOut = setInterval(() => {
        if (oldBgm.volume > 0.03) oldBgm.volume -= 0.03;
        else {
          clearInterval(fadeOut);
          try { oldBgm.pause(); } catch (_) {}
        }
      }, 50);
    }

    const paths = [`./audio/music/${filename}.mp3`, `./public/audio/music/${filename}.mp3`];
    let idx = 0;
    const newBgm = new Audio(paths[0]);
    newBgm.dataset.track = filename;
    newBgm.loop = true;
    newBgm.volume = 0.02;
    newBgm.addEventListener('error', () => {
      idx++;
      if (idx < paths.length) {
        newBgm.src = paths[idx];
        newBgm.play().catch(() => {});
      }
    });
    newBgm.play().then(() => {
      const fadeIn = setInterval(() => {
        if (newBgm.volume < targetBgmVol - 0.02) newBgm.volume += 0.02;
        else {
          newBgm.volume = targetBgmVol;
          clearInterval(fadeIn);
        }
      }, 50);
    }).catch(() => {});
    currentBGM = newBgm;
  },

  playVoice(filename, onEnded) {
    if (currentVoice) {
      try { currentVoice.pause(); currentVoice.currentTime = 0; } catch (_) {}
    }
    const paths = [`./audio/maya/${filename}.mp3`, `./public/audio/maya/${filename}.mp3`];
    let pathIdx = 0;
    const audioEl = new Audio(paths[0]);
    audioEl.volume = 0.95;

    // Duck background music while Maya speaks
    if (currentBGM) currentBGM.volume = targetBgmVol * 0.35;
    if (ctx && masterGain) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.25);
    }

    const restore = () => {
      if (currentBGM) currentBGM.volume = targetBgmVol;
      if (ctx && masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.36, ctx.currentTime + 0.4);
      }
      if (currentVoice === audioEl) currentVoice = null;
      if (onEnded) onEnded();
    };

    audioEl.addEventListener('ended', restore);
    audioEl.addEventListener('error', () => {
      pathIdx++;
      if (pathIdx < paths.length) {
        audioEl.src = paths[pathIdx];
        audioEl.play().catch(restore);
      } else {
        restore();
      }
    });
    audioEl.play().catch(restore);
    currentVoice = audioEl;
    return audioEl;
  },

  stopVoice() {
    if (currentVoice) {
      try { currentVoice.pause(); currentVoice.currentTime = 0; } catch (_) {}
      currentVoice = null;
      if (currentBGM) currentBGM.volume = targetBgmVol;
      if (ctx && masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.36, ctx.currentTime + 0.3);
      }
    }
  },

  playFootstep(surface = 'grass') {
    if (surface === 'rock') {
      tone('triangle', 180 + Math.random() * 25, 0.04, 0.15, 75);
    } else {
      tone('triangle', 95 + Math.random() * 20, 0.06, 0.14, 45);
      rustle();
    }
  },

  playHoofbeat() {
    tone('triangle', 130 + Math.random() * 20, 0.07, 0.22, 60);
    rustle();
    setTimeout(() => tone('triangle', 155 + Math.random() * 20, 0.06, 0.16, 70), 75);
  },

  playChime(shardIndex = 0) {
    const bf = scale[shardIndex % 8] * 2;
    [1, 1.5, 2].forEach((m, i) => tone('sine', bf * m, 1.6, 0.26 / (i + 1)));
  },
  playResonate() { tone('triangle', 115, 0.35, 0.32, 135); },
  playRingtone() { [0, 900].forEach(d => setTimeout(() => tone('sine', 440, 0.7, 0.2), d)); },
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
