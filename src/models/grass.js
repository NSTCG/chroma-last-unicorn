import { getTerrainHeight } from './world.js';
import { glslGround, glslRainbow } from '../shaders/common.js';
import { T, SMat } from '../engine/three.js';

function createDenseGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 9; i++) {
    const x = 16 + i * 12, w = 14 + (i % 3) * 3, h = 150 + (i % 4) * 28, b = (i - 4) * 11;
    ctx.fillStyle = '#448833';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, 248);
    ctx.quadraticCurveTo(x + b * 0.4, 248 - h * 0.55, x + b, 248 - h);
    ctx.quadraticCurveTo(x + b * 0.6, 248 - h * 0.55, x + w * 0.5, 248);
    ctx.fill();
  }

  ctx.fillStyle = '#fff'; ctx.fillRect(82, 47, 3, 3);
  ctx.fillStyle = '#fe4'; ctx.fillRect(83, 48, 1, 1);

  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
  return tex;
}

function createTaperedBladeGeometry(width = 0.72, height = 1.95) {
  const hw = width * 0.5, geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.BufferAttribute(new Float32Array([-hw,-0.45,0, hw,-0.45,0, -hw*0.92,height*0.55,0, hw*0.92,height*0.55,0, -hw*0.42,height,0, hw*0.42,height,0]), 3));
  geom.setAttribute('uv', new T.BufferAttribute(new Float32Array([0,0, 1,0, 0.04,0.55, 0.96,0.55, 0.29,1, 0.71,1]), 2));
  geom.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]);
  return geom;
}

export function createGrassField(scene, count = 46000) {
  const grassTex = createDenseGrassTexture();
  const bladeGeo = createTaperedBladeGeometry(0.72, 1.95);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uGrassMap: { value: grassTex }
  };

  const mat = SMat({
    vertexShader: `uniform float uTime;varying vec2 vUv;varying vec3 vWP,vVP,vAnchorWP;varying float vH;void main(){vUv=uv;vH=uv.y;vAnchorWP=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;vec4 wp=instanceMatrix*vec4(position,1.);float t=uTime,g=sin(wp.x*.06+wp.z*.05+t*2.2)*.85+sin(wp.x*.14-wp.z*.1+t*4.2)*.45,w=(sin(wp.x*.12+wp.z*.09+t*2.8)+sin(wp.x*.3-wp.z*.22+t*5.)*.45)*.48+g*.68,b=pow(vH,1.7)*w;wp.x+=b;wp.z+=b*.75;wp.y-=abs(b)*.22*vH;float c=sin(wp.x*2.5+wp.z*1.8);wp.xz+=vec2(cos(c),sin(c))*(vH*.28);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform sampler2D uGrassMap;uniform float uTime,uAwakened;varying vec2 vUv;varying vec3 vWP,vVP,vAnchorWP;varying float vH;${glslGround}${glslRainbow}void main(){vec4 tex=texture2D(uGrassMap,vUv);float bFade=smoothstep(0.,.18,vH);if(tex.a<.45||bFade<.02)discard;vec3 groundLit=gCol(vWP.xz,uTime,uAwakened);float bVar=sin(vWP.x*.18+1.2)*cos(vWP.z*.18+.8)*.5+.5,dist=length(vVP);vec3 tipA=mix(vec3(.05,.23,.07),vec3(.22,.51,.19),bVar),tipG=mix(vec3(.09,.09,.11),vec3(.22,.22,.27),bVar),tipF=mix(tipG,tipA,uAwakened)*1.1,col=mix(groundLit,tipF,smoothstep(.2,.92,vH));float flwMask=step(.93,sin(vAnchorWP.x*2.3+vAnchorWP.z*3.1)*cos(vAnchorWP.z*1.9-vAnchorWP.x*2.7))*step(.9,tex.r*tex.b),flwFade=(1.-smoothstep(10.,28.,dist))*smoothstep(.42,.85,vH);vec3 flwCol=mix(vec3(.98,.98,.98),rb(vAnchorWP.x*.06+vAnchorWP.z*.06)*1.12,uAwakened*.75);col=mix(mix(col,flwCol,flwMask*.85*flwFade),groundLit,smoothstep(16.,52.,dist));float alpha=(1.-smoothstep(55.,135.,dist))*bFade;if(alpha<.01)discard;gl_FragColor=vec4(col,alpha);}`,
    uniforms,
    side: 2, transparent: true, depthWrite: true
  });

  const mesh = new T.InstancedMesh(bladeGeo, mat, count);
  mesh.renderOrder = 1;
  mesh.receiveShadow = true;

  const dummy = new T.Object3D();
  let placed = 0, attempts = 0;

  while (placed < count && attempts < count * 3.8) {
    attempts++;
    const a = attempts * 2.4;
    let r = placed < count * .55
      ? 8.5 + Math.sqrt(placed / (count * .55)) * 56
      : 64 + Math.pow((placed - count * .55) / (count * .45), 1.3) * 150;

    const px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;

    const py = getTerrainHeight(px, pz) - .08;
    const hx = getTerrainHeight(px + .5, pz) - getTerrainHeight(px - .5, pz);
    const hz = getTerrainHeight(px, pz + .5) - getTerrainHeight(px - .5, pz + .5);
    const slope = Math.hypot(hx, hz);
    if (slope > .62) continue;

    const d = Math.hypot(px, pz + 12), isDistant = d > 55;
    const distW = isDistant ? Math.min(3.6, 1 + (d - 55) / 50 * 1.5) : 1;
    const distH = isDistant ? Math.min(2.2, 1 + (d - 55) / 70 * .8) : 1;
    const s = (.9 + Math.random() * .55) * Math.max(.3, 1 - slope * 1.2);

    dummy.position.set(px, py, pz);
    dummy.rotation.set(-Math.atan2(hz, 1) + (Math.random() - .5) * .65, Math.random() * 6.28, Math.atan2(hx, 1) + (Math.random() - .5) * .65);
    dummy.scale.set(s * (.95 + Math.random() * .4) * distW * 2, s * (.85 + Math.random() * .7) * distH, s * (.95 + Math.random() * .4) * distW * 2);
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
