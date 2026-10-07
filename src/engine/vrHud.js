import { audio } from '../audio/synth.js';
import { T, Grp, Msh, BMat, PGeo } from './three.js';

export function createVRHUD(scene, camera) {
  const canvas = document.createElement('canvas');
  canvas.width = 960; canvas.height = 1620;
  const ctx = canvas.getContext('2d');
  const tex = new T.CanvasTexture(canvas);
  tex.minFilter = tex.magFilter = T.LinearFilter;
  tex.generateMipmaps = false;

  const phoneGroup = Grp();
  const bodyMesh = Msh(PGeo(.125, .245), BMat({ color: 0x151520, depthTest: false, depthWrite: false }));
  const screenMesh = Msh(PGeo(.118, .236), BMat({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  screenMesh.position.z = .005;
  screenMesh.renderOrder = 10001;
  bodyMesh.renderOrder = 10000;
  bodyMesh.userData.isPhone = screenMesh.userData.isPhone = true;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let title = 'CHROMA', sub = '', act = '', collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

  let callState = 'idle', callTimer = 0, talkStep = 0, onCallComplete = null, lastAction = 0;
  const dial = [
    'Still stuck at work? Remember: no IT talk once we hit the highway! I bought peach gummies.',
    'I packed my vintage 35mm camera for the cliff overlook. The sunset will be pure gold.',
    'I love you so much. Do not drive too fast tonight. See you at home, my love.'
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
        if (ctx.measureText(test).width > maxW && line.length) {
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

  const f0 = 'bold 11px system-ui, -apple-system, sans-serif';
  const f1 = 'bold 13px system-ui, -apple-system, sans-serif';
  const f2 = 'bold 19px system-ui, -apple-system, sans-serif';

  function redraw() {
    ctx.setTransform(3, 0, 0, 3, 0, 0);
    ctx.clearRect(0, 0, 320, 540);
    ctx.fillStyle = '#0a0a14';
    rr(8, 8, 304, 524, 28);
    ctx.strokeStyle = '#64c8ff88'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.fillStyle = '#fffc'; ctx.font = f0;
    ctx.fillText('🌈 CHROMA', 24, 38);
    ctx.textAlign = 'right'; ctx.fillText('100% ⚡', 296, 38); ctx.textAlign = 'left';

    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(70 + i * 26, 68, 7, 0, 6.28);
      ctx.fillStyle = (collectedMask & (1 << i)) ? shardColors[i] : '#222230';
      ctx.fill();
    }

    ctx.fillStyle = '#121222f5';
    rr(16, 92, 288, 414, 20);

    if (callState === 'credits') {
      ctx.fillStyle = '#06060f';
      rr(6, 6, 308, 528, 26);
      ctx.strokeStyle = '#ffd700aa'; ctx.lineWidth = 2.5; ctx.stroke();

      ctx.fillStyle = '#ffd700'; ctx.font = f0; ctx.textAlign = 'center';
      ctx.fillText('✨ JOURNEY COMPLETED ✨', 160, 40);

      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('CHROMA', 160, 74);
      ctx.fillStyle = '#a0d8ef'; ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('THE LAST UNICORN', 160, 94);

      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.arc(88 + i * 24, 118, 6, 0, 6.28);
        ctx.fillStyle = shardColors[i]; ctx.fill();
      }

      ctx.fillStyle = '#141428ee';
      rr(22, 140, 276, 114, 14);
      ctx.strokeStyle = '#ff79c666'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
      wrapText('“Chase fireflies. Find me in the rainbow.\nLive with color again, my love... 🌸🌈”', 160, 174, 256, 20);

      ctx.strokeStyle = '#ffffff25'; ctx.beginPath(); ctx.moveTo(40, 270); ctx.lineTo(280, 270); ctx.stroke();

      ctx.fillStyle = '#ffffff88'; ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('CREATED & DEVELOPED BY', 160, 296);

      ctx.fillStyle = '#50fa7b'; ctx.font = 'bold 25px system-ui, -apple-system, sans-serif';
      ctx.fillText('NSTCG STUDIOS', 160, 330);

      ctx.fillStyle = '#ffffffbb'; ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('A WebXR & Atmospheric Dream Experience', 160, 354);
      ctx.fillStyle = '#ffffff55'; ctx.font = '9px system-ui, -apple-system, sans-serif';
      ctx.fillText('© 2026 NSTCG STUDIOS • ALL RIGHTS RESERVED', 160, 374);

      ctx.fillStyle = '#ffd70025';
      rr(32, 410, 256, 54, 27);
      ctx.strokeStyle = '#ffd700ee'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText('🌸 PLAY AGAIN', 160, 442);

      ctx.fillStyle = '#ffffffaa'; ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('[Trigger / Click to Play Again]', 160, 488);
      ctx.textAlign = 'left';

      tex.needsUpdate = true;
      return;
    }

    if (callState !== 'idle') {
      const end = callState === 'ending', live = callState === 'talking' || end, ring = callState === 'ringing', sc = end ? '#fd0' : (live ? '#2c7' : '#f7c');
      ctx.fillStyle = sc; ctx.font = f0;
      ctx.fillText(end ? '💌 MAYA NOTE' : (live ? '🟢 CALL ACTIVE' : (ring ? '📞 DIALING...' : '📞 INCOMING')), 32, 122);

      ctx.beginPath(); ctx.arc(160, 172, 26, 0, 6.28);
      ctx.fillStyle = '#795290'; ctx.fill();
      ctx.strokeStyle = sc; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = f2; ctx.textAlign = 'center';
      ctx.fillText('🌸', 160, 179);

      ctx.fillStyle = '#fff'; ctx.font = f2;
      ctx.fillText('Maya', 160, 216);

      ctx.fillStyle = end ? '#fd0' : (live ? '#2c7' : '#a0d8ef'); ctx.font = f1;
      ctx.fillText(end ? 'Mind Palace 🌈' : (live ? 'Connected 📶' : (ring ? 'Ringing... 📞' : 'Signal Active')), 160, 234);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1c1c34ee';
      rr(28, end ? 250 : 256, 264, end ? 172 : 156, 14);
      ctx.strokeStyle = '#64c8ff44'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = f1;
      wrapText(sub || title, 38, end ? 276 : 284, 244, end ? 18 : 22);

      ctx.fillStyle = (talkStep === 2) ? '#f36' : (end ? '#fd0' : '#2c7');
      rr(36, 434, 248, 44, 22);

      ctx.fillStyle = '#0a0a14'; ctx.font = f1; ctx.textAlign = 'center';
      ctx.fillText(act || '🌈 RESTORED', 160, 461);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#ff79c6'; ctx.font = f0;
      ctx.fillText('NARRATIVE DISPATCH', 34, 124);

      ctx.fillStyle = '#fff'; ctx.font = f2;
      let curY = wrapText(title, 34, 162, 252, 26);

      if (sub) {
        ctx.fillStyle = '#a0d8ef'; ctx.font = f1;
        curY = wrapText(sub, 34, curY + 14, 252, 22);
      }

      if (act) {
        ctx.fillStyle = '#ffea79'; ctx.font = f1;
        rr(30, Math.min(curY + 12, 420), 260, 40, 16);
        ctx.fillStyle = '#0a0a14'; ctx.textAlign = 'center';
        ctx.fillText(act, 160, Math.min(curY + 37, 445));
        ctx.textAlign = 'left';
      }
    }

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
    showCredits: () => {
      callState = 'credits';
      redraw();
      if (pulseHaptics) pulseHaptics('both', 0.9, 350);
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

      if (callState === 'credits') {
        window.location.reload();
        return;
      }

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
        audio.playVoice('shard2_yellow_1');
        hud.show('📞 MAYA VOICEMAIL', dial[0], 'Press [X] to Continue');
      } else if (callState === 'talking') {
        talkStep++;
        if (talkStep < 3) {
          audio.playVoice(talkStep === 1 ? 'shard2_yellow_2' : 'shard2_yellow_3');
          hud.show('📞 MAYA VOICEMAIL', dial[talkStep], talkStep === 2 ? 'Press [X] to Shatter Guilt' : 'Press [X] to Continue');
        } else {
          callState = 'idle';
          audio.stopVoice?.();
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
        audio.stopVoice?.();
        redraw();
      }
    },
    update: (delta, cam, isVR, leftCtrl, rightCtrl) => {
      if (callState === 'credits') {
        if (cam && phoneGroup.parent !== cam) cam.add(phoneGroup);
        phoneGroup.position.set(0, 0, -0.42);
        phoneGroup.rotation.set(0, 0, 0);
        phoneGroup.scale.setScalar(1.6);
        return;
      }

      if (callState === 'ringing') {
        callTimer += delta;
        if (callTimer > 2.4) {
          callState = 'talking';
          talkStep = 0;
          audio.playPeacefulChords();
          audio.playVoice('shard2_yellow_1');
          hud.show('📞 MAYA ON CALL', dial[0], 'Press [X] to Continue');
        }
      }

      if (isVR) {
        const holder = leftCtrl || rightCtrl;
        if (holder) {
          if (phoneGroup.parent !== holder) holder.add(phoneGroup);
          phoneGroup.position.set(0.02, 0.04, -0.06);
          phoneGroup.rotation.set(-Math.PI / 4, 0, 0);
          phoneGroup.scale.setScalar(1);
        }
      } else if (cam) {
        if (phoneGroup.parent !== cam) cam.add(phoneGroup);
        if (typeof window !== 'undefined' && window.innerWidth < window.innerHeight) {
          phoneGroup.position.set(0.02, -0.13, -0.32);
          phoneGroup.rotation.set(-0.28, -0.06, 0.02);
          phoneGroup.scale.setScalar(0.92);
        } else {
          phoneGroup.position.set(0.14, -0.12, -0.32);
          phoneGroup.rotation.set(-0.35, -0.22, 0.05);
          phoneGroup.scale.setScalar(1);
        }
      }
    }
  };

  return hud;
}
