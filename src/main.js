import { createRenderer } from './engine/renderer.js';
import { createRainbowSky } from './shaders/rainbowSkyShader.js';
import { createParticleSystem } from './shaders/particleShader.js';
import { createWorld } from './models/world.js';
import { createGrassField } from './models/grass.js';
import { createUnicorn } from './models/unicorn.js';
import { createOfficeRoom } from './models/office.js';
import { createShardsSystem } from './story/shards.js';
import { createNarrative } from './story/narrative.js';
import { createVRHUD } from './engine/vrHud.js';
import { setupPCControls } from './engine/controls.js';
import { setupXR } from './engine/xr.js';

function initGame() {
  const engine = createRenderer();
  const scene = engine.scene, camera = engine.camera, renderer = engine.renderer;

  const vrHud = createVRHUD(scene, camera);
  const office = createOfficeRoom(scene);
  const sky = createRainbowSky(scene);
  const particles = createParticleSystem(scene);
  const world = createWorld(scene);
  const grass = createGrassField(scene, 22000);
  const unicorn = createUnicorn(scene);

  let unicornState = 'idle', isMounted = false;

  const gameObj = {
    renderer, scene, camera, xr: null, vrHud, office,
    set unicornState(s) { unicornState = s; },
    get unicornState() { return unicornState; },
    setAwakened(val) {
      engine.setAwakened(val);
      sky.uniforms.uAwakened.value = particles.uniforms.uAwakened.value = val;
      world.setAwakened(val);
      grass.setAwakened(val);
      unicorn.setAwakened(val);
    }
  };

  const narrative = createNarrative(gameObj);

  const pulseHaptics = (h, i, d) => gameObj.xr?.pulseHaptics?.(h, i, d);
  const getUState = () => ({ isMounted, unicorn });
  const shards = createShardsSystem(scene, () => narrative.onShardCollected(), vrHud, pulseHaptics, getUState, camera, grass);

  const toggleMount = () => {
    isMounted = !isMounted;
    if (gameObj.xr?.pulseHaptics) gameObj.xr.pulseHaptics('both', 0.8, 180);
    if (isMounted) {
      vrHud.show('🦄 MOUNTED UNICORN', 'WASD / Stick to ride, Click to dismount');
    } else {
      const ux = unicorn.group.position.x - 1.8, uz = unicorn.group.position.z + 1.2;
      if (renderer.xr.isPresenting) gameObj.xr.xrGroup.position.set(ux, gameObj.xr.xrGroup.position.y, uz);
      else { camera.position.x = ux; camera.position.z = uz; }
      unicorn.update(0, 'idle');
    }
  };

  const getInteractive = () => [
    ...shards.getInteractiveMeshes(),
    ...unicorn.getInteractiveMeshes(),
    vrHud.phoneGroup,
    office.phoneGroup
  ];
  const onSelect = (mesh, isKeyX = false) => {
    if (narrative.act === 0) return narrative.onOfficeSelect ? narrative.onOfficeSelect(mesh, isKeyX) : narrative.triggerSlide();
    if (mesh?.userData?.isTaskNode || mesh?.userData?.index != null) return shards.collect(mesh);
    if (mesh?.userData?.isUnicorn || (isMounted && !mesh && !isKeyX)) return toggleMount();
    if (mesh?.userData?.isPhone || isKeyX || vrHud.isCalling) return vrHud.triggerCallAction();
  };

  const pcControls = setupPCControls(camera, renderer.domElement, getInteractive, onSelect, getUState, renderer);
  gameObj.xr = setupXR(
    renderer, scene, camera, getInteractive, onSelect,
    (pos, speed) => shards.checkVRPunch(pos, speed),
    () => { if (narrative.act === 0) narrative.onOfficeSelect ? narrative.onOfficeSelect() : narrative.triggerSlide(); },
    getUState, vrHud
  );

  vrHud.setHaptics?.(pulseHaptics);

  const overlay = document.getElementById('o'), btnVr = document.getElementById('q'), btnPlay = document.getElementById('p');
  const launchExperience = (isVR = false) => {
    if (overlay) overlay.classList.add('hidden');
    narrative.startExperience();
    if (isVR) gameObj.xr.startVR();
  };
  if (btnVr) btnVr.addEventListener('click', () => launchExperience(true));
  if (btnPlay) btnPlay.addEventListener('click', () => launchExperience(false));

  const clock = new window.THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);
    office.update(delta, clock.getElapsedTime());
    sky.update(delta);
    particles.update(delta);
    world.update(delta, camera);
    grass.update(delta);
    if (!isMounted) unicorn.update(delta, unicornState);
    shards.update(delta);
    narrative.update(delta);
    const isVR = renderer.xr.isPresenting;
    vrHud.update(delta, camera, isVR, isVR ? gameObj.xr.getLeftController() : null, isVR ? gameObj.xr.getRightController() : null);
    pcControls.update(delta);
    gameObj.xr.update(delta);
    renderer.render(scene, camera);
  });

  gameObj.shards = shards;
  gameObj.narrative = narrative;
  gameObj.toggleMount = toggleMount;
  gameObj.getUState = getUState;
  window.game = gameObj;
  return gameObj;
}

function boot() {
  if (window.THREE) window.game = initGame();
  else setTimeout(boot, 16);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
