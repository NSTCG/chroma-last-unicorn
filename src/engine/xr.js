import { getTerrainHeight } from '../models/world.js';
import { getHit } from './controls.js';

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState) {
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

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    laser.scale.z = 25;
    controller.add(laser);

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

  renderer.xr.addEventListener('sessionstart', () => {
    try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1.0); } catch (_) {}
    const s = renderer.xr.getSession();
    if (s?.renderState?.baseLayer) {
      try { s.renderState.baseLayer.fixedFoveation = 1.0; } catch (_) {}
    }
  });

  const startVR = async () => {
    if (!navigator.xr) return alert('WebXR not supported.');
    try {
      if (!(await navigator.xr.isSessionSupported('immersive-vr'))) return alert('VR not supported.');
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      xrGroup.position.copy(camera.position);
      xrGroup.position.y -= 1.6;
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      camera.updateMatrix();
      camera.updateMatrixWorld(true);
      await renderer.xr.setSession(session);
      try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1.0); } catch (_) {}
    } catch (err) {
      console.error(err);
    }
  };

  let snapTurnCooldown = 0;
  const forwardVec = new THREE.Vector3(), rightVec = new THREE.Vector3(), currentPos = new THREE.Vector3(), vrMoveDir = new THREE.Vector3();

  return {
    controllers,
    xrGroup,
    startVR,
    update: (delta) => {
      const session = renderer.xr.getSession();
      if (snapTurnCooldown > 0) snapTurnCooldown -= delta;

      controllers.forEach((ctrl, i) => {
        ctrl.getWorldPosition(currentPos);
        const dist = currentPos.distanceTo(lastPositions[i]);
        const speed = delta > 0 ? dist / delta : 0;
        lastPositions[i].copy(currentPos);
        if (onPunchCheck && speed > 0.4) onPunchCheck(currentPos, speed);
      });

      const isMounted = getUnicornState ? getUnicornState().isMounted : false;
      const unicorn = getUnicornState ? getUnicornState().unicorn : null;

      if (session?.inputSources) {
        camera.getWorldDirection(forwardVec);
        forwardVec.y = 0; forwardVec.normalize();
        rightVec.crossVectors(forwardVec, camera.up).normalize();
        vrMoveDir.set(0, 0, 0);

        for (const source of session.inputSources) {
          if (!source.gamepad?.axes) continue;
          const axes = source.gamepad.axes;
          const ax = axes[2] !== undefined ? axes[2] : axes[0] || 0;
          const ay = axes[3] !== undefined ? axes[3] : axes[1] || 0;

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

        if (isMounted && unicorn) {
          const isMoving = vrMoveDir.lengthSq() > 0.001;
          if (isMoving) vrMoveDir.normalize();
          unicorn.move(vrMoveDir, delta);
          unicorn.update(delta, isMoving ? 'gallop' : 'idle');
          xrGroup.position.set(unicorn.group.position.x, unicorn.group.position.y + 0.35, unicorn.group.position.z);
        } else {
          if (vrMoveDir.lengthSq() > 0.001) {
            vrMoveDir.normalize();
            xrGroup.position.addScaledVector(vrMoveDir, 7.5 * delta);
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
    }
  };
}
