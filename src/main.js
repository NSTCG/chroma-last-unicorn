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
import { setupDevStudio } from './dev/devStudio.js';

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
    this.grass = createGrassField(this.scene, 58000);
    this.unicorn = createUnicorn(this.scene);

    this.unicornState = 'idle';
    this.awakened = 0.0;
    this.isMounted = false;

    this.narrative = new NarrativeManager(this);
    this.shards = createShardsSystem(this.scene, (idx, data) => {
      this.narrative.onShardCollected(idx, data);
    }, this.vrHud);

    const getInteractive = () => [
      ...this.shards.getInteractiveMeshes(),
      ...this.unicorn.getInteractiveMeshes()
    ];

    const onSelect = (mesh) => {
      if (this.narrative.act === 0) {
        this.narrative.triggerSlide();
        return;
      }
      if (mesh && (mesh.userData?.isUnicorn || mesh.userData?.unicorn)) {
        this.toggleMount();
        return;
      }
      if (this.isMounted && !mesh) {
        this.toggleMount();
        return;
      }
      this.shards.collect(mesh);
    };

    this.pcControls = setupPCControls(
      this.camera,
      this.renderer.domElement,
      getInteractive,
      onSelect,
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn })
    );

    this.xr = setupXR(
      this.renderer,
      this.scene,
      this.camera,
      getInteractive,
      onSelect,
      (pos, speed) => this.shards.checkVRPunch(pos, speed),
      () => {
        if (this.narrative.act === 0) this.narrative.triggerSlide();
      },
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn })
    );

    this.initUI();
    this.startLoop();

    // Dev Studio (Dreamcrafter Live Art & Shader Studio)
    setupDevStudio(this);
  }

  toggleMount() {
    this.isMounted = !this.isMounted;
    if (this.isMounted) {
      this.narrative.showSubtitle('🦄 Mounted Celestial Unicorn! [W A S D] to ride, [CLICK / E] to dismount.');
    } else {
      this.camera.position.x = this.unicorn.group.position.x - 1.8;
      this.camera.position.z = this.unicorn.group.position.z + 1.2;
      this.unicorn.update(0, 'idle');
      this.narrative.showSubtitle('Dismounted unicorn. Exploring on foot.');
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

  setFadeIntensity(val) {
    if (this.world?.setFadeIntensity) this.world.setFadeIntensity(val);
    if (this.grass?.setFadeIntensity) this.grass.setFadeIntensity(val);
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
      this.world.update(delta, this.camera);
      this.grass.update(delta);
      if (!this.isMounted) {
        this.unicorn.update(delta, this.unicornState);
      }
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
