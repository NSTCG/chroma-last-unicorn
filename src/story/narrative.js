import { audio } from '../audio/synth.js';
import { V3 } from '../engine/three.js';

export function createNarrative(game) {
  let isSliding = false, slideProgress = 0;

  const getSlidePoint = (u, target) => {
    const cu = Math.max(0, Math.min(1, u)), a = cu * 6.9 + 0.5, r = 16 + Math.sin(cu * 6.28) * 8;
    return (target || V3(0, 0, 0)).set(Math.cos(a) * r, 4.7 + cu * 38, -12 + Math.sin(a) * r);
  };

  const moveCam = (pos, lookTarget) => {
    if (game.renderer?.xr?.isPresenting) {
      game.camera.position.set(0, 0, 0);
      game.camera.quaternion.identity();
      const xg = game.xr?.xrGroup;
      if (xg) {
        xg.position.set(pos.x, pos.y - 1.6, pos.z);
        xg.rotation.y = Math.atan2(pos.x - lookTarget.x, pos.z - lookTarget.z);
      }
    } else {
      game.camera.position.copy(pos);
      game.camera.lookAt(lookTarget);
    }
  };

  const mgr = {
    act: 0,
    collectedCount: 0,
    startExperience() {
      audio.init();
      mgr.act = 0;
      game.setAwakened(1);
      moveCam(getSlidePoint(1), getSlidePoint(0.96));
      game.vrHud?.show('2:43 AM • TERMINAL', 'Desk cold. Numb with grief since the cliff... Maya calls from the dream valley.', 'Trigger / Click to Enter');
    },
    triggerSlide() {
      if (isSliding || mgr.act !== 0) return;
      isSliding = true;
      slideProgress = 0;
      audio.tone('sine', 480, 0.3, 0.08);
      game.vrHud?.show('THE VALLEY', 'Descending to where you lost her...');
    },
    onShardCollected() {
      mgr.collectedCount++;
      if (mgr.act === 1) mgr.act = 2;
      game.setAwakened((mgr.collectedCount / 7) * 0.85);
      if (mgr.collectedCount === 7) {
        setTimeout(() => {
          mgr.act = 3;
          game.setAwakened(1);
          audio.playAscent();
          audio.playFeelGoodEnding();
          game.vrHud?.show('✨ AWAKENED', 'Her love restores our world!');
          game.unicornState = 'gallop';
          setTimeout(() => {
            mgr.act = 4;
            game.unicornState = 'ascend';
            game.vrHud?.showEndingNote?.(
              "Our horse can fly! 🦄\nI didn't save you from that cliff to live in grey.\nChase fireflies. Find me in the rainbow.\nLive with color again, my love... 🌸🌈"
            );
          }, 2800);
        }, 800);
      }
    },
    update(delta) {
      if (!isSliding) return;
      slideProgress += delta * (slideProgress < 0.15 || slideProgress > 0.85 ? 0.14 : 0.34);
      const u = Math.max(0, 1 - slideProgress);
      moveCam(getSlidePoint(u), getSlidePoint(Math.max(0, u - 0.04)));
      game.setAwakened(Math.pow(u, 1.2));
      if (Math.random() < 0.12) audio.tone('sine', 260 + u * 320, 0.4, 0.05);

      if (slideProgress >= 1) {
        isSliding = false;
        mgr.act = 1;
        game.setAwakened(0);
        moveCam(V3(0, 1.7, 5), V3(0, 1.7, -12));
        game.vrHud?.show('💔 COLORLESS GRIEF', 'Awaken 7 memories of Maya to heal.');
      }
    }
  };
  return mgr;
}
