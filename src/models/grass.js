import { getTerrainHeight } from './world.js';

function createDenseGrassTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 256);

  [[64,22,240,0],[45,17,218,-18],[83,17,222,18],[30,15,190,-30],[98,15,195,30],[16,13,160,-45],[112,13,165,45],[52,13,138,-9],[76,13,144,11]].forEach(([x, w, h, b]) => {
    ctx.fillStyle = '#448833';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, 248);
    ctx.quadraticCurveTo(x + b * 0.4, 248 - h * 0.55, x + b, 248 - h);
    ctx.quadraticCurveTo(x + b * 0.6, 248 - h * 0.55, x + w * 0.5, 248);
    ctx.fill();
  });

  const fx = 83, fy = 48;
  ctx.fillStyle = '#fff';
  for (let p = 0; p < 4; p++) {
    ctx.beginPath();
    ctx.arc(fx + Math.cos(p * 1.57) * 1.8, fy + Math.sin(p * 1.57) * 1.8, 1.2, 0, 6.28);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe044';
  ctx.beginPath();
  ctx.arc(fx, fy, 1.0, 0, 6.28);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createTaperedBladeGeometry(THREE, width = 0.72, height = 1.95) {
  const hw = width * 0.5, geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-hw,-0.45,0, hw,-0.45,0, -hw*0.92,height*0.55,0, hw*0.92,height*0.55,0, -hw*0.42,height,0, hw*0.42,height,0]), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 0.04,0.55, 0.96,0.55, 0.29,1, 0.71,1]), 2));
  geom.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]);
  geom.computeVertexNormals();
  return geom;
}

export function createGrassField(scene, count = 46000) {
  const THREE = window.THREE;
  const grassTex = createDenseGrassTexture(THREE);
  const bladeGeo = createTaperedBladeGeometry(THREE, 0.72, 1.95);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uGrassMap: { value: grassTex }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `uniform mat4 directionalShadowMatrix[1];uniform float uTime;varying vec2 vUv;varying vec3 vWP,vVP,vAnchorWP;varying float vH;varying vec4 vShadowCoord;void main(){vUv=uv;vH=uv.y;vec4 rawWp=instanceMatrix*vec4(0.0,0.0,0.0,1.0);vAnchorWP=rawWp.xyz;vec4 wp=instanceMatrix*vec4(position,1.0);float t=uTime,gust=sin(wp.x*0.06+wp.z*0.05+t*2.2)*0.85+sin(wp.x*0.14-wp.z*0.1+t*4.2)*0.45,w=(sin(wp.x*0.12+wp.z*0.09+t*2.8)+sin(wp.x*0.3-wp.z*0.22+t*5.0)*0.45)*0.48+gust*0.68,b=pow(vH,1.7)*w;wp.x+=b;wp.z+=b*0.75;wp.y-=abs(b)*0.22*vH;float curv=sin(wp.x*2.5+wp.z*1.8);wp.xz+=vec2(cos(curv),sin(curv))*(vH*0.28);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.0);vVP=-mv.xyz;vShadowCoord=directionalShadowMatrix[0]*wp;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D directionalShadowMap[1],uGrassMap;uniform float uTime,uAwakened;varying vec2 vUv;varying vec3 vWP,vVP,vAnchorWP;varying float vH;varying vec4 vShadowCoord;
      float unpackRGBAToDepth(const in vec4 v){return dot(v,vec4(1.0/16777216.0,1.0/65536.0,1.0/256.0,1.0));}
      float cloudN(vec2 p,float t){vec2 u1=p*0.025+vec2(t*0.06,t*0.03),u2=p*0.05-vec2(t*0.04,t*0.07);return smoothstep(0.2,0.85,(sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*0.5+0.5)*0.65+(sin(u2.x*2.8+u2.y*1.9)*cos(u2.y*3.2-u2.x*1.5)*0.5+0.5)*0.35);}
      void main(){
        vec4 tex=texture2D(uGrassMap,vUv);
        float bFade=smoothstep(0.0,0.18,vH);
        if(tex.a<0.45||bFade<0.02)discard;
        float c=cloudN(vWP.xz,uTime);
        vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened);
        vec3 gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*1.35,sun=vec3(1.22,1.14,1.02);
        vec3 groundLit=gF*mix(gi,sun,c*0.42+0.58);
        vec3 sc=vShadowCoord.xyz/vShadowCoord.w;float shadowOcc=1.0;
        float bVar=sin(vWP.x*0.18+1.2)*cos(vWP.z*0.18+0.8)*0.5+0.5;
        vec3 tipAwakened=mix(gA*1.12,gA*1.35+vec3(0.01,0.03,0.0),bVar);
        vec3 tipGrey=mix(gG*1.08,gG*1.24,bVar);
        vec3 tipFinal=mix(tipGrey,tipAwakened,uAwakened)*mix(gi,sun,shadowOcc*(c*0.42+0.58));
        float hFactor=smoothstep(0.20,0.92,vH);
        vec3 col=mix(groundLit,tipFinal,hFactor);

        float dist=length(vVP);
        float flwMask=step(0.93,sin(vAnchorWP.x*2.3+vAnchorWP.z*3.1)*cos(vAnchorWP.z*1.9-vAnchorWP.x*2.7))*step(0.90,tex.r*tex.b);
        float flwFade=(1.0-smoothstep(10.0,28.0,dist))*smoothstep(0.42,0.85,vH);
        vec3 flwCol=mix(vec3(0.98,0.96,0.98),(vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(vAnchorWP.x*0.06+vAnchorWP.z*0.06)+vec3(0,0.33,0.67))))*1.12,uAwakened*0.75);
        col=mix(col,flwCol,flwMask*0.85*flwFade);

        col=mix(col,groundLit,smoothstep(16.0,52.0,dist));
        float alpha=(1.0-smoothstep(55.0,135.0,dist))*bFade;
        if(alpha<0.01)discard;
        gl_FragColor=vec4(col,alpha);
      }`,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.shadowmap, uniforms]),
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count);
  mesh.renderOrder = 1;
  mesh.receiveShadow = true;

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

    const d = Math.hypot(px, pz + 12), isDistant = d > 55.0;
    const distW = isDistant ? Math.min(3.6, 1.0 + (d - 55.0) / 50.0 * 1.5) : 1.0;
    const distH = isDistant ? Math.min(2.2, 1.0 + (d - 55.0) / 70.0 * 0.8) : 1.0;
    const s = (0.90 + Math.random() * 0.55) * Math.max(0.3, 1.0 - slope * 1.2);

    dummy.position.set(px, py, pz);
    dummy.rotation.set(-Math.atan2(hz, 1.0) + (Math.random() - 0.5) * 0.65, Math.random() * 6.28, Math.atan2(hx, 1.0) + (Math.random() - 0.5) * 0.65);
    dummy.scale.set(s * (0.95 + Math.random() * 0.4) * distW * 2.0, s * (0.85 + Math.random() * 0.7) * distH, s * (0.95 + Math.random() * 0.4) * distW * 2.0);
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


