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
import { setupDevStudio } from '@devStudio';

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
    this.grass = createGrassField(this.scene, 46000);
    this.unicorn = createUnicorn(this.scene);

    this.unicornState = 'idle';
    this.isMounted = false;

    this.narrative = new NarrativeManager(this);

    const pulseHaptics = (h, i, d) => this.xr?.pulseHaptics?.(h, i, d);
    this.shards = createShardsSystem(this.scene, () => this.narrative.onShardCollected(), this.vrHud, pulseHaptics);

    const getInteractive = () => [...this.shards.getInteractiveMeshes(), ...this.unicorn.getInteractiveMeshes()];

    const onSelect = (mesh) => {
      if (this.narrative.act === 0) return this.narrative.triggerSlide();
      if (mesh?.userData?.isUnicorn || (this.isMounted && !mesh)) return this.toggleMount();
      this.shards.collect(mesh);
    };

    this.pcControls = setupPCControls(
      this.camera, this.renderer.domElement, getInteractive, onSelect,
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn }),
      this.renderer, this.vrHud
    );

    this.xr = setupXR(
      this.renderer, this.scene, this.camera, getInteractive, onSelect,
      (pos, speed) => this.shards.checkVRPunch(pos, speed),
      () => { if (this.narrative.act === 0) this.narrative.triggerSlide(); },
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn }),
      this.vrHud
    );

    if (this.vrHud?.setHaptics) this.vrHud.setHaptics(pulseHaptics);

    this.initUI();
    this.startLoop();
    setupDevStudio(this);
  }

  toggleMount() {
    this.isMounted = !this.isMounted;
    if (this.xr?.pulseHaptics) this.xr.pulseHaptics('both', 0.8, 180);
    if (this.isMounted) {
      this.vrHud.show('🦄 MOUNTED UNICORN', 'WASD / Stick to ride, Click to dismount');
    } else {
      const ux = this.unicorn.group.position.x - 1.8;
      const uz = this.unicorn.group.position.z + 1.2;
      if (this.renderer.xr.isPresenting) {
        this.xr.xrGroup.position.set(ux, this.xr.xrGroup.position.y, uz);
      } else {
        this.camera.position.x = ux;
        this.camera.position.z = uz;
      }
      this.unicorn.update(0, 'idle');
    }
  }

  setAwakened(val) {
    this.engine.setAwakened(val);
    this.sky.uniforms.uAwakened.value = val;
    this.particles.uniforms.uAwakened.value = val;
    this.world.setAwakened(val);
    this.grass.setAwakened(val);
    this.unicorn.setAwakened(val);
  }

  initUI() {
    const overlay = document.getElementById('overlay'), btnPc = document.getElementById('btn-start-pc'), btnVr = document.getElementById('btn-start-vr'), navVrBtn = document.getElementById('nav-vr-btn');
    const startGame = () => {
      if (overlay) overlay.classList.add('hidden');
      this.narrative.startExperience();
    };

    if (btnPc) btnPc.addEventListener('click', () => { startGame(); this.renderer.domElement.requestPointerLock(); });
    const launchVR = () => { startGame(); this.xr.startVR(); };
    if (btnVr) btnVr.addEventListener('click', launchVR);
    if (navVrBtn) navVrBtn.addEventListener('click', launchVR);

    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((s) => { if (navVrBtn) navVrBtn.style.display = s ? 'inline-flex' : 'none'; }).catch(() => {});
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
      if (!this.isMounted) this.unicorn.update(delta, this.unicornState);
      this.shards.update(delta);
      this.narrative.update(delta);
      const isVR = this.renderer.xr.isPresenting;
      this.vrHud.update(delta, this.camera, isVR, isVR ? this.xr.getRightController() : null);
      this.pcControls.update(delta);
      this.xr.update(delta);
      this.renderer.render(this.scene, this.camera);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new ChromaGame(); });
