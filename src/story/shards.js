import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { stdVS } from '../shaders/common.js';
import { getTerrainHeight } from '../models/world.js';
import { T, Grp, Msh, BMat, SMat, Col, CGeo, V3 } from '../engine/three.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -25, -6, 9.2, 'Rain: You stared at code until eyes burned. Catch 3 sparks.'],
  ['Orange', 0xff7700, 25, -6, 9.2, 'Fireflies: Catch them with your hands, silly! [0/5]'],
  ['Yellow', 0xffcc00, -18, 12, 9.5, 'Voicemail: Her voice cuts through the cold silence.'],
  ['Green', 0x11cc44, 18, 12, 9.5, 'Sky: Not down where I fell. Look to stars [20s].'],
  ['Blue', 0x00aaff, -24, -18, 10.8, 'Breathe: When grief chokes you... be still [20s].'],
  ['Indigo', 0x5533ee, 24, -18, 10.5, 'Cliff: Car skidded. I pushed you clear. Forgive yourself.'],
  ['Violet', 0xcc22ee, 0, -28, 12.8, '3rd Date: What if our horse could fly? Mount unicorn.']
].map(([name, color, x, z, y, phrase], index) => ({ name, color, pos: [x, y, z], phrase, index }));

function createOrbMaterial(color) {
  return SMat({
    uniforms: { uColor: { value: Col(color) } },
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform vec3 uColor;varying vec3 vN,vV;void main(){float r=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.2);gl_FragColor=vec4(mix(uColor*.7,uColor*1.6+vec3(.4,.5,.6),r),clamp(r*.8+.3,0.,.9));}`,
    wireframe: true, transparent: true, depthWrite: false
  });
}

export function createShardsSystem(scene, onShardCollected, vrHud, pulseHaptics, getUnicornState, camera) {
  const shards = [], shardsGroup = Grp(), breakGroup = Grp(), taskGroup = Grp();
  shardsGroup.add(breakGroup, taskGroup);
  scene.add(shardsGroup);

  const shardGeo = new T.OctahedronGeometry(1, 0), shellGeo = new T.IcosahedronGeometry(1.6, 1), fragGeo = new T.DodecahedronGeometry(0.42);
  const beaconGeo = CGeo(.06, .6, 50, 4); beaconGeo.translate(0, 25, 0);
  const breakFragments = [], camPos = V3(0, 0, 0), camDir = V3(0, 0, 0);
  const rnd = () => Math.random() - .5;

  const triggerShatter = (pos, color) => {
    const mat = BMat({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < 6; i++) {
      const frag = Msh(fragGeo, mat);
      frag.position.copy(pos);
      breakGroup.add(frag);
      breakFragments.push({ frag, vel: V3(rnd() * 6, rnd() * 4 + 3, rnd() * 6), rot: V3(rnd() * 9, rnd() * 9, rnd() * 9), life: 1 });
    }
  };

  SHARDS_DATA.forEach((data, index) => {
    const core = Msh(shardGeo, createPrismaticMaterial(data.color));
    const py = data.pos[1];
    core.position.set(data.pos[0], py, data.pos[2]);

    const shell = Msh(shellGeo, createOrbMaterial(data.color));
    shell.position.copy(core.position);

    const light = new T.PointLight(data.color, 2.2, 22);
    light.position.copy(core.position);

    const beacon = Msh(beaconGeo, BMat({ color: data.color, transparent: true, opacity: 0.4, blending: 2 }));
    beacon.position.copy(core.position);

    shardsGroup.add(shell, core, light, beacon);
    core.userData = shell.userData = { index, data, initialY: py };
    shards.push({ core, shell, light, beacon, data, collected: false, unlocked: false, vib: 0 });
  });

  const vanish = (...ms) => ms.forEach(m => { if (m) { shardsGroup.remove(m); m.visible = false; } });
  let activeTask = null;

  const clearTask = () => {
    while (taskGroup.children.length) taskGroup.remove(taskGroup.children[0]);
    activeTask = null;
  };

  const unlockShard = (s) => {
    s.unlocked = true;
    vanish(s.shell, s.beacon);
    triggerShatter(s.core.position, s.data.color);
    if (pulseHaptics) pulseHaptics('both', 0.9, 250);
    audio.playPluck(880, 0.6, 0.3);
    clearTask();
    if (vrHud) vrHud.show('✨ ' + s.data.name + ' SHIELD BROKEN!', s.data.phrase, 'Click crystal to collect!');
  };

  const addNode = (s, x, y, z) => {
    const node = Msh(fragGeo, BMat({ color: s.data.color }));
    node.position.set(s.data.pos[0] + x, s.data.pos[1] + y, s.data.pos[2] + z);
    node.userData = { isTaskNode: true };
    taskGroup.add(node);
    return node;
  };

  const startShardTask = (s) => {
    const idx = s.data.index;
    clearTask();
    vrHud?.resetCall?.();

    if (idx === 2) {
      vrHud?.startCallTask?.(s, () => unlockShard(s));
      return;
    }
    if (idx === 6) {
      if (getUnicornState?.().isMounted) unlockShard(s);
      else vrHud?.show('🔮 THE 3RD DATE', s.data.phrase, 'Mount Unicorn (Click / X)');
      return;
    }
    if (idx === 4) {
      activeTask = { idx, type: 'peace', timer: 0, lastPos: null, lastRot: null };
      vrHud?.show('🔵 BREATHE', s.data.phrase, 'Stillness: 0.0s / 20.0s');
      return;
    }
    if (idx === 3) {
      activeTask = { idx, type: 'wonder', timer: 0 };
      const halo = Msh(CGeo(2.2, 2.2, 0.1, 12), BMat({ color: 0x11cc44, transparent: true, opacity: 0.75, wireframe: true }));
      halo.position.set(s.data.pos[0], s.data.pos[1] + 5.0, s.data.pos[2]);
      halo.rotation.x = Math.PI / 2;
      taskGroup.add(halo);
      vrHud?.show('🟢 CELESTIAL SKY', s.data.phrase, 'Gaze: 0.0s / 20.0s');
      return;
    }

    activeTask = { idx, type: idx === 1 ? 'play' : (idx === 5 ? 'mystery' : 'art'), step: 0 };
    if (idx === 1) {
      const node = addNode(s, 0, 0, 0);
      node.add(new T.PointLight(0xff7700, 3.5, 22));
      const a = Math.random() * 6.28, r = 14 + Math.random() * 20, px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
      node.position.set(px, getTerrainHeight(px, pz) + 1.2, pz);
      vrHud?.show('🟠 FIREFLIES', s.data.phrase, 'Progress: [0/5]');
      return;
    } else {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.28;
        addNode(s, Math.cos(a) * 1.8, (i - 1) * 0.6, Math.sin(a) * 1.8);
      }
    }
    vrHud?.show(idx === 5 ? '🟣 THE CLIFF ROAD' : '🔴 FIRST SPARK', s.data.phrase, 'Progress: [0/3]');
  };

  const onTaskNodeInteract = (node) => {
    if (!activeTask) return null;
    const s = shards[activeTask.idx];
    if (!s) return null;
    activeTask.step++;
    triggerShatter(node.position, s.data.color);
    if (pulseHaptics) pulseHaptics('right', 0.6, 90);
    audio.playPluck(400 + activeTask.step * 110, 0.4, 0.2);
    const maxSteps = activeTask.type === 'play' ? 5 : 3;
    if (activeTask.step >= maxSteps) unlockShard(s);
    else {
      if (activeTask.type === 'play') {
        const a = Math.random() * 6.28, r = 14 + Math.random() * 22, nx = Math.cos(a) * r, nz = -12 + Math.sin(a) * r;
        node.position.set(nx, getTerrainHeight(nx, nz) + 1.2, nz);
        vrHud?.show('🟠 FIREFLIES', s.data.phrase, `Progress: [${activeTask.step}/${maxSteps}]`);
      } else {
        taskGroup.remove(node);
        vrHud?.show(activeTask.idx === 5 ? '🟣 THE CLIFF ROAD' : '🔴 FIRST SPARK', s.data.phrase, `Progress: [${activeTask.step}/${maxSteps}]`);
      }
    }
    return node;
  };

  const interactShard = (shard) => {
    if (!shard || shard.collected) return null;
    if (!shard.unlocked) {
      shard.vib = 0.45;
      audio.playResonate();
      if (pulseHaptics) pulseHaptics('both', 0.65, 120);
      startShardTask(shard);
      return null;
    }
    return triggerCollect(shard);
  };

  const triggerCollect = (shard) => {
    if (!shard || shard.collected) return null;
    shard.collected = true;
    audio.playChime(shard.data.index);
    if (pulseHaptics) pulseHaptics('both', 0.85, 200);
    triggerShatter(shard.core.position, shard.data.color);
    vanish(shard.core, shard.shell, shard.beacon, shard.light);
    shard.light.intensity = 0;
    if (vrHud?.setShardCollected) vrHud.setShardCollected(shard.data.index);
    if (vrHud) vrHud.show(shard.data.name + ' RESTORED', shard.data.phrase, '✨ Awaken!');
    if (onShardCollected) onShardCollected(shard.data);
    return shard;
  };

  return {
    shards,
    getInteractiveMeshes: () => [
      ...shards.filter(s => !s.collected).map(s => s.unlocked ? s.core : s.shell),
      ...taskGroup.children
    ],
    collect: (mesh) => {
      if (mesh?.userData?.isTaskNode) return onTaskNodeInteract(mesh);
      return mesh?.userData?.index != null ? interactShard(shards[mesh.userData.index]) : null;
    },
    checkVRPunch: (pos) => {
      shards.forEach(s => {
        if (!s.collected && pos.distanceTo(s.core.position) < 1.8) interactShard(s);
      });
      taskGroup.children.forEach(node => {
        if (pos.distanceTo(node.position) < 1.2) onTaskNodeInteract(node);
      });
    },
    update: (delta) => {
      const t = performance.now() * 0.002;
      shards.forEach((s) => {
        if (!s.collected) {
          s.core.rotation.y += delta * 1.5;
          s.core.rotation.x = Math.sin(t) * 0.3;
          s.core.position.y = s.core.userData.initialY + Math.sin(t + s.core.userData.index) * 0.4;
          s.light.position.y = s.core.position.y;
          s.core.material.update?.(delta);

          if (!s.unlocked) {
            s.shell.rotation.y -= delta * 0.8;
            s.shell.rotation.z += delta * 0.5;
            s.shell.position.y = s.core.position.y;
          }

          if (s.vib > 0) {
            s.vib -= delta;
            s.core.position.x = s.data.pos[0] + rnd() * .14;
            s.core.position.z = s.data.pos[2] + rnd() * .14;
          } else {
            s.core.position.x = s.data.pos[0];
            s.core.position.z = s.data.pos[2];
          }
          if (!s.unlocked) {
            s.shell.position.x = s.core.position.x;
            s.shell.position.z = s.core.position.z;
          }
        }
      });

      if (activeTask) {
        const s = shards[activeTask.idx];
        if (s && !s.unlocked) {
          if (activeTask.type === 'wonder') {
            const tm = `${activeTask.timer.toFixed(1)}s / 20.0s`;
            if (camera) camera.getWorldDirection(camDir);
            if (camDir.y > 0.65) {
              activeTask.timer += delta;
              if (Math.random() < 0.08) audio.tone('sine', 330 + (activeTask.timer / 20) * 220, 0.12, 0.05);
              vrHud?.show('🟢 CELESTIAL SKY', s.data.phrase, `Gaze: ${tm}`);
              if (activeTask.timer >= 20) unlockShard(s);
            } else {
              vrHud?.show('🟢 CELESTIAL SKY', 'Look high into the sky!', `Gaze: ${tm}`);
            }
          } else if (activeTask.type === 'peace') {
            const tm = `${activeTask.timer.toFixed(1)}s / 20.0s`;
            if (camera) camera.getWorldPosition(camPos);
            const camQuat = camera?.quaternion;
            let moved = false;
            if (activeTask.lastPos && camQuat && activeTask.lastRot) {
              if (camPos.distanceTo(activeTask.lastPos) > 0.015 || (1 - Math.abs(camQuat.dot(activeTask.lastRot))) > 0.0004) moved = true;
            }
            if (camQuat) {
              activeTask.lastPos = camPos.clone();
              activeTask.lastRot = camQuat.clone();
            }
            if (!moved) {
              activeTask.timer += delta;
              if (Math.random() < 0.06) audio.tone('sine', 220 + Math.sin(activeTask.timer * 2) * 25, 0.15, 0.08);
              vrHud?.show('🔵 BREATHE', s.data.phrase, `Stillness: ${tm}`);
              if (activeTask.timer >= 20) unlockShard(s);
            } else {
              vrHud?.show('🔵 BREATHE', 'Movement detected... be still.', `Stillness: ${tm}`);
            }
          } else if (activeTask.type === 'play') {
            const node = taskGroup.children[0];
            if (node) {
              node.rotation.y += delta * 2.5;
              node.position.y = getTerrainHeight(node.position.x, node.position.z) + 1.2 + Math.sin(performance.now() * 0.004) * 0.25;
            }
          } else if (activeTask.type === 'mystery') {
            activeTask.rotY = (activeTask.rotY || 0) + delta * 0.32;
            const sx = s.data.pos[0], sy = s.data.pos[1], sz = s.data.pos[2];
            taskGroup.children.forEach((node, i) => {
              const a = activeTask.rotY + (i / 3) * 6.28;
              node.position.set(sx + Math.cos(a) * 1.8, sy + (i - 1) * 0.45, sz + Math.sin(a) * 1.8);
            });
          }
        }
      }

      for (let i = breakFragments.length - 1; i >= 0; i--) {
        const f = breakFragments[i];
        f.life -= delta * 1.3;
        if (f.life <= 0) {
          breakGroup.remove(f.frag);
          breakFragments.splice(i, 1);
          continue;
        }
        f.vel.y -= delta * 9.8;
        f.frag.position.addScaledVector(f.vel, delta);
        f.frag.rotation.x += f.rot.x * delta;
        f.frag.rotation.y += f.rot.y * delta;
        f.frag.scale.setScalar(Math.max(0.01, f.life));
        f.frag.material.opacity = f.life;
      }
    }
  };
}
