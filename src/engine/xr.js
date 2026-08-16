// WebXR VR Controller Manager with Locomotion, Punch Detection, Snap Turn & Haptics

export function setupXR(renderer, scene, camera, getInteractiveObjects, onSelectObject, onPunchCheck, onActZeroTrigger, getUnicornState) {
  const THREE = window.THREE;
  renderer.xr.enabled = true;

  const xrGroup = new THREE.Group();
  scene.add(xrGroup);
  xrGroup.add(camera);

  const controllers = [];
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  const lastPositions = [new THREE.Vector3(), new THREE.Vector3()];

  // VR Controller Grip and Input Setup
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const laser = new THREE.Line(laserGeo, laserMat);
    laser.scale.z = 25;
    controller.add(laser);

    controller.addEventListener('selectstart', () => {
      if (onActZeroTrigger) onActZeroTrigger();

      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const targets = getInteractiveObjects();
      const hits = raycaster.intersectObjects(targets, true);
      let hitObj = null;
      if (hits.length > 0) {
        let hit = hits[0].object;
        while (hit && !hit.userData?.data && hit.parent) hit = hit.parent;
        if (hit?.userData?.data) hitObj = hit;
      }
      onSelectObject(hitObj);
    });

    xrGroup.add(controller);
    controllers.push(controller);
  }

  // VR Session Launch Helper
  const startVR = async () => {
    if (!navigator.xr) {
      alert('WebXR is not supported in this browser.');
      return;
    }
    try {
      const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!isSupported) {
        alert('Immersive VR mode is not supported on this display/device.');
        return;
      }
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      renderer.xr.setSession(session);
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
    }
  };

  let snapTurnCooldown = 0;
  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const currentPos = new THREE.Vector3();
  const vrMoveDir = new THREE.Vector3();

  return {
    controllers,
    xrGroup,
    startVR,
    update: (delta) => {
      const session = renderer.xr.getSession();
      if (snapTurnCooldown > 0) snapTurnCooldown -= delta;

      // Track Controller Positions & Detect Physical Punches
      controllers.forEach((ctrl, i) => {
        ctrl.getWorldPosition(currentPos);
        const dist = currentPos.distanceTo(lastPositions[i]);
        const speed = delta > 0 ? (dist / delta) : 0;
        lastPositions[i].copy(currentPos);

        if (onPunchCheck && speed > 0.4) {
          onPunchCheck(currentPos, speed);
        }
      });

      const isMounted = getUnicornState ? getUnicornState().isMounted : false;
      const unicorn = getUnicornState ? getUnicornState().unicorn : null;

      if (session && session.inputSources) {
        camera.getWorldDirection(forwardVec);
        forwardVec.y = 0;
        forwardVec.normalize();
        rightVec.crossVectors(camera.up, forwardVec).negate().normalize();
        vrMoveDir.set(0, 0, 0);

        for (const source of session.inputSources) {
          if (!source.gamepad || !source.gamepad.axes) continue;
          const axes = source.gamepad.axes;
          const ax = axes[2] !== undefined ? axes[2] : axes[0] || 0;
          const ay = axes[3] !== undefined ? axes[3] : axes[1] || 0;

          // LEFT HAND: Locomotion
          if (source.handedness === 'left') {
            if (Math.abs(ay) > 0.12) vrMoveDir.addScaledVector(forwardVec, -ay);
            if (Math.abs(ax) > 0.12) vrMoveDir.addScaledVector(rightVec, ax);
          }

          // RIGHT HAND: Snap Turn & Elevation
          if (source.handedness === 'right') {
            if (snapTurnCooldown <= 0) {
              if (ax > 0.55) {
                xrGroup.rotation.y -= Math.PI / 4;
                snapTurnCooldown = 0.28;
              } else if (ax < -0.55) {
                xrGroup.rotation.y += Math.PI / 4;
                snapTurnCooldown = 0.28;
              }
            }

            if (Math.abs(ay) > 0.3) {
              xrGroup.position.y -= ay * 5.0 * delta;
            }
          }
        }

        if (isMounted && unicorn) {
          const isMoving = vrMoveDir.lengthSq() > 0.001;
          if (isMoving) vrMoveDir.normalize();
          unicorn.move(vrMoveDir, delta, camera.rotation.y);
          unicorn.update(delta, isMoving ? 'gallop' : 'idle');
          xrGroup.position.set(unicorn.group.position.x, unicorn.group.position.y, unicorn.group.position.z);
        } else {
          if (vrMoveDir.lengthSq() > 0.001) {
            vrMoveDir.normalize();
            xrGroup.position.addScaledVector(vrMoveDir, 7.5 * delta);
          }

          // Play area radius clamping (Expanded vast sanctuary)
          const dx = xrGroup.position.x;
          const dz = xrGroup.position.z - (-12);
          const dist = Math.hypot(dx, dz);
          const MAX_R = 92.0;
          if (dist > MAX_R) {
            xrGroup.position.x = (dx / dist) * MAX_R;
            xrGroup.position.z = -12 + (dz / dist) * MAX_R;
          }
          xrGroup.position.y = Math.max(-0.5, Math.min(25.0, xrGroup.position.y));
        }
      }

      // Real-time ray hover highlighting
      controllers.forEach((controller) => {
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const targets = getInteractiveObjects();
        const hits = raycaster.intersectObjects(targets, true);

        const laser = controller.children[0];
        if (laser && laser.material) {
          if (hits.length > 0 && hits[0].distance < 30) {
            laser.material.color.setHex(0xff0077);
            laser.scale.z = hits[0].distance;
          } else {
            laser.material.color.setHex(0x00ffff);
            laser.scale.z = 25;
          }
        }
      });
    }
  };
}
