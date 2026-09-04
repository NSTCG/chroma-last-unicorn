export function createRenderer() {
  const THREE = window.THREE;
  const container = document.getElementById('canvas-container');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0x75788c, 1.4);
  const sun = new THREE.DirectionalLight(0xffecd0, 1.45);
  sun.position.set(30, 55, 20);
  const point = new THREE.PointLight(0xff55aa, 1.8, 40);
  point.position.set(0, 3, -12);
  scene.add(amb, sun, point);

  window.addEventListener('resize', () => {
    if (renderer.xr.isPresenting) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const greyAmb = new THREE.Color(0x75788c), atmoAmb = new THREE.Color(0xb274a2);

  return {
    scene, camera, renderer,
    setAwakened: (val) => { amb.color.lerpColors(greyAmb, atmoAmb, val); }
  };
}
