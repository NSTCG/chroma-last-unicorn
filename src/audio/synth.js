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

// Procedural BGM: 7 Greek modes on root C + Intro (Pentatonic) & Finale (Triumphant)
const noteFreq = (semi, oct = 4) => 261.626 * Math.pow(2, (semi + (oct - 4) * 12) / 12);

const MODES = {
  // 0: Red - C Ionian (Major): [C, D, E, F, G, A, B]
  0: {
    name: 'C Major (Ionian)',
    notes: [0, 2, 4, 5, 7, 9, 11],
    chord: [0, 4, 7, 11, 14], // Cmaj9
    tempo: 310,
    moodGain: 0.68,
    charNote: 4
  },
  // 1: Orange - C Dorian: [C, D, Eb, F, G, A, Bb] - natural 6th (A)
  1: {
    name: 'C Dorian',
    notes: [0, 2, 3, 5, 7, 9, 10],
    chord: [0, 3, 7, 9, 14], // Cm6/9
    tempo: 330,
    moodGain: 0.68,
    charNote: 9
  },
  // 2: Yellow - C Phrygian: [C, Db, Eb, F, G, Ab, Bb] - minor 2nd (Db)
  2: {
    name: 'C Phrygian',
    notes: [0, 1, 3, 5, 7, 8, 10],
    chord: [0, 1, 7, 10, 15], // Csus(b2, b7)
    tempo: 350,
    moodGain: 0.65,
    charNote: 1
  },
  // 3: Green - C Lydian: [C, D, E, F#, G, A, B] - augmented 4th (F#)
  3: {
    name: 'C Lydian',
    notes: [0, 2, 4, 6, 7, 9, 11],
    chord: [0, 4, 6, 11, 14], // Cmaj7#11
    tempo: 300,
    moodGain: 0.68,
    charNote: 6
  },
  // 4: Blue - C Mixolydian: [C, D, E, F, G, A, Bb] - minor 7th (Bb)
  4: {
    name: 'C Mixolydian',
    notes: [0, 2, 4, 5, 7, 9, 10],
    chord: [0, 4, 7, 10, 14], // C9
    tempo: 320,
    moodGain: 0.66,
    charNote: 10
  },
  // 5: Indigo - C Aeolian (Natural Minor): [C, D, Eb, F, G, Ab, Bb] - minor 6th (Ab)
  5: {
    name: 'C Aeolian (Minor)',
    notes: [0, 2, 3, 5, 7, 8, 10],
    chord: [0, 3, 7, 8, 10], // Cm(b6)
    tempo: 340,
    moodGain: 0.66,
    charNote: 8
  },
  // 6: Violet - C Locrian: [C, Db, Eb, F, Gb, Ab, Bb] - diminished 5th (Gb), minor 2nd (Db)
  6: {
    name: 'C Locrian',
    notes: [0, 1, 3, 5, 6, 8, 10],
    chord: [0, 3, 6, 10, 13], // Cm7b5(b9)
    tempo: 360,
    moodGain: 0.64,
    charNote: 6
  },
  // Intro / Free Roam: C Pentatonic Major
  intro: {
    name: 'C Pentatonic (Intro)',
    notes: [0, 2, 4, 7, 9],
    chord: [0, 4, 7, 9, 14], // C6/9
    tempo: 340,
    moodGain: 0.68,
    charNote: 7
  },
  // Finale: Radiant Triumphant C Major Shimmer
  finale: {
    name: 'C Triumphant (Finale)',
    notes: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16],
    chord: [0, 4, 7, 11, 12, 16],
    tempo: 260,
    moodGain: 0.75,
    charNote: 12
  }
};

let currentVoice = null;
let currentModeKey = null;
let currentMode = MODES['intro'];
let bgmGainNode = null, bgmBus = null, bgmFilter = null, delaySend = null;
let activePadVoices = [];
let arpTimer = null, arpStep = 0;

