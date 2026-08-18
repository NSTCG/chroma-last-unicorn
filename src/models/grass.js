import { getTerrainHeight } from './world.js';

export function createGrassField(scene, initialCount = 58000) {
  const THREE = window.THREE;
  const maxCount = 75000;

  const bladeGeo = new THREE.PlaneGeometry(0.32, 1.85, 1, 2);
  bladeGeo.translate(0, 0.925, 0);

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0 },
    uFadeIntensity: { value: 0.95 },
    uWS: { value: 1.0 },
    uWSt: { value: 1.0 },
    uGIShadowStrength: { value: 1.35 },
    uGrassBaseTint: { value: new THREE.Color(0.04, 0.22, 0.07) },
    uGrassTipTint: { value: new THREE.Color(0.28, 0.96, 0.38) },
    uGrassGradPow: { value: 0.85 },
    uCloudShadowDensity: { value: 0.42 }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `uniform mat4 directionalShadowMatrix[1];uniform float uTime,uWS,uWSt;varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;void main(){vH=uv.y;vec4 wp=instanceMatrix*vec4(position,1.0);float t=uTime*uWS;float w=(sin(wp.x*0.12+wp.z*0.09+t*1.5)+sin(wp.x*0.30-wp.z*0.22+t*2.8)*0.45+cos(wp.z*0.50+wp.x*0.35+t*4.0)*0.18)*0.42*uWSt;float b=pow(vH,1.8)*w;wp.x+=b;wp.z+=b*0.75;wp.y-=abs(b)*0.22*vH;vWP=wp.xyz;vec4 mv=modelViewMatrix*vec4(wp.xyz,1.0);vVP=-mv.xyz;vShadowCoord=directionalShadowMatrix[0]*wp;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `#include <packing>
      uniform sampler2D directionalShadowMap[1];uniform float uTime,uAwakened,uFadeIntensity,uGIShadowStrength,uGrassGradPow,uCloudShadowDensity;uniform vec3 uGrassBaseTint,uGrassTipTint;varying vec3 vWP,vVP;varying float vH;varying vec4 vShadowCoord;
      float cloudN(vec2 p,float t){vec2 u1=p*0.025+vec2(t*0.06,t*0.03),u2=p*0.05-vec2(t*0.04,t*0.07);float n1=sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*0.5+0.5,n2=sin(u2.x*2.8+u2.y*1.9)*cos(u2.y*3.2-u2.x*1.5)*0.5+0.5;return smoothstep(0.2,0.85,n1*0.65+n2*0.35);}
      void main(){
        float c=cloudN(vWP.xz,uTime);
        vec3 gA=mix(vec3(0.04,0.20,0.06),vec3(0.16,0.38,0.14),c),gG=mix(vec3(0.08,0.08,0.10),vec3(0.18,0.18,0.22),c),gF=mix(gG,gA,uAwakened);
        vec3 gi=mix(vec3(0.55,0.58,0.70),vec3(0.72,0.54,0.70),uAwakened)*uGIShadowStrength,sun=vec3(1.22,1.14,1.02);
        vec3 groundLit=gF*mix(gi,sun,c*0.42+0.58);
        vec3 sc=vShadowCoord.xyz/vShadowCoord.w;float shadowOcc=1.0;
        if(sc.x>=0.0&&sc.x<=1.0&&sc.y>=0.0&&sc.y<=1.0&&sc.z<=1.0){
          if(sc.z>unpackRGBAToDepth(texture2D(directionalShadowMap[0],sc.xy))+0.0006) shadowOcc=0.0;
        }
        float bVar=sin(vWP.x*0.18+1.2)*cos(vWP.z*0.18+0.8)*0.5+0.5;
        vec3 tipCol=mix(mix(uGrassBaseTint*1.8,uGrassTipTint*0.7,bVar),mix(uGrassTipTint*0.85,uGrassTipTint*1.25+vec3(0.12,0.10,0.04),bVar),c);
        float sFac=shadowOcc*(c*uCloudShadowDensity+(1.0-uCloudShadowDensity));
        vec3 tipFinal=mix(mix(vec3(0.14,0.14,0.18),vec3(0.28,0.28,0.34),c),tipCol,uAwakened)*mix(gi,sun,sFac);
        vec3 col=mix(groundLit,tipFinal,pow(vH,uGrassGradPow));
        float dist=length(vVP);
        col=mix(col,groundLit,smoothstep(35.0,140.0,dist)*0.96);
        gl_FragColor=vec4(col,1.0-smoothstep(110.0,220.0,dist)*uFadeIntensity);
      }`,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.shadowmap, uniforms]),
    side: THREE.DoubleSide, transparent: true, depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, maxCount);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const base = [];
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;

  while (placed < maxCount && attempts < maxCount * 3.5) {
    attempts++;
    const a = attempts * 2.399963;
    let r = placed < maxCount * 0.55
      ? 8.5 + Math.sqrt(placed / (maxCount * 0.55)) * 56.0
      : 64.0 + Math.pow((placed - maxCount * 0.55) / (maxCount * 0.45), 1.3) * 150.0;

    const px = Math.cos(a) * r, pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;

    const py = getTerrainHeight(px, pz) + 0.08;
    const hx = getTerrainHeight(px + 0.5, pz) - getTerrainHeight(px - 0.5, pz);
    const hz = getTerrainHeight(px, pz + 0.5) - getTerrainHeight(px, pz - 0.5);

    const d = Math.hypot(px, pz + 12), isDistant = d > 55.0;
    const distW = isDistant ? Math.min(3.6, 1.0 + (d - 55.0) / 50.0 * 1.5) : 1.0;
    const distH = isDistant ? Math.min(2.2, 1.0 + (d - 55.0) / 70.0 * 0.8) : 1.0;
    const s = 0.90 + Math.random() * 0.55;

    base.push({
      px, py, pz,
      rx: -Math.atan2(hz, 1.0) + (Math.random() - 0.5) * 0.3,
      ry: Math.random() * 6.28,
      rz: Math.atan2(hx, 1.0) + (Math.random() - 0.5) * 0.3,
      bw: s * (0.95 + Math.random() * 0.4) * distW,
      bh: s * (0.85 + Math.random() * 0.7) * distH
    });
    placed++;
  }

  let curCount = initialCount, curW = 2.0, curH = 1.0;
  const rebuild = () => {
    const active = Math.min(curCount, base.length);
    mesh.count = active;
    for (let i = 0; i < active; i++) {
      const b = base[i];
      dummy.position.set(b.px, b.py, b.pz);
      dummy.rotation.set(b.rx, b.ry, b.rz);
      dummy.scale.set(b.bw * curW, b.bh * curH, b.bw * curW);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  rebuild();
  scene.add(mesh);

  return {
    mesh,
    params: {
      get count() { return curCount; },
      set count(v) { curCount = Math.min(maxCount, Math.max(500, v)); rebuild(); },
      get widthScale() { return curW; },
      set widthScale(v) { curW = v; rebuild(); },
      get heightScale() { return curH; },
      set heightScale(v) { curH = v; rebuild(); },
      get windSpeed() { return mat.uniforms.uWS.value; },
      set windSpeed(v) { mat.uniforms.uWS.value = v; },
      get windStrength() { return mat.uniforms.uWSt.value; },
      set windStrength(v) { mat.uniforms.uWSt.value = v; },
      get giStrength() { return mat.uniforms.uGIShadowStrength.value; },
      set giStrength(v) { mat.uniforms.uGIShadowStrength.value = v; },
      get gradPow() { return mat.uniforms.uGrassGradPow.value; },
      set gradPow(v) { mat.uniforms.uGrassGradPow.value = v; },
      get cloudDensity() { return mat.uniforms.uCloudShadowDensity.value; },
      set cloudDensity(v) { mat.uniforms.uCloudShadowDensity.value = v; }
    },
    uniforms: mat.uniforms,
    setAwakened: (val) => { mat.uniforms.uAwakened.value = val; },
    setFadeIntensity: (val) => { mat.uniforms.uFadeIntensity.value = val; },
    update: (delta) => { mat.uniforms.uTime.value += delta; }
  };
}
