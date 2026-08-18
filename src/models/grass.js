import { getTerrainHeight } from './world.js';

function createDenseGrassTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 256);

  const blades = [
    [64, 22, 248, 0],
    [45, 17, 224, -18],
    [83, 17, 228, 18],
    [30, 15, 195, -30],
    [98, 15, 200, 30],
    [16, 13, 165, -45],
    [112, 13, 170, 45],
    [52, 13, 142, -9],
    [76, 13, 148, 11]
  ];

  blades.forEach(([x, w, h, bend]) => {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, 256);
    ctx.quadraticCurveTo(x + bend * 0.4, 256 - h * 0.55, x + bend, 256 - h);
    ctx.quadraticCurveTo(x + bend * 0.6, 256 - h * 0.55, x + w * 0.5, 256);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  return new THREE.CanvasTexture(canvas);
}

export function createGrassField(scene, count = 58000) {
  const THREE = window.THREE;
  const grassTex = createDenseGrassTexture(THREE);
  const bladeGeo = new THREE.PlaneGeometry(0.72, 1.95, 1, 2);
  bladeGeo.translate(0, 0.975, 0);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uGrassMap: { value: grassTex }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `uniform mat4 directionalShadowMatrix[1];uniform float uTime;varying vec2 vUv;varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;void main(){vUv=uv;vH=uv.y;vec4 wp=instanceMatrix*vec4(position,1.0);float t=uTime;float w=(sin(wp.x*0.12+wp.z*0.09+t*1.5)+sin(wp.x*0.30-wp.z*0.22+t*2.8)*0.45+cos(wp.z*0.50+wp.x*0.35+t*4.0)*0.18)*0.42;float b=pow(vH,1.8)*w;wp.x+=b;wp.z+=b*0.75;wp.y-=abs(b)*0.22*vH;vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.0);vVP=-mv.xyz;vShadowCoord=directionalShadowMatrix[0]*wp;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `#include <packing>
      uniform sampler2D directionalShadowMap[1];uniform sampler2D uGrassMap;uniform float uTime,uAwakened;varying vec2 vUv;varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;
      float cloudN(vec2 p,float t){vec2 u1=p*0.025+vec2(t*0.06,t*0.03),u2=p*0.05-vec2(t*0.04,t*0.07);float n1=sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*0.5+0.5,n2=sin(u2.x*2.8+u2.y*1.9)*cos(u2.y*3.2-u2.x*1.5)*0.5+0.5;return smoothstep(0.2,0.85,n1*0.65+n2*0.35);}
      void main(){
        vec4 tex=texture2D(uGrassMap,vUv);
        if(tex.a<0.45)discard;
        float c=cloudN(vWP.xz,uTime);
        vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened);
        vec3 gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*1.35,sun=vec3(1.22,1.14,1.02);
        vec3 groundLit=gF*mix(gi,sun,c*0.42+0.58);
        vec3 sc=vShadowCoord.xyz/vShadowCoord.w;float shadowOcc=1.0;
        if(sc.x>=0.0&&sc.x<=1.0&&sc.y>=0.0&&sc.y<=1.0&&sc.z<=1.0){
          if(sc.z>unpackRGBAToDepth(texture2D(directionalShadowMap[0],sc.xy))+0.0006) shadowOcc=0.0;
        }
        float bVar=sin(vWP.x*0.18+1.2)*cos(vWP.z*0.18+0.8)*0.5+0.5;
        vec3 tipCol=mix(mix(vec3(0.072,0.396,0.126),vec3(0.196,0.672,0.266),bVar),mix(vec3(0.238,0.816,0.323),vec3(0.47,1.3,0.514),bVar),c);
        float sFac=shadowOcc*(c*0.42+0.58);
        vec3 tipFinal=mix(mix(vec3(0.14,0.14,0.18),vec3(0.28,0.28,0.34),c),tipCol,uAwakened)*mix(gi,sun,sFac);
        vec3 col=mix(groundLit,tipFinal,pow(vH,0.85));
        float dist=length(vVP);
        col=mix(col,groundLit,smoothstep(25.0,95.0,dist)*0.96);
        vec3 fogCol=mix(vec3(0.05,0.05,0.08),vec3(0.26,0.15,0.24),uAwakened);
        col=mix(col,fogCol,smoothstep(45.0,195.0,dist)*0.95);
        gl_FragColor=vec4(col,1.0);
      }`,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.shadowmap, uniforms]),
    side: THREE.DoubleSide, transparent: false, depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;

  while (placed < count && attempts < count * 3.5) {
    attempts++;
    const a = attempts * 2.399963;
    let r = placed < count * 0.55
      ? 8.5 + Math.sqrt(placed / (count * 0.55)) * 56.0
      : 64.0 + Math.pow((placed - count * 0.55) / (count * 0.45), 1.3) * 150.0;

    const px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;

    const py = getTerrainHeight(px, pz) + 0.08;
    const hx = getTerrainHeight(px + 0.5, pz) - getTerrainHeight(px - 0.5, pz);
    const hz = getTerrainHeight(px, pz + 0.5) - getTerrainHeight(px, pz - 0.5);

    const d = Math.hypot(px, pz + 12), isDistant = d > 55.0;
    const distW = isDistant ? Math.min(3.6, 1.0 + (d - 55.0) / 50.0 * 1.5) : 1.0;
    const distH = isDistant ? Math.min(2.2, 1.0 + (d - 55.0) / 70.0 * 0.8) : 1.0;
    const s = 0.90 + Math.random() * 0.55;

    dummy.position.set(px, py, pz);
    dummy.rotation.set(-Math.atan2(hz, 1.0) + (Math.random() - 0.5) * 0.3, Math.random() * 6.28, Math.atan2(hx, 1.0) + (Math.random() - 0.5) * 0.3);
    const bw = s * (0.95 + Math.random() * 0.4) * distW * 2.0;
    const bh = s * (0.85 + Math.random() * 0.7) * distH;
    dummy.scale.set(bw, bh, bw);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  return {
    mesh,
    uniforms: mat.uniforms,
    setAwakened: (val) => { mat.uniforms.uAwakened.value = val; },
    update: (delta) => { mat.uniforms.uTime.value += delta; }
  };
}
