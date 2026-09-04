export function createPrismaticMaterial(opt = {}) {
  const THREE = window.THREE;
  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: opt.awakened || 0 },
    uBaseColor: { value: new THREE.Color(opt.baseColor !== undefined ? opt.baseColor : 0x505460) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vWP,vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;uniform vec3 uBaseColor;varying vec3 vWP,vN,vV;void main(){vec3 N=normalize(vN),V=normalize(vV),L=normalize(vec3(0.5,1.0,0.4));float d=max(dot(N,L),0.0)*0.65+0.35,fr=pow(1.0-max(dot(N,V),0.0),2.2);vec3 irid=(vec3(0.5)+vec3(0.5)*cos(6.28318*((vWP.y*0.25+vWP.x*0.15)*2.2+uTime*0.45+vec3(0,0.33,0.67))))*fr;vec3 col=mix(vec3(dot(uBaseColor,vec3(0.3,0.59,0.11))*0.85)*d,uBaseColor*d+irid,uAwakened);gl_FragColor=vec4(col,1.0);}`,
    side: THREE.DoubleSide
  });
  mat.setAwakened = (val) => { uniforms.uAwakened.value = val; };
  mat.update = (delta) => { uniforms.uTime.value += delta; };
  return mat;
}

