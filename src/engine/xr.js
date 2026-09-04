import { getTerrainHeight } from '../models/world.js';
import { getHit } from './controls.js';
import { audio } from '../audio/synth.js';

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState, vrHud) {
  const THREE = window.THREE;
  renderer.xr.enabled = true;
  try { renderer.xr.setFoveation?.(1.0); } catch (_) {}

  const xrGroup = new THREE.Group();
  scene.add(xrGroup);
  xrGroup.add(camera);

  const controllers = [], raycaster = new THREE.Raycaster(), tempMatrix = new THREE.Matrix4();
  const lastPositions = [new THREE.Vector3(), new THREE.Vector3()];
  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

  const pulseHaptics = (hand = 'both', intensity = 0.5, duration = 100) => {
    const s = renderer.xr.getSession();
    s?.inputSources?.forEach((src) => {
      if (hand === 'both' || src.handedness === hand) src.gamepad?.hapticActuators?.[0]?.pulse?.(intensity, duration);
    });
  };

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    laser.scale.z = 25;
    controller.add(laser);

    controller.addEventListener('selectstart', () => {
      onActZeroTrigger?.();
      vrHud?.triggerCallAction?.();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
    });

    xrGroup.add(controller);
    controllers.push(controller);
  }

  const startVR = async () => {
    if (!navigator.xr) return alert('WebXR not supported.');
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
      xrGroup.position.copy(camera.position);
      xrGroup.position.y -= 1.6;
      camera.position.set(0, 0, 0);
      await renderer.xr.setSession(session);
    } catch (err) { alert('VR error: ' + (err?.message || err)); }
  };

  let snapCooldown = 0, footTimer = 0, hoofTimer = 0;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), curPos = new THREE.Vector3(), moveDir = new THREE.Vector3();

  return {
    controllers, xrGroup, startVR, pulseHaptics,
    update: (delta) => {
      const session = renderer.xr.getSession();
      if (snapCooldown > 0) snapCooldown -= delta;

      controllers.forEach((ctrl, i) => {
        ctrl.getWorldPosition(curPos);
        const dist = curPos.distanceTo(lastPositions[i]);
        lastPositions[i].copy(curPos);
        if (delta > 0 && (dist / delta) > 0.4) onPunchCheck?.(curPos, dist / delta);
      });

      const { isMounted, unicorn } = getUnicornState?.() || {};

      if (session?.inputSources) {
        camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        right.set(-fwd.z, 0, fwd.x).normalize();
        moveDir.set(0, 0, 0);

        for (const src of session.inputSources) {
          const btn = src.gamepad?.buttons?.[0]?.pressed || src.gamepad?.buttons?.[4]?.pressed;
          if (btn && !src._b && vrHud?.triggerCallAction) vrHud.triggerCallAction();
          src._b = btn;

          const axes = src.gamepad?.axes;
          if (!axes || axes.length < 2) continue;
          const ax = axes[axes.length >= 4 ? 2 : 0], ay = axes[axes.length >= 4 ? 3 : 1];

          if (src.handedness === 'left') {
            if (Math.abs(ay) > 0.12) moveDir.addScaledVector(fwd, -ay);
            if (Math.abs(ax) > 0.12) moveDir.addScaledVector(right, ax);
          } else {
            if (snapCooldown <= 0 && Math.abs(ax) > 0.55) {
              xrGroup.rotation.y += ax > 0 ? -0.78 : 0.78;
              snapCooldown = 0.28;
            }
            if (Math.abs(ay) > 0.3) xrGroup.position.y -= ay * 5.0 * delta;
          }
        }

        const isMoving = moveDir.lengthSq() > 0.001;
        if (isMounted && unicorn) {
          if (isMoving) {
            moveDir.normalize();
            hoofTimer += delta;
            if (hoofTimer > 0.28) { hoofTimer = 0; audio.playHoofbeat(); }
            const diff = Math.atan2(-moveDir.x, -moveDir.z) - xrGroup.rotation.y;
            xrGroup.rotation.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1.0, delta * 3.5);
          }
          unicorn.move(moveDir, delta);
          unicorn.update(delta, isMoving ? 'gallop' : 'idle');
          xrGroup.position.set(unicorn.group.position.x, unicorn.group.position.y + 1.25, unicorn.group.position.z);
        } else {
          if (isMoving) {
            moveDir.normalize();
            xrGroup.position.addScaledVector(moveDir, 7.5 * delta);
            footTimer += delta;
            if (footTimer > 0.44) { footTimer = 0; audio.playFootstep(); }
          }
          const gy = getTerrainHeight(xrGroup.position.x, xrGroup.position.z);
          if (xrGroup.position.y < gy) xrGroup.position.y = gy;
        }
      }

      controllers.forEach((ctrl) => {
        tempMatrix.identity().extractRotation(ctrl.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
        const laser = ctrl.children[0];
        if (laser?.material) {
          const hit = hits.length > 0 && hits[0].distance < 30;
          laser.material.color.setHex(hit ? 0xff0077 : 0x00ffff);
          laser.scale.z = hit ? hits[0].distance : 25;
        }
      });
    },
    getRightController: () => controllers[1] || controllers[0]
  };
}
