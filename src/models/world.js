import { createFogCards } from './fogCards.js';
import { stdVS, glslGround } from '../shaders/common.js';
import { SHARDS_DATA } from '../story/shards.js';
import { T, Grp, Msh, Col, SMat, CGeo, PGeo, ConeGeo } from '../engine/three.js';


export function getTerrainHeight(x, z) {
  const lx = x, lz = z + 12, r = Math.hypot(lx, lz);
  return r < 90 ? 0 : Math.pow((r - 90) / 120, 1.7) * 48 + Math.sin(Math.atan2(lz, lx) * 6) * 10;
}

export function createWorld(scene) {
  const worldGroup = Grp();
  scene.add(worldGroup);

  const groundUniforms = { uTime: { value: 0 }, uAwakened: { value: 0 } };

  const createRockMaterial = (tint = 0xffffff) => SMat({
    uniforms: { ...groundUniforms, uTint: { value: Col(tint) } },
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;uniform vec3 uTint;varying vec3 vWP,vV,vN;float rn(vec3 p){vec3 q=p*1.6+vec3(sin(p.y*2.4)*.3,cos(p.z*2.1)*.3,sin(p.x*2.2)*.3);float tile=abs(sin(q.x*3.14)*cos(q.z*3.14)),strata=sin(p.y*4.5+sin(p.x*2.8+p.z*2.8)*1.2)*.5+.5,crack=smoothstep(.06,.18,abs(sin(p.x*1.8+p.y*2.2)*cos(p.z*1.8-p.y*1.5)));return tile*.45+strata*.35+crack*.2;}void main(){float n=rn(vWP);vec3 N=normalize(vN),L=normalize(vec3(.5,1.,.4)),V=normalize(vV);float d=dot(N,L),cel=smoothstep(-.15,.05,d)*.35+smoothstep(.18,.42,d)*.45+.2,rim=pow(1.-max(dot(N,V),0.),3.)*.45,top=max(N.y,0.)*.22;vec3 sG=mix(vec3(.16,.16,.2),vec3(.26,.26,.3),n),sA=mix(vec3(.36,.38,.42),vec3(.56,.52,.48),n),base=mix(sG,sA,uAwakened),col=mix(base*uTint,base,.35)*(cel+top)+vec3(.1,.12,.15)*rim;float cl=smoothstep(.04,.12,abs(sin(vWP.x*2.2+vWP.y*2.8)*cos(vWP.z*2.2-vWP.y*1.8)));col=mix(col*.42,col,cl);gl_FragColor=vec4(col,1.-smoothstep(70.,165.,length(vV)));}`,
    side: 2, transparent: true, depthWrite: true
  });

  const stoneMat = createRockMaterial(0x90909e);
  const materials = [stoneMat];

  const groundMat = SMat({
    uniforms: groundUniforms,
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uTime,uAwakened;varying vec3 vWP,vV,vN;${glslGround}void main(){gl_FragColor=vec4(gCol(vWP.xz,uTime,uAwakened),1.-smoothstep(70.,165.,length(vV)));}`,
    side: 2, transparent: true, depthWrite: true
  });

  const groundGeo = PGeo(550, 550, 48, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i) - 12));
  groundGeo.computeVertexNormals();
  const ground = Msh(groundGeo, groundMat);
  ground.position.set(0, 0, -12);
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const altar = Msh(CGeo(8, 9.5, 0.8, 8), stoneMat);
  altar.position.set(0, 0.4, -12);

  const ped = Msh(CGeo(2.5, 3.2, 0.8, 6), stoneMat);
  ped.position.set(0, 0.9, -12);
  worldGroup.add(altar, ped);

  const mGeo = new T.BoxGeometry(3.5, 32, 3.5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.28, d = 82 + Math.random() * 32, h = 22 + Math.random() * 26, m = Msh(mGeo, stoneMat);
    m.scale.set(1 + Math.random(), h / 32, 1 + Math.random());
    m.position.set(Math.cos(a) * d, h / 2, -12 + Math.sin(a) * d);
    worldGroup.add(m);
  }

  const islGeo = ConeGeo(4, 4, 6);
  islGeo.rotateX(Math.PI);
  islGeo.translate(0, -2, 0);

  const islands = SHARDS_DATA.map(d => {
    const g = Grp(), y = d.pos[1] - 3;
    g.position.set(d.pos[0], y, d.pos[2]);
    const rockMat = createRockMaterial(d.color);
    materials.push(rockMat);
    const m = Msh(islGeo, rockMat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    worldGroup.add(g);
    return { g, y, seed: Math.random() * 100 };
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
        isl.g.position.y = isl.y + Math.sin(t * 1.2 + isl.seed) * 0.45;
        isl.g.rotation.y = t * 0.15 + isl.seed;
      });
      materials.forEach(m => m.update?.(delta));
      fogCards.update(delta, camera);
    }
  };
}
