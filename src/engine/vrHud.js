export function createVRHUD(scene, camera) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 540;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);

  const phoneGroup = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.38, 0.015), new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.3, metalness: 0.8 }));
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.175, 0.355), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  screenMesh.position.z = 0.0085;
  screenMesh.renderOrder = 999;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let cTitle = 'CHROMA GUIDE', cSub = 'Explore sanctuary...', cAct = '';
  let tTitle = '', tSub = '', tAct = '', typeTimer = 0, isTyping = false, collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

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
    ctx.fillText('NARRATIVE DISPATCH', 36, 136);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(tTitle, 36, 178);

    if (tSub) {
      ctx.fillStyle = '#a0d8ef';
      ctx.font = '16px sans-serif';
      ctx.fillText(tSub, 36, 226);
    }

    if (tAct) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(tAct, 36, 282);
    }

    tex.needsUpdate = true;
  }

  redraw();

  return {
    phoneGroup,
    setShardCollected: (i) => { collectedMask |= (1 << i); redraw(); },
    show: (title, sub = '', act = '') => {
      cTitle = title; cSub = sub; cAct = act;
      tTitle = ''; tSub = ''; tAct = '';
      typeTimer = 0; isTyping = true;
    },
    update: (delta, cam, isVR, rightCtrl) => {
      if (isTyping) {
        typeTimer += delta * 38;
        const total = Math.floor(typeTimer);
        const tLen = cTitle.length, sLen = cSub.length, aLen = cAct.length;
        tTitle = cTitle.slice(0, Math.min(tLen, total));
        tSub = total > tLen ? cSub.slice(0, Math.min(sLen, total - tLen)) : '';
        tAct = total > (tLen + sLen) ? cAct.slice(0, Math.min(aLen, total - tLen - sLen)) : '';
        if (total >= tLen + sLen + aLen + 5) isTyping = false;
        redraw();
      }

      if (isVR && rightCtrl) {
        if (phoneGroup.parent !== rightCtrl) rightCtrl.add(phoneGroup);
        phoneGroup.position.set(0, 0.035, -0.06);
        phoneGroup.rotation.set(-Math.PI / 3.8, 0, 0);
      } else if (cam) {
        if (phoneGroup.parent !== cam) cam.add(phoneGroup);
        phoneGroup.position.set(0.19, -0.16, -0.42);
        phoneGroup.rotation.set(-0.35, -0.22, 0.06);
      }
    }
  };
}




