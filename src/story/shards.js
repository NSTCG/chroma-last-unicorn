import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { stdVS } from '../shaders/common.js';
import { T, Grp, Msh, BMat, SMat, Col, CGeo, V3 } from '../engine/three.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -25, -6, 9.2, 'Click 3 red sparks'],
  ['Orange', 0xff7700, 25, -6, 9.2, 'Catch spark 3 times'],
  ['Yellow', 0xffcc00, -18, 12, 9.5, 'Answer Maya call'],
  ['Green', 0x11cc44, 18, 12, 9.5, 'Look up at sky halo'],
  ['Blue', 0x00aaff, -24, -18, 10.8, 'Hold still & breathe'],
  ['Indigo', 0x5533ee, 24, -18, 10.5, 'Hit 3 rotating runes'],
  ['Violet', 0xcc22ee, 0, -28, 12.8, 'Ride unicorn to shard']
].map(([name, color, x, z, y, hint], index) => ({ name, color, pos: [x, y, z], phrase: name + ' restored.', hint, action: '✨ Awaken!', index }));


function createOrbMaterial(color) {
  const uniforms = { uTime: { value: 0 }, uColor: { value: Col(color) } };
  const mat = SMat({
    uniforms,
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime;uniform vec3 uColor;varying vec3 vWP,vN,vV;void main(){vec3 N=normalize(vN),V=normalize(vV);float r=pow(1.-max(dot(N,V),0.),2.2);gl_FragColor=vec4(mix(uColor*.7,uColor*1.6+vec3(.4,.5,.6),r),clamp(r*.8+.3,0.,.9));}`,
    wireframe: true,
    transparent: true,
    depthWrite: false
  });
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}

export function createShardsSystem(scene, onShardCollected, vrHud, pulseHaptics, getUnicornState, camera) {
  const shards = [], shardsGroup = Grp(), breakGroup = Grp(), taskGroup = Grp();
  shardsGroup.add(breakGroup, taskGroup);
  scene.add(shardsGroup);

  const shardGeo = new T.OctahedronGeometry(1, 0);
  const shellGeo = new T.IcosahedronGeometry(1.6, 1);
  const beaconGeo = CGeo(.06, .6, 50, 4);
  beaconGeo.translate(0, 25, 0);
  const fragGeo = new T.DodecahedronGeometry(0.38);
  const breakFragments = [];

  const rnd = () => Math.random() - .5;

  const triggerShatter = (pos, color) => {
    const mat = BMat({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < 14; i++) {
      const frag = Msh(fragGeo, mat);
      frag.position.copy(pos);
      breakGroup.add(frag);
      breakFragments.push({ frag, vel: V3(rnd() * 8, Math.random() * 6 + 2, rnd() * 8), rot: V3(rnd() * 12, rnd() * 12, rnd() * 12), life: 1 });
    }
  };

  SHARDS_DATA.forEach((data, index) => {
    const core = Msh(shardGeo, createPrismaticMaterial({ baseColor: data.color, awakened: 1 }));
    const py = data.pos[1];
    core.position.set(data.pos[0], py, data.pos[2]);

    const shell = Msh(shellGeo, createOrbMaterial(data.color));
    shell.position.copy(core.position);
    core.castShadow = true;

    const light = new T.PointLight(data.color, 2.2, 22);
    light.position.copy(core.position);

    const beacon = Msh(beaconGeo, BMat({ color: data.color, transparent: true, opacity: 0.4, blending: 2 }));
    beacon.position.copy(core.position);

    shardsGroup.add(shell, core, light, beacon);

    core.userData = shell.userData = { index, data, initialY: py };
    shards.push({ core, shell, light, beacon, data, collected: false, unlocked: false, vib: 0 });
  });

  const vanish = (...ms) => ms.forEach(m => {
    if (m) { shardsGroup.remove(m); m.visible = false; }
  });

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
      else vrHud?.show('🦄 ' + s.data.name + ' SHARD', s.data.hint, 'Mount Unicorn (Click / X)');
      return;
    }

    if (idx === 4) {
      activeTask = { idx, type: 'peace', timer: 0 };
      vrHud?.show('🕊️ ' + s.data.name + ' SHARD', s.data.hint, 'Stillness: 0.0s / 2.5s');
      return;
    }

    if (idx === 3) {
      activeTask = { idx, type: 'wonder', timer: 0 };
      const halo = Msh(CGeo(1.8, 1.8, 0.1, 12), BMat({ color: 0x11cc44, transparent: true, opacity: 0.75, wireframe: true }));
      halo.position.set(s.data.pos[0], s.data.pos[1] + 3.6, s.data.pos[2]);
      halo.rotation.x = Math.PI / 2;
      taskGroup.add(halo);
      vrHud?.show('🌿 ' + s.data.name + ' SHARD', s.data.hint, 'Gaze directly up at halo');
      return;
    }

    activeTask = { idx, type: idx === 1 ? 'play' : (idx === 5 ? 'mystery' : 'art'), step: 0 };
    if (idx === 1) {
      addNode(s, 1.8, 0.3, 0.8);
    } else {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.28;
        addNode(s, Math.cos(a) * 1.8, (i - 1) * 0.6, Math.sin(a) * 1.8);
      }
    }
    vrHud?.show('✨ ' + s.data.name + ' SHARD', s.data.hint, 'Progress: [0/3]');
  };

  const onTaskNodeInteract = (node) => {
    if (!activeTask) return null;
    const s = shards[activeTask.idx];
    if (!s) return null;
    activeTask.step++;
    triggerShatter(node.position, s.data.color);
    if (pulseHaptics) pulseHaptics('right', 0.6, 90);
    audio.playPluck(400 + activeTask.step * 110, 0.4, 0.2);
    if (activeTask.step >= 3) unlockShard(s);
    else {
      if (activeTask.type === 'play') {
        const a = activeTask.step * 2.2;
        node.position.set(s.data.pos[0] + Math.cos(a) * 1.9, s.data.pos[1] + (activeTask.step - 1) * 0.5, s.data.pos[2] + Math.sin(a) * 1.9);
      } else {
        taskGroup.remove(node);
      }
      vrHud?.show('✨ ' + s.data.name + ' SHARD', s.data.hint, `Progress: [${activeTask.step}/3]`);
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
    if (vrHud) vrHud.show(shard.data.name + ' RESTORED', shard.data.phrase, shard.data.action);
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
            s.shell.material.update?.(delta);
          }

          if (s.vib > 0) {
            s.vib -= delta;
            const vx = rnd() * .14, vz = rnd() * .14;
            s.core.position.x = s.data.pos[0] + vx;
            s.core.position.z = s.data.pos[2] + vz;
            if (!s.unlocked) {
              s.shell.position.x = s.core.position.x;
              s.shell.position.z = s.core.position.z;
            }
          } else {
            s.core.position.x = s.data.pos[0];
            s.core.position.z = s.data.pos[2];
            if (!s.unlocked) {
              s.shell.position.x = s.data.pos[0];
              s.shell.position.z = s.data.pos[2];
            }
          }
        }
      });

      if (activeTask) {
        const s = shards[activeTask.idx];
        if (s && !s.unlocked) {
          if (activeTask.type === 'wonder') {
            const dir = V3(0, 0, 0);
            if (camera) camera.getWorldDirection(dir);
            if (dir.y > 0.38) {
              activeTask.timer += delta;
              audio.tone('sine', 330 + activeTask.timer * 180, 0.12, 0.05);
              vrHud?.show('🌿 WONDER: SKY GAZE', 'Absorbing celestial light...', `Gaze: ${(activeTask.timer).toFixed(1)}s / 2.0s`);
              if (activeTask.timer >= 2.0) unlockShard(s);
            }
          } else if (activeTask.type === 'peace') {
            activeTask.timer += delta;
            if (Math.random() < 0.08) audio.tone('sine', 220 + Math.sin(activeTask.timer * 3) * 30, 0.15, 0.08);
            vrHud?.show('🕊️ PEACE: STILLNESS', 'Breathe with sanctuary...', `Stillness: ${(activeTask.timer).toFixed(1)}s / 2.5s`);
            if (activeTask.timer >= 2.5) unlockShard(s);
          } else if (activeTask.type === 'mystery') {
            taskGroup.rotation.y += delta * 1.2;
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
