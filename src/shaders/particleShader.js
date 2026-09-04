export function createParticleSystem(scene, count = 900) {
  const THREE = window.THREE;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    const r = 2.0 + Math.sqrt(Math.random()) * 90, a = Math.random() * 6.28;
    pos[i] = Math.cos(a) * r;
    pos[i + 1] = Math.random() * 12;
    pos[i + 2] = Math.sin(a) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: `uniform float uTime,uAwakened;varying vec3 vC;void main(){vec3 p=position;float t=uTime+p.x*0.1;p.y+=sin(t*2.0+p.z*0.2)*0.6;p.xz+=vec2(sin(t)*1.2,cos(t)*1.2);vC=mix(vec3(0.6),vec3(0.5)+vec3(0.5)*cos(6.28*(vec3(p.x*0.02)+vec3(0,0.33,0.67))),uAwakened);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(120.0/-mv.z,3.0,40.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;varying vec3 vC;void main(){if(length(gl_PointCoord-0.5)>0.5)discard;gl_FragColor=vec4(vC*1.5,0.9);}`,
    uniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  points.position.set(0, 0, -12);
  scene.add(points);
  return { uniforms, update: (delta) => { uniforms.uTime.value += delta; } };
}
