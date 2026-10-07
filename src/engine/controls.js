import { T, V3 } from './three.js';
import { updateWalking, updateRiding } from './movement.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  const isTarget = (o) => o?.userData?.index != null || o?.userData?.isTaskNode || o?.userData?.isUnicorn || o?.userData?.isPhone;
  while (h && !isTarget(h) && h.parent) h = h.parent;
  return isTarget(h) ? h : null;
};

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject, getUState, renderer) {
  const keys = {};
  const timers = { foot: 0, hoof: 0 };
  const raycaster = new T.Raycaster();
  const mouse = new T.Vector2();
  const euler = new T.Euler(0, 0, 0, 'YXZ');
  const forwardVec = V3(0, 0, 0);
  const rightVec = V3(0, 0, 0);
  const moveDir = V3(0, 0, 0);

  // Mouse drag state
  let isPointerDown = false;
  let downX = 0, downY = 0, lastX = 0, lastY = 0, totalDist = 0, downTime = 0;

  // Touch dual-zone state
  let moveTouchId = null, joyStartX = 0, joyStartY = 0, joyDirX = 0, joyDirY = 0;
  let lookTouchId = null, lastLookX = 0, lastLookY = 0;
  const touchStarts = new Map();

  const doRaycast = (clientX, clientY) => {
    mouse.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hit = getHit(raycaster.intersectObjects(getInteractiveObjects(), true));
    onSelectObject(hit, false);
  };

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyX' || e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
      onSelectObject(null, true);
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Mouse controls
  if (domElement) {
    domElement.addEventListener('pointerdown', (e) => {
      if (renderer?.xr?.isPresenting || e.pointerType === 'touch') return;
      isPointerDown = true;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      totalDist = 0;
      downTime = performance.now();
    });

    window.addEventListener('pointermove', (e) => {
      if (!isPointerDown || renderer?.xr?.isPresenting || e.pointerType === 'touch') return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      totalDist += Math.hypot(dx, dy);

      euler.setFromQuaternion(camera.quaternion);
      euler.y -= dx * 0.003;
      euler.x = Math.max(-1.45, Math.min(1.45, euler.x - dy * 0.003));
      camera.quaternion.setFromEuler(euler);
    });

    window.addEventListener('pointerup', (e) => {
      if (!isPointerDown || e.pointerType === 'touch') return;
      isPointerDown = false;
      if (totalDist < 12 && (performance.now() - downTime) < 320) {
        doRaycast(e.clientX, e.clientY);
      }
    });

    // Touch controls for mobile / tablet
    domElement.addEventListener('touchstart', (e) => {
      if (renderer?.xr?.isPresenting) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        touchStarts.set(t.identifier, { x: t.clientX, y: t.clientY, time: performance.now(), dist: 0 });

        if (t.clientX < innerWidth * 0.5 && moveTouchId === null) {
          // Left half -> movement joystick
          moveTouchId = t.identifier;
          joyStartX = t.clientX;
          joyStartY = t.clientY;
          joyDirX = joyDirY = 0;
        } else if (t.clientX >= innerWidth * 0.5 && lookTouchId === null) {
          // Right half -> camera look
          lookTouchId = t.identifier;
          lastLookX = t.clientX;
          lastLookY = t.clientY;
        }
      }
    }, { passive: false });

    domElement.addEventListener('touchmove', (e) => {
      if (renderer?.xr?.isPresenting) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const record = touchStarts.get(t.identifier);
        if (record) {
          record.dist += Math.hypot(t.clientX - (record.lastX ?? record.x), t.clientY - (record.lastY ?? record.y));
          record.lastX = t.clientX;
          record.lastY = t.clientY;
        }

        if (t.identifier === moveTouchId) {
          const dx = t.clientX - joyStartX;
          const dy = t.clientY - joyStartY;
          const len = Math.hypot(dx, dy);
          const maxR = 45;
          const factor = Math.min(1, len / maxR);
          joyDirX = len > 6 ? (dx / len) * factor : 0;
          joyDirY = len > 6 ? (dy / len) * factor : 0;
        } else if (t.identifier === lookTouchId) {
          const dx = t.clientX - lastLookX;
          const dy = t.clientY - lastLookY;
          lastLookX = t.clientX;
          lastLookY = t.clientY;
          euler.setFromQuaternion(camera.quaternion);
          euler.y -= dx * 0.004;
          euler.x = Math.max(-1.45, Math.min(1.45, euler.x - dy * 0.004));
          camera.quaternion.setFromEuler(euler);
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const record = touchStarts.get(t.identifier);
        if (record && record.dist < 15 && (performance.now() - record.time) < 320) {
          doRaycast(t.clientX, t.clientY);
        }
        touchStarts.delete(t.identifier);

        if (t.identifier === moveTouchId) {
          moveTouchId = null;
          joyDirX = joyDirY = 0;
        }
        if (t.identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    };

    domElement.addEventListener('touchend', handleTouchEnd);
    domElement.addEventListener('touchcancel', handleTouchEnd);
  }

  // Mobile on-screen action button
  let actBtn = document.getElementById('act-btn');
  if (!actBtn && typeof document !== 'undefined') {
    actBtn = document.createElement('button');
    actBtn.id = 'act-btn';
    actBtn.innerText = '⚡ Action';
    Object.assign(actBtn.style, {
      position: 'fixed',
      bottom: '18px',
      right: '18px',
      zIndex: '10',
      padding: '12px 20px',
      borderRadius: '24px',
      border: '1px solid #ffffff55',
      background: '#151528d9',
      backdropFilter: 'blur(8px)',
      color: '#ffd54f',
      font: 'bold 13px system-ui, sans-serif',
      letterSpacing: '1px',
      cursor: 'pointer',
      userSelect: 'none',
      webkitUserSelect: 'none',
      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      display: 'none'
    });
    const triggerAct = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectObject(null, true);
    };
    actBtn.addEventListener('click', triggerAct);
    actBtn.addEventListener('touchstart', triggerAct, { passive: false });
    document.body.appendChild(actBtn);
  }

  return {
    showActionButton: (show = true) => {
      if (actBtn) actBtn.style.display = show ? 'block' : 'none';
    },
    update: (delta) => {
      if (renderer?.xr?.isPresenting) {
        if (actBtn) actBtn.style.display = 'none';
        return;
      }
      if (actBtn && actBtn.style.display === 'none' && !document.getElementById('o')?.classList.contains('hidden') === false) {
        actBtn.style.display = 'block';
      }

      forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
      forwardVec.y = 0;
      if (forwardVec.lengthSq() > 0.0001) forwardVec.normalize();

      rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
      rightVec.y = 0;
      if (rightVec.lengthSq() > 0.0001) rightVec.normalize();

      moveDir.set(0, 0, 0);

      // Keyboard
      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forwardVec);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forwardVec);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(rightVec);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(rightVec);

      // Virtual joystick
      if (joyDirX || joyDirY) {
        moveDir.addScaledVector(rightVec, joyDirX);
        moveDir.addScaledVector(forwardVec, -joyDirY);
      }

      const uState = getUState ? getUState() : null;
      if (uState?.isMounted && uState.unicorn) {
        updateRiding(moveDir, uState.unicorn, camera, delta, false, timers);
      } else {
        updateWalking(moveDir, camera, delta, false, timers);
      }
    }
  };
}
