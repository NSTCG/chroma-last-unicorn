// In-Browser "Dreamcrafter" Live Art & Shader Studio
// Stripped in production build (__DEV__ === false)

export function setupDevStudio(game) {
  const panel = document.createElement('div');
  panel.id = 'dev-studio-panel';
  panel.style.cssText = `
    position: fixed; top: 16px; right: 16px; width: 330px;
    background: rgba(10, 12, 24, 0.96); backdrop-filter: blur(20px);
    border: 1.5px solid rgba(0, 240, 255, 0.35); border-radius: 12px;
    padding: 16px; color: #fff; font-family: system-ui, -apple-system, sans-serif; font-size: 12px;
    z-index: 999999; box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(0,240,255,0.25);
    max-height: 90vh; overflow-y: auto; display: none;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
      <span style="font-weight:bold; color:#ff77cc; font-size:13px;">🛠️ CHROMA DEV STUDIO</span>
      <button id="dev-close-btn" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:14px;">✕</button>
    </div>

    <!-- Quick Action / Unicorn Riding -->
    <div style="margin-bottom:12px;">
      <button id="dev-btn-mount" style="width:100%; padding:8px; background:linear-gradient(135deg, #f07, #70f); border:none; border-radius:6px; color:#fff; font-weight:bold; cursor:pointer; margin-bottom:6px;">
        🦄 Toggle Mount / Ride Unicorn
      </button>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="dev-btn" data-act="0">Act 0: Slide</button>
        <button class="dev-btn" data-act="1">Act 1: Adulthood</button>
        <button class="dev-btn" data-act="2">Act 2: Shards</button>
        <button class="dev-btn" data-act="3">Act 3: Unicorn</button>
      </div>
    </div>

    <!-- GI & Lighting Studio -->
    <div style="margin-bottom:12px; background:rgba(255,200,50,0.06); padding:10px; border-radius:8px; border:1px solid rgba(255,200,50,0.2);">
      <label style="color:#ffcc33; font-weight:bold; display:block; margin-bottom:8px;">☀️ SHADOW & GI LIGHTING</label>
      
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Shadow GI Ambient Bounce:</span> <span id="val-gi">1.35x</span>
        </div>
        <input type="range" id="slider-gi" min="0.2" max="2.5" step="0.05" value="1.35" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Cloud Shadow Density:</span> <span id="val-g-cloud">0.42</span>
        </div>
        <input type="range" id="slider-g-cloud" min="0.0" max="1.0" step="0.02" value="0.42" style="width:100%;">
      </div>
    </div>

    <!-- Grass & Meadow Tuner -->
    <div style="margin-bottom:12px; background:rgba(30,255,100,0.06); padding:10px; border-radius:8px; border:1px solid rgba(30,255,100,0.2);">
      <label style="color:#33ff77; font-weight:bold; display:block; margin-bottom:8px;">🌾 GRASS & MEADOW SCULPTOR</label>
      
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Grass Density (Count):</span> <span id="val-g-count">58000</span>
        </div>
        <input type="range" id="slider-g-count" min="1000" max="80000" step="1000" value="58000" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Blade Width:</span> <span id="val-g-w">2.00x</span>
        </div>
        <input type="range" id="slider-g-w" min="0.5" max="4.0" step="0.1" value="2.0" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Blade Height:</span> <span id="val-g-h">1.00x</span>
        </div>
        <input type="range" id="slider-g-h" min="0.3" max="3.0" step="0.05" value="1.0" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Grass Gradient Power:</span> <span id="val-g-grad">0.85</span>
        </div>
        <input type="range" id="slider-g-grad" min="0.3" max="2.2" step="0.05" value="0.85" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>Grass Base Root Color:</span>
          <input type="color" id="picker-g-base" value="#0a3812" style="background:none; border:1px solid #555; border-radius:4px; height:24px; cursor:pointer;">
        </div>
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>Grass Tip Green Color:</span>
          <input type="color" id="picker-g-tip" value="#47f561" style="background:none; border:1px solid #555; border-radius:4px; height:24px; cursor:pointer;">
        </div>
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Wind Sway Speed:</span> <span id="val-g-wspeed">1.00x</span>
        </div>
        <input type="range" id="slider-g-wspeed" min="0.1" max="3.0" step="0.05" value="1.0" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Wind Gust Strength:</span> <span id="val-g-wstr">1.00x</span>
        </div>
        <input type="range" id="slider-g-wstr" min="0.0" max="3.0" step="0.05" value="1.0" style="width:100%;">
      </div>
    </div>

    <!-- Fog & Atmosphere -->
    <div style="margin-bottom:12px;">
      <label style="color:#00ffff; font-weight:bold; display:block; margin-bottom:6px;">🌫️ FOG & ATMOSPHERE</label>
      
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Distance Fog Density:</span> <span id="val-fog">1.00</span>
        </div>
        <input type="range" id="slider-fog" min="0.0" max="2.0" step="0.05" value="1.00" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Sky Blend Intensity:</span> <span id="val-blend">0.95</span>
        </div>
        <input type="range" id="slider-blend" min="0.0" max="1.5" step="0.05" value="0.95" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Glitter / Sparkle:</span> <span id="val-glit">1.4</span>
        </div>
        <input type="range" id="slider-glit" min="0" max="3" step="0.1" value="1.4" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Iridescence:</span> <span id="val-irid">1.2</span>
        </div>
        <input type="range" id="slider-irid" min="0" max="3" step="0.1" value="1.2" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Awakened Ratio:</span> <span id="val-awak">0.0</span>
        </div>
        <input type="range" id="slider-awak" min="0" max="1" step="0.02" value="0.0" style="width:100%;">
      </div>
    </div>

    <button id="dev-export-btn" style="width:100%; padding:8px; background:#ff0077; border:none; border-radius:6px; color:#fff; font-weight:bold; cursor:pointer; margin-top:6px;">
      📋 Export Live Config
    </button>
  `;

  // Prominent high-z-index floating toggle pill button
  const togglePill = document.createElement('button');
  togglePill.id = 'dev-toggle-pill';
  togglePill.innerHTML = '⚙️ <strong>Studio (~ / F2)</strong>';
  togglePill.style.cssText = `
    position: fixed; top: 18px; right: 18px; z-index: 999999;
    background: linear-gradient(135deg, rgba(255,0,119,0.85), rgba(119,0,255,0.85));
    border: 1.5px solid rgba(255,255,255,0.4);
    color: #fff; padding: 8px 16px; border-radius: 999px; font-size: 12px;
    cursor: pointer; backdrop-filter: blur(12px); box-shadow: 0 4px 18px rgba(255,0,119,0.5);
    display: flex; align-items: center; gap: 6px;
  `;

  document.body.appendChild(togglePill);
  document.body.appendChild(panel);

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .dev-btn {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
      color: #fff; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px;
    }
    .dev-btn:hover { background: rgba(255,255,255,0.25); }
  `;
  document.head.appendChild(styleEl);

  const togglePanel = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  togglePill.addEventListener('click', togglePanel);
  panel.querySelector('#dev-close-btn').addEventListener('click', () => { panel.style.display = 'none'; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote' || e.code === 'F2') {
      togglePanel();
    }
  });

  // Mount toggle button
  panel.querySelector('#dev-btn-mount').addEventListener('click', () => {
    if (game.toggleMount) game.toggleMount();
  });

  // Act Jumps
  panel.querySelectorAll('.dev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = parseInt(btn.getAttribute('data-act'));
      if (act === 0) {
        game.narrative.startExperience();
      } else if (act === 1) {
        game.setAwakened(0.0);
      } else if (act === 2) {
        game.setAwakened(0.6);
      } else if (act === 3) {
        game.setAwakened(1.0);
        game.narrative.triggerUnicornAwakening();
      }
    });
  });

  // Helpers
  const bindSlider = (id, valId, suffix = '', callback) => {
    const slider = panel.querySelector(`#${id}`);
    const valText = panel.querySelector(`#${valId}`);
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valText.textContent = (Number.isInteger(val) ? val : val.toFixed(2)) + suffix;
      callback(val);
    });
  };

  // GI & Lighting
  bindSlider('slider-gi', 'val-gi', 'x', (val) => {
    if (game.grass?.params) game.grass.params.giStrength = val;
    if (game.world?.setGIShadowStrength) game.world.setGIShadowStrength(val);
  });

  bindSlider('slider-g-cloud', 'val-g-cloud', '', (val) => {
    if (game.grass?.params) game.grass.params.cloudDensity = val;
  });

  // Grass Sliders
  bindSlider('slider-g-count', 'val-g-count', '', (val) => {
    if (game.grass?.params) game.grass.params.count = val;
  });

  bindSlider('slider-g-w', 'val-g-w', 'x', (val) => {
    if (game.grass?.params) game.grass.params.widthScale = val;
  });

  bindSlider('slider-g-h', 'val-g-h', 'x', (val) => {
    if (game.grass?.params) game.grass.params.heightScale = val;
  });

  bindSlider('slider-g-grad', 'val-g-grad', '', (val) => {
    if (game.grass?.params) game.grass.params.gradPow = val;
  });

  panel.querySelector('#picker-g-base').addEventListener('input', (e) => {
    if (game.grass?.uniforms?.uGrassBaseTint) {
      game.grass.uniforms.uGrassBaseTint.value.set(e.target.value);
    }
  });

  panel.querySelector('#picker-g-tip').addEventListener('input', (e) => {
    if (game.grass?.uniforms?.uGrassTipTint) {
      game.grass.uniforms.uGrassTipTint.value.set(e.target.value);
    }
  });

  bindSlider('slider-g-wspeed', 'val-g-wspeed', 'x', (val) => {
    if (game.grass?.params) game.grass.params.windSpeed = val;
  });

  bindSlider('slider-g-wstr', 'val-g-wstr', 'x', (val) => {
    if (game.grass?.params) game.grass.params.windStrength = val;
  });

  // Fog & Atmosphere Sliders
  bindSlider('slider-fog', 'val-fog', '', (val) => {
    if (game.world?.fogCards?.setDensity) game.world.fogCards.setDensity(val);
  });

  bindSlider('slider-blend', 'val-blend', '', (val) => {
    if (game.setFadeIntensity) game.setFadeIntensity(val);
    else if (game.world.setFadeIntensity) game.world.setFadeIntensity(val);
  });

  bindSlider('slider-glit', 'val-glit', '', (val) => {
    game.world.materials.forEach(m => { if (m.uniforms?.uGlitter) m.uniforms.uGlitter.value = val; });
  });

  bindSlider('slider-irid', 'val-irid', '', (val) => {
    game.world.materials.forEach(m => { if (m.uniforms?.uIridescence) m.uniforms.uIridescence.value = val; });
  });

  bindSlider('slider-awak', 'val-awak', '', (val) => {
    game.setAwakened(val);
  });

  // Export Config
  panel.querySelector('#dev-export-btn').addEventListener('click', () => {
    const cfg = {
      gi: {
        shadowStrength: parseFloat(panel.querySelector('#slider-gi').value),
        cloudDensity: parseFloat(panel.querySelector('#slider-g-cloud').value)
      },
      grass: {
        count: parseInt(panel.querySelector('#slider-g-count').value),
        widthScale: parseFloat(panel.querySelector('#slider-g-w').value),
        heightScale: parseFloat(panel.querySelector('#slider-g-h').value),
        gradPow: parseFloat(panel.querySelector('#slider-g-grad').value),
        baseColor: panel.querySelector('#picker-g-base').value,
        tipColor: panel.querySelector('#picker-g-tip').value,
        windSpeed: parseFloat(panel.querySelector('#slider-g-wspeed').value),
        windStrength: parseFloat(panel.querySelector('#slider-g-wstr').value)
      },
      atmosphere: {
        fogDensity: parseFloat(panel.querySelector('#slider-fog').value),
        blendIntensity: parseFloat(panel.querySelector('#slider-blend').value),
        glitter: parseFloat(panel.querySelector('#slider-glit').value),
        iridescence: parseFloat(panel.querySelector('#slider-irid').value),
        awakened: parseFloat(panel.querySelector('#slider-awak').value)
      }
    };
    navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2));
    alert('Full live config copied to clipboard!');
  });
}
