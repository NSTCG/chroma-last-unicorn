// In-World 3D VR & PC Text Billboard System

export function createVRHUD(scene, camera) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 180;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.7), mat);
  mesh.renderOrder = 999;
  mesh.position.set(0, 0, -2.0);
  camera.add(mesh);

  let curTitle = '', curSub = '', curAct = '', opacity = 0.0, targetOp = 0.0, timer = null;

  function draw() {
    ctx.clearRect(0, 0, 512, 180);
    if (opacity <= 0.01) { texture.needsUpdate = true; return; }

    ctx.globalAlpha = opacity * 0.9;
    ctx.fillStyle = '#0a0d18';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 160, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(curTitle, 256, 45);

    if (curSub) {
      ctx.fillStyle = '#a0d8ef';
      ctx.font = '15px system-ui';
      ctx.fillText(curSub, 256, 82);
    }
    if (curAct) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'italic bold 14px system-ui';
      ctx.fillText(curAct, 256, 120);
    }
    texture.needsUpdate = true;
  }

  return {
    mesh,
    show: (title, sub = '', act = '', dur = 6000) => {
      curTitle = title; curSub = sub; curAct = act; targetOp = 1.0;
      const el = document.getElementById('subtitle-text');
      if (el) {
        el.innerHTML = `<strong>${title}</strong><br>${sub ? `<span style="color:#a0d8ef">${sub}</span><br>` : ''}${act ? `<span style="color:#ffea79;font-weight:600">${act}</span>` : ''}`;
        el.style.opacity = '1';
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { targetOp = 0.0; if (el) el.style.opacity = '0.35'; }, dur);
    },
    update: (delta) => {
      if (Math.abs(opacity - targetOp) > 0.01) {
        opacity += (targetOp - opacity) * delta * 5.0;
        draw();
      }
    }
  };
}
