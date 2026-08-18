import { audio } from '../audio/synth.js';

export function createVRHUD(scene, camera) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 540;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);

  const phoneGroup = new THREE.Group();

  // Rounded smartphone chassis
  const shape = new THREE.Shape();
  const w = 0.13, h = 0.25, r = 0.018, x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.002, bevelThickness: 0.002 });
  bodyGeo.center();

  const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.88, metalness: 0.12 }));
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.238), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 0.55, transparent: true, depthTest: false, depthWrite: false }));
  screenMesh.position.z = 0.0065;
  screenMesh.renderOrder = 999;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let cTitle = 'CHROMA GUIDE', cSub = 'Explore sanctuary...', cAct = '';
  let tTitle = '', tSub = '', tAct = '', typeTimer = 0, isTyping = false, collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

  // Calling task flow
  let callState = 'idle', callTimer = 0, callLineIndex = 0, onCallComplete = null;
  const dialogueLines = [
    'Maya: "Hey! Is that you? I haven\'t heard your voice in so long!"',
    'Maya: "Remember when we promised to always chase the light together?"',
    'Maya: "Thank you for calling. Warmth never really left. Go break the shell!"'
  ];

  function redraw() {
    ctx.clearRect(0, 0, 320, 540);
    ctx.fillStyle = '#0a0a14';
    if (ctx.roundRect) ctx.roundRect(8, 8, 304, 524, 28); else ctx.rect(8, 8, 304, 524);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100,200,255,0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px sans-serif';
    ctx.fillText('🌈 CHROMA', 24, 38);
    ctx.textAlign = 'right';
    ctx.fillText('100% ⚡', 296, 38);
    ctx.textAlign = 'left';

    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(70 + i * 26, 70, 7, 0, 6.28);
      ctx.fillStyle = (collectedMask & (1 << i)) ? shardColors[i] : '#222230';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(20,20,36,0.92)';
    if (ctx.roundRect) ctx.roundRect(18, 100, 284, 400, 20); else ctx.rect(18, 100, 284, 400);
    ctx.fill();

    ctx.fillStyle = '#ff79c6';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(callState === 'talking' || callState === 'ringing' ? 'PHONE CALL' : 'NARRATIVE DISPATCH', 36, 136);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(tTitle, 36, 176);

    if (tSub) {
      ctx.fillStyle = '#a0d8ef';
      ctx.font = '15px sans-serif';
      ctx.fillText(tSub, 36, 226);
    }

    if (tAct) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(tAct, 36, 282);
    }

    tex.needsUpdate = true;
  }

  redraw();

  const hud = {
    phoneGroup,
    setShardCollected: (i) => { collectedMask |= (1 << i); redraw(); },
    show: (title, sub = '', act = '') => {
      cTitle = title; cSub = sub; cAct = act;
      tTitle = ''; tSub = ''; tAct = '';
      typeTimer = 0; isTyping = true;
    },
    startCallTask: (shard, onComplete) => {
      callState = 'ready';
      onCallComplete = onComplete;
      hud.show('📞 CALL A FRIEND', 'Press [X] to call Maya...', 'Warmth reconnects...');
    },
    triggerCallAction: () => {
      if (callState === 'ready') {
        callState = 'ringing';
        callTimer = 0;
        audio.playRingtone();
        hud.show('DIALING MAYA...', 'Ring... Ring... 📞', 'Connecting...');
      }
    },
    update: (delta, cam, isVR, rightCtrl) => {
      if (isTyping) {
        typeTimer += delta * 36;
        const total = Math.floor(typeTimer);
        const tLen = cTitle.length, sLen = cSub.length, aLen = cAct.length;
        tTitle = cTitle.slice(0, Math.min(tLen, total));
        tSub = total > tLen ? cSub.slice(0, Math.min(sLen, total - tLen)) : '';
        tAct = total > (tLen + sLen) ? cAct.slice(0, Math.min(aLen, total - tLen - sLen)) : '';
        if (total >= tLen + sLen + aLen + 5) isTyping = false;
        redraw();
      }

      if (callState === 'ringing') {
        callTimer += delta;
        if (callTimer > 2.6) {
          callState = 'talking';
          callTimer = 0;
          callLineIndex = 0;
          audio.playPeacefulChords();
          audio.playMumble(380);
          hud.show('📞 CALL CONNECTED', dialogueLines[0], 'Listening to Maya...');
        }
      } else if (callState === 'talking') {
        callTimer += delta;
        if (isTyping && Math.random() < 0.18) audio.playMumble(360 + callLineIndex * 25);
        if (callTimer > 4.2) {
          callTimer = 0;
          callLineIndex++;
          if (callLineIndex < dialogueLines.length) {
            audio.playMumble(390 + callLineIndex * 30);
            hud.show('📞 CALL CONNECTED', dialogueLines[callLineIndex], 'Listening to Maya...');
          } else {
            callState = 'done';
            audio.playPluck(880, 0.6, 0.3);
            if (onCallComplete) onCallComplete();
            hud.show('✨ SHELL SHATTERED!', 'Warmth reconnected.', 'Punch / Click to collect!');
          }
        }
      }

      if (isVR && rightCtrl) {
        if (phoneGroup.parent !== rightCtrl) rightCtrl.add(phoneGroup);
        phoneGroup.position.set(0, 0.032, -0.05);
        phoneGroup.rotation.set(-Math.PI / 4, 0, 0);
        phoneGroup.scale.set(0.82, 0.82, 0.82);
      } else if (cam) {
        if (phoneGroup.parent !== cam) cam.add(phoneGroup);
        phoneGroup.position.set(0.18, -0.14, -0.38);
        phoneGroup.rotation.set(-0.35, -0.22, 0.06);
        phoneGroup.scale.set(0.82, 0.82, 0.82);
      }
    }
  };

  return hud;
}





