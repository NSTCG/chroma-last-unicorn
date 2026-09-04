import { getTerrainHeight } from '../models/world.js';
import { getHit } from './controls.js';
import { audio } from '../audio/synth.js';

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState, vrHud) {
  const THREE = window.THREE;
  renderer.xr.enabled = true;
  try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1.0); } catch (_) {}
  try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (_) {}

  const xrGroup = new THREE.Group();
  scene.add(xrGroup);
  xrGroup.add(camera);

  const controllers = [], raycaster = new THREE.Raycaster(), tempMatrix = new THREE.Matrix4();
  const lastPositions = [new THREE.Vector3(), new THREE.Vector3()];
  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

  const pulseHaptics = (hand = 'both', intensity = 0.5, duration = 100) => {
    const s = renderer.xr.getSession();
    if (!s?.inputSources) return;
    for (const src of s.inputSources) {
      if (hand === 'both' || src.handedness === hand) src.gamepad?.hapticActuators?.[0]?.pulse?.(intensity, duration);
    }
  };

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    laser.scale.z = 25;
    controller.add(laser);

    controller.addEventListener('selectstart', () => {
      if (onActZeroTrigger) onActZeroTrigger();
      if (vrHud?.triggerCallAction) vrHud.triggerCallAction();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
    });

    xrGroup.add(controller);
    controllers.push(controller);
  }

  renderer.xr.addEventListener('sessionstart', async () => {
    try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1.0); } catch (_) {}
  });

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

  let snapTurnCooldown = 0, footTimer = 0, hoofTimer = 0;
  const forwardVec = new THREE.Vector3(), rightVec = new THREE.Vector3(), currentPos = new THREE.Vector3(), vrMoveDir = new THREE.Vector3();

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

      const isMounted = getUnicornState ? getUnicornState().isMounted : false;
      const unicorn = getUnicornState ? getUnicornState().unicorn : null;

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
          const btnX = !!(source.gamepad?.buttons?.[4]?.pressed || source.gamepad?.buttons?.[5]?.pressed || source.gamepad?.buttons?.[0]?.pressed);
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
            if (Math.abs(ay) > 0.3) xrGroup.position.y -= ay * 5.0 * delta;
          }
        }

        const isMoving = vrMoveDir.lengthSq() > 0.001;
        if (isMounted && unicorn) {
          if (isMoving) {
            vrMoveDir.normalize();
            hoofTimer += delta;
            if (hoofTimer > 0.28) { hoofTimer = 0; audio.playHoofbeat(); }
            const targetYaw = Math.atan2(-vrMoveDir.x, -vrMoveDir.z);
            let diff = targetYaw - xrGroup.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            xrGroup.rotation.y += diff * Math.min(1.0, delta * 3.5);
          }
          unicorn.move(vrMoveDir, delta);
          unicorn.update(delta, isMoving ? 'gallop' : 'idle');
          xrGroup.position.set(unicorn.group.position.x, unicorn.group.position.y + 1.25, unicorn.group.position.z);
        } else {
          if (isMoving) {
            vrMoveDir.normalize();
            xrGroup.position.addScaledVector(vrMoveDir, 7.5 * delta);
            footTimer += delta;
            if (footTimer > 0.44) { footTimer = 0; audio.playFootstep(); }
          }
          const groundY = getTerrainHeight(xrGroup.position.x, xrGroup.position.z);
          if (xrGroup.position.y < groundY) xrGroup.position.y = groundY;

          const dist = Math.hypot(xrGroup.position.x, xrGroup.position.z + 12);
          if (dist > 140.0) {
            xrGroup.position.x = (xrGroup.position.x / dist) * 140.0;
            xrGroup.position.z = -12 + ((xrGroup.position.z + 12) / dist) * 140.0;
          }
        }
      }

      controllers.forEach((controller) => {
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
        const laser = controller.children[0];
        if (laser?.material) {
          laser.material.color.setHex(hits.length > 0 && hits[0].distance < 30 ? 0xff0077 : 0x00ffff);
          laser.scale.z = hits.length > 0 && hits[0].distance < 30 ? hits[0].distance : 25;
        }
      });
    },
    getRightController: () => controllers[1] || controllers[0]
  };
}

