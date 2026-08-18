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

  const ambientLight = new THREE.AmbientLight(0x75788c, 1.4);
  const hemiLight = new THREE.HemisphereLight(0x9aa4ca, 0x5a485e, 1.1);
  const sunLight = new THREE.DirectionalLight(0xffecd0, 1.45);
  sunLight.position.set(30, 55, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 180;
  const d = 85;
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.right = sunLight.shadow.camera.top = d;
  sunLight.shadow.bias = -0.0001;
  sunLight.shadow.normalBias = 0.08;

  const pointLight = new THREE.PointLight(0xff55aa, 1.8, 40);
  pointLight.position.set(0, 3, -12);
  scene.add(ambientLight, hemiLight, sunLight, pointLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const greyAmb = new THREE.Color(0x75788c), atmoAmb = new THREE.Color(0xb274a2);
  const greyHemiSky = new THREE.Color(0x9aa4ca), atmoHemiSky = new THREE.Color(0xdca0cb);

  return {
    scene, camera, renderer, ambientLight, hemiLight, sunLight, pointLight,
    setAwakened: (val) => {
      ambientLight.color.lerpColors(greyAmb, atmoAmb, val);
      hemiLight.color.lerpColors(greyHemiSky, atmoHemiSky, val);
    }
  };
}
