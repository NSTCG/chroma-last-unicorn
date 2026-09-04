// Streamlined World with Clean Architecture, Soft Shadows & Sky Blending
import { createFogCards } from './fogCards.js';

export function getTerrainHeight(x, z) {
  const lx = x, lz = z + 12, r = Math.hypot(lx, lz);
  return r < 90 ? 0 : Math.pow((r - 90) / 120, 1.7) * 48 + Math.sin(Math.atan2(lz, lx) * 6) * 10;
}

export function createWorld(scene) {
  const THREE = window.THREE;
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const groundUniforms = { uTime: { value: 0 }, uAwakened: { value: 0 } };

  const createRockMaterial = (tint = 0xffffff) => new THREE.ShaderMaterial({
    uniforms: { ...groundUniforms, uTint: { value: new THREE.Color(tint) } },
    vertexShader: `varying vec3 vWP,vVP,vN;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;uniform vec3 uTint;varying vec3 vWP,vVP,vN;float rn(vec3 p){vec3 q=p*1.6+vec3(sin(p.y*2.4)*0.3,cos(p.z*2.1)*0.3,sin(p.x*2.2)*0.3);float t=abs(sin(q.x*3.14)*cos(q.z*3.14)),s=sin(p.y*4.5+sin(p.x*2.8+p.z*2.8)*1.2)*0.5+0.5,c=smoothstep(0.06,0.18,abs(sin(p.x*1.8+p.y*2.2)*cos(p.z*1.8-p.y*1.5)));return t*0.45+s*0.35+c*0.2;}void main(){float n=rn(vWP);vec3 N=normalize(vN),L=normalize(vec3(0.5,1.0,0.4)),V=normalize(vVP);float d=dot(N,L),cel=smoothstep(-0.15,0.05,d)*0.35+smoothstep(0.18,0.42,d)*0.45+0.20,rim=pow(1.0-max(dot(N,V),0.0),3.0)*0.45,top=max(N.y,0.0)*0.22;vec3 sG=mix(vec3(0.16,0.16,0.20),vec3(0.26,0.26,0.30),n),sA=mix(vec3(0.36,0.38,0.42),vec3(0.56,0.52,0.48),n),base=mix(sG,sA,uAwakened),col=mix(base*uTint,base,0.35)*(cel+top)+vec3(0.1,0.12,0.15)*rim;float cl=smoothstep(0.04,0.12,abs(sin(vWP.x*2.2+vWP.y*2.8)*cos(vWP.z*2.2-vWP.y*1.8)));col=mix(col*0.42,col,cl);gl_FragColor=vec4(col,1.0-smoothstep(70.0,165.0,length(vVP)));}`,
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const stoneMat = createRockMaterial(0x90909e);
  const materials = [stoneMat];

  const groundMat = new THREE.ShaderMaterial({
    uniforms: groundUniforms,
    vertexShader: `varying vec3 vWP,vVP;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vVP=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;varying vec3 vWP,vVP;float cN(vec2 p,float t){vec2 u1=p*0.025+vec2(t*0.06,t*0.03),u2=p*0.05-vec2(t*0.04,t*0.07);return smoothstep(0.2,0.85,(sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*0.5+0.5)*0.65+(sin(u2.x*2.8+u2.y*1.9)*cos(u2.y*3.2-u2.x*1.5)*0.5+0.5)*0.35);}void main(){float c=cN(vWP.xz,uTime);vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened),gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*1.35,sun=vec3(1.22,1.14,1.02);gl_FragColor=vec4(gF*mix(gi,sun,c*0.42+0.58),1.0-smoothstep(70.0,165.0,length(vVP)));}`,
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const groundGeo = new THREE.PlaneGeometry(550, 550, 48, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i) - 12));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0, -12);
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(8, 9.5, 0.8, 8), stoneMat);
  altar.position.set(0, 0.4, -12); altar.castShadow = altar.receiveShadow = true;

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 0.8, 6), stoneMat);
  ped.position.set(0, 0.9, -12); ped.castShadow = ped.receiveShadow = true;
  worldGroup.add(altar, ped);

  const mGeo = new THREE.BoxGeometry(3.5, 32, 3.5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283, d = 82 + Math.random() * 32, h = 22 + Math.random() * 26, m = new THREE.Mesh(mGeo, stoneMat);
    m.scale.set(1 + Math.random(), h / 32, 1 + Math.random());
    m.position.set(Math.cos(a) * d, h / 2, -12 + Math.sin(a) * d);
    m.castShadow = m.receiveShadow = true;
    worldGroup.add(m);
  }

  const islGeo = new THREE.ConeGeometry(4, 4, 6);
  islGeo.rotateX(Math.PI);
  islGeo.translate(0, -2, 0);

  const islands = [
    [-25,6.2,-6,0xff2244],[25,6.2,-6,0xff7700],[-18,6.5,12,0xffcc00],
    [18,6.5,12,0x11cc44],[-24,7.8,-18,0x00aaff],[24,7.5,-18,0x5533ee],[0,9.8,-28,0xcc22ee]
  ].map(([x, y, z, color]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const rockMat = createRockMaterial(color);
    materials.push(rockMat);
    const m = new THREE.Mesh(islGeo, rockMat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    worldGroup.add(g);
    return { group: g, basePos: new THREE.Vector3(x, y, z), seed: Math.random() * 100 };
  });

  const fogCards = createFogCards(scene, 48);

  return {
    worldGroup, materials, groundMat,
    setAwakened: (val) => {
      groundUniforms.uAwakened.value = val;
      materials.forEach(m => m.setAwakened?.(val));
      fogCards.setAwakened(val);
    },
    update: (delta, camera) => {
      groundUniforms.uTime.value += delta;
      const t = groundUniforms.uTime.value;
      islands.forEach(isl => {
        isl.group.position.y = isl.basePos.y + Math.sin(t * 1.2 + isl.seed) * 0.45;
        isl.group.rotation.y = t * 0.15 + isl.seed;
      });
      materials.forEach(m => m.update?.(delta));
      fogCards.update(delta, camera);
    }
  };
}
