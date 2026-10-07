import { audio } from '../audio/synth.js';
import { V3, PGeo, BMat, Msh } from '../engine/three.js';

export function createNarrative(game) {
  let isSliding = false, slideProgress = 0;
  let creditsTriggered = false;
  let fadeMesh = null;
  let animId = null;

  // Prologue Office Cutscene State
  let officeStage = 'idle'; // 'idle' | 'sitting' | 'dozing1' | 'flutter' | 'dozing2' | 'asleep' | 'waiting_for_accept' | 'transporting' | 'done'
  let officeTimer = 0;
  let camDozingTilt = 0;
  let camDozingY = 0;
  let zoomIntoScreen = 0;

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

  const setFade = (targetOp, durationSec) => {
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
          if (fadeMesh?.material) {
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

  function wakeUpToCall() {
    if (officeStage === 'waiting_for_accept' || officeStage === 'transporting' || officeStage === 'done') return;
    officeStage = 'waiting_for_accept';
    audio.playRingtone();
    game.xr?.pulseHaptics?.('both', 0.9, 350);
    audio.playVoice('intro');

    // Eyelids flutter groggily awake
    setFade(0.45, 0.2);
    setTimeout(() => setFade(0.0, 0.4), 220);

    // Light up smartphone on desk
    game.office?.setPhoneRinging?.(true);

    // Show prompt on HUD and DOM
    game.vrHud?.show('📞 INCOMING CALL', 'Maya (Wife) • 2:43 AM', 'Click / Trigger / Press [X] to Accept');
    document.getElementById('call-prompt')?.classList.remove('hidden');
  }

  function acceptOfficeCall() {
    if (officeStage === 'transporting' || officeStage === 'done') return;
    if (officeStage !== 'waiting_for_accept') {
      wakeUpToCall();
      return;
    }
    officeStage = 'transporting';
    document.getElementById('call-prompt')?.classList.add('hidden');
    game.office?.setPhoneRinging?.(false);
    audio.playPeacefulChords?.();

    game.vrHud?.show('🌸 MAYA CONNECTED', '“I bought peach gummies... Find me in the rainbow.”', 'Transporting to Valley...');

    // Flare portal on external monitor displaying grayscale valley
    game.office?.setPortalGlow?.(1.0);

    // Camera zooms forward into the screen, flash white, and slide!
    setTimeout(() => {
      setFade(1.0, 0.24);
    }, 550);

    setTimeout(() => {
      officeStage = 'done';
      if (game.office?.officeGroup) game.office.officeGroup.visible = false;
      moveCam(getSlidePoint(1), getSlidePoint(0.96));
      mgr.triggerSlide();
      setFade(0.0, 0.45);
    }, 780);
  }

  function onOfficeSelect(mesh, isKeyX = false) {
    if (officeStage === 'waiting_for_accept') {
      acceptOfficeCall();
      return true;
    }
    if (officeStage === 'sitting' || officeStage === 'dozing1' || officeStage === 'flutter' || officeStage === 'dozing2' || officeStage === 'asleep') {
      wakeUpToCall();
      return true;
    }
    return false;
  }

  // Hook DOM call prompt button
  const acceptBtn = document.getElementById('call-accept-btn');
  if (acceptBtn) {
    acceptBtn.onclick = (e) => {
      e.stopPropagation();
      acceptOfficeCall();
    };
  }
  const callPrompt = document.getElementById('call-prompt');
  if (callPrompt) {
    callPrompt.onclick = (e) => {
      e.stopPropagation();
      acceptOfficeCall();
    };
  }

  function triggerBlinkFadeCredits(force = false) {
    if (creditsTriggered && !force) return;
    creditsTriggered = true;
    mgr.act = 5;

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

    if (force) {
      if (creditsEl) creditsEl.classList.remove('visible');
      setFade(0, 0);
    }

    // Eye-Blink Fade sequence:
    // 1. Rapid eyelid blink shut into black (280ms)
    setFade(1, 0.28);

    // 2. Eyelid flutter open (one last bittersweet glimpse of rainbow valley) (220ms)
    setTimeout(() => {
      setFade(0.35, 0.22);
    }, 280);

    // 3. Gentle peaceful close into pure black (950ms)
    setTimeout(() => {
      setFade(1.0, 0.95);
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
    onOfficeSelect,
    triggerBlinkFadeCredits,
    startExperience() {
      audio.init();
      mgr.act = 0;
      officeStage = 'sitting';
      officeTimer = 0;
      camDozingTilt = 0;
      camDozingY = 0;
      zoomIntoScreen = 0;

      if (game.office?.officeGroup) game.office.officeGroup.visible = true;
      game.setAwakened(0);

      // Seated in office chair at desk looking at 5090 Legion and external monitor
      moveCam(V3(0, 51.25, 0), V3(0, 50.95, -0.65));
      audio.playBGM('intro');
      game.vrHud?.show('2:43 AM • OFFICE', 'Legion Pro 7i • RTX 5090 • White Rubik’s Cube', 'Exhaustion setting in...');
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

      // ACT 0: Office Room Cutscene
      if (mgr.act === 0 && officeStage !== 'done' && !isSliding) {
        officeTimer += delta;

        if (officeStage === 'sitting') {
          if (officeTimer > 1.4) {
            officeStage = 'dozing1';
            setFade(0.42, 1.4);
          }
        } else if (officeStage === 'dozing1') {
          const p = Math.min(1, (officeTimer - 1.4) / 1.4);
          camDozingTilt = -0.12 * p;
          camDozingY = -0.04 * p;
          if (officeTimer > 2.8) {
            officeStage = 'flutter';
            setFade(0.18, 0.7);
          }
        } else if (officeStage === 'flutter') {
          const p = Math.min(1, (officeTimer - 2.8) / 0.7);
          camDozingTilt = -0.12 + 0.08 * p;
          camDozingY = -0.04 + 0.02 * p;
          if (officeTimer > 3.8) {
            officeStage = 'dozing2';
            setFade(0.88, 1.8);
          }
        } else if (officeStage === 'dozing2') {
          const p = Math.min(1, (officeTimer - 3.8) / 1.8);
          camDozingTilt = -0.04 - 0.38 * p;
          camDozingY = -0.02 - 0.14 * p;
          if (officeTimer > 5.8) {
            officeStage = 'asleep';
            setFade(1.0, 0.8);
          }
        } else if (officeStage === 'asleep') {
          camDozingTilt = -0.42;
          camDozingY = -0.16;
          if (officeTimer > 7.4) {
            wakeUpToCall();
          }
        } else if (officeStage === 'waiting_for_accept') {
          camDozingTilt += (0 - camDozingTilt) * Math.min(1, delta * 6);
          camDozingY += (0 - camDozingY) * Math.min(1, delta * 6);
        } else if (officeStage === 'transporting') {
          zoomIntoScreen = Math.min(0.68, zoomIntoScreen + delta * 1.1);
        }

        const eyeY = 51.25 + camDozingY;
        const eyeZ = 0 - zoomIntoScreen;
        const targetY = 50.95 + camDozingTilt * 1.5;
        const targetZ = -0.65;
        moveCam(V3(0, eyeY, eyeZ), V3(0, targetY, targetZ));
        return;
      }

      // Slide sequence down to the valley
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
