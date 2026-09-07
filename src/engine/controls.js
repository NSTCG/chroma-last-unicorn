import { getTerrainHeight } from '../models/world.js';
import { audio } from '../audio/synth.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && !h.userData?.data && h.parent && h.parent.type !== 'Scene') h = h.parent;
  return h?.userData ? h : null;
};

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject, getUnicornState, renderer, vrHud) {
  const THREE = window.THREE;
  let footTimer = 0, hoofTimer = 0, lookId = null, moveId = null, lx = 0, ly = 0, ox = 0, oy = 0, dragDist = 0;
  const joy = [0, 0], keys = {}, euler = new THREE.Euler(0, 0, 0, 'YXZ'), raycaster = new THREE.Raycaster(), center = new THREE.Vector2(0, 0);
  const crosshair = document.getElementById('crosshair');

  const tryInteract = () => {
    if (renderer?.xr?.isPresenting) return;
    raycaster.setFromCamera(center, camera);
    onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
  };

  window.addEventListener('pointerdown', (e) => {
    if (renderer?.xr?.isPresenting || e.target?.closest?.('#overlay,#top-left-bar')) return;
    if (e.clientX < window.innerWidth * 0.5) {
      if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
    } else if (moveId === null) {
      moveId = e.pointerId; ox = e.clientX; oy = e.clientY;
    }
    dragDist = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (renderer?.xr?.isPresenting) return;
    if (e.pointerId === lookId) {
      dragDist += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= (e.clientX - lx) * 0.0028;
      euler.x = Math.max(-1.52, Math.min(1.52, euler.x - (e.clientY - ly) * 0.0028));
      camera.quaternion.setFromEuler(euler);
      lx = e.clientX; ly = e.clientY;
    } else if (e.pointerId === moveId) {
      const dx = e.clientX - ox, dy = e.clientY - oy;
      dragDist += Math.abs(dx) + Math.abs(dy);
      const d = Math.hypot(dx, dy) || 1, r = Math.min(50, d);
      joy[0] = (dx / d) * (r / 50);
      joy[1] = -(dy / d) * (r / 50);
    }
  });

  const onUp = (e) => {
    if (e.pointerId === lookId) lookId = null;
    if (e.pointerId === moveId) { moveId = null; joy[0] = joy[1] = 0; }
    if (dragDist < 8) tryInteract();
  };
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  window.addEventListener('keydown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    keys[e.code] = true;
    if (e.code === 'KeyX') vrHud?.triggerCallAction?.();
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') tryInteract();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  const moveDir = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3();

  return {
    update: (delta) => {
      if (renderer?.xr?.isPresenting) return;
      raycaster.setFromCamera(center, camera);
      const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
      crosshair?.classList.toggle('active', hits.length > 0 && hits[0].distance < 30);

      moveDir.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      const kx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
      const kz = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const mx = Math.max(-1, Math.min(1, joy[0] + kx));
      const mz = Math.max(-1, Math.min(1, joy[1] + kz));

      if (Math.abs(mz) > 0.04) moveDir.addScaledVector(forward, mz);
      if (Math.abs(mx) > 0.04) moveDir.addScaledVector(right, mx);

      const { isMounted, unicorn } = getUnicornState?.() || {};

      if (isMounted && unicorn) {
        const isMoving = moveDir.lengthSq() > 0.001;
        if (isMoving) {
          moveDir.normalize();
          hoofTimer += delta;
          if (hoofTimer > 0.28) { hoofTimer = 0; audio.playHoofbeat(); }
          const diff = Math.atan2(-moveDir.x, -moveDir.z) - euler.y;
          euler.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1.0, delta * 3.5);
          camera.quaternion.setFromEuler(euler);
        }
        unicorn.move(moveDir, delta);
        unicorn.update(delta, isMoving ? 'gallop' : 'idle');
        camera.position.set(unicorn.group.position.x, unicorn.group.position.y + 1.85, unicorn.group.position.z);
      } else {
        const moveLen = Math.min(1, moveDir.length());
        if (moveLen > 0.04) {
          moveDir.normalize();
          camera.position.addScaledVector(moveDir, 8.5 * moveLen * delta);
          footTimer += delta;
          if (footTimer > 0.44) { footTimer = 0; audio.playFootstep(); }
        }
        if (keys['Space']) camera.position.y += 6.0 * delta;
        const groundY = getTerrainHeight(camera.position.x, camera.position.z) + 1.65;
        if (camera.position.y < groundY) camera.position.y = groundY;
      }
    }
  };
}
