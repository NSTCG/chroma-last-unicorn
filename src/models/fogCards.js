import { getTerrainHeight } from './world.js';
import { Grp, Msh, SMat, PGeo } from '../engine/three.js';

export function createFogCards(scene, count = 48) {
  const group = Grp();
  scene.add(group);

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0 }, uFogDensity: { value: 0.55 } };

  const mat = SMat({
    vertexShader: `varying vec2 vUv;varying vec3 vWP,vVP;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(0.,0.,0.,1.);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened,uFogDensity;varying vec2 vUv;varying vec3 vWP,vVP;void main(){float d=length(vVP),pF=smoothstep(4.,16.,d)*smoothstep(260.,150.,d),edge=sin(vUv.x*3.14)*smoothstep(0.,.4,vUv.y)*smoothstep(1.,.6,vUv.y),t=uTime*.25,wisp=sin(vWP.x*.06+vWP.z*.05+t*.8)*cos(vWP.z*.08-vWP.x*.04-t*.6)*.5+.5;vec3 col=mix(vec3(.55,.58,.68),vec3(.72,.64,.78),uAwakened);gl_FragColor=vec4(col,edge*(.24+wisp*.28)*pF*uFogDensity);}`,
    uniforms, transparent: true, depthTest: true, depthWrite: false, side: 2
  });

  const cards = [];
  const planeGeo = PGeo(1, 1);
  planeGeo.translate(0, 0.5, 0);
  group.renderOrder = 20;

  for (let i = 0; i < count; i++) {
    const tier = i % 3, a = (i / count) * 6.283 + (Math.random() - 0.5) * 0.45, rnd = Math.random;
    const r = tier * 48 + 14 + rnd() * (38 + tier * 28), w = tier * 20 + 18 + rnd() * (12 + tier * 10), h = tier * 8 + 7 + rnd() * (5 + tier * 4);
    const yOff = tier === 0 ? 0.1 : 0.4 + rnd() * 3;

    const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r, y = getTerrainHeight(x, z) + yOff;
    const mesh = Msh(planeGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, 1);
    mesh.renderOrder = 20;
    group.add(mesh);
    cards.push({ mesh, baseY: y, basePos: mesh.position.clone(), driftSpeed: 0.12 + Math.random() * 0.22 });
  }

  return {
    uniforms,
    setDensity: (v) => { uniforms.uFogDensity.value = v; },
    setAwakened: (v) => { uniforms.uAwakened.value = v; },
    update: (delta) => {
      uniforms.uTime.value += delta;
      const t = uniforms.uTime.value;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        c.mesh.position.x = c.basePos.x + Math.sin(t * c.driftSpeed + i) * 6;
        c.mesh.position.z = c.basePos.z + Math.cos(t * c.driftSpeed * 0.8 + i) * 4;
        c.mesh.position.y = c.baseY + Math.sin(t * 0.4 + i * 1.5) * 1.2;
      }
    }
  };
}
