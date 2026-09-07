import { getTerrainHeight } from './world.js';
import { Grp, Msh, SMat, PGeo } from '../engine/three.js';

export function createFogCards(scene, count = 48) {
  const group = Grp();
  scene.add(group);

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0 }, uFogDensity: { value: 0.55 } };

  const mat = SMat({
    vertexShader: `varying vec2 vUv;varying vec3 vWP,vVP;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(0.,0.,0.,1.);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);vec2 sz=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));mv.xy+=position.xy*sz;vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened,uFogDensity;varying vec2 vUv;varying vec3 vWP,vVP;void main(){float d=length(vVP),pF=smoothstep(4.,16.,d),hF=1.-smoothstep(150.,260.,d),bFade=smoothstep(0.,.42,vUv.y),tFade=smoothstep(1.,.6,vUv.y),edge=pow(sin(vUv.x*3.1416),1.4)*bFade*tFade,t=uTime*.25,wisp=sin(vWP.x*.06+vWP.z*.05+t*.8)*cos(vWP.z*.08-vWP.x*.04-t*.6)*.5+.5;vec3 col=mix(vec3(.55,.58,.68),vec3(.72,.64,.78)+vec3(.04,.04,.08)*sin(t+vWP.x*.1),uAwakened);gl_FragColor=vec4(col,edge*(.24+wisp*.28)*pF*hF*uFogDensity);}`,
    uniforms, transparent: true, depthTest: true, depthWrite: false, side: 2
  });

  const cards = [];
  const planeGeo = PGeo(1, 1);
  planeGeo.translate(0, 0.5, 0);
  group.renderOrder = 20;

  for (let i = 0; i < count; i++) {
    const tier = i % 3, a = (i / count) * 6.28318 + (Math.random() - 0.5) * 0.45;
    const r = tier === 0 ? 14 + Math.random() * 38 : (tier === 1 ? 55 + Math.random() * 55 : 110 + Math.random() * 95);
    const w = tier === 0 ? 18 + Math.random() * 12 : (tier === 1 ? 38 + Math.random() * 20 : 60 + Math.random() * 35);
    const h = tier === 0 ? 7 + Math.random() * 5 : (tier === 1 ? 16 + Math.random() * 8 : 24 + Math.random() * 14);
    const yOff = tier === 0 ? 0.1 : (tier === 1 ? 0.4 + Math.random() * 2.5 : 1.0 + Math.random() * 6.0);

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
