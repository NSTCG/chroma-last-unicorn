// Procedural Volumetric Distance Fog Cards with Wind Motion & Proximity Dissolve
export function createFogCards(scene, count = 24) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  scene.add(group);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uFogDensity: { value: 1.0 }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv;varying vec3 vWP,vVP;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime,uAwakened,uFogDensity;varying vec2 vUv;varying vec3 vWP,vVP;void main(){float d=length(vVP),pF=smoothstep(18.0,55.0,d),hF=1.0-smoothstep(150.0,230.0,d),edge=pow(sin(vUv.x*3.1416)*sin(vUv.y*3.1416),1.8),t=uTime*0.25,wisp=sin(vWP.x*0.06+vWP.z*0.05+t*0.8)*cos(vWP.z*0.08-vWP.x*0.04-t*0.6)*0.5+0.5;vec3 col=mix(vec3(0.55,0.58,0.68),vec3(0.88,0.62,0.76)+vec3(0.06,0.08,0.12)*sin(t+vWP.x*0.1),uAwakened);gl_FragColor=vec4(col,edge*(0.24+wisp*0.32)*pF*hF*uFogDensity);}`,
    uniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const cards = [];
  const planeGeo = new THREE.PlaneGeometry(42, 20);
  group.renderOrder = 20;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r = 62.0 + Math.random() * 110.0;
    const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r;
    const y = 3.5 + Math.random() * 14.0 + (r > 90 ? Math.pow((r - 90) / 120, 1.7) * 22 : 0);

    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.5, 1.0);
    mesh.renderOrder = 20;
    group.add(mesh);
    cards.push({ mesh, baseY: y, basePos: mesh.position.clone(), driftSpeed: 0.2 + Math.random() * 0.3 });
  }

  return {
    uniforms,
    setDensity: (v) => { uniforms.uFogDensity.value = v; },
    setAwakened: (v) => { uniforms.uAwakened.value = v; },
    update: (delta, camera) => {
      uniforms.uTime.value += delta;
      const t = uniforms.uTime.value;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        c.mesh.position.x = c.basePos.x + Math.sin(t * c.driftSpeed + i) * 6.0;
        c.mesh.position.z = c.basePos.z + Math.cos(t * c.driftSpeed * 0.8 + i) * 4.0;
        c.mesh.position.y = c.baseY + Math.sin(t * 0.4 + i * 1.5) * 1.2;
        if (camera) c.mesh.quaternion.copy(camera.quaternion);
      }
    }
  };
}
