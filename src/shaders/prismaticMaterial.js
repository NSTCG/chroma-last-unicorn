import { STD_VS, RAINBOW_GLSL } from './common.js';

export function createPrismaticMaterial(opt = {}) {
  const THREE = window.THREE;
  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: opt.awakened || 0 },
    uBaseColor: { value: new THREE.Color(opt.baseColor !== undefined ? opt.baseColor : 0x505460) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: STD_VS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;uniform vec3 uBaseColor;varying vec3 vWP,vN,vVP;${RAINBOW_GLSL}void main(){vec3 N=normalize(vN),V=normalize(vVP),L=normalize(vec3(0.5,1.0,0.4));float d=max(dot(N,L),0.0)*0.65+0.35,fr=pow(1.0-max(dot(N,V),0.0),2.2);vec3 irid=rb((vWP.y*0.25+vWP.x*0.15)*2.2+uTime*0.45)*fr;vec3 col=mix(vec3(dot(uBaseColor,vec3(0.3,0.59,0.11))*0.85)*d,uBaseColor*d+irid,uAwakened);gl_FragColor=vec4(col,1.0);}`,
    side: THREE.DoubleSide
  });
  mat.setAwakened = (val) => { uniforms.uAwakened.value = val; };
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}
