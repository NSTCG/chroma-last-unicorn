import { getTerrainHeight } from '../models/world.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && !h.userData?.data && h.parent) h = h.parent;
  return h?.userData?.data ? h : null;
};

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject, getUnicornState, renderer, vrHud) {
  const THREE = window.THREE;
  let isLocked = false, isMouseDown = false, prevMouseX = 0, prevMouseY = 0;
  const keys = {}, moveSpeed = 8.5;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);
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
    else if (isMouseDown) {
      onMouseMove(e.clientX - prevMouseX, e.clientY - prevMouseY);
      prevMouseX = e.clientX; prevMouseY = e.clientY;
    }
  });

  const tryInteract = () => {
    if (renderer?.xr?.isPresenting) return;
    raycaster.setFromCamera(screenCenter, camera);
    onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
  };

  domElement.addEventListener('mousedown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    isMouseDown = true;
    prevMouseX = e.clientX; prevMouseY = e.clientY;
    if (!isLocked && domElement.requestPointerLock) {
      try { domElement.requestPointerLock(); } catch (_) {}
    }
    tryInteract();
  });

  window.addEventListener('mouseup', () => { isMouseDown = false; });
  document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === domElement; });

  window.addEventListener('keydown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    keys[e.code] = true;
    if (e.code === 'KeyX' && vrHud?.triggerCallAction) vrHud.triggerCallAction();
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') tryInteract();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  const moveDir = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3();

  return {
    isLocked: () => isLocked,
    update: (delta) => {
      if (renderer?.xr?.isPresenting) return;
      raycaster.setFromCamera(screenCenter, camera);
      const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
      if (crosshair) crosshair.classList.toggle('active', hits.length > 0 && hits[0].distance < 30);

      moveDir.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

      const isMounted = getUnicornState ? getUnicornState().isMounted : false;
      const unicorn = getUnicornState ? getUnicornState().unicorn : null;

      if (isMounted && unicorn) {
        const isMoving = moveDir.lengthSq() > 0.001;
        if (isMoving) moveDir.normalize();
        unicorn.move(moveDir, delta);
        unicorn.update(delta, isMoving ? 'gallop' : 'idle');
        const uPos = unicorn.group.position;
        camera.position.set(uPos.x, uPos.y + 2.05, uPos.z - 0.2);
      } else {
        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          camera.position.addScaledVector(moveDir, moveSpeed * delta);
        }
        if (keys['Space']) camera.position.y += moveSpeed * 0.7 * delta;
        if (keys['ShiftLeft'] || keys['KeyC']) camera.position.y = Math.max(1.7, camera.position.y - moveSpeed * 0.7 * delta);

        const groundY = getTerrainHeight(camera.position.x, camera.position.z);
        if (camera.position.y < groundY + 1.7) camera.position.y = groundY + 1.7;

        const dist = Math.hypot(camera.position.x, camera.position.z + 12);
        if (dist > 92.0) {
          const a = Math.atan2(camera.position.z + 12, camera.position.x);
          camera.position.x = Math.cos(a) * 92.0;
          camera.position.z = -12 + Math.sin(a) * 92.0;
        }
        camera.position.y = Math.min(Math.max(1.5, camera.position.y), 55.0);
      }
    }
  };
}
