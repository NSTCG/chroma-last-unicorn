import { T, Col } from './three.js';

export function createRenderer() {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 5);

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = 2;
  document.getElementById('c').appendChild(renderer.domElement);

  const ambientLight = new T.AmbientLight(0x75788c, 1.4);
  const hemiLight = new T.HemisphereLight(0x9aa4ca, 0x5a485e, 1.1);
  const sunLight = new T.DirectionalLight(0xffecd0, 1.45);
  sunLight.position.set(30, 55, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  const sc = sunLight.shadow.camera;
  sc.near = 0.5; sc.far = 180; sc.left = sc.bottom = -85; sc.right = sc.top = 85;
  sunLight.shadow.bias = -0.0001; sunLight.shadow.normalBias = 0.08;

  const pointLight = new T.PointLight(0xff55aa, 1.8, 40);
  pointLight.position.set(0, 3, -12);
  scene.add(ambientLight, hemiLight, sunLight, pointLight, camera);

  window.addEventListener('resize', () => {
    if (renderer.xr.isPresenting) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const greyAmb = Col(0x75788c), atmoAmb = Col(0xb274a2);
  const greyHemiSky = Col(0x9aa4ca), atmoHemiSky = Col(0xdca0cb);

  return {
    scene, camera, renderer,
    setAwakened: (val) => {
      ambientLight.color.lerpColors(greyAmb, atmoAmb, val);
      hemiLight.color.lerpColors(greyHemiSky, atmoHemiSky, val);
    }
  };
}
