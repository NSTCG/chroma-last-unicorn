// Realistic Wind-Driven Stardust & Meadow Spores System
export function createParticleSystem(scene, count = 1600) {
  const THREE = window.THREE;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = new Float32Array(count * 2);

  const colors = [0xff4466, 0xff9922, 0xffea33, 0x33ee77, 0x00d4ff, 0x7755ff, 0xee44ff];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = 2.0 + Math.sqrt(Math.random()) * 92.0;
    const th = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(th) * r;
    pos[i3 + 1] = 0.4 + Math.random() * 14.0;
    pos[i3 + 2] = Math.sin(th) * r;

    const c = new THREE.Color(colors[i % 7]);
    col[i3] = c.r;
    col[i3 + 1] = c.g;
    col[i3 + 2] = c.b;

    seed[i * 2] = Math.random() * 6.28;
    seed[i * 2 + 1] = 0.6 + Math.random() * 0.8;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('customColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 customColor;
      attribute vec2 aSeed;
      uniform float uTime, uAwakened;
      varying vec3 vColor;

      void main() {
        vColor = mix(vec3(0.65, 0.65, 0.75), customColor, uAwakened);
        vec3 p = position;

        // Realistic multi-harmonic wind flow & turbulence
        float t = uTime * aSeed.y * 0.85 + aSeed.x;
        float wind = sin(p.x * 0.10 + p.z * 0.08 + t * 1.5) + cos(p.z * 0.18 - p.x * 0.12 + t * 2.2) * 0.5;
        
        p.x += sin(t * 1.1 + p.z * 0.04) * 2.2 + wind * 1.6;
        p.z += cos(t * 0.9 + p.x * 0.04) * 1.8 + wind * 1.2;
        p.y += sin(t * 2.2 + p.x * 0.25) * 0.75 + abs(sin(t * 0.6 + aSeed.x)) * 0.6;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp((72.0 / -mv.z) * (2.2 + uAwakened * 1.5), 5.0, 64.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float core = pow(1.0 - d * 2.0, 2.5);
        float corona = pow(1.0 - d * 2.0, 1.2);
        vec3 c = mix(vColor, vec3(1.0), core * 0.75);
        gl_FragColor = vec4(c * (1.5 + corona), corona * 0.95);
      }
    `,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  points.position.set(0, 0, -12);
  scene.add(points);

  return {
    uniforms,
    update: (delta) => { uniforms.uTime.value += delta; }
  };
}
