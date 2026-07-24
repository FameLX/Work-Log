// ── Single-Hex Palette Generator ─────────────────────────────────────────────
// Pure math: given ONE seed hex color, derive a full palette (header, dark,
// mid, background, panel, nav, input background, border, light button) via
// RGB lighten/darken mixing. No external deps.
//
// Ported verbatim (same math) from taskmanager.html's hexToRgb/lighten/darken/
// applyTheme (~line 1059-1090), which drove that app's single "header color"
// picker in Configure.
//
// THIS IS A DISTINCT MECHANISM FROM theme-system.js. theme-system.js is a
// curated-presets + per-token editor: named presets (Default/Dark/Ocean) plus
// hand-tuning each of ~18 individual tokens. hex-palette.js instead
// GENERATES an entire palette from one seed color via fixed lighten/darken
// ratios — no presets, no per-token editing, nothing saved to localStorage by
// this module. Do not merge the two; keep this as a separate "quick theme
// from one color" tool.
//
// Usage:
//   const palette = generatePalette('#1a3a6b');
//   // -> { header, dark, mid, bg, panel, nav, input, border, btnLight }
//
//   const ui = createPaletteGeneratorUI((palette) => {
//     document.documentElement.style.setProperty('--theme-header', palette.header);
//     // ...apply the rest of palette as needed
//   });
//   settingsPanel.appendChild(ui);
//
// Public API:
//   hexToRgb(hex) -> { r, g, b }
//   lighten(hex, amount) -> hex string, amount 0..1 (mixes toward white)
//   darken(hex, amount)  -> hex string, amount 0..1 (mixes toward black)
//   generatePalette(hex) -> { header, dark, mid, bg, panel, nav, input, border, btnLight }
//   createPaletteGeneratorUI(onApply) -> element with a color input + live
//     swatch preview; onApply(palette) fires on every color change (this is
//     a live generator/preview tool, not a "commit on button click" form)

(function (global) {
  function normHex(hex) {
    let v = (hex || '').trim();
    if (!v) return '#000000';
    if (v[0] !== '#') v = '#' + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '#000000';
  }

  function hexToRgb(hex) {
    const v = normHex(hex);
    return {
      r: parseInt(v.slice(1, 3), 16),
      g: parseInt(v.slice(3, 5), 16),
      b: parseInt(v.slice(5, 7), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function lighten(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const mix = (v) => v + (255 - v) * amount;
    return rgbToHex(mix(r), mix(g), mix(b));
  }

  function darken(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const mix = (v) => v * (1 - amount);
    return rgbToHex(mix(r), mix(g), mix(b));
  }

  function generatePalette(hex) {
    const base = normHex(hex);
    return {
      header: base,
      dark: darken(base, 0.40),
      mid: darken(base, 0.22),
      bg: lighten(base, 0.70),
      panel: lighten(base, 0.55),
      nav: lighten(base, 0.45),
      input: lighten(base, 0.82),
      border: lighten(base, 0.30),
      btnLight: lighten(base, 0.60),
    };
  }

  // ── Optional UI helper ──
  const SWATCH_ORDER = [
    ['header', 'Header'], ['dark', 'Dark'], ['mid', 'Mid'],
    ['bg', 'Background'], ['panel', 'Panel'], ['nav', 'Nav'],
    ['input', 'Input'], ['border', 'Border'], ['btnLight', 'Button Light'],
  ];

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected || document.getElementById('hp-inline-styles')) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.id = 'hp-inline-styles';
    style.textContent = `
      .hp-wrap{display:flex;flex-direction:column;gap:12px;}
      .hp-row{display:flex;align-items:center;gap:10px;}
      .hp-label{font-size:12px;font-weight:600;color:var(--text2,#6B6860);}
      .hp-input{width:44px;height:36px;padding:2px;border:1px solid var(--border,#E2E0D8);border-radius:6px;cursor:pointer;background:var(--surface,#fff);}
      .hp-seed-hex{font-size:12px;font-family:monospace;color:var(--text-muted,var(--text2,#9C9A92));}
      .hp-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px;}
      .hp-swatch{display:flex;flex-direction:column;gap:4px;align-items:center;}
      .hp-swatch-box{width:100%;height:36px;border-radius:6px;border:1px solid rgba(0,0,0,.12);}
      .hp-swatch-label{font-size:10px;font-weight:600;color:var(--text2,#6B6860);text-align:center;}
      .hp-swatch-hex{font-size:10px;font-family:monospace;color:var(--text-muted,var(--text2,#9C9A92));}
    `;
    document.head.appendChild(style);
  }

  function createPaletteGeneratorUI(onApply) {
    injectStyles();

    const wrap = document.createElement('div');
    wrap.className = 'hp-wrap';

    const row = document.createElement('div');
    row.className = 'hp-row';

    const label = document.createElement('label');
    label.className = 'hp-label';
    label.textContent = 'Seed color';

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'hp-input';
    input.value = '#1A3A6B';

    const seedHex = document.createElement('span');
    seedHex.className = 'hp-seed-hex';

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(seedHex);

    const swatchRow = document.createElement('div');
    swatchRow.className = 'hp-swatches';

    function render(hex) {
      const palette = generatePalette(hex);
      seedHex.textContent = palette.header;
      swatchRow.innerHTML = '';
      SWATCH_ORDER.forEach(([key, name]) => {
        const sw = document.createElement('div');
        sw.className = 'hp-swatch';

        const box = document.createElement('div');
        box.className = 'hp-swatch-box';
        box.style.background = palette[key];

        const cap = document.createElement('div');
        cap.className = 'hp-swatch-label';
        cap.textContent = name;

        const hexCap = document.createElement('div');
        hexCap.className = 'hp-swatch-hex';
        hexCap.textContent = palette[key];

        sw.appendChild(box);
        sw.appendChild(cap);
        sw.appendChild(hexCap);
        swatchRow.appendChild(sw);
      });
      if (typeof onApply === 'function') onApply(palette);
    }

    input.addEventListener('input', () => render(input.value));

    wrap.appendChild(row);
    wrap.appendChild(swatchRow);
    render(input.value);

    return wrap;
  }

  global.hexToRgb = hexToRgb;
  global.lighten = lighten;
  global.darken = darken;
  global.generatePalette = generatePalette;
  global.createPaletteGeneratorUI = createPaletteGeneratorUI;
})(window);