function setupBgmGraph() {
  if (!ctx || bgmGainNode) return;
  bgmGainNode = ctx.createGain();
  bgmGainNode.gain.value = 0.68;
  bgmGainNode.connect(masterGain);

  bgmFilter = ctx.createBiquadFilter();
  bgmFilter.type = 'lowpass';
  bgmFilter.frequency.value = 2400;
  bgmFilter.Q.value = 0.7;
  bgmFilter.connect(bgmGainNode);

  bgmBus = ctx.createGain();
  bgmBus.gain.value = 1.0;
  bgmBus.connect(bgmFilter);

  // Gentle stereo acoustic delay
  try {
    delaySend = ctx.createGain();
    delaySend.gain.value = 0.40;

    const dL = ctx.createDelay(), dR = ctx.createDelay();
    dL.delayTime.value = 0.28;
    dR.delayTime.value = 0.42;

    const dFlt = ctx.createBiquadFilter();
    dFlt.type = 'lowpass';
    dFlt.frequency.value = 1600;

    const dFb = ctx.createGain();
    dFb.gain.value = 0.24;

    // Pan delay returns if StereoPanner is supported
    if (ctx.createStereoPanner) {
      const panL = ctx.createStereoPanner(), panR = ctx.createStereoPanner();
      panL.pan.value = -0.42; panR.pan.value = 0.42;
      delaySend.connect(dL); delaySend.connect(dR);
      dL.connect(panL); dR.connect(panR);
      panL.connect(dFlt); panR.connect(dFlt);
    } else {
      delaySend.connect(dL); delaySend.connect(dR);
      dL.connect(dFlt); dR.connect(dFlt);
    }

    dFlt.connect(dFb);
    dFb.connect(dL); dFb.connect(dR);
    dFlt.connect(bgmBus);
  } catch (_) {}
}

function stopPadVoices() {
  if (!activePadVoices.length || !ctx) return;
  const now = ctx.currentTime;
  activePadVoices.forEach(v => {
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.linearRampToValueAtTime(0.0001, now + 1.4);
      setTimeout(() => {
        try { v.oscs.forEach(o => { o.stop(); o.disconnect(); }); v.gain.disconnect(); } catch (_) {}
      }, 1500);
    } catch (_) {}
  });
  activePadVoices = [];
}

function startPadVoices(mode) {
  if (!ctx || !bgmBus) return;
  const now = ctx.currentTime;
  const voices = [];

  // 1. Sub-bass root drone (C2: 65.4 Hz)
  try {
    const bassOsc = ctx.createOscillator(), bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(65.41, now);
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.linearRampToValueAtTime(0.24, now + 1.6);
    bassOsc.connect(bassGain);
    bassGain.connect(bgmBus);
    bassOsc.start(now);
    voices.push({ oscs: [bassOsc], gain: bassGain });
  } catch (_) {}

  // 2. Chord voices for the current mode
  const chordNotes = mode.chord.slice(0, 4);
  chordNotes.forEach((semi, idx) => {
    try {
      const f = noteFreq(semi, 3);
      const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator();
      const vGain = ctx.createGain();

      osc1.type = 'sine'; osc1.frequency.setValueAtTime(f, now);
      osc1.detune.setValueAtTime(-3, now);

      osc2.type = 'triangle'; osc2.frequency.setValueAtTime(f, now);
      osc2.detune.setValueAtTime(3, now);

      vGain.gain.setValueAtTime(0.0001, now);
      // Rich staggered swell
      const targetGain = 0.16 / (1 + idx * 0.15);
      vGain.gain.linearRampToValueAtTime(targetGain, now + 1.4 + idx * 0.25);

      osc1.connect(vGain);
      osc2.connect(vGain);
      vGain.connect(bgmBus);

      osc1.start(now);
      osc2.start(now);
      voices.push({ oscs: [osc1, osc2], gain: vGain });
    } catch (_) {}
  });

  activePadVoices = voices;
}

