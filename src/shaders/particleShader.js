// Instanced Stardust & Rainbow Embers System

export function createParticleSystem(scene, count = 400) {
  const THREE = window.THREE;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  const colors = [0xff3344, 0xff8811, 0xffdd22, 0x22ee66, 0x00ccff, 0x6644ff, 0xdd33ff];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3, r = 5 + Math.random() * 45, th = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(th) * r;
    pos[i3 + 1] = 0.5 + Math.random() * 25;
    pos[i3 + 2] = Math.sin(th) * r;

    const c = new THREE.Color(colors[i % 7]);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('customColor', new THREE.BufferAttribute(col, 3));

  const uniforms = { uTime: { value: 0 }, uAwakened: { value: 0.1 } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 customColor;
      uniform float uTime; uniform float uAwakened;
      varying vec3 vColor;
      void main() {
        vColor = mix(vec3(0.5), customColor, uAwakened);
        vec3 p = position;
        p.y += sin(uTime*1.5 + p.x*0.5)*0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (18.0 / -mv.z) * (1.0 + uAwakened);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
        gl_FragColor = vec4(vColor, 0.7);
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
