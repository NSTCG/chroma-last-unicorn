import { T, SMat } from '../engine/three.js';
import { glslRainbow } from './common.js';

export function createParticleSystem(scene, count = 1500) {
  const geo = new T.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3, r = 2 + Math.sqrt(Math.random()) * 92, th = Math.random() * 6.28;
    pos[i3] = Math.cos(th) * r;
    pos[i3 + 1] = i % 2 ? .4 + Math.random() * 14 : .2 + Math.random() * 2.8;
    pos[i3 + 2] = Math.sin(th) * r;
    seed[i * 2] = Math.random() * 6.28;
    seed[i * 2 + 1] = .6 + Math.random() * .8;
  }

  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new T.BufferAttribute(seed, 2));

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = SMat({
    vertexShader: `attribute vec2 aSeed;uniform float uTime,uAwakened;varying vec3 vColor;varying float vBlade;${glslRainbow}void main(){vColor=mix(vec3(.7,.7,.7),rb(aSeed.x*.16),uAwakened);vec3 p=position;float t=uTime*aSeed.y+aSeed.x,g=sin(p.x*.06+p.z*.05+uTime*2.2)*1.8,w=sin(p.x*.12+p.z*.09+t*2.8);p.xz+=vec2(sin(t+p.z*.04)*2.+w*1.5+g,cos(t+p.x*.04)*1.8+w+g*.7);p.y+=sin(t*2.+p.x*.2)*.7;vBlade=step(.5,fract(aSeed.x*3.7));vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((72./-mv.z)*(2.2+uAwakened*1.5)*(vBlade>.5?1.4:1.),4.,56.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;varying vec3 vColor;varying float vBlade;void main(){vec2 uv=gl_PointCoord-vec2(.5);float d=length(uv);if(d>.5)discard;float c=pow(1.-d*2.,1.8);gl_FragColor=vec4(mix(vColor,vec3(1.,1.,1.),c*.65)*(1.4+c),c*.95);}`,
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
