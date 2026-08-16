// Streamlined World with Clean Architecture, Soft Shadows & Sky Blending
import { createPrismaticMaterial } from '../shaders/prismaticMaterial.js';
import { createFogCards } from './fogCards.js';

export function createWorld(scene) {
  const THREE = window.THREE;
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const stoneMat = createPrismaticMaterial({ baseColor: 0x505460, iridescence: 0.0, dispersion: 0.0, glitter: 0.15, emissive: 0.0 });
  const materials = [stoneMat];

  const groundUniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0.0 },
    uFadeIntensity: { value: 0.95 },
    uGIShadowStrength: { value: 1.35 }
  };
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x12141a, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide, transparent: true, depthWrite: true
  });
  groundMat.uniforms = groundUniforms;

  groundMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, groundUniforms);
    s.vertexShader = `varying vec3 vWPos;\n` + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    s.fragmentShader = `uniform float uTime,uAwakened,uFadeIntensity,uGIShadowStrength;varying vec3 vWPos;
      float cloudN(vec2 p, float t){
        vec2 uv1 = p * 0.025 + vec2(t * 0.06, t * 0.03);
        float n1 = sin(uv1.x * 3.14 + cos(uv1.y * 2.7)) * cos(uv1.y * 3.14 + sin(uv1.x * 2.1)) * 0.5 + 0.5;
        vec2 uv2 = p * 0.05 - vec2(t * 0.04, t * 0.07);
        float n2 = sin(uv2.x * 2.8 + uv2.y * 1.9) * cos(uv2.y * 3.2 - uv2.x * 1.5) * 0.5 + 0.5;
        return smoothstep(0.2, 0.85, n1 * 0.65 + n2 * 0.35);
      }\n` + s.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float c = cloudN(vWPos.xz, uTime);
      vec3 shadowLush = vec3(0.04, 0.20, 0.06);
      vec3 sunLush = vec3(0.08, 0.32, 0.12) + vec3(0.08, 0.06, 0.02);
      vec3 groundAwakened = mix(shadowLush, sunLush, c);
      vec3 groundGrey = mix(vec3(0.08, 0.08, 0.10), vec3(0.18, 0.18, 0.22), c);
      vec3 groundFinal = mix(groundGrey, groundAwakened, uAwakened);

      vec3 giAmbient = mix(vec3(0.55, 0.58, 0.70), vec3(0.72, 0.54, 0.70), uAwakened) * uGIShadowStrength;
      vec3 directSun = vec3(1.22, 1.14, 1.02);
      
      vec3 groundLit = groundFinal * mix(giAmbient, directSun, c * 0.42 + 0.58);
      gl_FragColor.rgb = groundLit;
      gl_FragColor.a = 1.0 - smoothstep(110.0, 260.0, length(vWPos - cameraPosition)) * uFadeIntensity;`);
  };

  const groundGeo = new THREE.PlaneGeometry(550, 550, 48, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    pos.setY(i, r < 90 ? 0 : Math.pow((r - 90) / 120, 1.7) * 48 + Math.sin(a * 6) * 10);
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

  const mGeo = new THREE.BoxGeometry(3.5, 32, 3.5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283, d = 82 + Math.random() * 32, h = 22 + Math.random() * 26;
    const m = new THREE.Mesh(mGeo, stoneMat);
    m.scale.set(1 + Math.random(), h / 32, 1 + Math.random());
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

  const fogCards = createFogCards(scene);

  return {
    worldGroup,
    materials,
    groundMat,
    fogCards,
    setAwakened: (val) => {
      groundUniforms.uAwakened.value = val;
      fogCards.setAwakened(val);
      materials.forEach(m => { if (m.uniforms?.uColorAwakened) m.uniforms.uColorAwakened.value = val; });
    },
    setFadeIntensity: (val) => {
      groundUniforms.uFadeIntensity.value = val;
      materials.forEach(m => { if (m.uniforms?.uFadeIntensity) m.uniforms.uFadeIntensity.value = val; });
    },
    setGIShadowStrength: (val) => {
      groundUniforms.uGIShadowStrength.value = val;
    },
    update: (delta, camera) => {
      groundUniforms.uTime.value += delta;
      materials.forEach(m => { if (m.uniforms?.uTime) m.uniforms.uTime.value += delta; });
      fogCards.update(delta, camera);
      const t = groundUniforms.uTime.value;
      islands.forEach((isl, i) => { isl.g.position.y = isl.y + Math.sin(t * 1.2 + i) * 0.35; });
    }
  };
}
