export function createPrismaticMaterial(opt = {}) {
  const THREE = window.THREE;
  const uniforms = {
    uTime: { value: 0 },
    uColorAwakened: { value: opt.awakened || 0 },
    uBaseColor: { value: new THREE.Color(opt.baseColor !== undefined ? opt.baseColor : 0xffffff) },
    uIridescence: { value: opt.iridescence !== undefined ? opt.iridescence : 1.2 },
    uDispersion: { value: opt.dispersion !== undefined ? opt.dispersion : 2.2 },
    uGlitter: { value: opt.glitter !== undefined ? opt.glitter : 1.0 },
    uEmissive: { value: opt.emissive || 0 },
    uFadeIntensity: { value: opt.fadeIntensity || 0.65 }
  };

  const mat = new THREE.MeshStandardMaterial({
    color: opt.baseColor !== undefined ? opt.baseColor : 0x505460,
    roughness: 0.65, metalness: 0.15, side: THREE.DoubleSide, transparent: true, depthWrite: true
  });
  mat.uniforms = uniforms;

  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = `varying vec3 vWPos;\n` + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    s.fragmentShader = `uniform float uTime,uColorAwakened,uIridescence,uDispersion,uGlitter,uEmissive,uFadeIntensity;uniform vec3 uBaseColor;varying vec3 vWPos;\n` + s.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec3 irid=(vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*((vWPos.y*0.25+vWPos.x*0.15)*uDispersion+uTime*0.45)+vec3(0.0,0.33,0.67))))*(uIridescence*0.35+uEmissive);
      float spk=pow(fract(sin(dot(floor(vWPos*22.0),vec3(12.9898,78.233,45.164)))*43758.5453),20.0)*uGlitter*10.0;
      gl_FragColor.rgb=mix(vec3(dot(gl_FragColor.rgb,vec3(0.299,0.587,0.114))*0.85),gl_FragColor.rgb+irid+spk*uBaseColor,uColorAwakened);
      gl_FragColor.a=1.0-smoothstep(70.0,200.0,length(vWPos-cameraPosition))*uFadeIntensity;`);
  };

  return mat;
}
