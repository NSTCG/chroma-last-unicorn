import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { audio } from '../audio/synth.js';
import { stdVS } from '../shaders/common.js';
import { T, Grp, Msh, BMat, SMat, Col, CGeo, V3 } from '../engine/three.js';

export const SHARDS_DATA = [
  ['Red', 0xff2244, -25, -6, 9.2, 'Fire', 'Art'],
  ['Orange', 0xff7700, 25, -6, 9.2, 'Play', 'Play'],
  ['Yellow', 0xffcc00, -18, 12, 9.5, 'Warmth', 'Call'],
  ['Green', 0x11cc44, 18, 12, 9.5, 'Wonder', 'Sky'],
  ['Blue', 0x00aaff, -24, -18, 10.8, 'Peace', 'Breathe'],
  ['Indigo', 0x5533ee, 24, -18, 10.5, 'Mystery', 'Read'],
  ['Violet', 0xcc22ee, 0, -28, 12.8, 'Dreams', 'Dream']
].map(([name, color, x, z, y, phrase, action], index) => ({ name, color, pos: [x, y, z], phrase: phrase + ' returned.', action: '✨ ' + action + '!', index }));


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

export function createShardsSystem(scene, onShardCollected, vrHud, pulseHaptics) {
  const shards = [], shardsGroup = Grp(), breakGroup = Grp();
  shardsGroup.add(breakGroup);
  scene.add(shardsGroup);

  const shardGeo = new T.OctahedronGeometry(1, 0);
  const shellGeo = new T.IcosahedronGeometry(1.6, 1);
  const beaconGeo = CGeo(.06, .6, 50, 4);
  beaconGeo.translate(0, 25, 0);
  const fragGeo = new T.TetrahedronGeometry(0.24);
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

  const interactShard = (shard) => {
    if (!shard || shard.collected) return null;
    if (!shard.unlocked) {
      shard.vib = 0.45;
      audio.playResonate();
      if (pulseHaptics) pulseHaptics('both', 0.65, 120);
      if (shard.data.index === 2) {
        if (vrHud?.startCallTask) vrHud.startCallTask(shard, () => {
          shard.unlocked = true;
          vanish(shard.shell, shard.beacon);
          triggerShatter(shard.core.position, shard.data.color);
          if (pulseHaptics) pulseHaptics('both', 0.9, 250);
        });
      } else if (shards[2]?.unlocked || shards[2]?.collected) {
        shard.unlocked = true;
        vanish(shard.shell, shard.beacon);
        audio.playPluck(720, 0.4, 0.25);
        triggerShatter(shard.core.position, shard.data.color);
        if (pulseHaptics) pulseHaptics('both', 0.8, 180);
        if (vrHud) vrHud.show(shard.data.name + ' SHELL BROKEN!', shard.data.phrase, 'Punch to collect crystal!');
      } else if (vrHud) {
        vrHud.show(shard.data.name + ' [LOCKED]', 'Protection active', 'Unlock Yellow Shard first!');
      }
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
    getInteractiveMeshes: () => shards.filter(s => !s.collected).map(s => s.unlocked ? s.core : s.shell),
    collect: (mesh) => mesh?.userData ? interactShard(shards[mesh.userData.index]) : null,
    checkVRPunch: (pos) => {
      shards.forEach(s => {
        if (!s.collected && pos.distanceTo(s.core.position) < 1.8) interactShard(s);
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
