import { getTerrainHeight } from './world.js';
import { STD_VS, RAINBOW_GLSL } from '../shaders/common.js';

export function createUnicorn(scene) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uColorAwakened: { value: 0 } };

  const fs = `precision highp float;uniform float uTime,uMat;varying vec3 vN,vWP,vVP;${RAINBOW_GLSL}void main(){vec3 N=normalize(gl_FrontFacing?vN:-vN),V=normalize(vVP),L=normalize(vec3(0.5,1.0,0.4));float d=max(dot(N,L),0.0),toon=smoothstep(0.02,0.12,d)*0.4+smoothstep(0.38,0.48,d)*0.6,fr=pow(1.0-max(dot(N,V),0.0),2.2),outl=smoothstep(0.54,0.66,1.0-max(dot(N,V),0.0));vec3 p=vec3(0.96,0.97,1.0)*(toon*0.65+0.35)+rb(vWP.y*0.3+uTime*0.3)*fr*0.45,g=vec3(1.0,0.84,0.25)*(toon*0.65+0.35)+rb(uTime*0.4+vWP.y*0.4)*fr*0.65,h=rb(vWP.y*1.4+vWP.z*1.2+uTime*0.6)*(toon*0.75+0.25),b=uMat>1.5?h:(uMat>0.5?g:p);gl_FragColor=vec4(mix(b,vec3(0.04,0.02,0.07),outl*0.95),1.0);}`;

  const makeMat = (uMat) => new THREE.ShaderMaterial({
    vertexShader: STD_VS, fragmentShader: fs,
    uniforms: { ...uniforms, uMat: { value: uMat } },
    side: THREE.DoubleSide
  });

  const pearlMat = makeMat(0), goldMat = makeMat(1), rainbowMat = makeMat(2);
  const body = new THREE.Group();
  group.add(body);

  const cGeo = new THREE.SphereGeometry(0.38, 8, 6); cGeo.scale(0.9, 1.15, 1.15);
  const bGeo = new THREE.CylinderGeometry(0.36, 0.26, 0.90, 8); bGeo.rotateX(1.57); bGeo.scale(0.9, 1.15, 1.0);
  const rGeo = new THREE.SphereGeometry(0.27, 8, 6); rGeo.scale(0.9, 1.08, 1.08);
  const chest = new THREE.Mesh(cGeo, pearlMat), barrel = new THREE.Mesh(bGeo, pearlMat), rump = new THREE.Mesh(rGeo, pearlMat);
  chest.position.set(0, 1.30, 0.44); barrel.position.set(0, 1.25, 0); rump.position.set(0, 1.20, -0.45);
  body.add(chest, barrel, rump);

  const neckHeadPivot = new THREE.Group();
  body.add(neckHeadPivot);

  const neckGeo = new THREE.CylinderGeometry(0.14, 0.24, 0.85, 6);
  neckGeo.rotateX(0.55); neckGeo.translate(0, 1.65, 0.75);
  const headGeo = new THREE.ConeGeometry(0.18, 0.55, 6);
  headGeo.rotateX(-1.2); headGeo.translate(0, 1.95, 1.15);
  const maneGeo = new THREE.BoxGeometry(0.08, 0.85, 0.35);
  maneGeo.rotateX(0.55); maneGeo.translate(0, 1.75, 0.65);
  neckHeadPivot.add(new THREE.Mesh(neckGeo, pearlMat), new THREE.Mesh(headGeo, pearlMat), new THREE.Mesh(maneGeo, rainbowMat));

  const earGeo = new THREE.ConeGeometry(0.04, 0.20, 5);
  const earL = new THREE.Mesh(earGeo, pearlMat), earR = new THREE.Mesh(earGeo, pearlMat);
  earL.position.set(0.08, 2.12, 1.08); earL.rotation.set(-0.25, 0, -0.15);
  earR.position.set(-0.08, 2.12, 1.08); earR.rotation.set(-0.25, 0, 0.15);
  const hornGeo = new THREE.ConeGeometry(0.026, 0.42, 6); hornGeo.rotateX(0.72); hornGeo.translate(0, 0.20, 0.12);
  const horn = new THREE.Mesh(hornGeo, goldMat); horn.position.set(0, 1.96, 1.22);
  neckHeadPivot.add(earL, earR, horn);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.24, -0.55);
  body.add(tailPivot);
  const tailGeo = new THREE.ConeGeometry(0.12, 0.95, 5);
  tailGeo.rotateX(-0.55); tailGeo.translate(0, -0.4, -0.2);
  tailPivot.add(new THREE.Mesh(tailGeo, rainbowMat));

  const uGeo = new THREE.CylinderGeometry(0.1, 0.065, 0.55, 6); uGeo.translate(0, -0.275, 0);
  const lGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.52, 6); lGeo.translate(0, -0.26, 0);
  const hoofGeo = new THREE.CylinderGeometry(0.045, 0.075, 0.12, 6); hoofGeo.translate(0, -0.57, 0.012);

  const legs = [[0.18,0.42,1.18],[-0.18,0.42,1.18],[0.15,-0.45,1.1],[-0.15,-0.45,1.1]].map(([x, z, y]) => {
    const hip = new THREE.Group(); hip.position.set(x, y, z); body.add(hip);
    hip.add(new THREE.Mesh(uGeo, pearlMat));
    const knee = new THREE.Group(); knee.position.set(0, -0.55, 0); hip.add(knee);
    knee.add(new THREE.Mesh(lGeo, pearlMat), new THREE.Mesh(hoofGeo, goldMat));
    return { hip, knee };
  });

  const hitbox = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.position.set(0, 1.3, 0);
  group.add(hitbox);
  group.position.set(0, getTerrainHeight(0, -12) + 1.0, -12);

  let gallopTimer = 0, flightTimer = 0, currentHeading = 0;

  const unicornObj = {
    group, mat: pearlMat, isMounted: false,
    getInteractiveMeshes: () => [hitbox],
    setAwakened: (val) => { uniforms.uColorAwakened.value = val; },
    move: (moveVector, delta) => {
      if (moveVector.lengthSq() > 0.001) {
        group.position.addScaledVector(moveVector, 12.5 * delta);
        const targetAngle = Math.atan2(moveVector.x, moveVector.z);
        let diff = targetAngle - currentHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        currentHeading += diff * Math.min(1.0, delta * 12.0);
        group.rotation.y = currentHeading;
      }
      group.position.y = getTerrainHeight(group.position.x, group.position.z) + 1.0;
    },
    update: (delta, state = 'idle') => {
      uniforms.uTime.value += delta;
      const t = uniforms.uTime.value;

      if (state === 'idle') {
        const rr = Math.min(1.0, delta * 14.0);
        for (let i = 0; i < 4; i++) {
          legs[i].hip.rotation.x += -legs[i].hip.rotation.x * rr;
          legs[i].knee.rotation.x += -legs[i].knee.rotation.x * rr;
        }
        neckHeadPivot.rotation.x += (Math.sin(t * 1.5) * 0.025 - neckHeadPivot.rotation.x) * rr;
        body.position.y += (Math.sin(t * 1.5) * 0.015 - body.position.y) * rr;
        tailPivot.rotation.y = Math.sin(t * 2.0) * 0.15;
      } else {
        gallopTimer += delta * 9.5;
        const s = Math.sin(gallopTimer), c = Math.cos(gallopTimer);
        legs[0].hip.rotation.x = s * 0.65; legs[0].knee.rotation.x = Math.max(0, -s * 0.7);
        legs[1].hip.rotation.x = -s * 0.65; legs[1].knee.rotation.x = Math.max(0, s * 0.7);
        legs[2].hip.rotation.x = -c * 0.65; legs[2].knee.rotation.x = Math.max(0, c * 0.7);
        legs[3].hip.rotation.x = c * 0.65; legs[3].knee.rotation.x = Math.max(0, -c * 0.7);
        body.position.y = Math.abs(s) * 0.18;
        neckHeadPivot.rotation.x = s * 0.08;
        tailPivot.rotation.y = s * 0.35;

        if (state === 'ascend') {
          flightTimer += delta * 0.4;
          const rad = 16 + Math.sin(flightTimer * 1.2) * 4;
          group.position.set(Math.sin(flightTimer * 2.2) * rad, 2.8 + Math.sin(flightTimer * 4.0) * 0.8 + flightTimer * 3.2, -12 + Math.cos(flightTimer * 2.2) * rad);
          group.rotation.y = flightTimer * 2.2 + Math.PI / 2;
        }
      }
    }
  };

  hitbox.userData = { isUnicorn: true, unicorn: unicornObj, data: { isUnicorn: true } };
  group.traverse((obj) => {
    if (obj.isMesh && obj !== hitbox) obj.userData = hitbox.userData;
  });

  scene.add(group);
  return unicornObj;
}
