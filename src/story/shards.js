import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { getTerrainHeight } from '../models/world.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -48, 18, 'Fire returned.', '✨ Draw art!'],
  ['Orange', 0xff7700, 52, 26, 'Play returned.', '✨ Play games!'],
  ['Yellow', 0xffcc00, -62, -42, 'Warmth returned.', '✨ Call friends!'],
  ['Green', 0x11cc44, 68, -36, 'Wonder returned.', '✨ Gaze at sky!'],
  ['Blue', 0x00aaff, -38, 68, 'Peace returned.', '✨ Breathe deep!'],
  ['Indigo', 0x5533ee, 45, 72, 'Mystery returned.', '✨ Read stories!'],
  ['Violet', 0xcc22ee, 0, -82, 'Dreams returned.', '✨ Daydream!']
].map(([name, color, x, z, phrase, action], index) => ({ name, color, pos: [x, 0, z], phrase, action, index }));

export function createShardsSystem(scene, onShardCollected, vrHud, pulseHaptics) {
  const THREE = window.THREE;
  const shards = [], shardsGroup = new THREE.Group();
  scene.add(shardsGroup);

  const shardGeo = new THREE.OctahedronGeometry(1.0, 0);
  const shellGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const beaconGeo = new THREE.CylinderGeometry(0.06, 0.6, 50, 4);
  beaconGeo.translate(0, 25.0, 0);

  SHARDS_DATA.forEach((data, index) => {
    const coreMat = createPrismaticMaterial({ baseColor: data.color, iridescence: 2.5, dispersion: 3.0, glitter: 0.8, emissive: 0.9, awakened: 1.0 });
    const coreMesh = new THREE.Mesh(shardGeo, coreMat);
    const py = getTerrainHeight(data.pos[0], data.pos[2]) + 4.5;
    coreMesh.position.set(data.pos[0], py, data.pos[2]);

    const shellMesh = new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: data.color, wireframe: true, transparent: true, opacity: 0.55 }));
    shellMesh.position.copy(coreMesh.position);
    coreMesh.castShadow = true;
    shardsGroup.add(shellMesh, coreMesh);

    const orbLight = new THREE.PointLight(data.color, 2.2, 22);
    orbLight.position.copy(coreMesh.position);
    shardsGroup.add(orbLight);

    const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.40, blending: THREE.AdditiveBlending }));
    beacon.position.copy(coreMesh.position);
    shardsGroup.add(beacon);

    coreMesh.userData = shellMesh.userData = { index, data, initialY: py };
    shards.push({ coreMesh, shellMesh, orbLight, beacon, data, collected: false, unlocked: false, vibrate: 0 });
  });

  const interactShard = (shard) => {
    if (!shard || shard.collected) return null;
    if (!shard.unlocked) {
      shard.vibrate = 0.45;
      audio.playResonate();
      if (pulseHaptics) pulseHaptics('both', 0.65, 120);
      if (shard.data.index === 2) {
        if (vrHud?.startCallTask) vrHud.startCallTask(shard, () => {
          shard.unlocked = true;
          shard.shellMesh.visible = false;
          if (pulseHaptics) pulseHaptics('both', 0.9, 250);
        });
      } else {
        if (vrHud) vrHud.show(shard.data.name + ' [LOCKED]', shard.data.action, 'Prototype locked in Demo');
      }
      return null;
    }
    return triggerCollect(shard);
  };

  const triggerCollect = (shard) => {
    if (!shard || shard.collected) return null;
    shard.collected = true;
    audio.playChime(shard.data.color);
    if (pulseHaptics) pulseHaptics('both', 0.8, 180);
    shard.coreMesh.visible = shard.shellMesh.visible = shard.beacon.visible = false;
    shard.orbLight.intensity = 0.4;
    if (vrHud?.setShardCollected) vrHud.setShardCollected(shard.data.index);
    if (vrHud) vrHud.show(shard.data.name + ' RESTORED', shard.data.phrase, shard.data.action);
    if (onShardCollected) onShardCollected(shard.data);
    return shard;
  };

  return {
    shards,
    getInteractiveMeshes: () => shards.filter(s => !s.collected).map(s => s.unlocked ? s.coreMesh : s.shellMesh),
    collect: (mesh) => mesh?.userData ? interactShard(shards[mesh.userData.index]) : null,
    checkVRPunch: (pos) => {
      shards.forEach(s => {
        if (!s.collected && pos.distanceTo(s.coreMesh.position) < 1.8) interactShard(s);
      });
    },
    update: (delta) => {
      const t = performance.now() * 0.002;
      shards.forEach((s) => {
        if (!s.collected) {
          s.coreMesh.rotation.y += delta * 1.5;
          s.coreMesh.rotation.x = Math.sin(t) * 0.3;
          s.shellMesh.rotation.y -= delta * 0.8;
          s.shellMesh.rotation.z += delta * 0.5;
          s.coreMesh.position.y = s.coreMesh.userData.initialY + Math.sin(t + s.coreMesh.userData.index) * 0.4;
          s.shellMesh.position.y = s.coreMesh.position.y;
          s.orbLight.position.y = s.coreMesh.position.y;

          if (s.vibrate > 0) {
            s.vibrate -= delta;
            const vx = (Math.random() - 0.5) * 0.14, vz = (Math.random() - 0.5) * 0.14;
            s.coreMesh.position.x = s.data.pos[0] + vx; s.shellMesh.position.x = s.data.pos[0] + vx;
            s.coreMesh.position.z = s.data.pos[2] + vz; s.shellMesh.position.z = s.data.pos[2] + vz;
          } else {
            s.coreMesh.position.x = s.shellMesh.position.x = s.data.pos[0];
            s.coreMesh.position.z = s.shellMesh.position.z = s.data.pos[2];
          }
        }
      });
    }
  };
}

