import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { getTerrainHeight } from '../models/world.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -48, 18, 'Art'],
  ['Orange', 0xff7700, 52, 26, 'Play'],
  ['Yellow', 0xffcc00, -62, -42, 'Call'],
  ['Green', 0x11cc44, 68, -36, 'Sky'],
  ['Blue', 0x00aaff, -38, 68, 'Breathe'],
  ['Indigo', 0x5533ee, 45, 72, 'Read'],
  ['Violet', 0xcc22ee, 0, -82, 'Dream']
].map(([name, color, x, z, act], index) => ({ name, color, pos: [x, 0, z], phrase: name + ' returned.', action: '✨ ' + act + '!', index }));

export function createShardsSystem(scene, onShardCollected, vrHud, pulseHaptics, requestMount) {
  const THREE = window.THREE;
  const shards = [], shardsGroup = new THREE.Group(), targets = [];
  scene.add(shardsGroup);

  const shardGeo = new THREE.OctahedronGeometry(1.0, 0);
  const shellGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const beaconGeo = new THREE.CylinderGeometry(0.06, 0.6, 50, 4);
  beaconGeo.translate(0, 25.0, 0);

  SHARDS_DATA.forEach((data) => {
    const coreMat = createPrismaticMaterial({ baseColor: data.color, awakened: 1.0 });
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

    const sObj = { coreMesh, shellMesh, orbLight, beacon, data, collected: false, unlocked: false, vibrate: 0, initialY: py };
    coreMesh.userData = shellMesh.userData = { data, shard: sObj };
    shards.push(sObj);
  });

  const unlockShard = (idx, title, desc) => {
    const s = shards[idx];
    if (!s || s.unlocked) return;
    s.unlocked = true;
    s.shellMesh.visible = false;
    pulseHaptics?.('both', 0.9, 250);
    audio.playPluck(880, 0.6, 0.3);
    vrHud?.show(title, desc, 'Punch / Click to collect!');
  };

  const addTarget = (mesh, shardIdx, hitRadius, onHit) => {
    const t = { mesh, shardIdx, hitRadius, done: false, onHit: () => { if (!t.done) onHit(t); } };
    mesh.userData = { data: true, target: t };
    shardsGroup.add(mesh);
    targets.push(t);
    return t;
  };

  // 0: Red - 3 Sparks
  let redHits = 0;
  const redPos = SHARDS_DATA[0].pos, redBaseY = getTerrainHeight(redPos[0], redPos[2]) + 3.2;
  const sparkGeo = new THREE.OctahedronGeometry(0.48, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283;
    const sm = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xff3355, wireframe: true }));
    sm.position.set(redPos[0] + Math.cos(a) * 3.8, redBaseY, redPos[2] + Math.sin(a) * 3.8);
    sm.userData.baseAngle = a; sm.userData.baseY = redBaseY;
    addTarget(sm, 0, 1.5, (t) => {
      t.done = true; t.mesh.material.wireframe = false; t.mesh.scale.set(1.4, 1.4, 1.4);
      redHits++;
      audio.playPluck(440 + redHits * 140, 0.4, 0.28);
      pulseHaptics?.('right', 0.7, 120);
      if (redHits >= 3) unlockShard(0, '🎨 CREATIVE', 'Art burns again.');
      else vrHud?.show('🎨 ART SPARK', `Spark ${redHits}/3 Ignited!`, 'Strike remaining sparks');
    });
  }

  // 1: Orange - Toybox Cube
  let orgHits = 0;
  const orgPos = SHARDS_DATA[1].pos;
  const toyCube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
  toyCube.position.set(orgPos[0] + 2.4, getTerrainHeight(orgPos[0] + 2.4, orgPos[2] + 1.2) + 2.8, orgPos[2] + 1.2);
  addTarget(toyCube, 1, 1.6, (t) => {
    orgHits++;
    toyCube.rotation.y += 1.57; toyCube.rotation.x += 0.78;
    audio.tone('triangle', 320 + orgHits * 120, 0.16, 0.22);
    pulseHaptics?.('right', 0.6, 90);
    if (orgHits >= 3) { t.done = true; toyCube.material.color.setHex(0xffea44); unlockShard(1, '🧩 JOY', 'Play unlocked.'); }
    else vrHud?.show('🧩 TOY PUZZLE', `Facet ${orgHits}/3 aligned!`, 'Tap again to solve');
  });

  // 3: Green - Sky Stars
  let grnHits = 0;
  const grnPos = SHARDS_DATA[3].pos;
  [[-10, 36, -8], [8, 42, 10], [0, 38, -16]].forEach((off) => {
    const sm = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: 0x22ff88, wireframe: true }));
    sm.position.set(grnPos[0] + off[0], off[1], grnPos[2] + off[2]);
    addTarget(sm, 3, 0, (t) => {
      t.done = true; t.mesh.material.wireframe = false; t.mesh.scale.set(1.5, 1.5, 1.5);
      grnHits++;
      audio.tone('sine', 587 + grnHits * 140, 0.75, 0.22);
      pulseHaptics?.('both', 0.7, 140);
      if (grnHits >= 3) unlockShard(3, '✨ WONDER RESTORED!', 'Sky is infinite again.');
      else vrHud?.show('✨ SKY CONSTELLATION', `Star ${grnHits}/3 Aligned!`, 'Look up at stars');
    });
  });

  // 4: Blue - Serenity Swing
  let blueBreaths = 0, blueTimer = 0;
  const bluPos = SHARDS_DATA[4].pos, swingY = getTerrainHeight(bluPos[0] + 2.5, bluPos[2] - 3.0);
  const swingGroup = new THREE.Group();
  swingGroup.position.set(bluPos[0] + 2.5, swingY, bluPos[2] - 3.0);
  const wMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, wireframe: true });
  const seatPlank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.45), wMat);
  seatPlank.position.set(0, 0.9, 0);
  swingGroup.add(seatPlank);
  shardsGroup.add(swingGroup);
  addTarget(seatPlank, 4, 4.8, () => { vrHud?.show('🕊️ PEACE', 'Inhale calm... Exhale tension', 'Stand near swing to calm'); });

  // 5: Indigo - Monolith & Rune
  const indPos = SHARDS_DATA[5].pos, indBaseY = getTerrainHeight(indPos[0], indPos[2]);
  const monoMat = new THREE.MeshBasicMaterial({ color: 0x5533ee, wireframe: true });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.35;
    const mp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.8, 0.7), monoMat);
    mp.position.set(indPos[0] + Math.cos(a) * 4.4, indBaseY + 1.9, indPos[2] + Math.sin(a) * 4.4);
    shardsGroup.add(mp);
  }
  const runeMark = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ color: 0x7744ff, transparent: true, opacity: 0.6, wireframe: true }));
  runeMark.rotateX(-1.57); runeMark.position.set(indPos[0], indBaseY + 0.12, indPos[2]);
  addTarget(runeMark, 5, 2.4, (t) => {
    t.done = true; runeMark.material.wireframe = false; monoMat.wireframe = false;
    audio.playAscent();
    setTimeout(() => unlockShard(5, '🔮 MYSTERY RESTORED!', 'Imagination unlocked.'), 650);
  });

  // 6: Violet - Rainbow Gates & Unicorn Ride
  let gatesCleared = 0;
  const gateGeo = new THREE.TorusGeometry(3.2, 0.26, 6, 16);
  [[-14, -62], [-28, -42], [-8, -22], [18, -42], [2, -72]].forEach(([gx, gz]) => {
    const gm = new THREE.Mesh(gateGeo, new THREE.MeshBasicMaterial({ color: 0xcc22ee, wireframe: true, transparent: true, opacity: 0.75 }));
    gm.position.set(gx, getTerrainHeight(gx, gz) + 3.2, gz);
    gm.rotation.y = Math.atan2(-gx, -(gz + 82));
    addTarget(gm, 6, 4.6, (t) => {
      t.done = true; t.mesh.material.wireframe = false; t.mesh.scale.set(1.35, 1.35, 1.35);
      gatesCleared++;
      audio.tone('triangle', 392 + gatesCleared * 110, 0.45, 0.28, 480 + gatesCleared * 110);
      pulseHaptics?.('both', 0.85, 180);
      if (gatesCleared >= 5) { audio.playAscent(); unlockShard(6, '🌈 DREAM', '7 colors restored!'); }
      else vrHud?.show('🦄 RAINBOW RIDE', `Gate ${gatesCleared}/5 Cleared!`, 'Gallop to next Rainbow Gate');
    });
  });

  const interactShard = (shard) => {
    if (!shard || shard.collected) return null;
    if (!shard.unlocked) {
      shard.vibrate = 0.45;
      audio.playResonate();
      pulseHaptics?.('both', 0.65, 120);
      const idx = shard.data.index;
      if (idx === 0) vrHud?.show('🎨 ART', 'Paint freely!', 'Strike 3 Sparks');
      else if (idx === 1) vrHud?.show('🧩 PLAY', 'Secret puzzle!', 'Tap toy cube');
      else if (idx === 2) vrHud?.startCallTask?.(shard, () => unlockShard(2, '✨ WARMTH', 'Reconnected with Maya.'));
      else if (idx === 3) vrHud?.show('✨ WONDER', 'Look to stars!', 'Aim up at 3 stars');
      else if (idx === 4) vrHud?.show('🕊️ PEACE', 'Sit by swing. Breathe...', 'Stand near swing');
      else if (idx === 5) vrHud?.show('🔮 MYSTERY', 'Secret map mark!', 'Step onto rune mark');
      else if (idx === 6) {
        vrHud?.show('🦄 CELESTIAL', 'Ride Rainbow!', 'Pass 5 Gates');
        requestMount?.();
      }
      return null;
    }
    return triggerCollect(shard);
  };

  const triggerCollect = (shard) => {
    if (!shard || shard.collected) return null;
    shard.collected = true;
    audio.playChime(shard.data.index);
    pulseHaptics?.('both', 0.8, 180);
    shard.coreMesh.visible = shard.shellMesh.visible = shard.beacon.visible = false;
    shard.orbLight.intensity = 0.4;
    vrHud?.setShardCollected?.(shard.data.index);
    vrHud?.show(shard.data.name + ' RESTORED', shard.data.phrase, shard.data.action);
    onShardCollected?.(shard.data);
    return shard;
  };

  return {
    shards,
    getInteractiveMeshes: () => [
      ...shards.filter(s => !s.collected).map(s => s.unlocked ? s.coreMesh : s.shellMesh),
      ...targets.filter(t => !t.done).map(t => t.mesh)
    ],
    collect: (mesh) => {
      const ud = mesh?.userData;
      if (ud?.target) { ud.target.onHit(); return null; }
      if (ud?.shard) return interactShard(ud.shard);
      return null;
    },
    checkVRPunch: (pos) => {
      shards.forEach(s => !s.collected && pos.distanceTo(s.coreMesh.position) < 1.8 && interactShard(s));
      targets.forEach(t => !t.done && pos.distanceTo(t.mesh.position) < 1.6 && t.onHit());
    },
    update: (delta, playerPos) => {
      const t = performance.now() * 0.002;
      shards.forEach((s) => {
        if (!s.collected) {
          s.coreMesh.rotation.y += delta * 1.5;
          s.shellMesh.rotation.y -= delta * 0.8;
          s.coreMesh.position.y = s.initialY + Math.sin(t + s.data.index) * 0.4;
          s.shellMesh.position.y = s.orbLight.position.y = s.coreMesh.position.y;
          if (s.vibrate > 0) {
            s.vibrate -= delta;
            s.coreMesh.position.x = s.shellMesh.position.x = s.data.pos[0] + (Math.random() - 0.5) * 0.14;
            s.coreMesh.position.z = s.shellMesh.position.z = s.data.pos[2] + (Math.random() - 0.5) * 0.14;
          } else {
            s.coreMesh.position.x = s.shellMesh.position.x = s.data.pos[0];
            s.coreMesh.position.z = s.shellMesh.position.z = s.data.pos[2];
          }
        }
      });

      targets.forEach(tgt => {
        if (tgt.done) return;
        if (tgt.shardIdx === 0) {
          const a = tgt.mesh.userData.baseAngle + t * 1.2;
          tgt.mesh.position.x = redPos[0] + Math.cos(a) * 3.8;
          tgt.mesh.position.z = redPos[2] + Math.sin(a) * 3.8;
          tgt.mesh.position.y = tgt.mesh.userData.baseY + Math.sin(t * 2.0 + a) * 0.3;
          tgt.mesh.rotation.y += delta * 2.0;
        } else if (tgt.shardIdx === 1) {
          tgt.mesh.rotation.y += delta * 0.6;
          tgt.mesh.position.y = getTerrainHeight(tgt.mesh.position.x, tgt.mesh.position.z) + 2.8 + Math.sin(t * 1.8) * 0.25;
        } else if (tgt.shardIdx === 3) {
          tgt.mesh.rotation.y += delta * 1.4;
        }
      });

      if (playerPos) {
        targets.forEach(tgt => {
          if (!tgt.done && tgt.hitRadius > 0 && playerPos.distanceTo(tgt.mesh.position) < tgt.hitRadius) {
            if (tgt.shardIdx === 4) {
              if (shards[4].unlocked) return;
              blueTimer += delta;
              seatPlank.position.z = Math.sin(blueTimer * 1.8) * 0.4;
              if (blueTimer > 2.8) {
                blueTimer = 0; blueBreaths++;
                audio.tone('sine', 349 + blueBreaths * 45, 1.8, 0.12);
                if (blueBreaths >= 3) {
                  audio.playPeacefulChords();
                  tgt.done = true;
                  unlockShard(4, '🕊️ PEACE', 'Calm restored.');
                } else vrHud?.show('🕊️ PEACE BREATHING', `Inhale calm... (${blueBreaths}/3)`, 'Release all stress');
              }
            } else tgt.onHit();
          }
        });
      }
    }
  };
}
