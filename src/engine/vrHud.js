export function createVRHUD(scene) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0
  });

  const geo = new THREE.PlaneGeometry(1.4, 0.54);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  mesh.visible = false;
  if (scene) scene.add(mesh);

  let timer = null, targetOpacity = 0;
  const tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion(), forward = new THREE.Vector3(), targetPos = new THREE.Vector3();

  function redraw(title, sub, act) {
    ctx.clearRect(0, 0, 512, 200);

    // Glassmorphic translucent container
    ctx.fillStyle = 'rgba(10, 10, 22, 0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, 8, 496, 184, 26);
    else ctx.rect(8, 8, 496, 184);
    ctx.fill();

    ctx.strokeStyle = 'rgba(120, 210, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(title, 256, sub || act ? 46 : 100);

    if (sub) {
      ctx.fillStyle = '#9fe8ff';
      ctx.font = '18px sans-serif';
      ctx.fillText(sub, 256, act ? 96 : 120);
    }

    if (act) {
      ctx.fillStyle = '#ffea79';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(act, 256, 148);
    }

    tex.needsUpdate = true;
  }

  return {
    mesh,
    show: (title, sub = '', act = '', dur = 6000) => {
      redraw(title, sub, act);
      targetOpacity = 1.0;
      mesh.visible = true;

      const el = document.getElementById('subtitle-text');
      if (el) {
        el.innerHTML = `<strong>${title}</strong><br>${sub ? `<span style="color:#a0d8ef">${sub}</span><br>` : ''}${act ? `<span style="color:#ffea79;font-weight:600">${act}</span>` : ''}`;
        el.style.opacity = '1';
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        targetOpacity = 0.0;
        if (el) el.style.opacity = '0.35';
      }, dur);
    },
    update: (delta, camera) => {
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(1.0, delta * 3.5);
      mesh.visible = mat.opacity > 0.01;
      if (!mesh.visible || !camera) return;

      camera.getWorldPosition(tmpPos);
      camera.getWorldQuaternion(tmpQuat);

      forward.set(0, 0, -1).applyQuaternion(tmpQuat);
      targetPos.copy(tmpPos).addScaledVector(forward, 1.65);
      targetPos.y -= 0.42;

      mesh.position.lerp(targetPos, Math.min(1.0, delta * 5.0));
      mesh.lookAt(tmpPos.x, tmpPos.y + 0.08, tmpPos.z);
    }
  };
}

