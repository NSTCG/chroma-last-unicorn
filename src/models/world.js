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

  const createRockMaterial = (tint = 0x8e9aa8) => SMat({
    uniforms: { ...groundUniforms, uTint: { value: Col(tint) } },
    vertexShader: stdVS,
    fragmentShader: `precision highp float;uniform float uAwakened;uniform vec3 uTint;varying vec3 vWP,vN,vV;void main(){vec3 N=normalize(vN),V=normalize(vV),p=vWP*.4,q=p+sin(p.yzx*3.3)*.35;float n=sin(q.x*2.6+sin(q.y*3.2+q.z*2.4))*.25+sin(q.y*6.5-q.z*5.)*.1+sin(dot(vWP,vec3(22)))*.04+.85,crk=smoothstep(.08,.5,abs(sin(dot(q,vec3(3.6,2.4,3))))),pat=n*crk;vec3 bN=normalize(N+sin(q.yzx*7.)*.12);float d=max(dot(bN,vec3(.4,.8,.5)),0.)*.65+.35,rim=pow(1.-max(dot(bN,V),0.),3.)*.35,occ=clamp(pat*1.2-.2,.25,1.);vec3 gR=mix(vec3(.08),vec3(.35),pat*d)*occ,cR=mix(gR,gR*uTint*1.8,.55)+rim*uTint*occ;gl_FragColor=vec4(mix(gR,cR,uAwakened),1.-smoothstep(70.,165.,length(vV)));}`,
    side: 2, transparent: true, depthWrite: true
  });

  const stoneMat = createRockMaterial(0x8e9aa8);

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
  worldGroup.add(ground);

  const altar = Msh(CGeo(8, 9.5, 0.8, 8), stoneMat);
  altar.position.set(0, 0.4, -12);
  const ped = Msh(CGeo(2.5, 3.2, 0.8, 6), stoneMat);
  ped.position.set(0, 0.9, -12);
  worldGroup.add(altar, ped);

  const mGeo = CGeo(2.5, 2.5, 32, 4);
  for (let i = 0; i < 24; i++) {
    const a = i * 0.262, d = 82 + Math.random() * 32, h = 22 + Math.random() * 26, m = Msh(mGeo, stoneMat);
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
    const m = Msh(islGeo, rockMat);
    g.add(m);
    worldGroup.add(g);
    return { g, y, seed: Math.random() * 100 };
  });

  const fogCards = createFogCards(scene, 48);

  return {
    worldGroup, groundMat,
    setAwakened: (val) => {
      groundUniforms.uAwakened.value = val;
      fogCards.setAwakened(val);
    },
    update: (delta, camera) => {
      groundUniforms.uTime.value += delta;
      const t = groundUniforms.uTime.value;
      islands.forEach(isl => {
        isl.g.position.y = isl.y + Math.sin(t * 1.2 + isl.seed) * 0.45;
        isl.g.rotation.y = t * 0.15 + isl.seed;
      });
      fogCards.update(delta, camera);
    }
  };
}
