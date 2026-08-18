import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { getTerrainHeight } from '../models/world.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -48, 18, 'Fire restored.', '✨ Draw art!'],
  ['Orange', 0xff7700, 52, 26, 'Play restored.', '✨ Play games!'],
  ['Yellow', 0xffcc00, -62, -42, 'Warmth restored.', '✨ Call friends!'],
  ['Green', 0x11cc44, 68, -36, 'Wonder restored.', '✨ Gaze at sky!'],
  ['Blue', 0x00aaff, -38, 68, 'Peace restored.', '✨ Breathe deep!'],
  ['Indigo', 0x5533ee, 45, 72, 'Mystery restored.', '✨ Read stories!'],
  ['Violet', 0xcc22ee, 0, -82, 'Dreams restored.', '✨ Daydream!']
].map(([name, color, x, z, phrase, action], index) => ({ name, color, pos: [x, 0, z], phrase, action, index }));

export function createShardsSystem(scene, onShardCollected, vrHud) {
  const THREE = window.THREE;
  const shards = [], shardsGroup = new THREE.Group();
  scene.add(shardsGroup);

  const specBar = document.getElementById('spectrum-bar');
  if (specBar && !specBar.children.length) {
    SHARDS_DATA.forEach((d, i) => {
      const pip = document.createElement('div');
      pip.className = 'shard-pip';
      pip.id = `pip-${i}`;
      pip.style.color = '#' + d.color.toString(16).padStart(6, '0');
      specBar.appendChild(pip);
    });
  }

  const shardGeo = new THREE.OctahedronGeometry(1.0, 0);
  const shellGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const beaconGeo = new THREE.CylinderGeometry(0.06, 0.6, 50, 4);
  beaconGeo.translate(0, 25.0, 0);

  SHARDS_DATA.forEach((data, index) => {
    const coreMat = createPrismaticMaterial({ baseColor: data.color, iridescence: 2.5, dispersion: 3.0, glitter: 0.8, emissive: 0.9, awakened: 1.0 });
    const coreMesh = new THREE.Mesh(shardGeo, coreMat);
    const py = getTerrainHeight(data.pos[0], data.pos[2]) + 4.5;
    coreMesh.position.set(data.pos[0], py, data.pos[2]);

    const shellMesh = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.1, transparent: true, opacity: 0.55, wireframe: true }));
    shellMesh.position.copy(coreMesh.position);
    coreMesh.castShadow = shellMesh.castShadow = true;
    shardsGroup.add(shellMesh, coreMesh);

    const orbLight = new THREE.PointLight(data.color, 2.2, 22);
    orbLight.position.copy(coreMesh.position);
    shardsGroup.add(orbLight);

    const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.40, blending: THREE.AdditiveBlending }));
    beacon.position.copy(coreMesh.position);
    shardsGroup.add(beacon);

    coreMesh.userData = { index, data, initialY: py };
    shards.push({ coreMesh, shellMesh, orbLight, beacon, data, collected: false });
  });

  const triggerCollect = (shard) => {
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
  };

  return {
    shards,
    getInteractiveMeshes: () => shards.filter(s => !s.collected).map(s => s.coreMesh),
    collect: (mesh) => mesh?.userData ? triggerCollect(shards[mesh.userData.index]) : null,
    checkVRPunch: (pos) => {
      shards.forEach(s => {
        if (!s.collected && pos.distanceTo(s.coreMesh.position) < 1.6) triggerCollect(s);
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
