import { getHit } from './controls.js';
import { updateRiding, updateWalking } from './movement.js';
import { T, Grp, V3 } from './three.js';

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState, vrHud) {
  renderer.xr.enabled = true;
  try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1); } catch (_) {}
  try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (_) {}

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

  let leftCtrl = null, rightCtrl = null;

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new T.Line(laserGeo, new T.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    laser.scale.z = 25;
    controller.add(laser);

    controller.addEventListener('connected', (e) => {
      if (e.data?.handedness === 'left') leftCtrl = controller;
      else if (e.data?.handedness === 'right') rightCtrl = controller;
    });

    controller.addEventListener('selectstart', () => {
      if (onActZeroTrigger) onActZeroTrigger();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
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
      xrGroup.position.y -= 1.6;
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
  const timers = { foot: 0, hoof: 0 };
  const forwardVec = V3(0, 0, 0), rightVec = V3(0, 0, 0), currentPos = V3(0, 0, 0), vrMoveDir = V3(0, 0, 0);

  return {
    controllers,
    xrGroup,
    startVR,
    pulseHaptics,
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
          let ax = 0, ay = 0;
          if (axes.length >= 4) {
            ax = Math.abs(axes[2]) > 0.08 ? axes[2] : (Math.abs(axes[0]) > 0.08 ? axes[0] : 0);
            ay = Math.abs(axes[3]) > 0.08 ? axes[3] : (Math.abs(axes[1]) > 0.08 ? axes[1] : 0);
          } else if (axes.length >= 2) {
            ax = axes[0]; ay = axes[1];
          }

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

      controllers.forEach((controller) => {
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
        const laser = controller.children[0];
        if (laser?.material) {
          const hit = hits[0]?.distance < 30;
          laser.material.color.setHex(hit ? 0xff0077 : 0x00ffff);
          laser.scale.z = hit ? hits[0].distance : 25;
        }
      });
    },
    getLeftController: () => leftCtrl || controllers[0],
    getRightController: () => rightCtrl || controllers[1] || controllers[0]
  };
}
