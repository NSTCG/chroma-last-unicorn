import { getHit } from './controls.js';
import { updateRiding, updateWalking } from './movement.js';
import { T, Grp, V3, BMat } from './three.js';

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState, vrHud) {
  renderer.xr.enabled = true;
  try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (_) {}
  renderer.xr.addEventListener('sessionstart', () => {
    try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1); } catch (_) {}
    try { renderer.xr.getSession()?.updateTargetFrameRate?.(72); } catch (_) {}
  });

  const xrGroup = Grp();
  scene.add(xrGroup);
  xrGroup.add(camera);

  const controllers = [], raycaster = new T.Raycaster(), tempMatrix = new T.Matrix4();
  const lastPositions = [V3(0, 0, 0), V3(0, 0, 0)];
  const laserGeo = new T.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]);

  const pulseHaptics = (hand = 'both', intensity = 0.5, duration = 100) => {
    const s = renderer.xr.getSession();
    if (!s?.inputSources) return;
    for (const src of s.inputSources) {
      if (hand === 'both' || src.handedness === hand) src.gamepad?.hapticActuators?.[0]?.pulse?.(intensity, duration);
    }
  };

  const castRay = (c) => {
    tempMatrix.identity().extractRotation(c.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(getInteractiveObjects(), true);
  };

  let leftCtrl = null, rightCtrl = null;

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new T.Line(laserGeo, BMat({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    laser.scale.z = 25;
    controller.add(laser);

    controller.addEventListener('connected', (e) => {
      if (e.data?.handedness === 'left') leftCtrl = controller;
      else if (e.data?.handedness === 'right') rightCtrl = controller;
    });

    controller.addEventListener('selectstart', () => {
      if (onActZeroTrigger) onActZeroTrigger();
      onSelectObject(getHit(castRay(controller)));
    });

    xrGroup.add(controller);
    controllers.push(controller);
  }

  const startVR = async () => {
    if (!navigator.xr) return alert('WebXR not supported in this browser.');
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      xrGroup.position.copy(camera.position);
      xrGroup.position.y = Math.max(0.75, xrGroup.position.y - 1.2);
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      camera.updateMatrixWorld(true);
      await renderer.xr.setSession(session);
    } catch (err) {
      console.error(err);
      alert('Could not start VR: ' + (err?.message || err));
    }
  };

  let snapTurnCooldown = 0;
  const timers = { foot: 0, hoof: 0, haptics: pulseHaptics };
  const forwardVec = V3(0, 0, 0), rightVec = V3(0, 0, 0), currentPos = V3(0, 0, 0), vrMoveDir = V3(0, 0, 0);

  return {
    controllers,
    xrGroup,
    startVR,
    pulseHaptics,
    getLeftController: () => leftCtrl,
    getRightController: () => rightCtrl,
    update: (delta) => {
      const session = renderer.xr.getSession();
      if (snapTurnCooldown > 0) snapTurnCooldown -= delta;

      controllers.forEach((ctrl, i) => {
        ctrl.getWorldPosition(currentPos);
        const dist = currentPos.distanceTo(lastPositions[i]);
        lastPositions[i].copy(currentPos);
        if (onPunchCheck && delta > 0 && (dist / delta) > 0.4) onPunchCheck(currentPos, dist / delta);
      });

      const uState = getUnicornState ? getUnicornState() : null;

      if (session?.inputSources) {
        let headCam = camera;
        try {
          if (renderer.xr.isPresenting && renderer.xr.getCamera) headCam = renderer.xr.getCamera(camera) || camera;
        } catch (_) {}
        headCam.getWorldDirection(forwardVec);
        forwardVec.y = 0;
        if (forwardVec.lengthSq() < 0.001) forwardVec.set(0, 0, -1);
        else forwardVec.normalize();
        rightVec.set(-forwardVec.z, 0, forwardVec.x).normalize();
        vrMoveDir.set(0, 0, 0);

        for (const source of session.inputSources) {
          const btnX = !!(source.gamepad?.buttons?.[4]?.pressed || source.gamepad?.buttons?.[5]?.pressed);
          if (btnX && !source._wasBtn && vrHud?.triggerCallAction) vrHud.triggerCallAction();
          source._wasBtn = btnX;

          if (!source.gamepad?.axes) continue;
          const axes = source.gamepad.axes;
          const ax = axes[2] ?? axes[0] ?? 0, ay = axes[3] ?? axes[1] ?? 0;

          if (source.handedness === 'left') {
            if (Math.abs(ay) > 0.12) vrMoveDir.addScaledVector(forwardVec, -ay);
            if (Math.abs(ax) > 0.12) vrMoveDir.addScaledVector(rightVec, ax);
          }
          if (source.handedness === 'right') {
            if (snapTurnCooldown <= 0 && Math.abs(ax) > 0.55) {
              xrGroup.rotation.y += ax > 0 ? -Math.PI / 4 : Math.PI / 4;
              snapTurnCooldown = 0.28;
            }
            if (Math.abs(ay) > 0.3) xrGroup.position.y -= ay * 5 * delta;
          }
        }

        if (uState?.isMounted && uState.unicorn) {
          updateRiding(vrMoveDir, uState.unicorn, xrGroup, delta, true, xrGroup, timers);
        } else {
          updateWalking(vrMoveDir, xrGroup, delta, true, timers);
        }
      }

      controllers.forEach((c) => {
        const hits = castRay(c), l = c.children[0];
        if (l?.material) {
          const h = hits[0]?.distance < 30;
          l.material.color.setHex(h ? 0xff0077 : 0x00ffff);
          l.scale.z = h ? hits[0].distance : 25;
        }
      });
    },
    getLeftController: () => leftCtrl || controllers[0],
    getRightController: () => rightCtrl || controllers[1] || controllers[0]
  };
}
