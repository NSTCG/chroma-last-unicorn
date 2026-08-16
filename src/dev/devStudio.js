// In-Browser "Dreamcrafter" Live Art & Shader Studio
// Stripped in production build (__DEV__ === false)

export function setupDevStudio(game) {
  const panel = document.createElement('div');
  panel.id = 'dev-studio-panel';
  panel.style.cssText = `
    position: absolute; top: 16px; right: 16px; width: 320px;
    background: rgba(12, 14, 26, 0.94); backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
    padding: 16px; color: #fff; font-family: monospace; font-size: 12px;
    z-index: 1000; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    max-height: 90vh; overflow-y: auto; display: none;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
      <span style="font-weight:bold; color:#ff77cc; font-size:13px;">🛠️ CHROMA DEV STUDIO</span>
      <button id="dev-close-btn" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:14px;">✕</button>
    </div>

    <!-- Act Jump -->
    <div style="margin-bottom:12px;">
      <label style="color:#00ffff; font-weight:bold; display:block; margin-bottom:6px;">STORY ACT JUMP</label>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="dev-btn" data-act="0">Act 0: Slide</button>
        <button class="dev-btn" data-act="1">Act 1: Adulthood</button>
        <button class="dev-btn" data-act="2">Act 2: Shards</button>
        <button class="dev-btn" data-act="3">Act 3: Unicorn</button>
      </div>
    </div>

    <!-- Grass Sculptor & Meadow Controls -->
    <div style="margin-bottom:12px; background:rgba(30,255,100,0.06); padding:10px; border-radius:8px; border:1px solid rgba(30,255,100,0.2);">
      <label style="color:#33ff77; font-weight:bold; display:block; margin-bottom:8px;">🌾 GRASS & MEADOW TUNER</label>
      
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Grass Density (Count):</span> <span id="val-g-count">14000</span>
        </div>
        <input type="range" id="slider-g-count" min="1000" max="28000" step="500" value="14000" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Blade Width:</span> <span id="val-g-w">1.00x</span>
        </div>
        <input type="range" id="slider-g-w" min="0.3" max="3.0" step="0.05" value="1.0" style="width:100%;">
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Blade Height:</span> <span id="val-g-h">1.00x</span>
        </div>
        <input type="range" id="slider-g-h" min="0.3" max="3.0" step="0.05" value="1.0" style="width:100%;">
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

    <!-- Shader & Atmosphere -->
    <div style="margin-bottom:12px;">
      <label style="color:#ffcc00; font-weight:bold; display:block; margin-bottom:6px;">SHADER & ATMOSPHERE</label>
      
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Sky Blend Intensity:</span> <span id="val-blend">0.65</span>
        </div>
        <input type="range" id="slider-blend" min="0.0" max="1.5" step="0.05" value="0.65" style="width:100%;">
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

  // Mini toggle pill button
  const togglePill = document.createElement('button');
  togglePill.id = 'dev-toggle-pill';
  togglePill.innerText = '⚙️ Studio (~ / F2)';
  togglePill.style.cssText = `
    position: absolute; top: 16px; right: 16px; z-index: 999;
    background: rgba(20,20,35,0.75); border: 1px solid rgba(255,255,255,0.2);
    color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 11px;
    cursor: pointer; backdrop-filter: blur(8px);
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

  bindSlider('slider-g-wspeed', 'val-g-wspeed', 'x', (val) => {
    if (game.grass?.params) game.grass.params.windSpeed = val;
  });

  bindSlider('slider-g-wstr', 'val-g-wstr', 'x', (val) => {
    if (game.grass?.params) game.grass.params.windStrength = val;
  });

  // Atmosphere Sliders
  bindSlider('slider-blend', 'val-blend', '', (val) => {
    if (game.world.setFadeIntensity) game.world.setFadeIntensity(val);
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
      grass: {
        count: parseInt(panel.querySelector('#slider-g-count').value),
        widthScale: parseFloat(panel.querySelector('#slider-g-w').value),
        heightScale: parseFloat(panel.querySelector('#slider-g-h').value),
        windSpeed: parseFloat(panel.querySelector('#slider-g-wspeed').value),
        windStrength: parseFloat(panel.querySelector('#slider-g-wstr').value)
      },
      atmosphere: {
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
