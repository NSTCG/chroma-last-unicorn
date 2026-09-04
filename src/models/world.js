import { STD_VS, NOISE_GLSL } from '../shaders/common.js';

export function getTerrainHeight(x, z) {
  const lx = x, lz = z + 12, r = Math.hypot(lx, lz);
  return r < 90 ? 0 : Math.pow((r - 90) / 120, 1.7) * 48 + Math.sin(Math.atan2(lz, lx) * 6) * 10;
}

export function createWorld(scene) {
  const THREE = window.THREE;
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const groundUniforms = { uTime: { value: 0 }, uAwakened: { value: 0 } };

  const rockShader = `precision highp float;uniform float uTime,uAwakened;uniform vec3 uTint;varying vec3 vWP,vVP,vN;void main(){vec3 N=normalize(vN),L=normalize(vec3(0.5,1.0,0.4)),V=normalize(vVP);float d=dot(N,L),cel=smoothstep(-0.15,0.05,d)*0.35+smoothstep(0.18,0.42,d)*0.45+0.20,rim=pow(1.0-max(dot(N,V),0.0),3.0)*0.45;vec3 base=mix(vec3(0.18,0.18,0.22),vec3(0.46,0.44,0.42),uAwakened);gl_FragColor=vec4(mix(base*uTint,base,0.35)*cel+vec3(0.1)*rim,1.0-smoothstep(70.0,165.0,length(vVP)));}`;

  const createRockMaterial = (tint = 0xffffff) => new THREE.ShaderMaterial({
    uniforms: { ...groundUniforms, uTint: { value: new THREE.Color(tint) } },
    vertexShader: STD_VS, fragmentShader: rockShader,
    side: THREE.DoubleSide, transparent: true
  });

  const stoneMat = createRockMaterial(0x90909e);

  const groundMat = new THREE.ShaderMaterial({
    uniforms: groundUniforms,
    vertexShader: STD_VS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;varying vec3 vWP,vVP;${NOISE_GLSL}void main(){float c=cN(vWP.xz,uTime);vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened),gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*1.35,sun=vec3(1.22,1.14,1.02);gl_FragColor=vec4(gF*mix(gi,sun,c*0.42+0.58),1.0-smoothstep(70.0,165.0,length(vVP)));}`,
    side: THREE.DoubleSide, transparent: true
  });

  const groundGeo = new THREE.PlaneGeometry(550, 550, 48, 48);
  groundGeo.rotateX(-1.57);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i) - 12));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0, -12);
  worldGroup.add(ground);

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(8, 9.5, 0.8, 8), stoneMat);
  altar.position.set(0, 0.4, -12);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 0.8, 6), stoneMat);
  ped.position.set(0, 0.9, -12);
  worldGroup.add(altar, ped);

  const mGeo = new THREE.BoxGeometry(3.5, 32, 3.5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283, d = 82 + Math.random() * 32, h = 22 + Math.random() * 26, m = new THREE.Mesh(mGeo, stoneMat);
    m.scale.set(1 + Math.random(), h / 32, 1 + Math.random());
    m.position.set(Math.cos(a) * d, h / 2, -12 + Math.sin(a) * d);
    worldGroup.add(m);
  }

  const islGeo = new THREE.ConeGeometry(4, 4, 6);
  islGeo.rotateX(Math.PI); islGeo.translate(0, -2, 0);

  const islands = [
    [-25,6.2,-6,0xff2244],[25,6.2,-6,0xff7700],[-18,6.5,12,0xffcc00],
    [18,6.5,12,0x11cc44],[-24,7.8,-18,0x00aaff],[24,7.5,-18,0x5533ee],[0,9.8,-28,0xcc22ee]
  ].map(([x, y, z, color]) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const m = new THREE.Mesh(islGeo, createRockMaterial(color));
    g.add(m); worldGroup.add(g);
    return { group: g, basePos: new THREE.Vector3(x, y, z), seed: Math.random() * 100 };
  });

  return {
    worldGroup, groundMat,
    setAwakened: (val) => { groundUniforms.uAwakened.value = val; },
    update: (delta) => {
      groundUniforms.uTime.value += delta;
      const t = groundUniforms.uTime.value;
      islands.forEach(isl => {
        isl.group.position.y = isl.basePos.y + Math.sin(t * 1.2 + isl.seed) * 0.45;
        isl.group.rotation.y = t * 0.15 + isl.seed;
      });
    }
  };
}
