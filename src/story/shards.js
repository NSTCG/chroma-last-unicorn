// 7 Spectrum Shards with Point Lights & Actions
import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';

export const SHARDS_DATA = [
  { name: 'Red: Passion', color: 0xff2244, pos: [-25, 8.8, -6], phrase: 'Fire restored.', action: '✨ Draw art freely!' },
  { name: 'Orange: Play', color: 0xff7700, pos: [25, 8.8, -6], phrase: 'Play restored.', action: '✨ Play a silly game!' },
  { name: 'Yellow: Warmth', color: 0xffcc00, pos: [-18, 9.1, 12], phrase: 'Warmth restored.', action: '✨ Call an old friend!' },
  { name: 'Green: Wonder', color: 0x11cc44, pos: [18, 9.1, 12], phrase: 'Wonder restored.', action: '✨ Gaze at a cloud!' },
  { name: 'Blue: Serenity', color: 0x00aaff, pos: [-24, 10.4, -18], phrase: 'Peace restored.', action: '✨ 10 mins silence!' },
  { name: 'Indigo: Mystery', color: 0x5533ee, pos: [24, 10.1, -18], phrase: 'Mystery restored.', action: '✨ Read fantasy!' },
  { name: 'Violet: Dream', color: 0xcc22ee, pos: [0, 12.4, -28], phrase: 'Dreams restored.', action: '✨ Daydream!' }
];

export function createShardsSystem(scene, onShardCollected, vrHud) {
  const THREE = window.THREE;
  const shards = [];
  const shardsGroup = new THREE.Group();
  scene.add(shardsGroup);

  const shardGeo = new THREE.OctahedronGeometry(0.8, 0);
  const shellGeo = new THREE.IcosahedronGeometry(1.4, 1);

  SHARDS_DATA.forEach((data, index) => {
    const coreMat = createPrismaticMaterial({
      baseColor: data.color, iridescence: 2.5, dispersion: 3.0, glitter: 0.8, emissive: 0.9, awakened: 1.0
    });
    const coreMesh = new THREE.Mesh(shardGeo, coreMat);
    coreMesh.position.set(...data.pos);

    const shellMat = new THREE.MeshStandardMaterial({
      color: data.color, roughness: 0.1, transparent: true, opacity: 0.55, wireframe: true
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.position.copy(coreMesh.position);
    coreMesh.castShadow = shellMesh.castShadow = true;
    shardsGroup.add(shellMesh, coreMesh);

    const orbLight = new THREE.PointLight(data.color, 1.8, 16);
    orbLight.position.copy(coreMesh.position);
    shardsGroup.add(orbLight);

    const beaconGeo = new THREE.CylinderGeometry(0.04, 0.5, 35, 4);
    beaconGeo.translate(0, 17.5, 0);
    const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({
      color: data.color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending
    }));
    beacon.position.copy(coreMesh.position);
    shardsGroup.add(beacon);

    coreMesh.userData = { index, data, initialY: data.pos[1] };
    shellMesh.userData = { index, data, isShell: true };
    shards.push({ coreMesh, shellMesh, orbLight, beacon, data, collected: false });
  });

  return {
    shards,
    getInteractiveMeshes: () => shards.filter(s => !s.collected).map(s => s.coreMesh),
    collect: (mesh) => {
      if (!mesh?.userData) return null;
      const shard = shards[mesh.userData.index];
      if (!shard || shard.collected) return null;
      shard.collected = true;

      audio.playChime(shard.data.color);
      shard.coreMesh.visible = shard.shellMesh.visible = shard.beacon.visible = false;
      shard.orbLight.intensity = 0.4;

      const pip = document.getElementById(`pip-${shard.data.index || shards.indexOf(shard)}`);
      if (pip) pip.classList.add('collected');

      if (vrHud) vrHud.show(`RESTORED: ${shard.data.name}`, shard.data.phrase, shard.data.action, 7000);
      if (onShardCollected) onShardCollected(shard.data);
      return shard;
    },
    checkVRPunch: (pos) => {
      shards.forEach(s => {
        if (!s.collected && pos.distanceTo(s.coreMesh.position) < 1.6) {
          s.collected = true;
          audio.playChime(s.data.color);
          s.coreMesh.visible = s.shellMesh.visible = s.beacon.visible = false;
          s.orbLight.intensity = 0.4;
          const pip = document.getElementById(`pip-${s.data.index || shards.indexOf(s)}`);
          if (pip) pip.classList.add('collected');
          if (vrHud) vrHud.show(`RESTORED: ${s.data.name}`, s.data.phrase, s.data.action, 7000);
          if (onShardCollected) onShardCollected(s.data);
        }
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
        }
      });
    }
  };
}
