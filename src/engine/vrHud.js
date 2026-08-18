export function createVRHUD(scene, camera) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 540;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.3, metalness: 0.8 });

  const phoneGroup = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.38, 0.015), bodyMat);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.175, 0.355), screenMat);
  screenMesh.position.z = 0.0085;
  screenMesh.renderOrder = 999;
  phoneGroup.add(bodyMesh, screenMesh);

  if (camera) camera.add(phoneGroup);
  else if (scene) scene.add(phoneGroup);

  let currentTitle = 'CHROMA GUIDE', currentSub = 'Explore sanctuary...', currentAct = '';
  let typedTitle = '', typedSub = '', typedAct = '';
  let typeTimer = 0, isTyping = false, collectedMask = 0;
  const shardColors = ['#f24', '#f70', '#fc0', '#1c4', '#0af', '#53e', '#c2e'];

  function redraw() {
    ctx.clearRect(0, 0, 320, 540);

    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, 8, 304, 524, 28); else ctx.rect(8, 8, 304, 524);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌈 CHROMA', 24, 38);

    ctx.textAlign = 'right';
    ctx.fillText('100% ⚡', 296, 38);

    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(70 + i * 26, 70, 7, 0, 6.28);
      ctx.fillStyle = (collectedMask & (1 << i)) ? shardColors[i] : '#222230';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(20, 20, 36, 0.92)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(18, 100, 284, 400, 20); else ctx.rect(18, 100, 284, 400);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ff79c6';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NARRATIVE DISPATCH', 36, 136);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(typedTitle, 36, 178);

    if (typedSub) {
      ctx.fillStyle = '#a0d8ef';
      ctx.font = '16px sans-serif';
      ctx.fillText(typedSub, 36, 226);
    }

    if (typedAct) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(typedAct, 36, 282);
    }

    if (isTyping || Math.sin(performance.now() * 0.006) > 0) {
      ctx.fillStyle = '#00f0ff';
      const cx = typedAct ? 36 + ctx.measureText(typedAct).width + 4 : 36 + ctx.measureText(typedTitle).width + 4;
      const cy = typedAct ? 282 : 178;
      ctx.fillRect(cx, cy - 14, 2, 16);
    }

    tex.needsUpdate = true;
  }

  redraw();

  return {
    phoneGroup,
    setShardCollected: (index) => {
      collectedMask |= (1 << index);
      redraw();
    },
    show: (title, sub = '', act = '') => {
      currentTitle = title; currentSub = sub; currentAct = act;
      typedTitle = ''; typedSub = ''; typedAct = '';
      typeTimer = 0; isTyping = true;
    },
    update: (delta, cam, isVR, rightCtrl) => {
      if (isTyping) {
        typeTimer += delta * 38;
        const total = Math.floor(typeTimer);
        const tLen = currentTitle.length, sLen = currentSub.length, aLen = currentAct.length;
        typedTitle = currentTitle.slice(0, Math.min(tLen, total));
        typedSub = total > tLen ? currentSub.slice(0, Math.min(sLen, total - tLen)) : '';
        typedAct = total > (tLen + sLen) ? currentAct.slice(0, Math.min(aLen, total - tLen - sLen)) : '';
        if (total >= tLen + sLen + aLen + 5) isTyping = false;
        redraw();
      }

      if (isVR && rightCtrl) {
        if (phoneGroup.parent !== rightCtrl) rightCtrl.add(phoneGroup);
        phoneGroup.position.set(0, 0.035, -0.06);
        phoneGroup.rotation.set(-Math.PI / 3.8, 0, 0);
        phoneGroup.scale.set(1.0, 1.0, 1.0);
      } else if (cam) {
        if (phoneGroup.parent !== cam) cam.add(phoneGroup);
        phoneGroup.position.set(0.19, -0.16, -0.42);
        phoneGroup.rotation.set(-0.35, -0.22, 0.06);
        phoneGroup.scale.set(0.9, 0.9, 0.9);
      }
    }
  };
}



