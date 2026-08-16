// Streamlined World with Clean Architecture, Soft Shadows & Sky Blending
import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';

export function createWorld(scene) {
  const THREE = window.THREE;
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const stoneMat = createPrismaticMaterial({ baseColor: 0x505460, iridescence: 0.0, dispersion: 0.0, glitter: 0.15, emissive: 0.0 });
  const materials = [stoneMat];

  const groundUniforms = { uTime: { value: 0 }, uAwakened: { value: 0.0 }, uFadeIntensity: { value: 0.65 } };
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x12141a, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide, transparent: true, depthWrite: true
  });
  groundMat.uniforms = groundUniforms;

  groundMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, groundUniforms);
    s.vertexShader = `varying vec3 vWPos;\n` + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    s.fragmentShader = `uniform float uTime,uAwakened,uFadeIntensity;varying vec3 vWPos;\n` + s.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec3 lush=vec3(0.035,0.15,0.055);
      float c=sin(vWPos.x*0.04+uTime*0.3)*cos(vWPos.z*0.04+uTime*0.2)*0.5+0.5;
      vec3 glow=mix(vec3(0.92,0.44,0.58),vec3(0.96,0.66,0.48),sin(uTime*0.2+vWPos.x*0.03)*0.5+0.5);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*mix(lush,lush+glow*0.28,smoothstep(0.35,0.8,c))*6.0,uAwakened);
      gl_FragColor.a=1.0-smoothstep(70.0,220.0,length(vWPos-cameraPosition))*uFadeIntensity;`);
  };

  const groundGeo = new THREE.PlaneGeometry(320, 320, 32, 32);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    pos.setY(i, r < 45 ? 0 : Math.pow((r - 45) / 100, 1.7) * 38 + Math.sin(a * 6) * 8);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0, -12);
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(8, 9.5, 0.8, 8), stoneMat);
  altar.position.set(0, 0.4, -12);
  altar.castShadow = altar.receiveShadow = true;

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 0.8, 6), stoneMat);
  ped.position.set(0, 0.9, -12);
  ped.castShadow = ped.receiveShadow = true;
  worldGroup.add(altar, ped);

  const mGeo = new THREE.BoxGeometry(2.8, 25, 2.8);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 6.283, d = 38 + Math.random() * 25, h = 18 + Math.random() * 24;
    const m = new THREE.Mesh(mGeo, stoneMat);
    m.scale.set(1 + Math.random(), h / 25, 1 + Math.random());
    m.position.set(Math.cos(a) * d, h / 2, -12 + Math.sin(a) * d);
    m.castShadow = m.receiveShadow = true;
    worldGroup.add(m);
  }

  const islands = [
    [-25,6.2,-6,4.0,0xff2244],[25,6.2,-6,4.0,0xff7700],[-18,6.5,12,3.8,0xffcc00],
    [18,6.5,12,3.8,0x11cc44],[-24,7.8,-18,4.5,0x00aaff],[24,7.5,-18,4.5,0x5533ee],[0,9.8,-28,5.0,0xcc22ee]
  ].map(([x, y, z, r, color]) => {
    const islMat = createPrismaticMaterial({ baseColor: color, iridescence: 0.0, dispersion: 0.0, glitter: 1.6, emissive: 0.35 });
    materials.push(islMat);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, 4, 6), islMat);
    m.rotation.x = Math.PI;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    for (let c = 0; c < 3; c++) {
      const cr = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), islMat);
      cr.position.set((Math.random() - 0.5) * r * 0.6, 1.2, (Math.random() - 0.5) * r * 0.6);
      cr.castShadow = cr.receiveShadow = true;
      g.add(cr);
    }
    worldGroup.add(g);
    return { g, y };
  });

  const launchMat = createPrismaticMaterial({ baseColor: 0xffddee, iridescence: 1.5, dispersion: 2.0, glitter: 1.5, emissive: 0.5 });
  materials.push(launchMat);
  const launchPlatform = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.0, 1.2, 8), launchMat);
  launchPlatform.position.set(16.0, 40.8, -12.0);
  launchPlatform.castShadow = launchPlatform.receiveShadow = true;
  worldGroup.add(launchPlatform);

  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, a = t * 6.91 + 0.5, r = 16 + Math.sin(t * 6.283) * 8;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 3.5 + t * 38, -12 + Math.sin(a) * r));
  }
  const bridgeMat = createPrismaticMaterial({ baseColor: 0xffffff, iridescence: 2.8, dispersion: 3.5, glitter: 1.5, emissive: 0.8 });
  materials.push(bridgeMat);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 50, 1.2, 6, false), bridgeMat);
  tube.castShadow = tube.receiveShadow = true;
  worldGroup.add(tube);

  return {
    worldGroup,
    materials,
    groundMat,
    setAwakened: (val) => {
      groundUniforms.uAwakened.value = val;
      materials.forEach(m => { if (m.uniforms?.uColorAwakened) m.uniforms.uColorAwakened.value = val; });
    },
    setFadeIntensity: (val) => {
      groundUniforms.uFadeIntensity.value = val;
      materials.forEach(m => { if (m.uniforms?.uFadeIntensity) m.uniforms.uFadeIntensity.value = val; });
    },
    update: (delta) => {
      groundUniforms.uTime.value += delta;
      materials.forEach(m => { if (m.uniforms?.uTime) m.uniforms.uTime.value += delta; });
      const t = groundUniforms.uTime.value;
      islands.forEach((isl, i) => { isl.g.position.y = isl.y + Math.sin(t * 1.2 + i) * 0.35; });
    }
  };
}
