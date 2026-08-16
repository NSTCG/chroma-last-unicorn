// Celestial Unicorn with Crisp Cel-Toon Outlines, Shadow Casting & Dynamic Flight

export function createUnicorn(scene) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uColorAwakened: { value: 0.0 } };

  const vertexShader = `
    varying vec3 vN,vWP,vVP;
    void main(){
      vN=normalize(normalMatrix*normal);
      vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;
      vec4 mv=modelViewMatrix*vec4(position,1.0);vVP=-mv.xyz;
      gl_Position=projectionMatrix*mv;
    }
  `;

  const fragmentShader = `
    uniform float uTime,uColorAwakened,uMat;
    varying vec3 vN,vWP,vVP;
    vec3 rb(float t){return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67)));}
    void main(){
      vec3 N=normalize(gl_FrontFacing?vN:-vN),V=normalize(vVP);
      vec3 L=normalize(vec3(0.5,1.0,0.4));
      float d=max(dot(N,L),0.0);
      float toon=smoothstep(0.0,0.08,d)*0.35+smoothstep(0.35,0.45,d)*0.65;
      float spec=pow(max(dot(reflect(-L,N),V),0.0),24.0);
      float fr=pow(1.0-max(dot(N,V),0.0),2.2);
      float outl=smoothstep(0.70,0.78,1.0-max(dot(N,V),0.0));

      vec3 pearl=vec3(0.96,0.97,1.0)*(toon*0.75+0.25)+rb(vWP.y*0.3+uTime*0.3)*fr*0.35;
      vec3 gold=vec3(1.0,0.82,0.28)*(toon*0.75+0.25)+rb(uTime*0.4+vWP.y*0.4)*fr*0.55;
      vec3 hair=rb(vWP.y*1.4+vWP.z*1.2+uTime*0.6)*(toon*0.8+0.2)+spec*vec3(0.8);

      vec3 base=uMat>1.5?hair:(uMat>0.5?gold:pearl);
      vec3 col=mix(vec3(0.15+toon*0.15),mix(base+spec*0.4,vec3(0.04,0.04,0.08),outl*0.92),uColorAwakened);
      gl_FragColor=vec4(col,1.0-smoothstep(70.0,200.0,length(vVP))*0.65);
    }
  `;

  const makeMat = (uMat) => new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: { ...uniforms, uMat: { value: uMat } },
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const pearlMat = makeMat(0.0), goldMat = makeMat(1.0), rainbowMat = makeMat(2.0);
  const body = new THREE.Group();
  group.add(body);

  // 1. Torso
  const chestGeo = new THREE.SphereGeometry(0.38, 8, 8);
  chestGeo.scale(0.9, 1.15, 1.15);
  const chest = new THREE.Mesh(chestGeo, pearlMat);
  chest.position.set(0, 1.30, 0.44);

  const barrelGeo = new THREE.CylinderGeometry(0.36, 0.26, 0.90, 8);
  barrelGeo.rotateX(Math.PI / 2);
  barrelGeo.scale(0.9, 1.15, 1.0);
  const barrel = new THREE.Mesh(barrelGeo, pearlMat);
  barrel.position.set(0, 1.25, 0.0);

  const rumpGeo = new THREE.SphereGeometry(0.27, 8, 8);
  rumpGeo.scale(0.9, 1.08, 1.08);
  const rump = new THREE.Mesh(rumpGeo, pearlMat);
  rump.position.set(0, 1.20, -0.45);
  body.add(chest, barrel, rump);

  // 2. Neck & Head
  const neckHeadPivot = new THREE.Group();
  body.add(neckHeadPivot);

  const rings = [
    [0.44,1.30,0.22,0.28],[0.62,1.54,0.18,0.23],[0.82,1.76,0.14,0.18],
    [1.02,1.94,0.12,0.15],[1.20,1.94,0.13,0.14],[1.38,1.78,0.09,0.10],[1.56,1.66,0.06,0.07]
  ];
  const segs = 8, verts = [], inds = [];
  rings.forEach(([rz, ry, rx, rry]) => {
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      verts.push(Math.cos(a) * rx, ry + Math.sin(a) * rry, rz);
    }
  });
  const tipIdx = verts.length / 3;
  verts.push(0, 1.64, 1.62);

  for (let r = 0; r < rings.length - 1; r++) {
    const r0 = r * segs, r1 = (r + 1) * segs;
    for (let i = 0; i < segs; i++) {
      const n = (i + 1) % segs;
      inds.push(r0 + i, r0 + n, r1 + n, r0 + i, r1 + n, r1 + i);
    }
  }
  const lastRing = (rings.length - 1) * segs;
  for (let i = 0; i < segs; i++) inds.push(lastRing + i, lastRing + (i + 1) % segs, tipIdx);

  const neckHeadGeo = new THREE.BufferGeometry();
  neckHeadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  neckHeadGeo.setIndex(inds);
  neckHeadGeo.computeVertexNormals();
  neckHeadPivot.add(new THREE.Mesh(neckHeadGeo, pearlMat));

  // Balanced Organic Mane Crest
  const mRings = [
    [0,2.02,0.96,0.024,0.038],[0,1.92,0.82,0.035,0.065],[0,1.76,0.66,0.042,0.088],
    [0,1.60,0.48,0.045,0.092],[0,1.44,0.32,0.024,0.038]
  ];
  const mSegs = 6, mVerts = [], mInds = [];
  mRings.forEach(([mx, my, mz, mrx, mry]) => {
    for (let i = 0; i < mSegs; i++) {
      const a = (i / mSegs) * Math.PI * 2;
      mVerts.push(mx + Math.cos(a) * mrx, my + Math.sin(a) * mry, mz);
    }
  });
  for (let r = 0; r < mRings.length - 1; r++) {
    const r0 = r * mSegs, r1 = (r + 1) * mSegs;
    for (let i = 0; i < mSegs; i++) {
      const n = (i + 1) % mSegs;
      mInds.push(r0 + i, r0 + n, r1 + n, r0 + i, r1 + n, r1 + i);
    }
  }
  const maneGeo = new THREE.BufferGeometry();
  maneGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mVerts), 3));
  maneGeo.setIndex(mInds);
  maneGeo.computeVertexNormals();
  neckHeadPivot.add(new THREE.Mesh(maneGeo, rainbowMat));

  // Ears & Horn
  const earGeo = new THREE.ConeGeometry(0.04, 0.20, 5);
  const earL = new THREE.Mesh(earGeo, pearlMat);
  earL.position.set(0.075, 2.08, 1.12);
  earL.rotation.set(-0.25, 0, -0.15);
  const earR = new THREE.Mesh(earGeo, pearlMat);
  earR.position.set(-0.075, 2.08, 1.12);
  earR.rotation.set(-0.25, 0, 0.15);
  neckHeadPivot.add(earL, earR);

  const hornGeo = new THREE.ConeGeometry(0.026, 0.42, 6);
  hornGeo.rotateX(0.72);
  hornGeo.translate(0, 0.20, 0.12);
  const horn = new THREE.Mesh(hornGeo, goldMat);
  horn.position.set(0, 1.96, 1.22);
  neckHeadPivot.add(horn);

  // 3. Volumetric Closed 3D Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.24, -0.55);
  body.add(tailPivot);

  const tailRings = [
    [0,0,0,0.06],[0,0.04,-0.18,0.09],[0,-0.25,-0.36,0.11],[0,-0.52,-0.44,0.08],[0,-0.78,-0.40,0.02]
  ];
  const tSegs = 6, tVerts = [], tInds = [];
  tailRings.forEach(([tx, ty, tz, tr]) => {
    for (let i = 0; i < tSegs; i++) {
      const a = (i / tSegs) * Math.PI * 2;
      tVerts.push(tx + Math.cos(a) * tr, ty + Math.sin(a) * tr, tz);
    }
  });
  for (let r = 0; r < tailRings.length - 1; r++) {
    const r0 = r * tSegs, r1 = (r + 1) * tSegs;
    for (let i = 0; i < tSegs; i++) {
      const n = (i + 1) % tSegs;
      tInds.push(r0 + i, r0 + n, r1 + n, r0 + i, r1 + n, r1 + i);
    }
  }
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tVerts), 3));
  tailGeo.setIndex(tInds);
  tailGeo.computeVertexNormals();
  tailPivot.add(new THREE.Mesh(tailGeo, rainbowMat));

  // 4. Four Standing Anatomical Legs
  const legs = [
    [0.18,0.42,true],[-0.18,0.42,true],[0.15,-0.45,false],[-0.15,-0.45,false]
  ].map(([x, z, isFront]) => {
    const hip = new THREE.Group();
    hip.position.set(x, isFront ? 1.18 : 1.10, z);
    body.add(hip);

    const uGeo = new THREE.CylinderGeometry(isFront ? 0.095 : 0.115, 0.065, 0.55, 6);
    uGeo.translate(0, -0.275, 0);
    hip.add(new THREE.Mesh(uGeo, pearlMat));

    const knee = new THREE.Group();
    knee.position.set(0, -0.55, 0);
    hip.add(knee);

    const lGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.52, 6);
    lGeo.translate(0, -0.26, 0);
    knee.add(new THREE.Mesh(lGeo, pearlMat));

    const hoofGeo = new THREE.CylinderGeometry(0.045, 0.075, 0.12, 7);
    hoofGeo.translate(0, -0.57, 0.012);
    knee.add(new THREE.Mesh(hoofGeo, goldMat));

    return { hip, knee };
  });

  // 5. Classic Angel Wings (Folded Sideways Along Flank)
  const createAngelWing = () => {
    const g = new THREE.Group();
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0.01,0.05,0.05, 0.06,0.78,-0.10, 0.12,0.52,-0.78,
      0.01,0.05,0.05, 0.12,0.52,-0.78, 0.06,0.32,-0.42,
      0.01,0.05,0.05, 0.12,0.52,-0.78, 0.10,0.30,-0.70,
      0.01,0.05,0.05, 0.10,0.30,-0.70, 0.05,0.18,-0.38,
      0.01,0.02,0.02, 0.10,0.30,-0.70, 0.08,0.12,-0.58,
      0.01,0.02,0.02, 0.08,0.12,-0.58, 0.04,0.06,-0.30
    ]), 3));
    wingGeo.computeVertexNormals();
    g.add(new THREE.Mesh(wingGeo, rainbowMat));
    return g;
  };

  const wingL = new THREE.Group();
  wingL.position.set(0.19, 1.38, 0.22);
  body.add(wingL);
  wingL.add(createAngelWing());

  const wingR = new THREE.Group();
  wingR.position.set(-0.19, 1.38, 0.22);
  body.add(wingR);
  const wR = createAngelWing();
  wR.scale.set(-1, 1, 1);
  wingR.add(wR);

  group.position.set(0, 1.3, -12);

  // Cast Shadows
  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });

  scene.add(group);

  let gallopTimer = 0, flightTimer = 0;

  return {
    group,
    mat: pearlMat,
    setAwakened: (val) => { uniforms.uColorAwakened.value = val; },
    update: (delta, state = 'idle') => {
      uniforms.uTime.value += delta;

      if (state === 'idle') {
        const t = uniforms.uTime.value;
        neckHeadPivot.rotation.x = Math.sin(t * 1.5) * 0.025;
        neckHeadPivot.rotation.y = Math.sin(t * 0.8) * 0.04;
        body.position.y = Math.sin(t * 1.5) * 0.015;
        tailPivot.rotation.y = Math.sin(t * 2.0) * 0.15;
        tailPivot.rotation.z = Math.sin(t * 1.5) * 0.06;
        wingL.rotation.set(0.12, 0.08, -0.65 + Math.sin(t * 1.2) * 0.03);
        wingR.rotation.set(0.12, -0.08, 0.65 - Math.sin(t * 1.2) * 0.03);
      } else if (state === 'gallop' || state === 'ascend') {
        gallopTimer += delta * 8.0;
        const stride = Math.sin(gallopTimer), strideCos = Math.cos(gallopTimer);

        legs[0].hip.rotation.x = stride * 0.65;
        legs[0].knee.rotation.x = Math.max(0, -stride * 0.7);
        legs[1].hip.rotation.x = -stride * 0.65;
        legs[1].knee.rotation.x = Math.max(0, stride * 0.7);
        legs[2].hip.rotation.x = -strideCos * 0.65;
        legs[2].knee.rotation.x = Math.max(0, strideCos * 0.7);
        legs[3].hip.rotation.x = strideCos * 0.65;
        legs[3].knee.rotation.x = Math.max(0, -strideCos * 0.7);

        body.position.y = Math.abs(stride) * 0.18;
        neckHeadPivot.rotation.x = stride * 0.08;
        tailPivot.rotation.y = stride * 0.35;

        const flap = Math.sin(gallopTimer * 1.6) * 0.85;
        wingL.rotation.set(0.2, 0.2, -0.65 + (flap + 0.7) * 0.95);
        wingR.rotation.set(0.2, -0.2, 0.65 - (flap + 0.7) * 0.95);

        if (state === 'ascend') {
          flightTimer += delta * 0.4;
          const radius = 16 + Math.sin(flightTimer * 1.2) * 4;
          group.position.x = Math.sin(flightTimer * 2.2) * radius;
          group.position.z = -12 + Math.cos(flightTimer * 2.2) * radius;
          group.position.y = 1.3 + 1.5 + Math.sin(flightTimer * 4.0) * 0.8 + flightTimer * 3.2;
          group.rotation.y = flightTimer * 2.2 + Math.PI / 2;
        }
      }
    }
  };
}
