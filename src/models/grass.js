import { getTerrainHeight } from './world.js';
import { NOISE_GLSL } from '../shaders/common.js';

function createDenseGrassTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#448833';
  ctx.beginPath();
  ctx.moveTo(16, 128); ctx.lineTo(32, 8); ctx.lineTo(48, 128); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(16, 32); ctx.lineTo(32, 128); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(32, 128); ctx.lineTo(48, 32); ctx.lineTo(64, 128); ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export function createGrassField(scene, count = 38000) {
  const THREE = window.THREE;
  const grassTex = createDenseGrassTexture(THREE);
  const bladeGeo = new THREE.PlaneGeometry(0.65, 1.8, 1, 2);
  bladeGeo.translate(0, 0.9, 0);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uGrassMap: { value: grassTex }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `uniform float uTime;varying vec2 vUv;varying vec3 vWP,vVP;varying float vH;void main(){vUv=uv;vH=uv.y;vec4 wp=instanceMatrix*vec4(position,1.0);float t=uTime,w=(sin(wp.x*0.12+wp.z*0.09+t*2.8)+sin(wp.x*0.3-wp.z*0.22+t*5.0)*0.45)*0.48;float b=pow(vH,1.7)*w;wp.x+=b;wp.z+=b*0.75;vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.0);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform sampler2D uGrassMap;uniform float uTime,uAwakened;varying vec2 vUv;varying vec3 vWP,vVP;varying float vH;${NOISE_GLSL}void main(){vec4 tex=texture2D(uGrassMap,vUv);if(tex.a<0.45||vH<0.02)discard;float c=cN(vWP.xz,uTime);vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened),gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*1.35,sun=vec3(1.22,1.14,1.02),groundLit=gF*mix(gi,sun,c*0.42+0.58);float dist=length(vVP),alpha=(1.0-smoothstep(55.0,135.0,dist))*smoothstep(0.0,0.18,vH);if(alpha<0.01)discard;gl_FragColor=vec4(groundLit,alpha);}`,
    uniforms,
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count);
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;

  while (placed < count && attempts < count * 3.8) {
    attempts++;
    const a = attempts * 2.399963;
    let r = placed < count * 0.55
      ? 8.5 + Math.sqrt(placed / (count * 0.55)) * 56.0
      : 64.0 + Math.pow((placed - count * 0.55) / (count * 0.45), 1.3) * 150.0;

    const px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;

    const py = getTerrainHeight(px, pz) - 0.08;
    const hx = getTerrainHeight(px + 0.5, pz) - getTerrainHeight(px - 0.5, pz);
    const hz = getTerrainHeight(px, pz + 0.5) - getTerrainHeight(px - 0.5, pz + 0.5);
    const slope = Math.hypot(hx, hz);
    if (slope > 0.62) continue;

    dummy.position.set(px, py, pz);
    dummy.rotation.set(-Math.atan2(hz, 1.0), Math.random() * 6.28, Math.atan2(hx, 1.0));
    dummy.scale.set(1.4 + Math.random() * 0.6, 0.9 + Math.random() * 0.6, 1.4 + Math.random() * 0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  return {
    uniforms,
    setAwakened: (val) => { uniforms.uAwakened.value = val; },
    update: (delta) => { uniforms.uTime.value += delta; }
  };
}
