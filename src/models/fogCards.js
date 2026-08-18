// Procedural Volumetric Distance Fog Cards with Soft Terrain Blending & GPU Camera Billboarding
import { getTerrainHeight } from './world.js';

export function createFogCards(scene, count = 36) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  scene.add(group);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uFogDensity: { value: 0.55 }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv;varying vec3 vWP,vVP;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened,uFogDensity;varying vec2 vUv;varying vec3 vWP,vVP;void main(){float d=length(vVP),pF=smoothstep(4.0,16.0,d),hF=1.0-smoothstep(120.0,220.0,d);float bFade=smoothstep(0.0,0.42,vUv.y),tFade=smoothstep(1.0,0.60,vUv.y),edge=pow(sin(vUv.x*3.1416),1.4)*bFade*tFade;float t=uTime*0.25,wisp=sin(vWP.x*0.06+vWP.z*0.05+t*0.8)*cos(vWP.z*0.08-vWP.x*0.04-t*0.6)*0.5+0.5;vec3 col=mix(vec3(0.55,0.58,0.68),vec3(0.72,0.64,0.78)+vec3(0.04,0.04,0.08)*sin(t+vWP.x*0.1),uAwakened);gl_FragColor=vec4(col,edge*(0.24+wisp*0.28)*pF*hF*uFogDensity);}`,
    uniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const cards = [];
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  planeGeo.translate(0, 0.5, 0); // Anchor pivot at base
  group.renderOrder = 20;

  for (let i = 0; i < count; i++) {
    const isInner = i < 18;
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const r = isInner ? 14.0 + Math.random() * 42.0 : 58.0 + Math.random() * 110.0;
    const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r;
    const ty = getTerrainHeight(x, z);
    const y = isInner ? ty + 0.1 : ty + 0.5 + Math.random() * 3.5;
    const w = isInner ? 18 + Math.random() * 12 : 42 + Math.random() * 20;
    const h = isInner ? 7 + Math.random() * 5 : 18 + Math.random() * 8;

    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, 1.0);
    mesh.renderOrder = 20;
    group.add(mesh);
    cards.push({ mesh, baseY: y, basePos: mesh.position.clone(), driftSpeed: 0.15 + Math.random() * 0.25 });
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


