import { Msh, SGeo, SMat } from '../engine/three.js';
import { stdVS } from './common.js';

export function createRainbowSky(scene) {
  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0 } };

  const mat = SMat({
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;varying vec3 vWP;void main(){vec3 d=normalize(vWP);float el=clamp(d.y,0.,1.),t=uTime*.3;vec3 grey=mix(vec3(.05),vec3(.15),el),sky=mix(mix(vec3(.26,.15,.24),vec3(.96,.55,.52),smoothstep(0.,.35,el)),vec3(.16,.06,.3),smoothstep(.35,1.,el));float c1=exp(-abs(d.y-(sin(d.x*2.2+d.z*1.5+t)*.14+.28))*14.),c2=exp(-abs(d.y-(sin(d.z*2.-d.x*1.8-t*.7)*.16+.48))*12.);vec3 cCol=mix(vec3(1.,.85,.65),vec3(1.,.45,.75),sin(d.x*3.+t)*.5+.5);float star=pow(fract(sin(dot(floor(d.xz*130.+d.y*90.),vec2(13.,78.)))*43758.),52.)*smoothstep(.35,1.,el)*3.5;gl_FragColor=vec4(mix(grey,sky+(c1*.6+c2*.4)*cCol+star,uAwakened),1.);}`,
    uniforms,
    side: 1,
    depthWrite: false
  });

  const mesh = Msh(SGeo(220, 16, 12), mat);
  scene.add(mesh);

  return {
    mesh,
    uniforms,
    update: (delta) => { uniforms.uTime.value += delta; }
  };
}
