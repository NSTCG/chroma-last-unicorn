// Procedural Lush Non-Uniform Grass Field with Multi-Harmonic Wind Waves & Live Controls
export function createGrassField(scene, initialCount = 14000) {
  const THREE = window.THREE;
  const maxCount = 28000;

  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.08,0,0, 0.08,0,0, -0.05,0.85,0.04,
     0.08,0,0, 0.05,0.85,0.04, -0.05,0.85,0.04,
    -0.05,0.85,0.04, 0.05,0.85,0.04, 0,1.8,0.18
  ]), 3));
  bladeGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0,0, 1,0, 0.2,0.5, 1,0, 0.8,0.5, 0.2,0.5, 0.2,0.5, 0.8,0.5, 0.5,1
  ]), 2));
  bladeGeo.computeVertexNormals();

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0.0 },
    uWS: { value: 1.0 },
    uWSt: { value: 1.0 }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      uniform mat4 directionalShadowMatrix[1];
      uniform float uTime,uWS,uWSt;
      varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;
      void main(){
        vH=uv.y;
        vec4 wp=instanceMatrix*vec4(position,1.0);
        float t=uTime*uWS;
        float w=(sin(wp.x*0.14+wp.z*0.1+t*1.5)+sin(wp.x*0.32-wp.z*0.24+t*2.8)*0.45+cos(wp.z*0.55+wp.x*0.4+t*4.0)*0.18)*0.42*uWSt;
        float b=pow(vH,1.8)*w;
        wp.x+=b;wp.z+=b*0.75;wp.y-=abs(b)*0.22*vH;
        vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.0);vVP=-mv.xyz;
        vShadowCoord=directionalShadowMatrix[0]*wp;
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      #include <packing>
      uniform sampler2D directionalShadowMap[1];
      uniform float uTime,uAwakened;
      varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;
      vec3 rb(float t){return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67)));}
      void main(){
        vec3 root=mix(vec3(0.07,0.07,0.09),vec3(0.035,0.15,0.055),uAwakened);
        float np=sin(vWP.x*0.18+1.2)*cos(vWP.z*0.18+0.8)*0.5+0.5;
        vec3 green=mix(root,mix(mix(vec3(0.16,0.82,0.24),vec3(0.34,0.94,0.36),np),rb(vWP.x*0.08+vWP.z*0.06+uTime*0.22),pow(vH,2.8)*0.45),vH);
        vec3 grey=mix(root,mix(vec3(0.15,0.15,0.18),vec3(0.24,0.24,0.28),np),vH);
        vec3 col=mix(grey,green,uAwakened);

        vec3 sc=vShadowCoord.xyz/vShadowCoord.w;
        float sh=1.0;
        if(sc.x>=0.0 && sc.x<=1.0 && sc.y>=0.0 && sc.y<=1.0 && sc.z<=1.0){
          float depth=unpackRGBAToDepth(texture2D(directionalShadowMap[0],sc.xy));
          if(sc.z>depth+0.0005) sh=0.45;
        }
        col*=(sh*0.65+0.35);
        gl_FragColor=vec4(col,1.0-smoothstep(35.0,95.0,length(vVP)));
      }
    `,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.shadowmap, uniforms]),
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, maxCount);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const base = [];
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;
  while (placed < maxCount && attempts < maxCount * 2.5) {
    attempts++;
    const a = attempts * 2.4, r = Math.sqrt(attempts / maxCount) * 50.0;
    const px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;
    const d = Math.hypot(px, pz + 12);
    const py = d < 45 ? 0 : Math.pow((d - 45) / 100, 1.7) * 38;
    const rx = (Math.random() - 0.5) * 0.35, ry = Math.random() * 6.28, rz = (Math.random() - 0.5) * 0.35;
    const s = 0.75 + Math.random() * 0.55;
    base.push({ px, py, pz, rx, ry, rz, bw: s * (0.85 + Math.random() * 0.4), bh: s * (0.8 + Math.random() * 0.7) });
    placed++;
  }

  let curCount = initialCount, curW = 1.0, curH = 1.0;

  const rebuild = () => {
    const active = Math.min(curCount, base.length);
    mesh.count = active;
    for (let i = 0; i < active; i++) {
      const b = base[i];
      dummy.position.set(b.px, b.py, b.pz);
      dummy.rotation.set(b.rx, b.ry, b.rz);
      dummy.scale.set(b.bw * curW, b.bh * curH, b.bw * curW);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  rebuild();
  scene.add(mesh);

  return {
    mesh,
    params: {
      get count() { return curCount; },
      set count(v) { curCount = Math.min(maxCount, Math.max(500, v)); rebuild(); },
      get widthScale() { return curW; },
      set widthScale(v) { curW = v; rebuild(); },
      get heightScale() { return curH; },
      set heightScale(v) { curH = v; rebuild(); },
      get windSpeed() { return mat.uniforms.uWS.value; },
      set windSpeed(v) { mat.uniforms.uWS.value = v; },
      get windStrength() { return mat.uniforms.uWSt.value; },
      set windStrength(v) { mat.uniforms.uWSt.value = v; }
    },
    setAwakened: (val) => { mat.uniforms.uAwakened.value = val; },
    update: (delta) => { mat.uniforms.uTime.value += delta; }
  };
}
