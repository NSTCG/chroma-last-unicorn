import { getTerrainHeight } from '../models/world.js';
import { audio } from '../audio/synth.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && !h.userData?.data && h.parent && h.parent.type !== 'Scene') h = h.parent;
  return h?.userData ? h : null;
};

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject, getUnicornState, renderer, vrHud) {
  const THREE = window.THREE;
  let isLocked = false, isMouseDown = false, prevMouseX = 0, prevMouseY = 0, footTimer = 0, hoofTimer = 0;
  const keys = {}, euler = new THREE.Euler(0, 0, 0, 'YXZ'), raycaster = new THREE.Raycaster(), center = new THREE.Vector2(0, 0);
  const crosshair = document.getElementById('crosshair');

  const onMouseMove = (mx, my) => {
    if (renderer?.xr?.isPresenting) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= mx * 0.0022;
    euler.x = Math.max(-1.52, Math.min(1.52, euler.x - my * 0.0022));
    camera.quaternion.setFromEuler(euler);
  };

  document.addEventListener('mousemove', (e) => {
    if (renderer?.xr?.isPresenting) return;
    if (isLocked) onMouseMove(e.movementX || 0, e.movementY || 0);
    else if (isMouseDown) { onMouseMove(e.clientX - prevMouseX, e.clientY - prevMouseY); prevMouseX = e.clientX; prevMouseY = e.clientY; }
  });

  const tryInteract = () => {
    if (renderer?.xr?.isPresenting) return;
    raycaster.setFromCamera(center, camera);
    onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
  };

  domElement.addEventListener('mousedown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    isMouseDown = true; prevMouseX = e.clientX; prevMouseY = e.clientY;
    if (!isLocked && domElement.requestPointerLock) { try { domElement.requestPointerLock(); } catch (_) {} }
    tryInteract();
  });

  window.addEventListener('mouseup', () => { isMouseDown = false; });
  document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === domElement; });

  window.addEventListener('keydown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    keys[e.code] = true;
    if (e.code === 'KeyX') vrHud?.triggerCallAction?.();
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') tryInteract();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  const moveDir = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3();

  return {
    isLocked: () => isLocked,
    update: (delta) => {
      if (renderer?.xr?.isPresenting) return;
      raycaster.setFromCamera(center, camera);
      const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
      crosshair?.classList.toggle('active', hits.length > 0 && hits[0].distance < 30);

      moveDir.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

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
        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          camera.position.addScaledVector(moveDir, 8.5 * delta);
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
