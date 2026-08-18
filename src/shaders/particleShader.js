export function createParticleSystem(scene, count = 1500) {
  const THREE = window.THREE;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), seed = new Float32Array(count * 2);
  const rgb = [
    [1, 0.27, 0.4], [1, 0.6, 0.13], [1, 0.92, 0.2],
    [0.2, 0.93, 0.47], [0, 0.83, 1], [0.47, 0.33, 1], [0.93, 0.27, 1]
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3, r = 2.0 + Math.sqrt(Math.random()) * 92.0, th = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(th) * r;
    pos[i3 + 1] = 0.4 + Math.random() * 14.0;
    pos[i3 + 2] = Math.sin(th) * r;
    const c = rgb[i % 7];
    col[i3] = c[0]; col[i3 + 1] = c[1]; col[i3 + 2] = c[2];
    seed[i * 2] = Math.random() * 6.28;
    seed[i * 2 + 1] = 0.6 + Math.random() * 0.8;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('customColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 customColor;attribute vec2 aSeed;uniform float uTime,uAwakened;varying vec3 vColor;void main(){vColor=mix(vec3(0.7),customColor,uAwakened);vec3 p=position;float t=uTime*aSeed.y+aSeed.x,w=sin(p.x*0.1+p.z*0.08+t*1.5)+cos(p.z*0.2-p.x*0.1+t*2.0)*0.5;p.xz+=vec2(sin(t+p.z*0.04)*2.0+w*1.5,cos(t+p.x*0.04)*1.8+w);p.y+=sin(t*2.0+p.x*0.2)*0.7+abs(sin(t*0.6))*0.6;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp((72.0/-mv.z)*(2.2+uAwakened*1.5),5.0,64.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vColor;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float c=pow(1.0-d*2.0,2.0);gl_FragColor=vec4(mix(vColor,vec3(1.0),c*0.75)*(1.5+c),c*0.95);}`,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  points.position.set(0, 0, -12);
  scene.add(points);

  return {
    uniforms,
    update: (delta) => { uniforms.uTime.value += delta; }
  };
}
