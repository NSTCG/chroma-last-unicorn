// Volumetric Sunset Sky Shader with Horizon Blending

export function createRainbowSky(scene) {
  const THREE = window.THREE;
  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.0 } };

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform float uAwakened;
      varying vec3 vWorldPosition;
      void main() {
        vec3 d = normalize(vWorldPosition);
        float el = clamp(d.y, 0.0, 1.0);
        vec3 grey = mix(vec3(0.05, 0.05, 0.08), vec3(0.12, 0.12, 0.18), el);

        vec3 sky = mix(vec3(0.26, 0.15, 0.24), vec3(0.92, 0.44, 0.58), smoothstep(0.0, 0.22, el));
        sky = mix(sky, vec3(0.96, 0.66, 0.48), smoothstep(0.22, 0.45, el));
        sky = mix(sky, vec3(0.16, 0.06, 0.30), smoothstep(0.45, 1.0, el));

        float t = uTime * 0.3;
        float c1 = exp(-abs(d.y - (sin(d.x * 2.2 + d.z * 1.5 + t) * 0.14 + 0.28)) * 14.0);
        float c2 = exp(-abs(d.y - (sin(d.z * 2.0 - d.x * 1.8 - t * 0.7) * 0.16 + 0.48)) * 12.0);
        vec3 cCol = mix(vec3(1.0, 0.85, 0.65), vec3(1.0, 0.45, 0.75), sin(d.x * 3.0 + t) * 0.5 + 0.5);

        float star = pow(fract(sin(dot(floor(d.xz * 130.0 + d.y * 90.0), vec2(12.9898, 78.233))) * 43758.5453), 52.0) * smoothstep(0.35, 1.0, el) * 3.5;
        gl_FragColor = vec4(mix(grey, sky + (c1 * 0.6 + c2 * 0.4) * cCol + star, uAwakened), 1.0);
      }
    `,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 16), mat);
  scene.add(mesh);

  return {
    mesh,
    uniforms,
    update: (delta) => { uniforms.uTime.value += delta; }
  };
}
