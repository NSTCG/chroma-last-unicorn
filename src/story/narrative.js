// Narrative State Manager with Immediate Awakening & Celestial Flight
import { audio } from '../audio/synth.js';

export class NarrativeManager {
  constructor(game) {
    this.game = game;
    this.act = 0;
    this.collectedCount = 0;
    this.isSliding = false;
    this.slideProgress = 0;
  }

  getSlidePoint(u) {
    const THREE = window.THREE;
    const cu = Math.max(0.0, Math.min(1.0, u));
    const a = cu * Math.PI * 2.2 + 0.5;
    const r = 16 + Math.sin(cu * Math.PI * 2) * 8;
    return new THREE.Vector3(Math.cos(a) * r, 3.5 + cu * 38.0 + 1.2, -12 + Math.sin(a) * r);
  }

  startExperience() {
    audio.init();
    this.act = 0;
    this.game.setAwakened(1.0);

    const startPos = this.getSlidePoint(1.0);
    const lookAhead = this.getSlidePoint(0.96);

    this.game.camera.position.copy(startPos);
    this.game.camera.lookAt(lookAhead);

    if (this.game.xr?.xrGroup) {
      this.game.xr.xrGroup.position.set(startPos.x, startPos.y - 1.6, startPos.z);
      this.game.xr.xrGroup.rotation.y = Math.atan2(lookAhead.x - startPos.x, lookAhead.z - startPos.z);
    }

    if (this.game.vrHud) {
      this.game.vrHud.show('🌈 CHILDHOOD', 'Click / Trigger to Slide Down!', '', 12000);
    }
  }

  triggerSlide() {
    if (this.isSliding || this.act !== 0) return;
    this.isSliding = true;
    this.slideProgress = 0;
    audio.playPluck(520, 0.4, 0.6);
    if (this.game.vrHud) this.game.vrHud.show('HOLD ON!', 'Wheeeeeee!', '', 4000);
  }

  updateSlide(delta) {
    if (!this.isSliding) return;
    const p = this.slideProgress;
    const speed = p < 0.15 ? 0.14 : (p < 0.85 ? 0.34 : 0.14);
    this.slideProgress += delta * speed;
    const u = Math.max(0.0, 1.0 - this.slideProgress);
    const pos = this.getSlidePoint(u);
    const lookAhead = this.getSlidePoint(Math.max(0.0, u - 0.04));

    this.game.camera.position.copy(pos);
    this.game.camera.lookAt(lookAhead);

    if (this.game.xr?.xrGroup) {
      this.game.xr.xrGroup.position.set(pos.x, pos.y - 1.6, pos.z);
      this.game.xr.xrGroup.rotation.y = Math.atan2(lookAhead.x - pos.x, lookAhead.z - pos.z);
    }

    this.game.setAwakened(Math.pow(u, 1.2));
    if (Math.random() < 0.25) audio.playChime(Math.floor(u * 7));

    if (this.slideProgress >= 1.0) {
      this.isSliding = false;
      this.act = 1;
      this.game.setAwakened(0.0);
      this.game.camera.position.set(0, 1.7, 5);
      this.game.camera.lookAt(0, 1.7, -12);
      if (this.game.xr?.xrGroup) {
        this.game.xr.xrGroup.position.set(0, 0, 5);
        this.game.xr.xrGroup.rotation.y = 0;
      }
      if (this.game.vrHud) {
        this.game.vrHud.show('💔 Where did colors go?', 'Locked in 7 Floating Shards...', 'Punch crystals in VR or Click on PC', 9000);
      }
    }
  }

  onShardCollected(index, data) {
    this.collectedCount++;
    if (this.act === 1) this.act = 2;
    const ratio = this.collectedCount / 7;
    this.game.setAwakened(ratio * 0.85);

    if (this.collectedCount === 7) {
      setTimeout(() => this.triggerUnicornAwakening(), 800);
    }
  }

  triggerUnicornAwakening() {
    this.act = 3;
    this.game.setAwakened(1.0);
    audio.playAscent();
    if (this.game.vrHud) this.game.vrHud.show('✨ THE LAST UNICORN AWAKENS!', 'Imagination has returned to your soul.', '', 8000);
    this.game.unicornState = 'gallop';
    setTimeout(() => this.triggerRainbowAscent(), 2500);
  }

  triggerRainbowAscent() {
    this.act = 4;
    audio.playAscent();
    if (this.game.vrHud) this.game.vrHud.show('🌈 ASCENSION TO INFINITY', 'You remembered who you are.', '', 10000);
    this.game.unicornState = 'ascend';
  }

  update(delta) {
    if (this.isSliding) this.updateSlide(delta);
  }
}
