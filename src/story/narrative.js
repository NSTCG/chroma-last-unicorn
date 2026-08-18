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
    const cu = Math.max(0, Math.min(1, u)), a = cu * 6.9 + 0.5, r = 16 + Math.sin(cu * 6.28) * 8;
    return new window.THREE.Vector3(Math.cos(a) * r, 3.5 + cu * 38.0 + 1.2, -12 + Math.sin(a) * r);
  }

  startExperience() {
    audio.init();
    this.act = 0;
    this.game.setAwakened(1.0);
    const startPos = this.getSlidePoint(1.0), lookAhead = this.getSlidePoint(0.96);
    this.game.camera.position.copy(startPos);
    this.game.camera.lookAt(lookAhead);
    if (this.game.xr?.xrGroup) {
      this.game.xr.xrGroup.position.set(startPos.x, startPos.y - 1.6, startPos.z);
      this.game.xr.xrGroup.rotation.y = Math.atan2(lookAhead.x - startPos.x, lookAhead.z - startPos.z);
    }
    if (this.game.vrHud) this.game.vrHud.show('🌈 CHILDHOOD', 'Click / Trigger to Slide!', '', 12000);
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
    this.slideProgress += delta * (p < 0.15 || p > 0.85 ? 0.14 : 0.34);
    const u = Math.max(0, 1.0 - this.slideProgress), pos = this.getSlidePoint(u), lookAhead = this.getSlidePoint(Math.max(0, u - 0.04));

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
      this.game.setAwakened(0);
      this.game.camera.position.set(0, 1.7, 5);
      this.game.camera.lookAt(0, 1.7, -12);
      if (this.game.xr?.xrGroup) {
        this.game.xr.xrGroup.position.set(0, 0, 5);
        this.game.xr.xrGroup.rotation.y = 0;
      }
      if (this.game.vrHud) this.game.vrHud.show('💔 Where did colors go?', 'Restore 7 Shards!', 'Punch / Click', 9000);
    }
  }

  onShardCollected() {
    this.collectedCount++;
    if (this.act === 1) this.act = 2;
    this.game.setAwakened((this.collectedCount / 7) * 0.85);
    if (this.collectedCount === 7) setTimeout(() => this.triggerUnicornAwakening(), 800);
  }

  triggerUnicornAwakening() {
    this.act = 3;
    this.game.setAwakened(1.0);
    audio.playAscent();
    if (this.game.vrHud) this.game.vrHud.show('✨ UNICORN AWAKENS!', 'Wonder returned.', '', 8000);
    this.game.unicornState = 'gallop';
    setTimeout(() => {
      this.act = 4;
      if (this.game.vrHud) this.game.vrHud.show('🌈 ASCENSION TO INFINITY', 'You remembered.', '', 10000);
      this.game.unicornState = 'ascend';
    }, 2500);
  }

  update(delta) {
    if (this.isSliding) this.updateSlide(delta);
  }
}
