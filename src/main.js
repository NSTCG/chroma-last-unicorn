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

function injectUI() {
  const style = document.createElement('style');
  style.textContent = `*{box-sizing:border-box;margin:0;padding:0;user-select:none}body,html{width:100%;height:100%;overflow:hidden;background:#08080c;font-family:sans-serif;color:#fff}#canvas-container{position:absolute;inset:0}canvas{width:100%;height:100%;display:block}#crosshair{position:absolute;top:50%;left:50%;width:8px;height:8px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,255,255,.7);pointer-events:none;z-index:10}#crosshair.active{transform:translate(-50%,-50%) scale(2.2);background:#f5a;box-shadow:0 0 20px #f5a}#top-left-bar{position:absolute;top:12px;left:12px;z-index:9999}.nav-vr-btn{background:linear-gradient(135deg,#00f0ff,#0051ff);color:#fff;border:none;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer}#spectrum-bar{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:10;background:rgba(15,15,25,.6);padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.1)}.shard-pip{width:12px;height:12px;border-radius:50%;background:#2a2a35;border:1px solid rgba(255,255,255,.2);transition:all .5s}.shard-pip.collected{box-shadow:0 0 12px currentColor,0 0 20px currentColor;transform:scale(1.2)}#narrative-hud{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);text-align:center;z-index:10;pointer-events:none;width:90%;max-width:680px}.subtitle{font-size:1rem;background:rgba(10,10,18,.75);padding:6px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.15);display:inline-block}#overlay{position:absolute;inset:0;z-index:20;background:radial-gradient(circle at center,rgba(16,16,28,.88) 0%,rgba(5,5,10,.98) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px;transition:opacity .6s,visibility .6s}#overlay.hidden{opacity:0;visibility:hidden;pointer-events:none}.title-glitch{font-size:clamp(2.4rem,6vw,4rem);font-weight:800;letter-spacing:4px;background:linear-gradient(135deg,#fff,#f8d 40%,#0ff 80%,#ffea79);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}.tagline{font-size:.95rem;color:#a0a5be;max-width:480px;margin-bottom:20px}.btn-group{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.action-btn{padding:10px 24px;border-radius:999px;font-size:.95rem;font-weight:600;cursor:pointer;border:none;text-transform:uppercase}.btn-primary{background:linear-gradient(135deg,#f07,#70f);color:#fff}.btn-vr{background:linear-gradient(135deg,#00f0ff,#0051ff);color:#fff}.controls-hint{margin-top:20px;font-size:.8rem;color:#7e839e;display:flex;flex-direction:column;gap:4px;align-items:center}.key-badge{background:rgba(255,255,255,.1);padding:2px 5px;border-radius:4px;color:#fff}`;
  document.head.appendChild(style);

  document.body.innerHTML = `
    <div id="canvas-container"></div>
    <div id="crosshair"></div>
    <div id="top-left-bar"><button id="nav-vr-btn" class="nav-vr-btn">🥽 VR</button></div>
    <div id="spectrum-bar"></div>
    <div id="narrative-hud"><div class="subtitle" id="subtitle-text">Walk forward into mist...</div></div>
    <div id="overlay">
      <div class="title-glitch">CHROMA</div>
      <div class="tagline">Awaken the 7 colors & ride Celestial Rainbow.</div>
      <div class="btn-group">
        <button class="action-btn btn-primary" id="btn-start-pc">✨ Play</button>
        <button class="action-btn btn-vr" id="btn-start-vr">🥽 WebXR</button>
      </div>
      <div class="controls-hint">
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <div><span class="key-badge">WASD</span> Move</div>
          <div><span class="key-badge">MOUSE</span> Look</div>
          <div><span class="key-badge">CLICK/E</span> Ride</div>
          <div><span class="key-badge">SPACE</span> Float</div>
        </div>
        <div style="color:#00f0ff;font-size:0.78rem">🥽 VR: Left: Move | Right: Turn | Trigger: Laser</div>
      </div>
    </div>
  `;
}

class ChromaGame {
  constructor() {
    injectUI();

    this.engine = createRenderer();
    this.scene = this.engine.scene;
    this.camera = this.engine.camera;
    this.renderer = this.engine.renderer;

    this.vrHud = createVRHUD();
    this.sky = createRainbowSky(this.scene);
    this.particles = createParticleSystem(this.scene);
    this.world = createWorld(this.scene);
    this.grass = createGrassField(this.scene, 58000);
    this.unicorn = createUnicorn(this.scene);

    this.unicornState = 'idle';
    this.isMounted = false;

    this.narrative = new NarrativeManager(this);
    this.shards = createShardsSystem(this.scene, () => this.narrative.onShardCollected(), this.vrHud);

    const getInteractive = () => [...this.shards.getInteractiveMeshes(), ...this.unicorn.getInteractiveMeshes()];

    const onSelect = (mesh) => {
      if (this.narrative.act === 0) return this.narrative.triggerSlide();
      if (mesh?.userData?.isUnicorn || (this.isMounted && !mesh)) return this.toggleMount();
      this.shards.collect(mesh);
    };

    this.pcControls = setupPCControls(
      this.camera, this.renderer.domElement, getInteractive, onSelect,
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn }),
      this.renderer
    );

    this.xr = setupXR(
      this.renderer, this.scene, this.camera, getInteractive, onSelect,
      (pos, speed) => this.shards.checkVRPunch(pos, speed),
      () => { if (this.narrative.act === 0) this.narrative.triggerSlide(); },
      () => ({ isMounted: this.isMounted, unicorn: this.unicorn })
    );

    this.initUI();
    this.startLoop();
    setupDevStudio(this);
  }

  toggleMount() {
    this.isMounted = !this.isMounted;
    if (this.isMounted) {
      this.vrHud.show('🦄 MOUNTED UNICORN', 'WASD to ride, Click to dismount', '', 4000);
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
      this.vrHud.update(delta);
      this.pcControls.update(delta);
      this.xr.update(delta);
      this.renderer.render(this.scene, this.camera);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new ChromaGame(); });
