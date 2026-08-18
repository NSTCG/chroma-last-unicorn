// Celestial Unicorn with Crisp Cel-Toon Outlines, Shadow Casting & Dynamic Flight
import { getTerrainHeight } from './world.js';

export function createUnicorn(scene) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uColorAwakened: { value: 0 } };

  const vs = `varying vec3 vN,vWP,vV;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(position,1.0);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
  const fs = `precision highp float;uniform float uTime,uMat;varying vec3 vN,vWP,vV;vec3 rb(float t){return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67)));}void main(){vec3 N=normalize(gl_FrontFacing?vN:-vN);vec3 V=normalize(vV);vec3 L=normalize(vec3(0.5,1.0,0.4));float d=max(dot(N,L),0.0),toon=smoothstep(0.02,0.12,d)*0.4+smoothstep(0.38,0.48,d)*0.6,spec=pow(max(dot(reflect(-L,N),V),0.0),20.0),fr=pow(1.0-max(dot(N,V),0.0),2.2),outl=smoothstep(0.54,0.66,1.0-max(dot(N,V),0.0));vec3 pearl=vec3(0.96,0.97,1.0)*(toon*0.65+0.35)+rb(vWP.y*0.3+uTime*0.3)*fr*0.45,gold=vec3(1.0,0.84,0.25)*(toon*0.65+0.35)+rb(uTime*0.4+vWP.y*0.4)*fr*0.65,hair=rb(vWP.y*1.4+vWP.z*1.2+uTime*0.6)*(toon*0.75+0.25)+spec*vec3(0.9),base=uMat>1.5?hair:(uMat>0.5?gold:pearl),col=mix(base+spec*0.45,vec3(0.04,0.02,0.07),outl*0.95);gl_FragColor=vec4(col,1.0);}`;

  const makeMat = (uMat) => new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs,
    uniforms: { ...uniforms, uMat: { value: uMat } },
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const pearlMat = makeMat(0), goldMat = makeMat(1), rainbowMat = makeMat(2);
  const body = new THREE.Group();
  body.rotation.y = Math.PI; // Face standard Three.js -Z forward
  group.add(body);

  const chestGeo = new THREE.SphereGeometry(0.38, 8, 8); chestGeo.scale(0.9, 1.15, 1.15);
  const barrelGeo = new THREE.CylinderGeometry(0.36, 0.26, 0.90, 8); barrelGeo.rotateX(Math.PI / 2); barrelGeo.scale(0.9, 1.15, 1.0);
  const rumpGeo = new THREE.SphereGeometry(0.27, 8, 8); rumpGeo.scale(0.9, 1.08, 1.08);
  const chest = new THREE.Mesh(chestGeo, pearlMat); chest.position.set(0, 1.30, 0.44);
  const barrel = new THREE.Mesh(barrelGeo, pearlMat); barrel.position.set(0, 1.25, 0);
  const rump = new THREE.Mesh(rumpGeo, pearlMat); rump.position.set(0, 1.20, -0.45);
  body.add(chest, barrel, rump);

  const neckHeadPivot = new THREE.Group();
  body.add(neckHeadPivot);

  const neckGeo = new THREE.CylinderGeometry(0.12, 0.26, 1.1, 7); neckGeo.rotateX(-0.68); neckGeo.translate(0, 1.72, 0.72);
  const headGeo = new THREE.SphereGeometry(0.16, 7, 7); headGeo.scale(0.85, 1.1, 1.4); headGeo.translate(0, 2.05, 1.15);
  const maneGeo = new THREE.BoxGeometry(0.06, 0.9, 0.45); maneGeo.rotateX(-0.68); maneGeo.translate(0, 1.82, 0.62);
  neckHeadPivot.add(new THREE.Mesh(neckGeo, pearlMat), new THREE.Mesh(headGeo, pearlMat), new THREE.Mesh(maneGeo, rainbowMat));

  const earGeo = new THREE.ConeGeometry(0.04, 0.20, 5);
  const earL = new THREE.Mesh(earGeo, pearlMat); earL.position.set(0.075, 2.18, 1.12); earL.rotation.set(-0.25, 0, -0.15);
  const earR = new THREE.Mesh(earGeo, pearlMat); earR.position.set(-0.075, 2.18, 1.12); earR.rotation.set(-0.25, 0, 0.15);
  const hornGeo = new THREE.ConeGeometry(0.026, 0.42, 6); hornGeo.rotateX(0.72); hornGeo.translate(0, 0.20, 0.12);
  const horn = new THREE.Mesh(hornGeo, goldMat); horn.position.set(0, 2.05, 1.25);
  neckHeadPivot.add(earL, earR, horn);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.24, -0.55);
  body.add(tailPivot);
  const tailGeo = new THREE.ConeGeometry(0.11, 0.85, 6); tailGeo.rotateX(0.35); tailGeo.translate(0, -0.42, -0.2);
  tailPivot.add(new THREE.Mesh(tailGeo, rainbowMat));

  const uGeo = new THREE.CylinderGeometry(0.1, 0.065, 0.55, 6); uGeo.translate(0, -0.275, 0);
  const lGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.52, 6); lGeo.translate(0, -0.26, 0);
  const hoofGeo = new THREE.CylinderGeometry(0.045, 0.075, 0.12, 6); hoofGeo.translate(0, -0.57, 0.012);

  const legs = [[0.18,0.42,true],[-0.18,0.42,true],[0.15,-0.45,false],[-0.15,-0.45,false]].map(([x, z, isFront]) => {
    const hip = new THREE.Group(); hip.position.set(x, isFront ? 1.18 : 1.10, z); body.add(hip);
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
        const targetAngle = Math.atan2(-moveVector.x, -moveVector.z);
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
        neckHeadPivot.rotation.y += (Math.sin(t * 0.8) * 0.04 - neckHeadPivot.rotation.y) * rr;
        body.position.y += (Math.sin(t * 1.5) * 0.015 - body.position.y) * rr;
        tailPivot.rotation.y = Math.sin(t * 2.0) * 0.15;
      } else if (state === 'gallop' || state === 'ascend') {
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
          group.position.x = Math.sin(flightTimer * 2.2) * rad;
          group.position.z = -12 + Math.cos(flightTimer * 2.2) * rad;
          group.position.y = 2.8 + Math.sin(flightTimer * 4.0) * 0.8 + flightTimer * 3.2;
          group.rotation.y = flightTimer * 2.2 + Math.PI / 2;
        }
      }
    }
  };

  hitbox.userData = { isUnicorn: true, unicorn: unicornObj, data: { isUnicorn: true } };
  group.traverse((obj) => {
    if (obj.isMesh) {
      if (obj !== hitbox) obj.castShadow = true;
      obj.userData = hitbox.userData;
    }
  });

  scene.add(group);
  return unicornObj;
}

