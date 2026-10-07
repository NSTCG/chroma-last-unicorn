import { audio } from '../audio/synth.js';
import { V3, PGeo, BMat, Msh } from '../engine/three.js';

export function createNarrative(game) {
  let isSliding = false, slideProgress = 0;
  let creditsTriggered = false;
  let fadeMesh = null;
  let animId = null;

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

  function triggerBlinkFadeCredits(force = false) {
    if (creditsTriggered && !force) return;
    creditsTriggered = true;
    mgr.act = 5;

    // Attach 3D fade mesh to VR camera if not already created
    if (game.camera && !fadeMesh) {
      const fadeGeo = PGeo(6, 6);
      const fadeMat = BMat({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false
      });
      fadeMesh = Msh(fadeGeo, fadeMat);
      fadeMesh.position.set(0, 0, -0.08);
      fadeMesh.renderOrder = 9990;
      game.camera.add(fadeMesh);
    }

    const fadeEl = document.getElementById('fade-overlay');
    const creditsEl = document.getElementById('credits');
    const restartBtn = document.getElementById('credits-restart');

    if (restartBtn) {
      restartBtn.onclick = (e) => {
        e.stopPropagation();
        window.location.reload();
      };
    }
    if (creditsEl) {
      creditsEl.onclick = () => window.location.reload();
    }

    const setOpacity = (targetOp, durationSec) => {
      if (fadeEl) {
        fadeEl.style.transition = durationSec > 0 ? `opacity ${durationSec}s cubic-bezier(0.25, 1, 0.5, 1)` : 'none';
        fadeEl.style.opacity = targetOp;
      }
      if (fadeMesh && fadeMesh.material) {
        if (animId) cancelAnimationFrame(animId);
        if (durationSec <= 0) {
          fadeMesh.material.opacity = targetOp;
        } else {
          const startOp = fadeMesh.material.opacity;
          const startTime = performance.now();
          const durMs = durationSec * 1000;
          const animate = (now) => {
            const progress = Math.min(1, (now - startTime) / durMs);
            if (fadeMesh && fadeMesh.material) {
              fadeMesh.material.opacity = startOp + (targetOp - startOp) * progress;
            }
            if (progress < 1) {
              animId = requestAnimationFrame(animate);
            }
          };
          animId = requestAnimationFrame(animate);
        }
      }
    };

    if (force) {
      if (creditsEl) creditsEl.classList.remove('visible');
      setOpacity(0, 0);
    }

    // Eye-Blink Fade sequence:
    // 1. Rapid eyelid blink shut into black (280ms)
    setOpacity(1, 0.28);

    // 2. Eyelid flutter open (one last bittersweet glimpse of rainbow valley) (220ms)
    setTimeout(() => {
      setOpacity(0.35, 0.22);
    }, 280);

    // 3. Gentle peaceful close into pure black (950ms)
    setTimeout(() => {
      setOpacity(1.0, 0.95);
    }, 500);

    // 4. Reveal end credits with NSTCG STUDIOS branding (both 2D DOM and WebXR VR headset)
    setTimeout(() => {
      if (creditsEl) creditsEl.classList.add('visible');
      game.vrHud?.showCredits?.();
      audio.playPeacefulChords?.();
    }, 1550);
  }

  // Debug skip feature: if ?dev or #dev is on the URL, pressing Space skips directly to credits
  const isDev = typeof window !== 'undefined' && (
    window.location.search.includes('dev') ||
    window.location.hash.includes('dev')
  );

  if (isDev) {
    console.log('⚡ [CHROMA DEV MODE] Press [Space] or call window.skipToCredits() to skip to Blink Fade & Credits (NSTCG STUDIOS)');
    window.skipToCredits = () => triggerBlinkFadeCredits(true);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        const overlay = document.getElementById('o');
        if (overlay) overlay.classList.add('hidden');
        audio.init();
        audio.stopVoice?.();
        triggerBlinkFadeCredits(true);
      }
    });
  }

  const mgr = {
    act: 0,
    collectedCount: 0,
    triggerBlinkFadeCredits,
    startExperience() {
      audio.init();
      mgr.act = 0;
      game.setAwakened(1);
      moveCam(getSlidePoint(1), getSlidePoint(0.96));
      audio.playBGM('intro');
      audio.playVoice('intro');
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
          audio.playBGM('finale');
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

            // Play Maya's final audio, followed by the eye-blink fade and NSTCG STUDIOS end credits
            let finaleComplete = false;
            const onFinaleEnd = () => {
              if (finaleComplete) return;
              finaleComplete = true;
              triggerBlinkFadeCredits();
            };

            audio.playVoice('finale', onFinaleEnd);

            // Safety timeout: in case audio is interrupted or muted, trigger after 16s
            setTimeout(onFinaleEnd, 16000);
          }, 2800);
        }, 800);
      } else {
        // Revert to initial audio once level is completed and no new level is active
        setTimeout(() => {
          if (!game.shards?.getActiveTask?.() && mgr.collectedCount < 7) {
            audio.playBGM('intro');
          }
        }, 1600);
      }
    },
    update(delta) {
      if (fadeMesh && game.camera && fadeMesh.parent !== game.camera) {
        game.camera.add(fadeMesh);
        fadeMesh.position.set(0, 0, -0.08);
      }

      if (!isSliding) return;
      slideProgress += delta * (slideProgress < 0.15 || slideProgress > 0.85 ? 0.14 : 0.34);
      const u = Math.max(0, 1 - slideProgress);
      moveCam(getSlidePoint(u), getSlidePoint(Math.max(0, u - 0.04)));
      game.setAwakened(Math.pow(u, 1.2));

      if (slideProgress >= 1) {
        isSliding = false;
        mgr.act = 1;
        game.setAwakened(0);
        audio.playBGM('intro');
        moveCam(V3(0, 1.7, 5), V3(0, 1.7, -12));
        game.vrHud?.show('💔 COLORLESS GRIEF', 'Awaken 7 memories of Maya to heal.');
      }
    }
  };
  return mgr;
}
