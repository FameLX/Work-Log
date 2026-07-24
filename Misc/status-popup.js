// ── Click-to-Open Status Popup ───────────────────────────────────────────────
// Turns a status badge into a click target that opens a small overlay grid of
// color-coded options instead of a <select>. Clicking an option applies it
// inline — updates the badge's own label/colors and marks it as the current
// selection — then closes the popup. A single shared overlay (like
// date-picker.js's single #dp-pop) is reused by every badge on the page.
//
// Ported from taskmanager.html's openStatusPopup/applyStatus/closeStatusPopup
// (~line 833-848), decoupled from that file's global `statuses` array so any
// [{key,label,color}] (or {key,label,bg,text}) list works.
//
// Works standalone with a plain options array. Pairs naturally with
// badge-taxonomy.js: pass `taxonomy.getAll` (the function itself, not its
// result) as `options` so newly-added taxonomy entries show up live next
// time the popup opens, without re-wiring the badge.
//
// Usage:
//   const badge = document.createElement('span');
//   badge.className = 'sp-badge';
//   badge.textContent = 'Pending';
//   badge.dataset.statusKey = task.status; // optional: highlights current option
//   attachStatusPopup(badge, [
//     { key: 'pending', label: 'Pending', bg: '#E6F1FB', text: '#185FA5' },
//     { key: 'done',    label: 'Done',    bg: '#DCFCE7', text: '#166534' },
//   ], (key, item) => { task.status = key; save(); });
//
// Public API:
//   attachStatusPopup(badgeEl, options, onSelect)
//     badgeEl   element that opens the popup when clicked
//     options   [{key,label,bg,text}] or [{key,label,color}], or a () => that array
//               for a live list (e.g. taxonomy.getAll)
//     onSelect(key, item) called when an option is picked, before the badge updates
//   closeStatusPopup() -> closes the shared popup, if open

(function (global) {
  let overlay = null, sheet = null, grid = null;
  let activeBadge = null, activeOptions = null, activeOnSelect = null;
  let keyHandler = null;

  function resolveOptions() {
    if (typeof activeOptions === 'function') return activeOptions() || [];
    return activeOptions || [];
  }

  function colorsOf(item) {
    const bg = item.bg || item.color || 'var(--surface2)';
    const text = item.text || 'var(--text)';
    const border = item.border || item.bg || item.color || 'var(--border)';
    return { bg, text, border };
  }

  function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'sp-overlay';

    sheet = document.createElement('div');
    sheet.className = 'sp-sheet';

    grid = document.createElement('div');
    grid.className = 'sp-grid';

    sheet.appendChild(grid);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => closeStatusPopup());
    sheet.addEventListener('click', (e) => e.stopPropagation());
  }

  function renderGrid() {
    grid.innerHTML = '';
    const currentKey = activeBadge ? activeBadge.dataset.statusKey : null;
    resolveOptions().forEach((item) => {
      const { bg, text, border } = colorsOf(item);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sp-btn' + (item.key === currentKey ? ' current' : '');
      btn.style.background = bg;
      btn.style.color = text;
      btn.style.borderColor = border;
      btn.textContent = item.label;
      btn.addEventListener('click', () => selectOption(item));
      grid.appendChild(btn);
    });
  }

  function selectOption(item) {
    const badge = activeBadge;
    const onSelect = activeOnSelect;

    if (badge) {
      const { bg, text, border } = colorsOf(item);
      badge.textContent = item.label;
      badge.style.background = bg;
      badge.style.color = text;
      badge.style.borderColor = border;
      badge.dataset.statusKey = item.key;
    }

    closeStatusPopup();
    if (typeof onSelect === 'function') onSelect(item.key, item);
  }

  function attachStatusPopup(badgeEl, options, onSelect) {
    if (!badgeEl) throw new Error('attachStatusPopup: badgeEl is required');
    badgeEl.classList.add('sp-badge');
    badgeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openFor(badgeEl, options, onSelect);
    });
  }

  function openFor(badgeEl, options, onSelect) {
    ensureOverlay();

    if (overlay.classList.contains('open') && activeBadge === badgeEl) {
      closeStatusPopup();
      return;
    }

    activeBadge = badgeEl;
    activeOptions = options;
    activeOnSelect = onSelect;

    renderGrid();
    overlay.classList.add('open');

    keyHandler = (e) => { if (e.key === 'Escape') closeStatusPopup(); };
    document.addEventListener('keydown', keyHandler);
  }

  function closeStatusPopup() {
    if (!overlay) return;
    overlay.classList.remove('open');
    activeBadge = null;
    activeOptions = null;
    activeOnSelect = null;
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }

  global.attachStatusPopup = attachStatusPopup;
  global.closeStatusPopup = closeStatusPopup;
})(window);
