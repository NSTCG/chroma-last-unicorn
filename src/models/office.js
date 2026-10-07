import { T, Grp, Msh, BMat, BGeo, PGeo, CGeo } from '../engine/three.js';

export function createOfficeRoom(scene) {
  const officeGroup = Grp();
  officeGroup.position.set(0, 50, 0);
  scene.add(officeGroup);

  // 1. MONITOR SCREEN TEXTURE: Grayscale Valley Scene Screenshot
  const monitorCanvas = document.createElement('canvas');
  monitorCanvas.width = 1024;
  monitorCanvas.height = 576;
  const mctx = monitorCanvas.getContext('2d');

  function renderMonitorGrayscaleValley(glow = 0) {
    // Atmospheric dark gradient sky
    const skyGrad = mctx.createLinearGradient(0, 0, 0, 400);
    skyGrad.addColorStop(0, '#101018');
    skyGrad.addColorStop(0.5, '#1e1e28');
    skyGrad.addColorStop(1, '#343440');
    mctx.fillStyle = skyGrad;
    mctx.fillRect(0, 0, 1024, 576);

    // Distant mountain ridge 1 (dark silhouette)
    mctx.fillStyle = '#22222c';
    mctx.beginPath();
    mctx.moveTo(0, 360);
    mctx.lineTo(120, 240);
    mctx.lineTo(260, 290);
    mctx.lineTo(440, 180);
    mctx.lineTo(580, 270);
    mctx.lineTo(720, 210);
    mctx.lineTo(880, 280);
    mctx.lineTo(1024, 230);
    mctx.lineTo(1024, 576);
    mctx.lineTo(0, 576);
    mctx.fill();

    // Mountain ridge 2 (mid gray)
    mctx.fillStyle = '#3a3a46';
    mctx.beginPath();
    mctx.moveTo(0, 390);
    mctx.lineTo(180, 310);
    mctx.lineTo(320, 350);
    mctx.lineTo(512, 270);
    mctx.lineTo(680, 340);
    mctx.lineTo(840, 295);
    mctx.lineTo(1024, 380);
    mctx.lineTo(1024, 576);
    mctx.lineTo(0, 576);
    mctx.fill();

    // Fog layers
    const fogGrad = mctx.createLinearGradient(0, 280, 0, 440);
    fogGrad.addColorStop(0, 'rgba(200, 200, 215, 0.0)');
    fogGrad.addColorStop(0.5, 'rgba(200, 200, 215, 0.28)');
    fogGrad.addColorStop(1, 'rgba(200, 200, 215, 0.05)');
    mctx.fillStyle = fogGrad;
    mctx.fillRect(0, 280, 1024, 160);

    // Valley foreground rolling hills
    mctx.fillStyle = '#1c1c24';
    mctx.beginPath();
    mctx.moveTo(0, 460);
    mctx.quadraticCurveTo(240, 420, 512, 450);
    mctx.quadraticCurveTo(780, 480, 1024, 430);
    mctx.lineTo(1024, 576);
    mctx.lineTo(0, 576);
    mctx.fill();

    // Central Stone Altar & Pedestal
    mctx.fillStyle = '#484856';
    mctx.beginPath();
    mctx.ellipse(512, 465, 140, 30, 0, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = '#606070';
    mctx.beginPath();
    mctx.ellipse(512, 455, 75, 16, 0, 0, Math.PI * 2);
    mctx.fill();

    // Ethereal Unicorn Silhouette in center
    mctx.fillStyle = '#e4e4ee';
    // Body & neck
    mctx.beginPath();
    mctx.ellipse(512, 432, 28, 14, 0, 0, Math.PI * 2);
    mctx.fill();
    // Neck & Head
    mctx.beginPath();
    mctx.moveTo(524, 432);
    mctx.lineTo(540, 406);
    mctx.lineTo(548, 412);
    mctx.lineTo(534, 436);
    mctx.closePath();
    mctx.fill();
    // Horn
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 2.5;
    mctx.beginPath();
    mctx.moveTo(544, 408);
    mctx.lineTo(558, 386);
    mctx.stroke();
    // Legs
    mctx.lineWidth = 3;
    mctx.strokeStyle = '#e4e4ee';
    mctx.beginPath();
    mctx.moveTo(496, 436); mctx.lineTo(492, 458);
    mctx.moveTo(504, 436); mctx.lineTo(502, 458);
    mctx.moveTo(522, 436); mctx.lineTo(520, 458);
    mctx.moveTo(528, 436); mctx.lineTo(530, 458);
    mctx.stroke();

    // Floating dream shards (grayscale glyphs)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sx = 512 + Math.cos(a) * 180;
      const sy = 410 + Math.sin(a) * 45;
      mctx.beginPath();
      mctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      mctx.fillStyle = '#ffffffbb';
      mctx.fill();
      mctx.strokeStyle = '#ffffff55';
      mctx.lineWidth = 1.5;
      mctx.stroke();
    }

    // High-Tech Diagnostics HUD Overlay on Monitor
    mctx.fillStyle = 'rgba(10, 10, 16, 0.65)';
    mctx.fillRect(0, 0, 1024, 38);
    mctx.fillStyle = '#ff5555';
    mctx.beginPath(); mctx.arc(28, 19, 5, 0, Math.PI * 2); mctx.fill();

    mctx.fillStyle = '#ffffff';
    mctx.font = 'bold 13px monospace';
    mctx.fillText('CHROMASYNC ARCHIVE // CAMERA 01 [OFFLINE]', 44, 23);

    mctx.fillStyle = '#9999a8';
    mctx.textAlign = 'right';
    mctx.fillText('RTX 5090 • 4K 144Hz • MONOCHROME FEED', 1000, 23);
    mctx.textAlign = 'left';

    // Center screen status watermark
    mctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    mctx.font = '11px monospace';
    mctx.textAlign = 'center';
    mctx.fillText('[ SECTOR: THE LOST VALLEY // HUE: 0.00% // TIME: 02:43 AM ]', 512, 540);
    mctx.textAlign = 'left';

    // Subtle scanlines
    mctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < 576; y += 4) {
      mctx.fillRect(0, y, 1024, 1.5);
    }

    // Portal Bloom Glow Overlay (used when transport triggers)
    if (glow > 0) {
      const pGrad = mctx.createRadialGradient(512, 380, 20, 512, 380, 600);
      pGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, glow * 1.5)})`);
      pGrad.addColorStop(0.4, `rgba(160, 216, 239, ${Math.min(0.8, glow * 0.9)})`);
      pGrad.addColorStop(0.7, `rgba(255, 121, 198, ${Math.min(0.6, glow * 0.7)})`);
      pGrad.addColorStop(1, `rgba(255, 215, 0, ${Math.min(0.4, glow * 0.5)})`);
      mctx.fillStyle = pGrad;
      mctx.fillRect(0, 0, 1024, 576);
    }
  }

  renderMonitorGrayscaleValley(0);
  const monitorTex = new T.CanvasTexture(monitorCanvas);
  monitorTex.minFilter = monitorTex.magFilter = T.LinearFilter;

  // 2. LAPTOP SCREEN TEXTURE: Legion Pro 7i Diagnostics
  const laptopCanvas = document.createElement('canvas');
  laptopCanvas.width = 512;
  laptopCanvas.height = 320;
  const lctx = laptopCanvas.getContext('2d');

  function renderLaptopScreen() {
    lctx.fillStyle = '#0a0a10';
    lctx.fillRect(0, 0, 512, 320);

    lctx.fillStyle = '#1c1c28';
    lctx.fillRect(0, 0, 512, 28);
    lctx.fillStyle = '#50fa7b';
    lctx.font = 'bold 12px monospace';
    lctx.fillText('LEGION PRO 7i // GEN 10', 16, 18);
    lctx.fillStyle = '#8be9fd';
    lctx.textAlign = 'right';
    lctx.fillText('NVIDIA RTX 5090 (32GB)', 496, 18);
    lctx.textAlign = 'left';

    lctx.fillStyle = '#f8f8f2';
    lctx.font = '11px monospace';
    const lines = [
      '> system_temp: 48°C // VAPOR CHAMBER COOLING',
      '> display_output: DP 2.1 -> 32" UHD EXTERNAL [SYNC]',
      '> current_project: "chroma_dream_archive.cpp"',
      '> maya_audio_stream: BUFFERED (02:43:18 AM)',
      '> warning: extreme fatigue detected. rest required.',
      '> memory_slot_0: "the_cliff_highway.raw"',
      '> [TERMINAL IDLE... SLEEP IN 3 MINUTES]'
    ];
    lines.forEach((l, idx) => {
      lctx.fillStyle = idx === 4 ? '#ffb86c' : (idx === 3 ? '#ff79c6' : '#cccccc');
      lctx.fillText(l, 18, 56 + idx * 28);
    });
  }
  renderLaptopScreen();
  const laptopTex = new T.CanvasTexture(laptopCanvas);

  // 3. RUBIK'S CUBE TEXTURE: (With no color) All White!
  const cubeCanvas = document.createElement('canvas');
  cubeCanvas.width = 256;
  cubeCanvas.height = 256;
  const cctx = cubeCanvas.getContext('2d');
  cctx.fillStyle = '#18181f'; // dark black/gray seams
  cctx.fillRect(0, 0, 256, 256);
  // Draw 3x3 porcelain white tiles with subtle rounded corners
  cctx.fillStyle = '#f6f6fc';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 10 + c * 80;
      const y = 10 + r * 80;
      cctx.beginPath();
      cctx.roundRect(x, y, 76, 76, 8);
      cctx.fill();
      cctx.strokeStyle = '#e0e0e8';
      cctx.lineWidth = 2;
      cctx.stroke();
    }
  }
  const cubeTex = new T.CanvasTexture(cubeCanvas);

  // 4. SMARTPHONE SCREEN TEXTURE (Maya Calling)
  const phoneCanvas = document.createElement('canvas');
  phoneCanvas.width = 256;
  phoneCanvas.height = 512;
  const pctx = phoneCanvas.getContext('2d');

  function renderPhoneScreen(ringing = false) {
    pctx.fillStyle = '#06060c';
    pctx.fillRect(0, 0, 256, 512);

    if (ringing) {
      // Glow header
      pctx.fillStyle = '#ff79c6';
      pctx.font = 'bold 13px system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.fillText('📞 INCOMING CALL', 128, 48);

      // Maya avatar
      pctx.beginPath();
      pctx.arc(128, 140, 48, 0, Math.PI * 2);
      pctx.fillStyle = '#795290';
      pctx.fill();
      pctx.strokeStyle = '#ffd700';
      pctx.lineWidth = 3;
      pctx.stroke();

      pctx.fillStyle = '#ffffff';
      pctx.font = '36px sans-serif';
      pctx.fillText('🌸', 128, 152);

      pctx.fillStyle = '#ffffff';
      pctx.font = 'bold 24px system-ui, sans-serif';
      pctx.fillText('Maya', 128, 222);

      pctx.fillStyle = '#a0d8ef';
      pctx.font = '12px system-ui, sans-serif';
      pctx.fillText('Wife • Mobile', 128, 246);

      // Green Accept Call Button
      pctx.fillStyle = '#2ecc71';
      pctx.beginPath();
      pctx.roundRect(32, 380, 192, 54, 27);
      pctx.fill();
      pctx.fillStyle = '#ffffff';
      pctx.font = 'bold 16px system-ui, sans-serif';
      pctx.fillText('📞 ACCEPT', 128, 414);

      pctx.fillStyle = '#ffffff88';
      pctx.font = '11px system-ui, sans-serif';
      pctx.fillText('[Click / Pull Trigger]', 128, 464);
    } else {
      // Idle Lock Screen
      pctx.fillStyle = '#ffffffaa';
      pctx.font = 'bold 36px system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.fillText('2:43', 128, 120);
      pctx.font = '13px system-ui, sans-serif';
      pctx.fillText('AM', 128, 142);
      pctx.fillStyle = '#ffffff55';
      pctx.fillText('Late Night Work Mode', 128, 172);
    }
    pctx.textAlign = 'left';
  }
  renderPhoneScreen(false);
  const phoneTex = new T.CanvasTexture(phoneCanvas);

  // --------------------------------------------------------------------------
  // 3D ENVIRONMENT ARCHITECTURE
  // --------------------------------------------------------------------------
  const matWhiteFloor = BMat({ color: 0xefeff5 });
  const matWhiteWall = BMat({ color: 0xf5f5fa });
  const matFrontWall = BMat({ color: 0xf8f8fd });
  const matCeiling = BMat({ color: 0xfafafc });
  const matLight = BMat({ color: 0xffffff });

  // Room Walls & Floor (Pure White / Sterile Office)
  const floor = Msh(BGeo(8, 0.1, 8), matWhiteFloor);
  floor.position.set(0, -0.05, 0);

  const ceiling = Msh(BGeo(8, 0.1, 8), matCeiling);
  ceiling.position.set(0, 3.2, 0);

  const wallFront = Msh(BGeo(8, 3.2, 0.1), matFrontWall);
  wallFront.position.set(0, 1.6, -3.8);

  const wallBack = Msh(BGeo(8, 3.2, 0.1), matWhiteWall);
  wallBack.position.set(0, 1.6, 3.8);

  const wallLeft = Msh(BGeo(0.1, 3.2, 8), matWhiteWall);
  wallLeft.position.set(-3.8, 1.6, 0);

  const wallRight = Msh(BGeo(0.1, 3.2, 8), matWhiteWall);
  wallRight.position.set(3.8, 1.6, 0);

  // Recessed Ceiling Lights
  const light1 = Msh(BGeo(0.35, 0.02, 3.6), matLight);
  light1.position.set(-1.2, 3.18, 0);
  const light2 = Msh(BGeo(0.35, 0.02, 3.6), matLight);
  light2.position.set(1.2, 3.18, 0);

  officeGroup.add(floor, ceiling, wallFront, wallBack, wallLeft, wallRight, light1, light2);

  // --------------------------------------------------------------------------
  // OFFICE DESK & CHAIR SETUP
  // --------------------------------------------------------------------------
  const matDeskTop = BMat({ color: 0xfcfcff });
  const matDeskLeg = BMat({ color: 0xe0e0e8 });
  const matDeskMat = BMat({ color: 0xd8d8e2 });

  // Tabletop
  const deskTop = Msh(BGeo(1.65, 0.045, 0.86), matDeskTop);
  deskTop.position.set(0, 0.74, -0.65);

  // Modern T-legs
  const deskLegL = Msh(BGeo(0.05, 0.74, 0.68), matDeskLeg);
  deskLegL.position.set(-0.7, 0.37, -0.65);
  const deskLegR = Msh(BGeo(0.05, 0.74, 0.68), matDeskLeg);
  deskLegR.position.set(0.7, 0.37, -0.65);

  // Desk felt mat
  const deskMat = Msh(BGeo(1.02, 0.005, 0.48), matDeskMat);
  deskMat.position.set(0, 0.765, -0.58);

  officeGroup.add(deskTop, deskLegL, deskLegR, deskMat);

  // Office Chair (Seated directly where player eye level is: 0, 1.25, 0)
  const matChair = BMat({ color: 0xe8e8f2 });
  const matChairBase = BMat({ color: 0xc8c8d2 });
  const chairGroup = Grp();
  chairGroup.position.set(0, 0, -0.05);

  const chairSeat = Msh(BGeo(0.52, 0.08, 0.48), matChair);
  chairSeat.position.set(0, 0.48, 0);

  const chairBack = Msh(BGeo(0.48, 0.62, 0.06), matChair);
  chairBack.position.set(0, 0.84, 0.22);
  chairBack.rotation.x = -0.12;

  const chairPole = Msh(CGeo(0.035, 0.035, 0.44, 8), matChairBase);
  chairPole.position.set(0, 0.22, 0);

  const chairArmL = Msh(BGeo(0.06, 0.03, 0.28), matChair);
  chairArmL.position.set(-0.29, 0.68, 0.04);
  const chairArmR = Msh(BGeo(0.06, 0.03, 0.28), matChair);
  chairArmR.position.set(0.29, 0.68, 0.04);

  chairGroup.add(chairSeat, chairBack, chairPole, chairArmL, chairArmR);
  officeGroup.add(chairGroup);

  // --------------------------------------------------------------------------
  // LENOVO LEGION PRO 7i LAPTOP (RTX 5090)
  // --------------------------------------------------------------------------
  const legionGroup = Grp();
  legionGroup.position.set(-0.28, 0.765, -0.54);

  const matChassis = BMat({ color: 0xd6d6de });
  const matRearShelf = BMat({ color: 0x1e1e24 });
  const matKeyboard = BMat({ color: 0x25252e });

  // Base chassis
  const chassis = Msh(BGeo(0.36, 0.018, 0.25), matChassis);

  // Signature Legion rear shelf extending behind screen hinge
  const rearShelf = Msh(BGeo(0.36, 0.016, 0.036), matRearShelf);
  rearShelf.position.set(0, 0, -0.138);

  // Dual rear cooling exhaust grilles
  const ventL = Msh(BGeo(0.12, 0.012, 0.008), BMat({ color: 0x111115 }));
  ventL.position.set(-0.1, 0, -0.155);
  const ventR = Msh(BGeo(0.12, 0.012, 0.008), BMat({ color: 0x111115 }));
  ventR.position.set(0.1, 0, -0.155);
  rearShelf.add(ventL, ventR);

  // Keyboard deck well
  const kbWell = Msh(BGeo(0.32, 0.002, 0.13), matKeyboard);
  kbWell.position.set(0, 0.01, -0.01);

  // Trackpad
  const trackpad = Msh(BGeo(0.12, 0.001, 0.075), BMat({ color: 0xe2e2e8 }));
  trackpad.position.set(0, 0.01, 0.08);

  // Angled Screen Lid
  const lidGroup = Grp();
  lidGroup.position.set(0, 0.01, -0.12);
  lidGroup.rotation.x = -0.36; // tilted back ~110 degrees

  const lidOuter = Msh(BGeo(0.355, 0.23, 0.008), matChassis);
  lidOuter.position.set(0, 0.115, 0);

  const lidScreen = Msh(PGeo(0.33, 0.208), BMat({ map: laptopTex }));
  lidScreen.position.set(0, 0.115, 0.005);

  lidGroup.add(lidOuter, lidScreen);
  legionGroup.add(chassis, rearShelf, kbWell, trackpad, lidGroup);
  officeGroup.add(legionGroup);

  // --------------------------------------------------------------------------
  // EXTERNAL MONITOR SETUP (WITH GRAYSCALE VALLEY SCENE)
  // --------------------------------------------------------------------------
  const monitorGroup = Grp();
  monitorGroup.position.set(0.18, 0.765, -0.66);
  monitorGroup.rotation.y = -0.08; // angled slightly towards user

  const matStand = BMat({ color: 0xb4b4be });
  const matFrame = BMat({ color: 0xd0d0d8 });
  const matScreen = BMat({ map: monitorTex });

  // Heavy duty desk clamp & arm
  const clamp = Msh(BGeo(0.09, 0.04, 0.09), matStand);
  clamp.position.set(0, 0, -0.12);
  const pole = Msh(CGeo(0.018, 0.018, 0.38, 12), matStand);
  pole.position.set(0, 0.18, -0.12);
  const vesa = Msh(BGeo(0.1, 0.1, 0.04), matStand);
  vesa.position.set(0, 0.32, -0.06);

  // Ultra-thin 32-inch bezel frame
  const monitorBezel = Msh(BGeo(0.72, 0.42, 0.02), matFrame);
  monitorBezel.position.set(0, 0.32, 0);

  // Monitor Display Surface (Grayscale Scene)
  const monitorScreen = Msh(PGeo(0.70, 0.40), matScreen);
  monitorScreen.position.set(0, 0.32, 0.011);
  monitorScreen.userData.isMonitorPortal = true;

  monitorGroup.add(clamp, pole, vesa, monitorBezel, monitorScreen);
  officeGroup.add(monitorGroup);

  // --------------------------------------------------------------------------
  // CONNECTING CABLE (Legion 5090 -> External Monitor)
  // --------------------------------------------------------------------------
  const matCable = BMat({ color: 0x222228 });
  const cableGroup = Grp();
  const pts = [
    [-0.20, 0.765, -0.67],
    [-0.10, 0.765, -0.72],
    [0.02, 0.765, -0.74],
    [0.15, 0.78, -0.72]
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
    const len = Math.hypot(dx, dy, dz);
    const seg = Msh(CGeo(0.005, 0.005, len, 6), matCable);
    seg.position.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2);
    seg.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      new T.Vector3(dx, dy, dz).normalize()
    );
    cableGroup.add(seg);
  }
  officeGroup.add(cableGroup);

  // --------------------------------------------------------------------------
  // RUBIK'S CUBE (ON THE TABLE, WITH NO COLOR, ALL WHITE)
  // --------------------------------------------------------------------------
  const rubiksCube = Msh(BGeo(0.062, 0.062, 0.062), BMat({ map: cubeTex }));
  rubiksCube.position.set(-0.52, 0.796, -0.42);
  rubiksCube.rotation.set(0, 0.44, 0); // rotated organically on desk
  officeGroup.add(rubiksCube);

  // --------------------------------------------------------------------------
  // SMARTPHONE (MAYA'S PHONE ON DESK)
  // --------------------------------------------------------------------------
  const phoneGroup = Grp();
  phoneGroup.position.set(0.44, 0.765, -0.42);
  phoneGroup.rotation.y = -0.15;

  const phoneBody = Msh(BGeo(0.076, 0.008, 0.152), BMat({ color: 0xdcdce4 }));
  const phoneScreen = Msh(PGeo(0.072, 0.148), BMat({ map: phoneTex }));
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.position.y = 0.0045;

  // Pulsing ring indicator around phone
  const phoneRing = Msh(CGeo(0.09, 0.09, 0.002, 24), BMat({
    color: 0xff79c6,
    transparent: true,
    opacity: 0
  }));
  phoneRing.position.y = 0.002;

  phoneGroup.add(phoneBody, phoneScreen, phoneRing);
  phoneGroup.userData.isDeskPhone = true;
  phoneBody.userData.isDeskPhone = phoneScreen.userData.isDeskPhone = true;
  officeGroup.add(phoneGroup);

  return {
    officeGroup,
    monitorScreen,
    phoneGroup,
    setPhoneRinging: (isRinging) => {
      renderPhoneScreen(isRinging);
      phoneTex.needsUpdate = true;
      phoneRing.material.opacity = isRinging ? 0.75 : 0;
    },
    setPortalGlow: (amount) => {
      renderMonitorGrayscaleValley(amount);
      monitorTex.needsUpdate = true;
    },
    update: (delta, time) => {
      if (phoneRing.material.opacity > 0) {
        phoneRing.material.opacity = 0.45 + Math.sin(time * 8) * 0.35;
        phoneRing.scale.setScalar(1 + Math.sin(time * 8) * 0.08);
      }
    }
  };
}
