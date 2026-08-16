// Three.js Scene, Camera, WebXR Renderer & Lighting Setup (Alpha-based Sky Blending)

export function createRenderer() {
  const THREE = window.THREE;
  const container = document.getElementById('canvas-container');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Environmental Lighting
  const ambientLight = new THREE.AmbientLight(0x22222a, 0.9);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffecd0, 1.3);
  sunLight.position.set(20, 35, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 120;
  const d = 45;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0001;
  sunLight.shadow.normalBias = 0.08;
  scene.add(sunLight);

  const pointLight = new THREE.PointLight(0xff55aa, 1.5, 35);
  pointLight.position.set(0, 3, -12);
  scene.add(pointLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    scene,
    camera,
    renderer,
    setAwakened: (val) => {
      const THREE = window.THREE;
      const greyAmb = new THREE.Color(0x22222a);
      const atmoAmb = new THREE.Color(0x522846);
      ambientLight.color.lerpColors(greyAmb, atmoAmb, val);
    }
  };
}
