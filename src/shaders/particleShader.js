import { T, SMat } from '../engine/three.js';
import { glslRainbow } from './common.js';

export function createParticleSystem(scene, count = 1200) {
  const geo = new T.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3, r = 2 + Math.sqrt(Math.random()) * 92, th = Math.random() * 6.28;
    pos[i3] = Math.cos(th) * r;
    pos[i3 + 1] = 0.5 + Math.random() * 8;
    pos[i3 + 2] = Math.sin(th) * r;
  }

  geo.setAttribute('position', new T.BufferAttribute(pos, 3));

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = SMat({
    vertexShader: `uniform float uTime,uAwakened;varying vec3 vCol;${glslRainbow}void main(){vec3 p=position;p.y+=sin(uTime*1.5+p.x*.2)*.6;vCol=mix(vec3(.85),rb(p.x*.06+uTime*.15),uAwakened);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(110./-mv.z,3.,45.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;varying vec3 vCol;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vCol,1.-d*2.);}`,
    uniforms,
    transparent: true,
    blending: 2,
    depthWrite: false
  });

  const points = new T.Points(geo, mat);
  points.position.set(0, 0, -12);
  scene.add(points);

  return { uniforms, update: (delta) => { uniforms.uTime.value += delta; } };
}
