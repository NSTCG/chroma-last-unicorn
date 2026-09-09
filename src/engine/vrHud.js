import { audio } from '../audio/synth.js';
import { T, Grp, Msh, BMat, PGeo } from './three.js';

export function createVRHUD(scene, camera) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 540;
  const ctx = canvas.getContext('2d');
  const tex = new T.CanvasTexture(canvas);

  const phoneGroup = Grp();
  const bodyMesh = Msh(new T.BoxGeometry(.125, .245, .008), BMat({ color: 0x151520 }));
  const screenMesh = Msh(PGeo(.118, .236), BMat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: 2 }));
  screenMesh.position.z = .0045;
  screenMesh.renderOrder = 999;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let title = 'CHROMA GUIDE', sub = 'Explore sanctuary...', act = 'Restore 7 Shards', collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

  let callState = 'idle', callTimer = 0, talkStep = 0, onCallComplete = null, lastAction = 0;
  const dialogueLines = [
    'Remember chasing rainbows?',
    'Warmth never left!',
    'Break that shell now!'
  ].map(s => `Maya: "${s}"`);

  const rr = (x, y, w, h, r = 20) => {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fill();
  };

  const wrapText = (text, x, y, maxW, lineH) => {
    if (!text) return y;
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const test = line + words[n] + ' ';
      if (ctx.measureText(test).width > maxW && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, y);
    return y + lineH;
  };

  function redraw() {
    ctx.clearRect(0, 0, 320, 540);
    ctx.fillStyle = '#0a0a14';
    rr(8, 8, 304, 524, 28);
    ctx.strokeStyle = '#64c8ff73'; ctx.lineWidth = 2.5; ctx.stroke();

    // Top status bar
    ctx.fillStyle = '#fffa'; ctx.font = '13px sans-serif';
    ctx.fillText('🌈 CHROMA', 24, 38);
    ctx.textAlign = 'right'; ctx.fillText('100% ⚡', 296, 38); ctx.textAlign = 'left';

    // Shard indicators
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(70 + i * 26, 68, 7, 0, 6.28);
      ctx.fillStyle = (collectedMask & (1 << i)) ? shardColors[i] : '#222230';
      ctx.fill();
    }

    // Main Card Body
    ctx.fillStyle = '#121222f0';
    rr(16, 92, 288, 412, 20);

    if (callState !== 'idle') {
      const isLive = callState === 'talking', isRinging = callState === 'ringing';
      ctx.fillStyle = isLive ? '#2ecc71' : '#ff79c6';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(isLive ? '🟢 CALL ACTIVE' : (isRinging ? '📞 DIALING...' : '📞 INCOMING'), 32, 122);

      // Avatar
      ctx.beginPath(); ctx.arc(160, 178, 28, 0, 6.28);
      ctx.fillStyle = '#795290'; ctx.fill();
      ctx.strokeStyle = isLive ? '#2ecc71' : '#ff79c6'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🌸', 160, 186);

      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Maya', 160, 228);

      ctx.fillStyle = isLive ? '#2ecc71' : '#a0d8ef'; ctx.font = '12px sans-serif';
      ctx.fillText(isLive ? 'Connected 📶' : (isRinging ? 'Ringing... 📞' : 'Signal Active'), 160, 246);

      // Bubble
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1c1c34d9';
      rr(28, 262, 264, 154, 14);
      ctx.strokeStyle = '#64c8ff33'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
      wrapText(sub || title, 40, 290, 240, 22);

      // Button
      ctx.fillStyle = (callState === 'talking' && talkStep === 2) ? '#ff3366' : (callState === 'done' ? '#ffd700' : '#2ecc71');
      rr(36, 436, 248, 44, 22);

      ctx.fillStyle = '#0a0a14'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(act || '▶ CONTINUE', 160, 463);
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

    // Force Three.js GPU texture upload
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
    startCallTask: (shard, onComplete) => {
      callState = 'offer';
      onCallComplete = onComplete;
      hud.show('📞 MISSION: WARMTH', 'Maya is waiting...', 'Press [X] to Accept');
    },
    triggerCallAction: () => {
      const now = performance.now();
      if (now - lastAction < 320) return;
      lastAction = now;
      if (pulseHaptics) pulseHaptics('right', 0.6, 90);

      if (callState === 'offer') {
        callState = 'accepted';
        hud.show('📞 READY TO CALL', 'Reconnect with Maya...', 'Press [X] to Dial');
      } else if (callState === 'accepted') {
        callState = 'ringing';
        callTimer = 0;
        audio.playRingtone();
        hud.show('DIALING MAYA...', 'Ring... Ring... 📞', 'Press [X] to Answer');
      } else if (callState === 'ringing') {
        callState = 'talking';
        talkStep = 0;
        audio.playPeacefulChords();
        audio.playMumble(380);
        hud.show('📞 MAYA ON CALL', dialogueLines[0], 'Press [X] to Continue');
      } else if (callState === 'talking') {
        talkStep++;
        if (talkStep < 3) {
          audio.playMumble(380 + talkStep * 20);
          hud.show('📞 MAYA ON CALL', dialogueLines[talkStep], talkStep === 2 ? 'Press [X] to Shatter Shell' : 'Press [X] to Continue');
        } else {
          callState = 'idle';
          if (pulseHaptics) pulseHaptics('both', 0.9, 250);
          audio.playPluck(880, 0.6, 0.3);
          if (onCallComplete) onCallComplete();
          hud.show('✨ SHELL SHATTERED!', 'Warmth reconnected.', 'Punch / Click to collect!');
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
          hud.show('📞 MAYA ON CALL', dialogueLines[0], 'Press [X] to Continue');
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
