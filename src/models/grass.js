// Procedural Vast Meadow with Radial LOD, GI Tinted Shadows, Cloud Dynamics & Terrain Blending
export function createGrassField(scene, initialCount = 58000) {
  const THREE = window.THREE;
  const maxCount = 80000;

  // 2x wider base blade geometry
  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.16, 0, 0,    0.16, 0, 0,   -0.10, 0.85, 0.04,
     0.16, 0, 0,    0.10, 0.85, 0.04, -0.10, 0.85, 0.04,
    -0.10, 0.85, 0.04, 0.10, 0.85, 0.04, 0, 1.85, 0.18
  ]), 3));
  bladeGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0,  1, 0,  0.2, 0.5,
    1, 0,  0.8, 0.5, 0.2, 0.5,
    0.2, 0.5, 0.8, 0.5, 0.5, 1
  ]), 2));
  bladeGeo.computeVertexNormals();

  const uniforms = {
    uTime: { value: 0 },
    uAwakened: { value: 0.0 },
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
    vertexShader: `
      uniform mat4 directionalShadowMatrix[1];
      uniform float uTime, uWS, uWSt;
      varying vec3 vWP, vVP;
      varying float vH;
      varying vec4 vShadowCoord;

      void main() {
        vH = uv.y;
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        float t = uTime * uWS;
        float w = (sin(wp.x * 0.12 + wp.z * 0.09 + t * 1.5) +
                   sin(wp.x * 0.30 - wp.z * 0.22 + t * 2.8) * 0.45 +
                   cos(wp.z * 0.50 + wp.x * 0.35 + t * 4.0) * 0.18) * 0.42 * uWSt;
        float b = pow(vH, 1.8) * w;
        wp.x += b;
        wp.z += b * 0.75;
        wp.y -= abs(b) * 0.22 * vH;

        vWP = wp.xyz;
        vec4 mv = modelViewMatrix * vec4(wp.xyz, 1.0);
        vVP = -mv.xyz;
        vShadowCoord = directionalShadowMatrix[0] * wp;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      #include <packing>
      uniform sampler2D directionalShadowMap[1];
      uniform float uTime, uAwakened, uFadeIntensity;
      uniform float uGIShadowStrength, uGrassGradPow, uCloudShadowDensity;
      uniform vec3 uGrassBaseTint, uGrassTipTint;
      varying vec3 vWP, vVP;
      varying float vH;
      varying vec4 vShadowCoord;

      float cloudN(vec2 p, float t) {
        vec2 uv1 = p * 0.025 + vec2(t * 0.06, t * 0.03);
        float n1 = sin(uv1.x * 3.14 + cos(uv1.y * 2.7)) * cos(uv1.y * 3.14 + sin(uv1.x * 2.1)) * 0.5 + 0.5;
        vec2 uv2 = p * 0.05 - vec2(t * 0.04, t * 0.07);
        float n2 = sin(uv2.x * 2.8 + uv2.y * 1.9) * cos(uv2.y * 3.2 - uv2.x * 1.5) * 0.5 + 0.5;
        return smoothstep(0.2, 0.85, n1 * 0.65 + n2 * 0.35);
      }

      void main() {
        // Drifting Cloud Shadows & Sunlight Patches
        float c = cloudN(vWP.xz, uTime);

        // Ground-matching base colors (Identical to Terrain Shader)
        vec3 shadowLush = vec3(0.04, 0.20, 0.06);
        vec3 sunLush = vec3(0.08, 0.32, 0.12) + vec3(0.08, 0.06, 0.02);
        vec3 groundAwakened = mix(shadowLush, sunLush, c);
        vec3 groundGrey = mix(vec3(0.08, 0.08, 0.10), vec3(0.18, 0.18, 0.22), c);
        vec3 groundFinal = mix(groundGrey, groundAwakened, uAwakened);

        // GI Ambient & Direct Sun
        vec3 giAmbient = mix(vec3(0.55, 0.58, 0.70), vec3(0.72, 0.54, 0.70), uAwakened) * uGIShadowStrength;
        vec3 directSun = vec3(1.22, 1.14, 1.02);
        vec3 groundLit = groundFinal * mix(giAmbient, directSun, c * 0.42 + 0.58);

        // Environment GI Tinted Real-Time Shadow (from pillars, unicorn, altar)
        vec3 sc = vShadowCoord.xyz / vShadowCoord.w;
        float shadowOcc = 1.0;
        if (sc.x >= 0.0 && sc.x <= 1.0 && sc.y >= 0.0 && sc.y <= 1.0 && sc.z <= 1.0) {
          float depth = unpackRGBAToDepth(texture2D(directionalShadowMap[0], sc.xy));
          if (sc.z > depth + 0.0006) shadowOcc = 0.0;
        }

        // Blade tip color with shadow occlusion & sun modulation
        float bladeVar = sin(vWP.x * 0.18 + 1.2) * cos(vWP.z * 0.18 + 0.8) * 0.5 + 0.5;
        vec3 sunTip = mix(uGrassTipTint * 0.85, uGrassTipTint * 1.25 + vec3(0.12, 0.10, 0.04), bladeVar);
        vec3 shadowTip = mix(uGrassBaseTint * 1.8, uGrassTipTint * 0.7, bladeVar);
        vec3 tipColor = mix(shadowTip, sunTip, c);

        float sunFactor = shadowOcc * (c * uCloudShadowDensity + (1.0 - uCloudShadowDensity));
        vec3 tipAwakened = tipColor * mix(giAmbient, directSun, sunFactor);
        vec3 tipGrey = mix(vec3(0.14, 0.14, 0.18), vec3(0.28, 0.28, 0.34), c) * mix(giAmbient, directSun, sunFactor);
        vec3 tipFinal = mix(tipGrey, tipAwakened, uAwakened);

        // Grass base (vH = 0.0) is EXACTLY groundLit; blade tip (vH = 1.0) is tipFinal
        vec3 col = mix(groundLit, tipFinal, pow(vH, uGrassGradPow));

        // Seamless Distant Grass Blend directly into the Terrain / Ground Mesh
        float dist = length(vVP);
        float terrainBlend = smoothstep(35.0, 140.0, dist);
        col = mix(col, groundLit, terrainBlend * 0.96);

        // Increased Sky Blend Fade into the horizon
        float alpha = 1.0 - smoothstep(110.0, 220.0, dist) * uFadeIntensity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.shadowmap, uniforms]),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, maxCount);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const base = [];
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;

  // Multi-tier radial LOD sampling across the entire 500x500 terrain
  while (placed < maxCount && attempts < maxCount * 3.5) {
    attempts++;
    const a = attempts * 2.399963;
    
    // Distribute 50% in player sanctuary (r < 65) and 50% across outer mountains (r: 65 to 220)
    let r;
    if (placed < maxCount * 0.55) {
      r = 8.5 + Math.sqrt(placed / (maxCount * 0.55)) * 56.0;
    } else {
      const outerT = (placed - maxCount * 0.55) / (maxCount * 0.45);
      r = 64.0 + Math.pow(outerT, 1.3) * 150.0;
    }

    const px = Math.cos(a) * r;
    const pz = -12 + Math.sin(a) * r;
    if (Math.hypot(px, pz + 12) < 8.5) continue;

    const d = Math.hypot(px, pz + 12);
    const py = d < 90 ? 0 : Math.pow((d - 90) / 120, 1.7) * 48;
    const rx = (Math.random() - 0.5) * 0.35;
    const ry = Math.random() * 6.28;
    const rz = (Math.random() - 0.5) * 0.35;

    // Radial LOD Scaling: Wider and taller blades in distant terrain to preserve lush look with fewer instances
    const isDistant = d > 55.0;
    const distScaleW = isDistant ? Math.min(3.6, 1.0 + (d - 55.0) / 50.0 * 1.5) : 1.0;
    const distScaleH = isDistant ? Math.min(2.2, 1.0 + (d - 55.0) / 70.0 * 0.8) : 1.0;

    const s = 0.90 + Math.random() * 0.55;
    base.push({
      px, py, pz, rx, ry, rz,
      bw: s * (0.95 + Math.random() * 0.4) * distScaleW,
      bh: s * (0.85 + Math.random() * 0.7) * distScaleH
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
