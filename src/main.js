// Master Game Orchestrator & WebXR / PC Loop for JS13K
// "CHROMA: The Last Unicorn"

import { createRenderer } from './engine/renderer.js';
import { createRainbowSky } from './shaders/rainbowSkyShader.js';
import { createParticleSystem } from './shaders/particleShader.js';
import { createWorld } from './models/world.js';
import { createGrassField } from './models/grass.js';
import { createUnicorn } from './models/unicorn.js';
import { createShardsSystem } from './story/shards.js';
import { NarrativeManager } from './story/narrative.js';
import { createVRHUD } from './engine/vrHud.js';
import { setupPCControls } from './engine/controls.js';
import { setupXR } from './engine/xr.js';

class ChromaGame {
  constructor() {
    this.engine = createRenderer();
    this.scene = this.engine.scene;
    this.camera = this.engine.camera;
    this.renderer = this.engine.renderer;

    this.vrHud = createVRHUD(this.scene, this.camera);
    this.sky = createRainbowSky(this.scene);
    this.particles = createParticleSystem(this.scene);
    this.world = createWorld(this.scene);
    this.grass = createGrassField(this.scene, 16000);
    this.unicorn = createUnicorn(this.scene);

    this.unicornState = 'idle';
    this.awakened = 0.0;

    this.narrative = new NarrativeManager(this);
    this.shards = createShardsSystem(this.scene, (idx, data) => {
      this.narrative.onShardCollected(idx, data);
    }, this.vrHud);

    const getInteractive = () => this.shards.getInteractiveMeshes();
    const onSelect = (mesh) => {
      if (this.narrative.act === 0) {
        this.narrative.triggerSlide();
      } else {
        this.shards.collect(mesh);
      }
    };

    this.pcControls = setupPCControls(this.camera, this.renderer.domElement, getInteractive, onSelect);
    this.xr = setupXR(
      this.renderer,
      this.scene,
      this.camera,
      getInteractive,
      onSelect,
      (pos, speed) => this.shards.checkVRPunch(pos, speed),
      () => {
        if (this.narrative.act === 0) this.narrative.triggerSlide();
      }
    );

    this.initUI();
    this.startLoop();

    // Dev Studio (Excluded from production build)
    if (__DEV__) {
      const devPath = './dev/devStudio.js';
      import(/* @vite-ignore */ devPath).then(m => m.setupDevStudio(this)).catch(() => {});
    }
  }

  setAwakened(val) {
    this.awakened = val;
    this.engine.setAwakened(val);
    this.sky.uniforms.uAwakened.value = val;
    this.particles.uniforms.uAwakened.value = val;
    this.world.setAwakened(val);
    this.grass.setAwakened(val);
    this.unicorn.setAwakened(val);
  }

  initUI() {
    const overlay = document.getElementById('overlay');
    const btnPc = document.getElementById('btn-start-pc');
    const btnVr = document.getElementById('btn-start-vr');

    const startGame = () => {
      if (overlay) overlay.classList.add('hidden');
      this.narrative.startExperience();
    };

    if (btnPc) {
      btnPc.addEventListener('click', () => {
        startGame();
        this.renderer.domElement.requestPointerLock();
      });
    }

    if (btnVr) {
      btnVr.addEventListener('click', () => {
        startGame();
        this.xr.startVR();
      });
    }
  }

  startLoop() {
    const clock = new window.THREE.Clock();

    this.renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.1);

      this.sky.update(delta);
      this.particles.update(delta);
      this.world.update(delta);
      this.grass.update(delta);
      this.unicorn.update(delta, this.unicornState);
      this.shards.update(delta);
      this.narrative.update(delta);
      this.vrHud.update(delta);

      this.pcControls.update(delta);
      this.xr.update(delta);

      this.renderer.render(this.scene, this.camera);
    });
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new ChromaGame();
});
