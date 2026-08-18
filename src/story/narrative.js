import { audio } from '../audio/synth.js';

export class NarrativeManager {
  constructor(game) {
    this.game = game;
    this.act = 0;
    this.collectedCount = 0;
    this.isSliding = false;
    this.slideProgress = 0;
  }

  getSlidePoint(u, target) {
    const cu = Math.max(0, Math.min(1, u)), a = cu * 6.9 + 0.5, r = 16 + Math.sin(cu * 6.28) * 8;
    return (target || new window.THREE.Vector3()).set(Math.cos(a) * r, 4.7 + cu * 38.0, -12 + Math.sin(a) * r);
  }

  _isVR() { return this.game.renderer?.xr?.isPresenting; }

  _moveCamera(pos, lookTarget) {
    if (this._isVR()) {
      // In VR: camera is child of xrGroup, so only move xrGroup.
      // Camera local position must stay at (0,0,0) for proper stereo rendering.
      this.game.camera.position.set(0, 0, 0);
      this.game.camera.quaternion.identity();
      const xg = this.game.xr?.xrGroup;
      if (xg) {
        xg.position.set(pos.x, pos.y - 1.6, pos.z);
        xg.rotation.y = Math.atan2(lookTarget.x - pos.x, lookTarget.z - pos.z);
      }
    } else {
      this.game.camera.position.copy(pos);
      this.game.camera.lookAt(lookTarget);
    }
  }

  startExperience() {
    audio.init();
    this.act = 0;
    this.game.setAwakened(1.0);
    this._moveCamera(this.getSlidePoint(1.0), this.getSlidePoint(0.96));
    if (this.game.vrHud) this.game.vrHud.show('🌈 CHILDHOOD', 'Trigger to Slide!');
  }

  triggerSlide() {
    if (this.isSliding || this.act !== 0) return;
    this.isSliding = true;
    this.slideProgress = 0;
    audio.playPluck(520, 0.4, 0.6);
    if (this.game.vrHud) this.game.vrHud.show('HOLD ON!', 'Wheeeeeee!');
  }

  updateSlide(delta) {
    if (!this.isSliding) return;
    const p = this.slideProgress;
    this.slideProgress += delta * (p < 0.15 || p > 0.85 ? 0.14 : 0.34);
    const u = Math.max(0, 1.0 - this.slideProgress);
    this._moveCamera(this.getSlidePoint(u), this.getSlidePoint(Math.max(0, u - 0.04)));
    this.game.setAwakened(Math.pow(u, 1.2));
    if (Math.random() < 0.25) audio.playChime(Math.floor(u * 7));

    if (this.slideProgress >= 1.0) {
      this.isSliding = false;
      this.act = 1;
      this.game.setAwakened(0);
      this._moveCamera(new window.THREE.Vector3(0, 1.7, 5), new window.THREE.Vector3(0, 1.7, -12));
      if (this.game.vrHud) this.game.vrHud.show('💔 LOST COLORS', 'Restore 7 Shards!', 'Laser / Punch');
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
    if (this.game.vrHud) this.game.vrHud.show('✨ UNICORN AWAKENS', 'Wonder returned.');
    this.game.unicornState = 'gallop';
    setTimeout(() => {
      this.act = 4;
      if (this.game.vrHud) this.game.vrHud.show('🌈 ASCENSION', 'You remembered.');
      this.game.unicornState = 'ascend';
    }, 2500);
  }

  update(delta) {
    if (this.isSliding) this.updateSlide(delta);
  }
}
