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
    fragmentShader: `precision highp float;uniform float uTime;uniform vec3 uBaseColor;varying vec3 vWP,vN,vV;${glslRainbow}void main(){vec3 N=normalize(vN),V=normalize(vV);float d=max(dot(N,vec3(.3,.8,.5)),0.)*.65+.35,fr=pow(1.-max(dot(N,V),0.),2.2);vec3 irid=rb((vWP.y*.25+vWP.x*.15)*2.2+uTime*.45)*fr;gl_FragColor=vec4(uBaseColor*d+irid,1.);}`,
    side: 2
  });
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}
