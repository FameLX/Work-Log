// ── Appearance Themes system ─────────────────────────────────────────────────
// CSS-variable theming: built-in presets (CSS classes on :root), a live custom
// editor (inline styles on :root override whatever preset class is active —
// no separate render path), and named saved themes in localStorage.
//
// Depends on theme-system.css (token defaults + preset classes + editor UI).
//
// Usage:
//   loadTheme();                          // call ASAP at boot, before first paint
//   const wrap = createThemeSystem(document.getElementById('settings-slot'));
//   container.appendChild(wrap);          // builds the whole settings-section UI
//
// Public API (also exposed as globals — the saved-themes list and per-token
// pickers are generated as innerHTML with onclick="..." strings, so these
// must be reachable by name):
//   THEME_TOKENS, PRESETS
//   createThemeSystem(container, opts)
//   loadTheme()
//   switchTheme(name) / applySavedTheme(id) / deleteSavedTheme(id) / renameSavedTheme(id, value)
//   onTokenColor(key) / onTokenHex(key)
//   toggleAdvancedTheme()
//   saveCustomTheme() / resetCustomForm()

(function (global) {
  const THEME_TOKENS = [
    { key: 'bg', label: 'Background', tier: 'basic' },
    { key: 'surface', label: 'Surface', tier: 'basic' },
    { key: 'accent', label: 'Accent', tier: 'basic' },
    { key: 'text', label: 'Text', tier: 'basic' },
    { key: 'surface2', label: 'Surface (alt)', tier: 'adv', group: 'Surfaces & borders' },
    { key: 'border', label: 'Border', tier: 'adv', group: 'Surfaces & borders' },
    { key: 'border2', label: 'Border (strong)', tier: 'adv', group: 'Surfaces & borders' },
    { key: 'text2', label: 'Text (muted)', tier: 'adv', group: 'Text tones' },
    { key: 'text3', label: 'Text (faint)', tier: 'adv', group: 'Text tones' },
    { key: 'accent-text', label: 'Accent text', tier: 'adv', group: 'Text tones' },
    { key: 'success', label: 'Success', tier: 'adv', group: 'Status — success' },
    { key: 'success-bg', label: 'Success bg', tier: 'adv', group: 'Status — success' },
    { key: 'info', label: 'Info', tier: 'adv', group: 'Status — info' },
    { key: 'info-bg', label: 'Info bg', tier: 'adv', group: 'Status — info' },
    { key: 'warn', label: 'Warning', tier: 'adv', group: 'Status — warning' },
    { key: 'warn-bg', label: 'Warning bg', tier: 'adv', group: 'Status — warning' },
    { key: 'danger', label: 'Danger', tier: 'adv', group: 'Status — danger' },
    { key: 'danger-bg', label: 'Danger bg', tier: 'adv', group: 'Status — danger' },
  ];

  // Drives both the CSS (:root.theme-<id>) and the preset button grid.
  // Add an entry here + a matching :root.theme-<id> block in theme-system.css.
  const PRESETS = [
    { id: 'default', name: 'Default', swatches: ['#F7F6F3', '#1A1917', '#FFFFFF'] },
    { id: 'dark', name: 'Dark', swatches: ['#0F0E0C', '#E8E4DE', '#1A1917'] },
    { id: 'ocean', name: 'Ocean', swatches: ['#EEF4F8', '#0B5FA5', '#FFFFFF'] },
  ];

  let STORAGE_THEMES = 'app_saved_themes';
  let STORAGE_CURRENT = 'app_current_theme';
  let savedThemes = [];

  function loadSavedThemes() {
    try {
      savedThemes = JSON.parse(localStorage.getItem(STORAGE_THEMES) || '[]');
    } catch (e) {
      savedThemes = [];
    }
  }

  // Coerce any CSS color (hex, rgb(), 3-digit hex) to a normalized #rrggbb string.
  function normalizeHex(v) {
    v = (v || '').trim();
    if (!v) return '#000000';
    const rgb = v.match(/rgba?\(([^)]+)\)/i);
    if (rgb) {
      const parts = rgb[1].split(',').map((x) => parseInt(x.trim(), 10));
      return '#' + parts.slice(0, 3).map((n) => (n || 0).toString(16).padStart(2, '0')).join('');
    }
    if (v[0] !== '#') v = '#' + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '#000000';
  }

  // Read what every token currently resolves to (class-based theme + any inline overrides).
  function readCurrentTokens(root) {
    const cs = getComputedStyle(root);
    const out = {};
    THEME_TOKENS.forEach((t) => { out[t.key] = normalizeHex(cs.getPropertyValue('--' + t.key)); });
    return out;
  }

  function clearThemeOverrides(root) {
    THEME_TOKENS.forEach((t) => root.style.removeProperty('--' + t.key));
  }

  function applyTokenSet(root, tokens) {
    THEME_TOKENS.forEach((t) => { if (tokens[t.key]) root.style.setProperty('--' + t.key, tokens[t.key]); });
  }

  // ── Construction ──
  function createThemeSystem(container, opts) {
    opts = opts || {};
    const root = opts.root || document.documentElement;
    if (opts.storagePrefix) {
      STORAGE_THEMES = opts.storagePrefix + '_saved_themes';
      STORAGE_CURRENT = opts.storagePrefix + '_current_theme';
    }
    loadSavedThemes();

    const wrap = document.createElement('div');
    wrap.className = 'settings-section';

    const h3 = document.createElement('h3');
    h3.textContent = 'Appearance Themes';
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = 'Choose from the presets below, or create your own custom theme.';

    const presetGrid = document.createElement('div');
    presetGrid.className = 'theme-grid';
    presetGrid.id = 'theme-presets';
    PRESETS.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-btn';
      btn.dataset.theme = p.id;
      const preview = document.createElement('div');
      preview.className = 'theme-preview';
      p.swatches.forEach((c) => {
        const sw = document.createElement('div');
        sw.className = 'theme-color';
        sw.style.background = c;
        preview.appendChild(sw);
      });
      const name = document.createElement('span');
      name.className = 'theme-name';
      name.textContent = p.name;
      btn.appendChild(preview);
      btn.appendChild(name);
      btn.addEventListener('click', () => switchTheme(p.id));
      presetGrid.appendChild(btn);
    });

    const customSection = document.createElement('div');
    customSection.className = 'custom-theme-section';
    customSection.innerHTML = `
      <div class="custom-theme-title">Create Custom Theme</div>
      <p class="custom-theme-hint">These are the colours the active theme is using right now. Adjust any of them — the app previews instantly — then save it as a reusable theme.</p>
      <div class="custom-theme-grid" id="custom-basic-grid"></div>
      <button type="button" class="btn btn-sm advanced-toggle-btn" id="advanced-toggle-btn">
        <span>Advanced Theme Settings</span>
        <svg class="icon sm chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div id="advanced-theme-panel" style="display:none;">
        <p class="custom-theme-hint">Fine-tune every surface, border, text tone and status colour individually.</p>
        <div id="advanced-token-groups"></div>
      </div>
      <div class="custom-save-row">
        <input type="text" id="custom-theme-name" placeholder="Name this theme…"/>
        <button type="button" class="btn btn-primary" id="save-custom-theme-btn">Save Custom Theme</button>
        <button type="button" class="btn" id="reset-custom-theme-btn">Reset</button>
      </div>
    `;

    const savedSection = document.createElement('div');
    savedSection.className = 'custom-theme-section';
    savedSection.innerHTML = `
      <div class="custom-theme-title">Saved Themes</div>
      <p class="custom-theme-hint">Your saved custom themes. Rename, apply, or delete any of them.</p>
      <div id="saved-themes-list"></div>
    `;

    wrap.appendChild(h3);
    wrap.appendChild(desc);
    wrap.appendChild(presetGrid);
    wrap.appendChild(customSection);
    wrap.appendChild(savedSection);

    if (opts.mountId) wrap.dataset.mountId = opts.mountId;
    global.__themeSystemRoot = root; // used by the module-level functions below
    global.__themeSystemScope = wrap;

    customSection.querySelector('#advanced-toggle-btn').addEventListener('click', toggleAdvancedTheme);
    customSection.querySelector('#save-custom-theme-btn').addEventListener('click', saveCustomTheme);
    customSection.querySelector('#reset-custom-theme-btn').addEventListener('click', resetCustomForm);

    buildCustomEditor();
    populateCustomFromCurrent();
    markActiveTheme();
    renderSavedThemes();

    return wrap;
  }

  function scope() {
    return global.__themeSystemScope || document;
  }
  function rootEl() {
    return global.__themeSystemRoot || document.documentElement;
  }

  // ── Presets ──
  function switchTheme(themeName) {
    const root = rootEl();
    clearThemeOverrides(root);
    root.className = themeName === 'default' ? '' : 'theme-' + themeName;
    localStorage.setItem(STORAGE_CURRENT, themeName);
    markActiveTheme();
    populateCustomFromCurrent();
    renderSavedThemes();
  }

  function markActiveTheme() {
    const cur = localStorage.getItem(STORAGE_CURRENT) || 'default';
    scope().querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
    if (!cur.startsWith('saved:')) {
      const btn = scope().querySelector(`.theme-btn[data-theme="${cur}"]`);
      if (btn) btn.classList.add('active');
    }
  }

  // ── Custom editor ──
  function pickerHTML(t) {
    return `<div class="color-picker-group">
      <label class="color-picker-label" for="tk-${t.key}">${t.label}</label>
      <div class="color-picker-input">
        <input type="color" id="tk-${t.key}" data-token="${t.key}"/>
        <input type="text" id="tk-${t.key}-hex" data-token-hex="${t.key}" placeholder="#000000"/>
      </div>
    </div>`;
  }

  function buildCustomEditor() {
    const s = scope();
    s.querySelector('#custom-basic-grid').innerHTML =
      THEME_TOKENS.filter((t) => t.tier === 'basic').map(pickerHTML).join('');

    const groups = {};
    THEME_TOKENS.filter((t) => t.tier === 'adv').forEach((t) => (groups[t.group] = groups[t.group] || []).push(t));
    s.querySelector('#advanced-token-groups').innerHTML = Object.keys(groups).map((g) =>
      `<div class="adv-group-label">${g}</div><div class="custom-theme-grid">${groups[g].map(pickerHTML).join('')}</div>`
    ).join('');

    s.querySelectorAll('[data-token]').forEach((el) => {
      el.addEventListener('input', () => onTokenColor(el.dataset.token));
    });
    s.querySelectorAll('[data-token-hex]').forEach((el) => {
      el.addEventListener('change', () => onTokenHex(el.dataset.tokenHex));
    });
  }

  function populateCustomFromCurrent() {
    const tokens = readCurrentTokens(rootEl());
    const s = scope();
    THEME_TOKENS.forEach((t) => {
      const c = s.querySelector('#tk-' + t.key);
      const h = s.querySelector('#tk-' + t.key + '-hex');
      if (c) c.value = tokens[t.key];
      if (h) h.value = tokens[t.key];
    });
  }

  // Editing a token live-previews it across the whole app immediately.
  function onTokenColor(key) {
    const s = scope();
    const v = s.querySelector('#tk-' + key).value;
    s.querySelector('#tk-' + key + '-hex').value = v;
    rootEl().style.setProperty('--' + key, v);
  }

  function onTokenHex(key) {
    const s = scope();
    const v = normalizeHex(s.querySelector('#tk-' + key + '-hex').value);
    s.querySelector('#tk-' + key).value = v;
    s.querySelector('#tk-' + key + '-hex').value = v;
    rootEl().style.setProperty('--' + key, v);
  }

  function toggleAdvancedTheme() {
    const s = scope();
    const panel = s.querySelector('#advanced-theme-panel');
    const btn = s.querySelector('#advanced-toggle-btn');
    const opening = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = opening ? 'block' : 'none';
    btn.classList.toggle('open', opening);
  }

  function resetCustomForm() {
    const root = rootEl();
    const cur = localStorage.getItem(STORAGE_CURRENT) || 'default';
    clearThemeOverrides(root);
    if (cur.startsWith('saved:')) {
      const th = savedThemes.find((t) => 'saved:' + t.id === cur);
      if (th) applyTokenSet(root, th.tokens);
    }
    populateCustomFromCurrent();
  }

  function saveCustomTheme() {
    const s = scope();
    const nameInput = s.querySelector('#custom-theme-name');
    const name = (nameInput.value || '').trim() || ('My Theme ' + (savedThemes.length + 1));
    const id = 't' + Date.now();
    savedThemes.push({ id, name, tokens: readCurrentTokens(rootEl()) });
    localStorage.setItem(STORAGE_THEMES, JSON.stringify(savedThemes));
    nameInput.value = '';
    applySavedTheme(id);
  }

  function applySavedTheme(id) {
    const root = rootEl();
    const th = savedThemes.find((t) => t.id === id);
    if (!th) return;
    clearThemeOverrides(root);
    root.className = 'theme-custom'; // any neutral base class works
    applyTokenSet(root, th.tokens);
    localStorage.setItem(STORAGE_CURRENT, 'saved:' + id);
    markActiveTheme();
    populateCustomFromCurrent();
    renderSavedThemes();
  }

  function deleteSavedTheme(id) {
    savedThemes = savedThemes.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_THEMES, JSON.stringify(savedThemes));
    if (localStorage.getItem(STORAGE_CURRENT) === 'saved:' + id) switchTheme('default');
    renderSavedThemes();
  }

  function renameSavedTheme(id, value) {
    const th = savedThemes.find((t) => t.id === id);
    if (!th) return;
    th.name = (value || '').trim() || th.name;
    localStorage.setItem(STORAGE_THEMES, JSON.stringify(savedThemes));
  }

  function renderSavedThemes() {
    const s = scope();
    const list = s.querySelector('#saved-themes-list');
    if (!list) return;
    if (!savedThemes.length) {
      list.innerHTML = '<div class="saved-empty">No saved themes yet. Adjust the colours above and click Save Custom Theme.</div>';
      return;
    }
    const cur = localStorage.getItem(STORAGE_CURRENT);
    list.innerHTML = savedThemes.map((th) => {
      const active = cur === 'saved:' + th.id;
      const sw = ['bg', 'surface', 'accent', 'text'].map((k) => `<div class="theme-color" style="background:${th.tokens[k] || '#ccc'}"></div>`).join('');
      return `<div class="saved-theme-row${active ? ' active' : ''}">
        <div class="theme-preview saved">${sw}</div>
        <input class="saved-theme-name" value="${th.name}" data-rename="${th.id}"/>
        <button type="button" class="btn btn-sm${active ? ' btn-primary' : ''}" data-apply="${th.id}">${active ? 'Active' : 'Apply'}</button>
        <button type="button" class="icon-btn del" data-delete="${th.id}" title="Delete theme">🗑</button>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-rename]').forEach((el) => {
      el.addEventListener('change', () => renameSavedTheme(el.dataset.rename, el.value));
    });
    list.querySelectorAll('[data-apply]').forEach((el) => {
      el.addEventListener('click', () => applySavedTheme(el.dataset.apply));
    });
    list.querySelectorAll('[data-delete]').forEach((el) => {
      el.addEventListener('click', () => deleteSavedTheme(el.dataset.delete));
    });
  }

  // Call on every page load, BEFORE building the settings UI (order matters:
  // this must run first so the app doesn't flash the wrong theme).
  function loadTheme(opts) {
    opts = opts || {};
    const root = opts.root || document.documentElement;
    if (opts.storagePrefix) {
      STORAGE_THEMES = opts.storagePrefix + '_saved_themes';
      STORAGE_CURRENT = opts.storagePrefix + '_current_theme';
    }
    loadSavedThemes();
    const cur = localStorage.getItem(STORAGE_CURRENT) || 'default';
    clearThemeOverrides(root);
    if (cur.startsWith('saved:')) {
      const th = savedThemes.find((t) => 'saved:' + t.id === cur);
      if (th) { root.className = 'theme-custom'; applyTokenSet(root, th.tokens); return; }
      root.className = '';
      return;
    }
    root.className = cur === 'default' ? '' : 'theme-' + cur;
  }

  global.THEME_TOKENS = THEME_TOKENS;
  global.PRESETS = PRESETS;
  global.createThemeSystem = createThemeSystem;
  global.loadTheme = loadTheme;
  global.switchTheme = switchTheme;
  global.markActiveTheme = markActiveTheme;
  global.onTokenColor = onTokenColor;
  global.onTokenHex = onTokenHex;
  global.toggleAdvancedTheme = toggleAdvancedTheme;
  global.resetCustomForm = resetCustomForm;
  global.saveCustomTheme = saveCustomTheme;
  global.applySavedTheme = applySavedTheme;
  global.deleteSavedTheme = deleteSavedTheme;
  global.renameSavedTheme = renameSavedTheme;
  global.renderSavedThemes = renderSavedThemes;
})(window);
