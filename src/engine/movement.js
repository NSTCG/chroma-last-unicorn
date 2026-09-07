import { getTerrainHeight } from '../models/world.js';
import { audio } from '../audio/synth.js';

export function updateRiding(moveDir, unicorn, obj, delta, isVR, rot, timers) {
  const isMoving = moveDir.lengthSq() > 0.001;
  if (isMoving) {
    moveDir.normalize();
    timers.hoof += delta;
    if (timers.hoof > 0.28) { timers.hoof = 0; audio.playHoofbeat(); }
    const targetYaw = Math.atan2(-moveDir.x, -moveDir.z);
    let diff = targetYaw - (isVR ? rot.rotation.y : rot.y);
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    if (isVR) rot.rotation.y += diff * Math.min(1, delta * 3.5);
    else { rot.y += diff * Math.min(1, delta * 3.5); obj.quaternion.setFromEuler(rot); }
  }
  unicorn.move(moveDir, delta);
  unicorn.update(delta, isMoving ? 'gallop' : 'idle');
  obj.position.set(unicorn.group.position.x, unicorn.group.position.y + (isVR ? 1.25 : 1.85), unicorn.group.position.z);
}

export function updateWalking(moveDir, obj, delta, isVR, timers) {
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    obj.position.addScaledVector(moveDir, (isVR ? 7.5 : 8.5) * delta);
    timers.foot += delta;
    if (timers.foot > 0.44) { timers.foot = 0; audio.playFootstep(); }
  }
  const gy = getTerrainHeight(obj.position.x, obj.position.z) + (isVR ? 0 : 1.7);
  if (obj.position.y < gy) obj.position.y = gy;
  const maxR = isVR ? 140 : 92;
  const dist = Math.hypot(obj.position.x, obj.position.z + 12);
  if (dist > maxR) {
    const a = Math.atan2(obj.position.z + 12, obj.position.x);
    obj.position.x = Math.cos(a) * maxR;
    obj.position.z = -12 + Math.sin(a) * maxR;
  }
  if (!isVR) obj.position.y = Math.min(Math.max(1.5, obj.position.y), 55);
}
