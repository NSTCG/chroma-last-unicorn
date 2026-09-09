import { getTerrainHeight } from './world.js';
import { stdVS, glslRainbow } from '../shaders/common.js';
import { T, Grp, Msh, SMat, BMat, CGeo, SGeo, ConeGeo } from '../engine/three.js';

export function createUnicorn(scene) {
  const group = Grp();
  const uniforms = { uTime: { value: 0 } };

  const fs = `precision highp float;uniform float uTime,uMat;varying vec3 vN,vWP,vV;${glslRainbow}void main(){vec3 N=normalize(gl_FrontFacing?vN:-vN),V=normalize(vV);float d=max(dot(N,vec3(.3,.8,.5)),0.),t6=smoothstep(.02,.48,d)*.6+.4,spec=pow(max(dot(reflect(vec3(-.3,-.8,-.5),N),V),0.),20.),fr=pow(1.-max(dot(N,V),0.),2.2),outl=smoothstep(.54,.66,1.-max(dot(N,V),0.));vec3 p=vec3(.97)*t6+rb(vWP.y*.3+uTime*.3)*fr*.45,g=vec3(1.,.84,.25)*t6+rb(uTime*.4+vWP.y*.4)*fr*.65,h=rb(vWP.y*1.4+vWP.z*1.2+uTime*.6)*(t6*.75+.25)+spec*.9,b=uMat>1.5?h:(uMat>.5?g:p);gl_FragColor=vec4(mix(b+spec*.45,vec3(.04,.02,.07),outl*.95),1.);}`;

  const makeMat = (uMat) => SMat({
    vertexShader: stdVS, fragmentShader: fs,
    uniforms: { uTime: uniforms.uTime, uMat: { value: uMat } },
    side: 2, transparent: true, depthWrite: true
  });

  const pearlMat = makeMat(0), goldMat = makeMat(1), rainbowMat = makeMat(2);
  const body = Grp();
  group.add(body);

  const cGeo = SGeo(0.38, 8, 8); cGeo.scale(0.9, 1.15, 1.15);
  const bGeo = CGeo(0.36, 0.26, 0.9, 8); bGeo.rotateX(1.5708); bGeo.scale(0.9, 1.15, 1);
  const rGeo = SGeo(0.27, 8, 8); rGeo.scale(0.9, 1.08, 1.08);
  const chest = Msh(cGeo, pearlMat), barrel = Msh(bGeo, pearlMat), rump = Msh(rGeo, pearlMat);
  chest.position.set(0, 1.3, 0.44); barrel.position.set(0, 1.25, 0); rump.position.set(0, 1.2, -0.45);
  body.add(chest, barrel, rump);

  const neckHeadPivot = Grp();
  body.add(neckHeadPivot);

  const buildLoft = (rings, segs, tip) => {
    const verts = [], inds = [];
    for (let j = 0; j < rings.length; j += 3) {
      const ry = rings[j], rz = rings[j + 1], rad = rings[j + 2];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * 6.283;
        verts.push(Math.cos(a) * rad, ry + Math.sin(a) * rad, rz);
      }
    }
    if (tip) verts.push(...tip);
    const nRings = rings.length / 3;
    for (let r = 0; r < nRings - 1; r++) {
      const r0 = r * segs, r1 = r0 + segs;
      for (let i = 0; i < segs; i++) {
        const n = (i + 1) % segs;
        inds.push(r0 + i, r0 + n, r1 + n, r0 + i, r1 + n, r1 + i);
      }
    }
    if (tip) {
      const lr = (nRings - 1) * segs, tipIdx = verts.length / 3 - 1;
      for (let i = 0; i < segs; i++) inds.push(lr + i, lr + (i + 1) % segs, tipIdx);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(verts), 3));
    geo.setIndex(inds);
    geo.computeVertexNormals();
    return geo;
  };

  const neckGeo = buildLoft([1.3,.44,.24, 1.54,.62,.2, 1.76,.82,.16, 1.94,1.02,.13, 1.94,1.2,.14, 1.78,1.38,.1, 1.66,1.56,.07], 8, [0, 1.64, 1.62]);
  const maneGeo = buildLoft([2.02,.96,.03, 1.92,.82,.05, 1.76,.66,.06, 1.6,.48,.07, 1.44,.32,.04], 6);
  neckHeadPivot.add(Msh(neckGeo, pearlMat), Msh(maneGeo, rainbowMat));

  const earGeo = ConeGeo(.04, .2, 5);
  [-1, 1].forEach(s => {
    const ear = Msh(earGeo, pearlMat);
    ear.position.set(s * .075, 2.08, 1.12); ear.rotation.set(-.25, 0, s * .15);
    neckHeadPivot.add(ear);
  });
  const hornGeo = ConeGeo(.026, .42, 6); hornGeo.rotateX(.72); hornGeo.translate(0, .2, .12);
  const horn = Msh(hornGeo, goldMat); horn.position.set(0, 1.96, 1.22);
  neckHeadPivot.add(horn);

  const tailPivot = Grp();
  tailPivot.position.set(0, 1.24, -.55);
  body.add(tailPivot);
  const tailGeo = buildLoft([0,0,.06, .04,-.18,.09, -.25,-.36,.11, -.52,-.44,.08, -.78,-.4,.02], 6);
  tailPivot.add(Msh(tailGeo, rainbowMat));

  const uGeo = CGeo(.1, .065, .55, 6); uGeo.translate(0, -.275, 0);
  const lGeo = CGeo(.055, .045, .52, 6); lGeo.translate(0, -.26, 0);
  const hoofGeo = CGeo(.045, .075, .12, 6); hoofGeo.translate(0, -.57, .012);

  const legs = [[.18,.42],[-.18,.42],[.15,-.45],[-.15,-.45]].map(([x, z]) => {
    const hip = Grp(), knee = Grp();
    hip.position.set(x, z > 0 ? 1.18 : 1.1, z); knee.position.set(0, -.55, 0);
    body.add(hip); hip.add(Msh(uGeo, pearlMat), knee);
    knee.add(Msh(lGeo, pearlMat), Msh(hoofGeo, goldMat));
    return { hip, knee };
  });

  const hitbox = Msh(CGeo(1.6, 1.6, 2.6, 6), BMat({ visible: false }));
  hitbox.position.set(0, 1.3, 0);
  group.add(hitbox);
  group.position.set(0, getTerrainHeight(0, -12) + 1, -12);

  let gallopTimer = 0, flightTimer = 0, currentHeading = 0;

  const unicornObj = {
    group, mat: pearlMat, isMounted: false,
    getInteractiveMeshes: () => [hitbox],
    setAwakened: () => {},
    move: (moveVector, delta) => {
      if (moveVector.lengthSq() > 0.001) {
        group.position.addScaledVector(moveVector, 11 * delta);
        const targetAngle = Math.atan2(moveVector.x, moveVector.z);
        let diff = (targetAngle - currentHeading + 3.14) % 6.28 - 3.14;
        currentHeading += diff * Math.min(1, delta * 2.5);
        group.rotation.y = currentHeading;
      }
      group.position.y = getTerrainHeight(group.position.x, group.position.z) + 1;
    },
    update: (delta, state = 'idle') => {
      uniforms.uTime.value += delta;
      const t = uniforms.uTime.value;

      if (state === 'idle') {
        const rr = Math.min(1, delta * 14);
        legs.forEach(l => {
          l.hip.rotation.x += -l.hip.rotation.x * rr;
          l.knee.rotation.x += -l.knee.rotation.x * rr;
        });
        neckHeadPivot.rotation.x += (Math.sin(t * 1.5) * 0.025 - neckHeadPivot.rotation.x) * rr;
        neckHeadPivot.rotation.y += (Math.sin(t * 0.8) * 0.04 - neckHeadPivot.rotation.y) * rr;
        body.position.y += (Math.sin(t * 1.5) * 0.015 - body.position.y) * rr;
        tailPivot.rotation.y = Math.sin(t * 2) * 0.15;
      } else if (state === 'gallop' || state === 'ascend') {
        gallopTimer += delta * 9.5;
        const s = Math.sin(gallopTimer), c = Math.cos(gallopTimer);
        legs.forEach((l, i) => {
          const v = (i < 2 ? (i ? -s : s) : (i % 2 ? c : -c)) * 0.65;
          l.hip.rotation.x = v;
          l.knee.rotation.x = Math.max(0, (i < 2 ? (i ? s : -s) : (i % 2 ? -c : c)) * 0.7);
        });
        body.position.y = Math.abs(s) * 0.18;
        neckHeadPivot.rotation.x = s * 0.08;
        tailPivot.rotation.y = s * 0.35;

        if (state === 'ascend') {
          flightTimer += delta * 0.4;
          const rad = 16 + Math.sin(flightTimer * 1.2) * 4;
          group.position.set(Math.sin(flightTimer * 2.2) * rad, 2.8 + Math.sin(flightTimer * 4) * 0.8 + flightTimer * 3.2, -12 + Math.cos(flightTimer * 2.2) * rad);
          group.rotation.y = flightTimer * 2.2 + Math.PI / 2;
        }
      }
    }
  };

  hitbox.userData = { isUnicorn: true, unicorn: unicornObj, data: { isUnicorn: true } };
  group.traverse((obj) => {
    if (obj.isMesh) obj.userData = hitbox.userData;
  });

  scene.add(group);
  return unicornObj;
}
