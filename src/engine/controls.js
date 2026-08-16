// Desktop PC Controls (PointerLock + Drag Mouse Look + Keyboard Movement & Universal Click Interact)

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject) {
  const THREE = window.THREE;
  let isLocked = false;
  let isMouseDown = false;
  let prevMouseX = 0, prevMouseY = 0;
  const keys = {};
  const moveSpeed = 8.5;

  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);
  const crosshair = document.getElementById('crosshair');

  const onMouseMove = (movementX, movementY) => {
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= movementX * 0.0022;
    euler.x -= movementY * 0.0022;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
  };

  document.addEventListener('mousemove', (e) => {
    if (isLocked) {
      onMouseMove(e.movementX || 0, e.movementY || 0);
    } else if (isMouseDown) {
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      onMouseMove(dx, dy);
    }
  });

  const tryInteract = () => {
    raycaster.setFromCamera(screenCenter, camera);
    const targets = getInteractiveObjects();
    const hits = raycaster.intersectObjects(targets, true);
    let hitObj = null;
    if (hits.length > 0) {
      let hit = hits[0].object;
      while (hit && !hit.userData?.data && hit.parent) hit = hit.parent;
      if (hit?.userData?.data) hitObj = hit;
    }
    // Always dispatch onSelectObject so Act 0 slide triggers on any click
    onSelectObject(hitObj);
  };

  domElement.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    if (!isLocked && domElement.requestPointerLock) {
      try { domElement.requestPointerLock(); } catch (_) {}
    }
    tryInteract();
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === domElement;
  });

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      tryInteract();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  const moveDir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  return {
    isLocked: () => isLocked,
    update: (delta) => {
      raycaster.setFromCamera(screenCenter, camera);
      const targets = getInteractiveObjects();
      const hits = raycaster.intersectObjects(targets, true);

      if (crosshair) {
        if (hits.length > 0 && hits[0].distance < 30) crosshair.classList.add('active');
        else crosshair.classList.remove('active');
      }

      // Keyboard WASD Movement
      moveDir.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(camera.up, forward).negate().normalize();

      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        camera.position.addScaledVector(moveDir, moveSpeed * delta);
      }

      if (keys['Space']) camera.position.y += moveSpeed * 0.7 * delta;
      if (keys['ShiftLeft'] || keys['KeyC']) camera.position.y = Math.max(1.7, camera.position.y - moveSpeed * 0.7 * delta);

      // Play area boundary clamping
      const dx = camera.position.x;
      const dz = camera.position.z - (-12);
      const dist = Math.hypot(dx, dz);
      const MAX_R = 38.0;

      if (dist > MAX_R) {
        const angle = Math.atan2(dz, dx);
        camera.position.x = Math.cos(angle) * MAX_R;
        camera.position.z = -12 + Math.sin(angle) * MAX_R;
      }
      camera.position.y = Math.min(Math.max(1.5, camera.position.y), 45.0);
    }
  };
}