function playModalPluck(freq, velocity = 0.22) {
  if (!ctx || !bgmBus || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain();

  // Glassy chime / harp tone: sine body with subtle octave strike transient
  osc1.type = 'sine'; osc1.frequency.setValueAtTime(freq, now);
  osc2.type = 'triangle'; osc2.frequency.setValueAtTime(freq * 2, now);

  const dur = 1.1 + Math.random() * 0.4;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(velocity, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc1.connect(g); osc2.connect(g);
  g.connect(bgmBus);
  if (delaySend) g.connect(delaySend);

  osc1.start(now); osc2.start(now);
  osc1.stop(now + dur); osc2.stop(now + dur);
}

function tickModalArp() {
  if (!ctx || ctx.state !== 'running' || !currentMode) return;
  arpStep = (arpStep + 1) % 32;

  const notes = currentMode.notes;
  const isDownbeat = (arpStep % 4 === 0);
  const isMeasureStart = (arpStep % 8 === 0);

  // Dynamic generative phrasing (leave gentle rests so it breathes)
  const shouldPlay = isDownbeat ? (Math.random() < 0.95) : (Math.random() < 0.55);

  if (shouldPlay && notes.length) {
    let pickSemi;
    if (isMeasureStart) {
      // Anchor on root C or 5th G
      pickSemi = (Math.random() < 0.6) ? 0 : 7;
    } else if (Math.random() < 0.35 && currentMode.charNote !== undefined) {
      // Highlight signature modal color note (e.g. F# in Lydian, Db in Phrygian, A in Dorian)
      pickSemi = currentMode.charNote;
    } else {
      pickSemi = notes[Math.floor(Math.random() * notes.length)];
    }

    const oct = (Math.random() < 0.35) ? 5 : 4;
    const freq = noteFreq(pickSemi, oct);
    const vel = 0.18 + Math.random() * 0.09;
    playModalPluck(freq, vel);
  }
}

export const audio = {
  init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(ctx.destination);

    setupBgmGraph();

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

    // Start procedural modal arpeggiator clock
    if (arpTimer) clearInterval(arpTimer);
    arpTimer = setInterval(tickModalArp, currentMode?.tempo || 320);

    // Initial peaceful intro mode
    this.playBGM('intro');
  },
  tone,

  playBGM(trackKey) {
    if (!ctx) this.init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    setupBgmGraph();

    let targetKey = trackKey;
    if (typeof trackKey === 'number') {
      targetKey = trackKey % 7;
    } else if (trackKey !== 'intro' && trackKey !== 'finale') {
      targetKey = 'intro';
    }

    if (currentModeKey === targetKey) return;
    currentModeKey = targetKey;

    const mode = MODES[targetKey] || MODES['intro'];
    currentMode = mode;

    // Crossfade ambient pad bed to the new mode
    stopPadVoices();
    startPadVoices(mode);

    // Update arpeggiator tempo and volume smoothly
    if (bgmGainNode && ctx) {
      const now = ctx.currentTime;
      bgmGainNode.gain.cancelScheduledValues(now);
      bgmGainNode.gain.linearRampToValueAtTime(mode.moodGain || 0.68, now + 1.2);
    }

    if (arpTimer) clearInterval(arpTimer);
    arpTimer = setInterval(tickModalArp, mode.tempo || 320);
  },

  playVoice(filename, onEnded) {
    if (currentVoice) {
      try { currentVoice.pause(); currentVoice.currentTime = 0; } catch (_) {}
    }
    const paths = [`./audio/maya/${filename}.mp3`, `./public/audio/maya/${filename}.mp3`];
    let pathIdx = 0;
    const audioEl = new Audio(paths[0]);
    audioEl.volume = 0.95;

    // Smoothly duck procedural BGM while Maya speaks
    if (ctx && bgmGainNode) {
      bgmGainNode.gain.cancelScheduledValues(ctx.currentTime);
      bgmGainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.25);
    }

    const restore = () => {
      if (ctx && bgmGainNode) {
        const targetGain = currentMode?.moodGain || 0.68;
        bgmGainNode.gain.cancelScheduledValues(ctx.currentTime);
        bgmGainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.4);
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
      if (ctx && bgmGainNode) {
        const targetGain = currentMode?.moodGain || 0.68;
        bgmGainNode.gain.cancelScheduledValues(ctx.currentTime);
        bgmGainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.3);
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
    if (bgmFilter) bgmFilter.frequency.value = 1800 + val * 800;
  }
};
