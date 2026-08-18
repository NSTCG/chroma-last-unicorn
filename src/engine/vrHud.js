export function createVRHUD(scene, camera) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 140;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.58), mat);
  mesh.renderOrder = 999;
  mesh.visible = false;
  scene.add(mesh);

  let curTitle = '', curSub = '', curAct = '', opacity = 0, targetOp = 0, timer = null;
  const camPos = new THREE.Vector3(), camDir = new THREE.Vector3();

  function draw() {
    ctx.clearRect(0, 0, 384, 140);
    if (opacity <= 0.01) {
      mesh.visible = false;
      texture.needsUpdate = true;
      return;
    }
    mesh.visible = true;
    ctx.globalAlpha = opacity * 0.9;
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(8, 8, 368, 124);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(curTitle, 192, 38);

    if (curSub) {
      ctx.fillStyle = '#a0d8ef';
      ctx.font = '13px sans-serif';
      ctx.fillText(curSub, 192, 70);
    }
    if (curAct) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(curAct, 192, 102);
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
      timer = setTimeout(() => { targetOp = 0; if (el) el.style.opacity = '0.35'; }, dur);
    },
    update: (delta) => {
      if (Math.abs(opacity - targetOp) > 0.01) {
        opacity += (targetOp - opacity) * delta * 5.0;
        draw();
      }
      if (mesh.visible) {
        camera.getWorldPosition(camPos);
        camera.getWorldDirection(camDir);
        mesh.position.copy(camPos).addScaledVector(camDir, 2.0);
        mesh.position.y -= 0.35;
        mesh.quaternion.copy(camera.quaternion);
      }
    }
  };
}
