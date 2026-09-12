import { stdVS, glslRainbow } from './common.js';
import { Col, SMat } from '../engine/three.js';

export function createPrismaticMaterial(baseColor) {
  const uniforms = {
    uTime: { value: 0 },
    uBaseColor: { value: Col(baseColor) }
  };
  const mat = SMat({
    uniforms,
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime;uniform vec3 uBaseColor;varying vec3 vWP,vN,vV;${glslRainbow}void main(){vec3 N=normalize(vN),V=normalize(vV);float d=max(dot(N,vec3(.3,.8,.5)),0.)*.6+.4,fr=pow(1.-max(dot(N,V),0.),2.);gl_FragColor=vec4(uBaseColor*d+rb((vWP.y+vWP.x)*.4+uTime*.4)*fr,1.);}`,
    side: 2
  });
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}
