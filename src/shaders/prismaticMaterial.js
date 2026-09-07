import { stdVS, glslRainbow } from './common.js';
import { Col, SMat } from '../engine/three.js';

export function createPrismaticMaterial(opt = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: opt.awakened || 0 },
    uBaseColor: { value: Col(opt.baseColor !== undefined ? opt.baseColor : 0x505460) }
  };
  const mat = SMat({
    uniforms,
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;uniform vec3 uBaseColor;varying vec3 vWP,vN,vV;${glslRainbow}void main(){vec3 N=normalize(vN),V=normalize(vV),L=normalize(vec3(.5,1.,.4));float d=max(dot(N,L),0.)*.65+.35,fr=pow(1.-max(dot(N,V),0.),2.2);vec3 irid=rb((vWP.y*.25+vWP.x*.15)*2.2+uTime*.45)*fr;float spk=pow(fract(sin(dot(floor(vWP*22.),vec3(13.,78.,45.)))*43758.),20.)*10.;float lum=dot(uBaseColor,vec3(.3,.59,.11))*.85;vec3 col=mix(vec3(lum)*d,uBaseColor*d+irid+spk*uBaseColor,uAwakened);gl_FragColor=vec4(col,1.);}`,
    side: 2
  });
  mat.setAwakened = (val) => { uniforms.uAwakened.value = val; };
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}
