import { audio } from '../audio/synth.js';
import { T, Grp, Msh, BMat, PGeo } from './three.js';

export function createVRHUD(scene, camera) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 540;
  const ctx = canvas.getContext('2d');
  const tex = new T.CanvasTexture(canvas);

  const phoneGroup = Grp();
  const bodyMesh = Msh(PGeo(.125, .245), BMat({ color: 0x151520 }));
  const screenMesh = Msh(PGeo(.118, .236), BMat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: 2 }));
  screenMesh.position.z = .0045;
  screenMesh.renderOrder = 999;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let title = 'CHROMA', sub = '', act = '', collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

  let callState = 'idle', callTimer = 0, talkStep = 0, onCallComplete = null, lastAction = 0;
  const dial = [
    'Still at work? No IT talk on our road trip!',
    'I packed the camera for the cliff overlook.',
    'I love you so much. See you at home.'
  ];

  const rr = (x, y, w, h, r = 20) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  const wrapText = (text, x, y, maxW, lineH) => {
    if (!text) return y;
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line.length > 0) {
          ctx.fillText(line, x, y);
          line = word + ' ';
          y += lineH;
        } else line = test;
      }
      ctx.fillText(line, x, y);
      y += lineH;
    }
    return y;
  };

  function redraw() {
    ctx.clearRect(0, 0, 320, 540);
    ctx.fillStyle = '#0a0a14';
    rr(8, 8, 304, 524, 28);
    ctx.strokeStyle = '#64c8ff73'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.fillStyle = '#fffa'; ctx.font = '13px sans-serif';
    ctx.fillText('🌈 CHROMA', 24, 38);
    ctx.textAlign = 'right'; ctx.fillText('100% ⚡', 296, 38); ctx.textAlign = 'left';

    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(70 + i * 26, 68, 7, 0, 6.28);
      ctx.fillStyle = (collectedMask & (1 << i)) ? shardColors[i] : '#222230';
      ctx.fill();
    }

    ctx.fillStyle = '#121222f0';
    rr(16, 92, 288, 412, 20);

    if (callState !== 'idle') {
      const end = callState === 'ending', live = callState === 'talking' || end, ring = callState === 'ringing', sc = end ? '#fd0' : (live ? '#2c7' : '#f7c');
      ctx.fillStyle = sc; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(end ? '💌 MAYA NOTE' : (live ? '🟢 CALL ACTIVE' : (ring ? '📞 DIALING...' : '📞 INCOMING')), 32, 122);

      ctx.beginPath(); ctx.arc(160, 178, 28, 0, 6.28);
      ctx.fillStyle = '#795290'; ctx.fill();
      ctx.strokeStyle = sc; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🌸', 160, 186);

      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Maya', 160, 228);

      ctx.fillStyle = end ? '#fd0' : (live ? '#2c7' : '#a0d8ef'); ctx.font = '12px sans-serif';
      ctx.fillText(end ? 'Mind Palace 🌈' : (live ? 'Connected 📶' : (ring ? 'Ringing... 📞' : 'Signal Active')), 160, 246);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1c1c34d9';
      rr(28, end ? 254 : 262, 264, end ? 172 : 154, 14);
      ctx.strokeStyle = '#64c8ff33'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = end ? '11px sans-serif' : '15px sans-serif';
      wrapText(sub || title, end ? 36 : 40, end ? 270 : 290, end ? 248 : 240, end ? 16 : 22);

      ctx.fillStyle = (talkStep === 2) ? '#f36' : (end ? '#fd0' : '#2c7');
      rr(36, 436, 248, 44, 22);

      ctx.fillStyle = '#0a0a14'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(act || '🌈 RESTORED', 160, 463);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#ff79c6'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('NARRATIVE DISPATCH', 36, 126);

      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
      let curY = wrapText(title, 36, 168, 248, 28);

      if (sub) {
        ctx.fillStyle = '#a0d8ef'; ctx.font = '16px sans-serif';
        curY = wrapText(sub, 36, curY + 12, 248, 24);
      }

      if (act) {
        ctx.fillStyle = '#ffea79'; ctx.font = 'bold 14px sans-serif';
        wrapText(act, 36, curY + 18, 248, 22);
      }
    }

    tex.version++;
    tex.needsUpdate = true;
  }

  redraw();

  let pulseHaptics = null;

  const hud = {
    phoneGroup,
    get callState() { return callState; },
    get isCalling() { return callState !== 'idle' && callState !== 'done'; },
    setHaptics: (fn) => { pulseHaptics = fn; },
    setShardCollected: (i) => {
      collectedMask |= (1 << i);
      if (pulseHaptics) pulseHaptics('right', 0.65, 140);
      redraw();
    },
    show: (t, s = '', a = '') => {
      title = t; sub = s; act = a;
      redraw();
      if (pulseHaptics) pulseHaptics('right', 0.45, 80);
    },
    showEndingNote: (msg) => {
      callState = 'ending';
      title = '🌸 Maya';
      sub = msg;
      act = '💖 PROMISE KEPT';
      redraw();
      if (pulseHaptics) pulseHaptics('both', 0.9, 300);
    },
    startCallTask: (shard, onComplete) => {
      callState = 'offer';
      onCallComplete = onComplete;
      hud.show('📞 SAVED VOICEMAIL', 'Maya • Audio Archive', 'Press [X] to Listen');
    },
    triggerCallAction: () => {
      const now = performance.now();
      if (now - lastAction < 320) return;
      lastAction = now;
      if (pulseHaptics) pulseHaptics('right', 0.6, 90);

      if (callState === 'offer') {
        callState = 'accepted';
        hud.show('📞 PLAYING VOICEMAIL', 'Listening to Maya...', 'Press [X] to Play');
      } else if (callState === 'accepted') {
        callState = 'ringing';
        callTimer = 0;
        audio.playRingtone();
        hud.show('BUFFERING AUDIO...', 'Connecting memory...', 'Press [X] to Hear');
      } else if (callState === 'ringing') {
        callState = 'talking';
        talkStep = 0;
        audio.playPeacefulChords();
        audio.playMumble(380);
        hud.show('📞 MAYA VOICEMAIL', dial[0], 'Press [X] to Continue');
      } else if (callState === 'talking') {
        talkStep++;
        if (talkStep < 3) {
          audio.playMumble(380 + talkStep * 20);
          hud.show('📞 MAYA VOICEMAIL', dial[talkStep], talkStep === 2 ? 'Press [X] to Shatter Guilt' : 'Press [X] to Continue');
        } else {
          callState = 'idle';
          if (pulseHaptics) pulseHaptics('both', 0.9, 250);
          audio.playPluck(880, 0.6, 0.3);
          if (onCallComplete) onCallComplete();
          hud.show('✨ GUILT SHATTERED!', 'Her voice breaks the silence.', 'Punch / Click crystal!');
        }
      }
    },
    resetCall: () => {
      if (callState !== 'idle') {
        callState = 'idle';
        redraw();
      }
    },
    update: (delta, cam, isVR, leftCtrl, rightCtrl) => {
      if (callState === 'ringing') {
        callTimer += delta;
        if (callTimer > 2.4) {
          callState = 'talking';
          talkStep = 0;
          audio.playPeacefulChords();
          audio.playMumble(380);
          hud.show('📞 MAYA ON CALL', dial[0], 'Press [X] to Continue');
        }
      }

      if (isVR) {
        const holder = leftCtrl || rightCtrl;
        if (holder) {
          if (phoneGroup.parent !== holder) holder.add(phoneGroup);
          phoneGroup.position.set(0.02, 0.04, -0.06);
          phoneGroup.rotation.set(-Math.PI / 4, 0, 0);
          phoneGroup.scale.setScalar(.85);
        }
      } else if (cam) {
        if (phoneGroup.parent !== cam) cam.add(phoneGroup);
        phoneGroup.position.set(0.14, -0.12, -0.32);
        phoneGroup.rotation.set(-0.35, -0.22, 0.05);
        phoneGroup.scale.setScalar(.85);
      }
    }
  };

  return hud;
}
