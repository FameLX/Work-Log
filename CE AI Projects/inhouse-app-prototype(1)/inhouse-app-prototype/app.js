/* ===================================================================
   INHOUSE APPLICATION — PROTOTYPE APP LOGIC
   Pure client-side. No server, no database — DB is a JS object
   persisted to localStorage. Session auth is simulated with
   sessionStorage (cleared on logout / tab close), standing in for
   the real server-side httpOnly session cookie described in the spec.
   =================================================================== */

const LS_KEY = 'inhouse_prototype_db_v1';
const SS_SESSION_KEY = 'inhouse_prototype_session_v1';

// ---------------------------------------------------------------
// DB layer
// ---------------------------------------------------------------
const DB = {
  data: null,
  load() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.meta && parsed.meta.version === DEFAULT_DB.meta.version) {
          this.data = parsed;
          return;
        }
        // Seed schema moved on (fields renamed/restructured) — cached data from an older
        // version would throw mid-render (e.g. reading .map on a field that no longer
        // exists), so reset instead of trying to migrate it in this prototype.
      } catch (e) { /* fall through to reset */ }
    }
    this.reset();
  },
  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
    this.save();
  },
  save() {
    localStorage.setItem(LS_KEY, JSON.stringify(this.data));
  },
};

// Mock outbox — stands in for nodemailer's console-log fallback when SMTP_HOST is unset.
const Outbox = {
  key: 'inhouse_prototype_outbox_v1',
  list() {
    try { return JSON.parse(sessionStorage.getItem(this.key)) || []; } catch (e) { return []; }
  },
  send(to, subject, body) {
    const items = this.list();
    items.unshift({ to, subject, body, sentAt: new Date().toISOString() });
    sessionStorage.setItem(this.key, JSON.stringify(items.slice(0, 50)));
  },
};

// ---------------------------------------------------------------
// Session (simulates server-side session cookie)
// ---------------------------------------------------------------
const Session = {
  get() {
    try { return JSON.parse(sessionStorage.getItem(SS_SESSION_KEY)); } catch (e) { return null; }
  },
  set(obj) { sessionStorage.setItem(SS_SESSION_KEY, JSON.stringify(obj)); },
  clear() { sessionStorage.removeItem(SS_SESSION_KEY); },
  currentUser() {
    const s = this.get();
    if (!s) return null;
    return DB.data.users.find(u => u.username === s.username) || null;
  },
};

// ---------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------
function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(d) { return d ? d.slice(0, 10) : ''; }
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}
function byId(arr, id) { return arr.find(x => x.id === id); }
function genRandomPassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

function h(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + (values[i] !== undefined ? values[i] : ''), '');
}

// ---------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------
function toast(msg, type) {
  const host = document.getElementById('toast-host');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ---------------------------------------------------------------
// Modal system
// ---------------------------------------------------------------
const Modal = {
  stack: [],
  open(innerHtml, opts) {
    opts = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.modalId = uid('modal');
    overlay.innerHTML = `<div class="modal ${opts.wide ? 'modal-wide' : ''} ${opts.xwide ? 'modal-xwide' : ''}">${innerHtml}</div>`;
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && !opts.persistent) Modal.close(overlay.dataset.modalId); });
    document.getElementById('modal-root').appendChild(overlay);
    this.stack.push(overlay.dataset.modalId);
    return overlay.dataset.modalId;
  },
  close(id) {
    const root = document.getElementById('modal-root');
    const sel = id ? `[data-modal-id="${id}"]` : '.modal-overlay:last-child';
    const el = root.querySelector(sel);
    if (el) el.remove();
    this.stack = this.stack.filter(x => x !== id);
  },
  closeAll() {
    document.getElementById('modal-root').innerHTML = '';
    this.stack = [];
  },
};
function modalHeader(title, modalId) {
  return `<div class="modal-header"><h3>${escapeHtml(title)}</h3><div class="modal-close" onclick="Modal.close('${modalId}')">&times;</div></div>`;
}
function pageFooter(href, label) {
  return `<div class="page-footer"><button class="btn" onclick="nav('${href}')">${escapeHtml(label)}</button></div>`;
}

// ---------------------------------------------------------------
// Rich text editing toolbar — a lightweight formatting bar (bold/italic/
// underline, font size, lists, alignment) over a contenteditable div, used
// anywhere KM content is edited in place. Uses document.execCommand, which
// is deprecated but still broadly supported in Chromium and more than
// sufficient for a prototype's freeform content fields.
// ---------------------------------------------------------------
// 8–144, matching common word-processor size steps rather than every integer — the picker
// (see toggleRteSizeMenu) caps its visible list to ~10 rows and scrolls for the rest.
const RTE_FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96, 108, 120, 132, 144];
function richToolbarHtml(editorId) {
  return `
    <div class="rte-toolbar">
      <div class="rte-group">
        <select class="rte-select" title="Heading" onchange="rteFormatBlock('${editorId}',this.value);this.value=''">
          <option value="">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Bold" onclick="rteExec('${editorId}','bold')"><b>B</b></button>
        <button type="button" class="rte-btn" title="Italic" onclick="rteExec('${editorId}','italic')"><i>I</i></button>
        <button type="button" class="rte-btn" title="Underline" onclick="rteExec('${editorId}','underline')"><u>U</u></button>
        <button type="button" class="rte-btn" title="Strikethrough" onclick="rteExec('${editorId}','strikeThrough')"><s>S</s></button>
      </div>
      <div class="rte-group" style="position:relative">
        <button type="button" class="rte-btn" title="Font size (8–144)" onclick="toggleRteSizeMenu(event,'${editorId}')">Size ▾</button>
        <div class="rte-size-menu hidden" id="rte-size-menu-${editorId}">
          ${RTE_FONT_SIZES.map(sz => `<div class="rte-size-option" onclick="rteSetFontSize('${editorId}',${sz})">${sz}px</div>`).join('')}
        </div>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Bullet list" onclick="rteExec('${editorId}','insertUnorderedList')">• List</button>
        <button type="button" class="rte-btn" title="Numbered list" onclick="rteExec('${editorId}','insertOrderedList')">1. List</button>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Align left" onclick="rteExec('${editorId}','justifyLeft')">⇤</button>
        <button type="button" class="rte-btn" title="Align center" onclick="rteExec('${editorId}','justifyCenter')">≡</button>
        <button type="button" class="rte-btn" title="Align right" onclick="rteExec('${editorId}','justifyRight')">⇥</button>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Insert 2-column layout" onclick="rteInsertColumns('${editorId}',2)">▥ 2-col</button>
        <button type="button" class="rte-btn" title="Insert 3-column layout" onclick="rteInsertColumns('${editorId}',3)">▦ 3-col</button>
        <label class="rte-btn" title="Insert image" style="cursor:pointer;display:inline-flex;align-items:center">🖼<input type="file" accept="image/*" class="hidden" onchange="rteInsertImage('${editorId}',event)"></label>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Insert row above" onclick="rteInsertRow('${editorId}','above')">⬆▤</button>
        <button type="button" class="rte-btn" title="Insert row below" onclick="rteInsertRow('${editorId}','below')">⬇▤</button>
        <button type="button" class="rte-btn" title="Insert column left" onclick="rteInsertColumn('${editorId}','left')">⬅▥</button>
        <button type="button" class="rte-btn" title="Insert column right" onclick="rteInsertColumn('${editorId}','right')">➡▥</button>
        <button type="button" class="rte-btn" title="Delete row" onclick="rteDeleteRow('${editorId}')">▤⌫</button>
        <button type="button" class="rte-btn" title="Delete column" onclick="rteDeleteColumn('${editorId}')">▥⌫</button>
        <button type="button" class="rte-btn" title="Insert table" onclick="rteOpenInsertTableModal('${editorId}')">⊞</button>
      </div>
      <div class="rte-group">
        <button type="button" class="rte-btn" title="Clear formatting" onclick="rteExec('${editorId}','removeFormat')">Clear</button>
      </div>
    </div>
  `;
}
function rteExec(editorId, cmd, val) {
  const el = document.getElementById(editorId);
  if (!el) return;
  el.focus();
  document.execCommand(cmd, false, val || null);
}
function rteFormatBlock(editorId, tag) {
  if (!tag) return;
  rteExec(editorId, 'formatBlock', `<${tag}>`);
}
// document.execCommand('fontSize', ...) only accepts the legacy 1–7 scale, not real pixel
// sizes — the standard workaround is to apply size "7" (the only value guaranteed to produce
// a single easily-selectable wrapper) then swap that wrapper's presentational size attribute
// for a real `font-size: Npx` style.
function rteSetFontSize(editorId, px) {
  const el = document.getElementById(editorId);
  if (!el) return;
  el.focus();
  document.execCommand('fontSize', false, '7');
  el.querySelectorAll('font[size="7"]').forEach(f => {
    f.removeAttribute('size');
    f.style.fontSize = px + 'px';
  });
  closeRteSizeMenu(editorId);
}
function toggleRteSizeMenu(event, editorId) {
  event.stopPropagation();
  const menu = document.getElementById('rte-size-menu-' + editorId);
  if (!menu) return;
  const opening = menu.classList.contains('hidden');
  document.querySelectorAll('.rte-size-menu').forEach(m => m.classList.add('hidden'));
  if (opening) {
    menu.classList.remove('hidden');
    setTimeout(() => document.addEventListener('click', function closeOnce() {
      closeRteSizeMenu(editorId);
      document.removeEventListener('click', closeOnce);
    }, { once: true }), 0);
  }
}
function closeRteSizeMenu(editorId) {
  const menu = document.getElementById('rte-size-menu-' + editorId);
  if (menu) menu.classList.add('hidden');
}
function rteInsertColumns(editorId, count) {
  const el = document.getElementById(editorId);
  if (!el) return;
  el.focus();
  const cols = Array.from({ length: count }, (_, i) => `<div style="flex:1;min-width:0"><p>Column ${i + 1}</p></div>`).join('');
  document.execCommand('insertHTML', false, `<div style="display:flex;gap:16px;margin:8px 0">${cols}</div><p><br></p>`);
}
function rteOpenInsertTableModal(editorId) {
  const mid = Modal.open(`
    ${modalHeader('Insert Table', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Rows (including header)</label><input id="rte-table-rows" type="number" min="1" value="3"></div>
        <div class="field"><label>Columns</label><input id="rte-table-cols" type="number" min="1" value="3"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="rteInsertTable('${editorId}')">Insert</button></div>
  `);
  wireCancel(mid);
  document.getElementById('rte-table-rows').focus();
}
function rteInsertTable(editorId) {
  const rows = Math.max(1, parseInt(document.getElementById('rte-table-rows').value, 10) || 3);
  const cols = Math.max(1, parseInt(document.getElementById('rte-table-cols').value, 10) || 3);
  const el = document.getElementById(editorId);
  Modal.closeAll();
  if (!el) return;
  el.focus();
  let html = '<table class="rte-table"><tbody>';
  html += '<tr>' + Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join('') + '</tr>';
  for (let r = 1; r < rows; r++) html += '<tr>' + '<td>&nbsp;</td>'.repeat(cols) + '</tr>';
  html += '</tbody></table><p><br></p>';
  document.execCommand('insertHTML', false, html);
}
// Word-style row/column insert & delete, acting on whichever cell the user last clicked or
// focused inside ANY rte-editor (tracked below via delegated listeners on document, since
// editors are (re)rendered as HTML strings rather than built with addEventListener wiring).
let RTE_ACTIVE_CELL = null;
function rteTrackActiveCell(e) {
  const cell = e.target.closest && e.target.closest('.rte-editor td, .rte-editor th');
  if (cell) RTE_ACTIVE_CELL = cell;
}
document.addEventListener('click', rteTrackActiveCell);
document.addEventListener('focusin', rteTrackActiveCell);
// Resolves the cell to operate on: the last tracked cell if it's still part of THIS editor,
// otherwise (per spec) falls back to the last row / last column — i.e. the bottom-right cell
// of the editor's most recently inserted table, since that's simultaneously "the last row"
// and "the last column".
function rteResolveActiveCell(editorId) {
  const editorEl = document.getElementById(editorId);
  if (!editorEl) return null;
  if (RTE_ACTIVE_CELL && editorEl.contains(RTE_ACTIVE_CELL)) return RTE_ACTIVE_CELL;
  const tables = editorEl.querySelectorAll('table');
  if (!tables.length) return null;
  const table = tables[tables.length - 1];
  const rows = table.querySelectorAll('tr');
  if (!rows.length) return null;
  const lastRow = rows[rows.length - 1];
  const cells = lastRow.querySelectorAll('td, th');
  return cells.length ? cells[cells.length - 1] : null;
}
function rteIsHeaderRow(row) { return !!row.querySelector('th'); }
function rteInsertRow(editorId, position) {
  const cell = rteResolveActiveCell(editorId);
  if (!cell) { toast('No table to edit — insert one first.', 'error'); return; }
  const row = cell.closest('tr');
  const cellCount = row.children.length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < cellCount; i++) {
    const td = document.createElement('td');
    td.innerHTML = '&nbsp;';
    newRow.appendChild(td);
  }
  row.parentNode.insertBefore(newRow, position === 'above' ? row : row.nextSibling);
}
function rteInsertColumn(editorId, position) {
  const cell = rteResolveActiveCell(editorId);
  if (!cell) { toast('No table to edit — insert one first.', 'error'); return; }
  const table = cell.closest('table');
  const colIndex = Array.prototype.indexOf.call(cell.parentNode.children, cell);
  table.querySelectorAll('tr').forEach(r => {
    const refCell = r.children[colIndex];
    if (!refCell) return;
    const isHeader = rteIsHeaderRow(r);
    const newCell = document.createElement(isHeader ? 'th' : 'td');
    newCell.innerHTML = '&nbsp;';
    refCell.parentNode.insertBefore(newCell, position === 'left' ? refCell : refCell.nextSibling);
  });
}
function rteDeleteRow(editorId) {
  const cell = rteResolveActiveCell(editorId);
  if (!cell) { toast('No table to edit.', 'error'); return; }
  const row = cell.closest('tr');
  if (row.parentNode.children.length <= 1) { toast('Cannot delete the table’s last remaining row.', 'error'); return; }
  row.remove();
}
function rteDeleteColumn(editorId) {
  const cell = rteResolveActiveCell(editorId);
  if (!cell) { toast('No table to edit.', 'error'); return; }
  const table = cell.closest('table');
  const colIndex = Array.prototype.indexOf.call(cell.parentNode.children, cell);
  const rows = table.querySelectorAll('tr');
  if (rows[0].children.length <= 1) { toast('Cannot delete the table’s last remaining column.', 'error'); return; }
  rows.forEach(r => { if (r.children[colIndex]) r.children[colIndex].remove(); });
}
function rteInsertImage(editorId, event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const el = document.getElementById(editorId);
    if (!el) return;
    el.focus();
    document.execCommand('insertImage', false, reader.result);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ---------------------------------------------------------------
// Theme engine — HSL adjustment utility
// ---------------------------------------------------------------
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h1 = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h1 = ((g - b) / d) % 6; break;
      case g: h1 = (b - r) / d + 2; break;
      case b: h1 = (r - g) / d + 4; break;
    }
    h1 *= 60;
    if (h1 < 0) h1 += 360;
  }
  return { h: h1, s: s * 100, l: l * 100 };
}
function hslToHex(h1, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h1 / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h1 < 60) [r, g, b] = [c, x, 0];
  else if (h1 < 120) [r, g, b] = [x, c, 0];
  else if (h1 < 180) [r, g, b] = [0, c, x];
  else if (h1 < 240) [r, g, b] = [0, x, c];
  else if (h1 < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).clamp0255().toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
Number.prototype.clamp0255 = function () { return Math.max(0, Math.min(255, this)); };

function darkenHex(hex, pct) {
  const { h: h1, s, l } = hexToHsl(hex);
  return hslToHex(h1, s, l * (1 - pct / 100));
}
function lightenHex(hex, pct) {
  const { h: h1, s, l } = hexToHsl(hex);
  const nl = Math.min(100, l + (100 - l) * (pct / 100));
  return hslToHex(h1, s, nl);
}

function computeAccentTokens(mode, baseHex) {
  if (mode === 'light') {
    return { button: darkenHex(baseHex, 40), text: darkenHex(baseHex, 70) };
  }
  // dim & dark share the same formula
  return { button: lightenHex(baseHex, 60), text: lightenHex(baseHex, 100) };
}

function applyTheme(mode, accentHex, persist) {
  document.documentElement.setAttribute('data-mode', mode);
  const tokens = computeAccentTokens(mode, accentHex);
  document.documentElement.style.setProperty('--accent-base', accentHex);
  document.documentElement.style.setProperty('--accent-button', tokens.button);
  document.documentElement.style.setProperty('--accent-text', tokens.text);
  // Header always uses the raw accent color for its text, with a background tinted 80%
  // lighter — a fixed, mode-independent treatment (unlike the button/text formulas above,
  // which differ between light and dark/dim).
  document.documentElement.style.setProperty('--header-bg', lightenHex(accentHex, 80));
  document.documentElement.style.setProperty('--header-border', lightenHex(accentHex, 65));
  document.documentElement.style.setProperty('--header-text', accentHex);
  if (persist !== false) {
    const user = Session.currentUser();
    if (user) {
      DB.data.userThemePrefs[user.username] = { mode, accent: accentHex };
      DB.save();
    }
  }
}
function loadThemeForCurrentUser() {
  const user = Session.currentUser();
  const pref = (user && DB.data.userThemePrefs[user.username]) || { mode: 'dark', accent: '#2f81f7' };
  applyTheme(pref.mode, pref.accent, false);
}

// ---------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------
function userGroup(user) { return user ? byId(DB.data.userGroups, user.groupId) : null; }
function hasPerm(user, category, fnId) {
  if (!user) return false;
  const gp = DB.data.groupPermissions[user.groupId];
  return !!(gp && gp[category] && gp[category].includes(fnId));
}
function isAdmin(user) { return user && user.groupId === 'grp-admin'; }

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------
function nav(hash) { window.location.hash = hash; }
function currentRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/login';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, query: new URLSearchParams(query || '') };
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  DB.load();
  route();
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
});

// Captured at the top of every route() so renderKmShell() can put the sidebar (and the
// window) back where the user was before whatever triggered this re-render — see there.
let PENDING_KM_SCROLL_RESTORE = null;
function route() {
  const kmSidebarEl = document.querySelector('.km-sidebar');
  PENDING_KM_SCROLL_RESTORE = kmSidebarEl ? { windowY: window.scrollY, sidebarY: kmSidebarEl.scrollTop } : null;

  const session = Session.get();
  const { parts } = currentRoute();
  const top = parts[0] || 'login';

  if (!session) {
    if (top !== 'login') { nav('#/login'); return; }
    renderLogin();
    return;
  }

  const user = Session.currentUser();
  if (!user || user.status !== 'active') {
    Session.clear();
    nav('#/login');
    return;
  }

  loadThemeForCurrentUser();

  if (user.mustChangePassword && top !== 'force-change-password') {
    nav('#/force-change-password');
    return;
  }
  if (!user.mustChangePassword && top === 'force-change-password') {
    nav('#/landing');
    return;
  }

  if (top === 'force-change-password') { renderForceChangePassword(); return; }
  if (top === 'landing' || !top) {
    if (window.KM_ONLY_MODE) { nav('#/km'); return; }
    renderShell(renderLanding, { crumbs: [['Home', null]] });
    return;
  }
  if (top === 'km') { renderKmRoute(parts); return; }
  if (top === 'engagement') {
    if (window.KM_ONLY_MODE) { nav('#/km'); return; }
    renderEngagementRoute(parts);
    return;
  }
  if (top === 'settings') {
    if (!isAdmin(user)) { toast('Admin access required.', 'error'); nav('#/landing'); return; }
    renderShell(renderSettings, { crumbs: [['Home', '#/landing'], ['Settings', null]] });
    return;
  }
  if (top === 'templates') {
    if (!hasPerm(user, 'program', 'fn-eng-template-manage')) { toast('You do not have access to Template Configuration.', 'error'); nav('#/landing'); return; }
    renderShell(renderTemplatesPage, { crumbs: [['Home', '#/landing'], ['Template Configuration', null]] });
    return;
  }
  if (top === 'users') {
    if (!isAdmin(user)) { toast('Admin access required.', 'error'); nav('#/landing'); return; }
    if (parts[1] === 'group' && parts[2]) {
      CURRENT_GROUP_ID = parts[2];
      const group = byId(DB.data.userGroups, parts[2]);
      renderShell(renderUserGroupWorkspace, { crumbs: [['Home', '#/landing'], ['User Management', '#/users'], [group?.name || 'Group', null]] });
      return;
    }
    renderShell(renderUsers, { crumbs: [['Home', '#/landing'], ['User Management', null]] });
    return;
  }
  nav('#/landing');
}

// ---------------------------------------------------------------
// Back / Forward — a lightweight "recent pages" stack independent of the browser's own
// history (nav() already pushes real browser history entries too, but these buttons give a
// visible, always-in-the-topbar way to retrace steps without hunting for the browser's own
// back button). Every renderShell() call records the page that just rendered; navHistoryBack/
// Forward move the pointer and re-nav() with NAV_HISTORY_SUPPRESS set so that replay doesn't
// grow the stack or clobber the entries ahead of it.
// ---------------------------------------------------------------
let NAV_HISTORY = [];
let NAV_HISTORY_POS = -1;
let NAV_HISTORY_SUPPRESS = false;
function resetNavHistory() { NAV_HISTORY = []; NAV_HISTORY_POS = -1; }
function pushNavHistoryEntry(hash, label) {
  if (NAV_HISTORY_SUPPRESS) { NAV_HISTORY_SUPPRESS = false; }
  if (NAV_HISTORY_POS >= 0 && NAV_HISTORY[NAV_HISTORY_POS].hash === hash) {
    NAV_HISTORY[NAV_HISTORY_POS].label = label;
    return;
  }
  NAV_HISTORY = NAV_HISTORY.slice(0, NAV_HISTORY_POS + 1);
  NAV_HISTORY.push({ hash, label });
  NAV_HISTORY_POS = NAV_HISTORY.length - 1;
}
function navHistoryBack() {
  if (NAV_HISTORY_POS <= 0) return;
  NAV_HISTORY_POS--;
  NAV_HISTORY_SUPPRESS = true;
  nav(NAV_HISTORY[NAV_HISTORY_POS].hash);
}
function navHistoryForward() {
  if (NAV_HISTORY_POS >= NAV_HISTORY.length - 1) return;
  NAV_HISTORY_POS++;
  NAV_HISTORY_SUPPRESS = true;
  nav(NAV_HISTORY[NAV_HISTORY_POS].hash);
}
function navHistoryButtonsHtml() {
  const canBack = NAV_HISTORY_POS > 0;
  const canForward = NAV_HISTORY_POS < NAV_HISTORY.length - 1;
  const backLabel = canBack ? NAV_HISTORY[NAV_HISTORY_POS - 1].label : '';
  const fwdLabel = canForward ? NAV_HISTORY[NAV_HISTORY_POS + 1].label : '';
  return `
    <button class="btn btn-sm btn-icon nav-history-btn" title="${canBack ? 'Back to ' + escapeHtml(backLabel) : 'Back'}" ${canBack ? '' : 'disabled'} onclick="navHistoryBack()">◀</button>
    <button class="btn btn-sm btn-icon nav-history-btn" title="${canForward ? 'Forward to ' + escapeHtml(fwdLabel) : 'Forward'}" ${canForward ? '' : 'disabled'} onclick="navHistoryForward()">▶</button>
  `;
}

// ---------------------------------------------------------------
// App shell (topbar + main content mount)
// ---------------------------------------------------------------
function renderShell(pageFn, opts) {
  const user = Session.currentUser();
  const root = document.getElementById('app-root');
  const crumbsHtml = (opts.crumbs || []).map(([label, href], i, arr) => {
    const isLast = i === arr.length - 1;
    return (isLast || !href)
      ? `<span class="crumb current">${escapeHtml(label)}</span>`
      : `<span class="crumb" onclick="nav('${href}')">${escapeHtml(label)}</span><span class="crumb-sep">/</span>`;
  }).join('');
  const currentLabel = (opts.crumbs && opts.crumbs.length) ? opts.crumbs[opts.crumbs.length - 1][0] : '';
  pushNavHistoryEntry(window.location.hash, currentLabel);

  root.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="nav-history-group">${navHistoryButtonsHtml()}</div>
        <span class="brand" onclick="nav('${window.KM_ONLY_MODE ? '#/km' : '#/landing'}')">Inhouse Application</span>
        <span class="crumb-sep">/</span>
        ${crumbsHtml}
        <div class="topbar-right">
          <span class="role-badge">${escapeHtml(userGroup(user)?.name || '')} · ${escapeHtml(user.username)}</span>
          ${isAdmin(user) ? `<button class="btn btn-sm" onclick="nav('#/users')">Users</button>` : ''}
          ${hasPerm(user, 'program', 'fn-eng-template-manage') ? `<button class="btn btn-sm" onclick="nav('#/templates')">Templates</button>` : ''}
          ${isAdmin(user) ? `<button class="btn btn-sm" onclick="nav('#/settings')">Settings</button>` : ''}
          <button class="btn btn-sm btn-icon" title="Outbox (mock email)" onclick="openOutboxModal()">✉</button>
          <button class="btn btn-sm btn-icon" title="Theme" onclick="toggleThemePop()">🎨</button>
          <div id="theme-pop-anchor"></div>
          <button class="btn btn-sm" onclick="doLogout()">Logout</button>
        </div>
      </div>
      <div class="main" id="main-content"></div>
    </div>
    <div id="toast-host" class="toast-host"></div>
  `;
  pageFn(document.getElementById('main-content'));
}

function toggleThemePop() {
  const anchor = document.getElementById('theme-pop-anchor');
  if (anchor.querySelector('.theme-pop')) { anchor.innerHTML = ''; return; }
  const user = Session.currentUser();
  const pref = DB.data.userThemePrefs[user.username] || { mode: 'dark', accent: '#2f81f7' };
  anchor.innerHTML = `
    <div class="theme-pop" onclick="event.stopPropagation()">
      <h4>Mode</h4>
      <div class="mode-row">
        ${['light', 'dim', 'dark'].map(m => `<button class="btn btn-sm ${pref.mode === m ? 'active' : ''}" onclick="setThemeMode('${m}')">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
      </div>
      <h4>Accent Color</h4>
      <div class="color-row">
        <input type="color" id="accent-color-input" value="${pref.accent}" onchange="setThemeAccent(this.value)">
        <input type="text" id="accent-hex-input" value="${pref.accent}" onchange="setThemeAccent(this.value)">
      </div>
    </div>
  `;
  // Defer attaching the outside-click listener until after this click finishes bubbling —
  // otherwise the very click that opens the popover (still bubbling up to document) would
  // immediately trigger it closed again before the user ever sees it.
  setTimeout(() => {
    document.addEventListener('click', function closeOnce() {
      anchor.innerHTML = '';
      document.removeEventListener('click', closeOnce);
    }, { once: true });
  }, 0);
}
function setThemeMode(mode) {
  const user = Session.currentUser();
  const pref = DB.data.userThemePrefs[user.username] || { mode: 'dark', accent: '#2f81f7' };
  applyTheme(mode, pref.accent);
  toggleThemePop(); toggleThemePop();
}
function setThemeAccent(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { toast('Enter a valid hex color, e.g. #2f81f7', 'error'); return; }
  const user = Session.currentUser();
  const pref = DB.data.userThemePrefs[user.username] || { mode: 'dark', accent: '#2f81f7' };
  applyTheme(pref.mode, hex);
  // Keep the swatch and hex text field in sync with each other, whichever one was edited.
  const colorInput = document.getElementById('accent-color-input');
  const hexInput = document.getElementById('accent-hex-input');
  if (colorInput) colorInput.value = hex;
  if (hexInput) hexInput.value = hex;
}

function doLogout() {
  Session.clear();
  resetNavHistory();
  nav('#/login');
}

function openOutboxModal() {
  const items = Outbox.list();
  const id = Modal.open(`
    ${modalHeader('Mock Outbox (SMTP_HOST not set — emails log here instead)', '')}
    <div class="modal-body">
      ${items.length === 0 ? '<div class="empty-state">No emails sent yet.</div>' : items.map(it => `
        <div class="template-item">
          <div class="tname">To: ${escapeHtml(it.to)} — ${escapeHtml(it.subject)}</div>
          <div class="subtle" style="font-size:11px;margin-bottom:6px">${fmtDateTime(it.sentAt)}</div>
          <pre>${escapeHtml(it.body)}</pre>
        </div>
      `).join('')}
    </div>
    <div class="modal-footer"><button class="btn" onclick="Modal.closeAll()">Close</button></div>
  `, { wide: true });
}

// ===================================================================
// LOGIN / FORGOT PASSWORD / FORCE CHANGE PASSWORD
// ===================================================================
function renderLogin(root) {
  root = root || document.getElementById('app-root');
  root.innerHTML = `
    <div class="login-shell">
      <div class="login-card">
        <div class="login-logo">CARRIER ENGAGEMENT</div>
        <div class="login-title">Inhouse Application</div>
        <div class="login-sub">Sign in with your team account</div>
        <div id="login-error"></div>
        <form onsubmit="return handleLogin(event)">
          <div class="field"><label>Username</label><input id="login-username" autocomplete="username" required></div>
          <div class="field"><label>Password</label><input id="login-password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-full" type="submit">Sign In</button>
        </form>
        <div class="login-footer-link"><a href="#" onclick="openForgotPasswordModal();return false;">Forgot password?</a></div>
        <div class="demo-users">
          <div><b>Demo accounts</b> (password = username + 123)</div>
          <div>admin / admin123 — Admin (full access)</div>
          <div>member / member123 — Members (KM + Engagement edit)</div>
          <div>viewer / viewer123 — User (view only)</div>
        </div>
      </div>
    </div>
    <div id="toast-host" class="toast-host"></div>
  `;
}

let loginAttempts = {};
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const now = Date.now();
  const rec = loginAttempts[username] || { count: 0, resetAt: now + 60000 };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 60000; }
  if (rec.count >= 5) {
    document.getElementById('login-error').innerHTML = `<div class="login-error">Too many attempts. Try again in a minute. (rate-limited)</div>`;
    return false;
  }

  const user = DB.data.users.find(u => u.username === username);
  if (!user || user.password !== password || user.status !== 'active') {
    rec.count++; loginAttempts[username] = rec;
    document.getElementById('login-error').innerHTML = `<div class="login-error">Invalid username or password.</div>`;
    return false;
  }
  loginAttempts[username] = { count: 0, resetAt: now + 60000 };
  Session.set({ username: user.username });
  resetNavHistory();
  DB.data.auditLog.unshift({ id: uid('audit'), timestamp: new Date().toISOString(), username: user.username, action: 'Login', details: 'Successful login' });
  DB.save();
  nav('#/landing');
  return false;
}

let forgotPasswordAttempts = { count: 0, resetAt: 0 };
function openForgotPasswordModal() {
  Modal.open(`
    ${modalHeader('Forgot Password', '')}
    <div class="modal-body">
      <p class="muted" style="margin-bottom:12px">Enter your registered email. We'll generate a temporary password and email it to you.</p>
      <div class="field"><label>Email</label><input id="fp-email" type="email" required></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="Modal.closeAll()">Cancel</button>
      <button class="btn btn-primary" onclick="handleForgotPassword()">Send Temporary Password</button>
    </div>
  `);
}
function handleForgotPassword() {
  const now = Date.now();
  if (now > forgotPasswordAttempts.resetAt) forgotPasswordAttempts = { count: 0, resetAt: now + 60000 };
  if (forgotPasswordAttempts.count >= 3) { toast('Too many requests. Try again shortly.', 'error'); return; }
  forgotPasswordAttempts.count++;

  const email = document.getElementById('fp-email').value.trim().toLowerCase();
  const user = DB.data.users.find(u => u.email.toLowerCase() === email);
  // Always show the same confirmation regardless of match, to avoid leaking which emails are registered.
  if (user) {
    const temp = genRandomPassword();
    user.password = temp; // prototype stand-in for a hashed temp password
    user.mustChangePassword = true;
    DB.save();
    Outbox.send(user.email, 'Your temporary password', `A password reset was requested for your account (${user.username}).\n\nTemporary password: ${temp}\n\nYou will be required to change it on next login.`);
  }
  Modal.closeAll();
  toast('If that email is registered, a temporary password has been sent. Check the Outbox (✉) for this demo.');
}

function renderForceChangePassword() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="force-shell">
      <div class="login-card">
        <div class="login-title">Change Your Password</div>
        <div class="login-sub">A password change is required before you can continue.</div>
        <div id="fcp-error"></div>
        <form onsubmit="return handleForceChangePassword(event)">
          <div class="field"><label>New Password</label><input id="fcp-new" type="password" minlength="6" required></div>
          <div class="field"><label>Confirm New Password</label><input id="fcp-confirm" type="password" minlength="6" required></div>
          <button class="btn btn-primary btn-full" type="submit">Change Password &amp; Continue</button>
        </form>
      </div>
    </div>
    <div id="toast-host" class="toast-host"></div>
  `;
}
function handleForceChangePassword(e) {
  e.preventDefault();
  const p1 = document.getElementById('fcp-new').value;
  const p2 = document.getElementById('fcp-confirm').value;
  if (p1 !== p2) { document.getElementById('fcp-error').innerHTML = `<div class="login-error">Passwords do not match.</div>`; return false; }
  const user = Session.currentUser();
  user.password = p1;
  user.mustChangePassword = false;
  DB.save();
  toast('Password changed.');
  nav('#/landing');
  return false;
}

// ===================================================================
// LANDING PAGE
// ===================================================================
function renderLanding(main) {
  const user = Session.currentUser();
  const welcomeTitle = user ? `Welcome back ${escapeHtml(user.name)} ${escapeHtml(user.surname.charAt(0))}.!` : 'Welcome back';
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">${welcomeTitle}</div><div class="page-sub">Choose a site to continue</div></div>
    </div>
    <div class="site-grid">
      ${DB.data.sites.map(site => `
        <div class="site-card" onclick="nav('#/${site.key === 'km' ? 'km' : 'engagement'}')">
          <div class="icon">${site.key === 'km' ? '📚' : '📊'}</div>
          <div class="name">${escapeHtml(site.name)}</div>
          <div class="desc">${escapeHtml(site.description)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===================================================================
// SHARED: Country > Project browser (used by both KM and Engagement)
// ===================================================================
function renderProjectBrowser(basePath) {
  const groups = {};
  DB.data.projects.forEach(p => { (groups[p.countryId] ||= []).push(p); });
  return DB.data.countries.map(country => {
    const projects = groups[country.id] || [];
    if (!projects.length) return '';
    return `
      <div class="country-group">
        <div class="country-heading">${escapeHtml(country.name)}</div>
        <div class="project-grid">
          ${projects.map(p => `
            <div class="project-card" onclick="nav('${basePath}/project/${p.id}')">
              <div class="name">${escapeHtml(p.name)}</div>
              <div class="meta">View project</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ===================================================================
// KM SITE
// ===================================================================
let CURRENT_KM_PROJECT_ID = null;
let CURRENT_KM_DATA_ID = null;
let CURRENT_KM_DATA_TAB = 'documents';
let CURRENT_KM_GENERAL_NODE_ID = null;
// Which sidebar groups ('general', 'project:<id>') are expanded — persists across navigation
// within the session so re-visiting a page doesn't collapse everything the user opened.
let KM_SIDEBAR_EXPANDED = new Set();
// Node currently selected for editing via the shared Edit Structure toolbar (see
// renderTocEditToolbar) — set by clicking a topic row while TOC_STRUCTURE_EDIT_MODE is on.
let TOC_SELECTED_NODE_ID = null;

function renderKmRoute(parts) {
  // parts: ['km'] | ['km','general'] | ['km','general',nodeId] | ['km','project',id] | ['km','data',id]
  if (parts[1] === 'general') {
    CURRENT_KM_GENERAL_NODE_ID = parts[2] || null;
    renderShell(renderKmGeneral, { crumbs: [['Home', '#/landing'], ['Knowledge Management', '#/km'], ['General Information', null]] });
    return;
  }
  if (parts[1] === 'project' && parts[2]) {
    CURRENT_KM_PROJECT_ID = parts[2];
    CURRENT_TOC_SCOPE = 'project';
    const project = byId(DB.data.projects, parts[2]);
    renderShell(renderKmProject, { crumbs: [['Home', '#/landing'], ['Knowledge Management', '#/km'], [project?.name || 'Project', null]] });
    return;
  }
  if (parts[1] === 'data' && parts[2]) {
    CURRENT_KM_DATA_ID = parts[2];
    CURRENT_TOC_SCOPE = 'project';
    const entry = byId(DB.data.kmDataEntries, parts[2]);
    const project = entry && byId(DB.data.projects, entry.projectId);
    renderShell(renderKmDataEntry, {
      crumbs: [['Home', '#/landing'], ['Knowledge Management', '#/km'],
        [project?.name || 'Project', `#/km/project/${project?.id}`], [entry?.title || 'Data', null]],
    });
    return;
  }
  if (parts[1] === 'toc' && parts[2] && parts[3]) {
    // The sidebar now lists every project's tree at once (see renderKmSidebar), so a leaf can
    // be clicked directly from KM home or General Info without ever visiting the project page
    // first — CURRENT_TOC_SCOPE must be set to 'project' HERE, before the findTocNode() call
    // right below, or it stays whatever scope the user was last on (e.g. 'general') and this
    // Thailand-tree lookup silently searches the wrong tree, returns null, and crashes/blanks.
    CURRENT_KM_PROJECT_ID = parts[2];
    CURRENT_TOC_NODE_ID = parts[3];
    CURRENT_TOC_SCOPE = 'project';
    const project = byId(DB.data.projects, parts[2]);
    const node = findTocNode(parts[3]);
    renderShell(renderKmTocPage, {
      crumbs: [['Home', '#/landing'], ['Knowledge Management', '#/km'],
        [project?.name || 'Project', `#/km/project/${parts[2]}`], [node?.title || 'Page', null]],
    });
    return;
  }
  renderShell(renderKmHome, { crumbs: [['Home', '#/landing'], ['Knowledge Management', null]] });
}

function renderKmHome(main) {
  const canImport = canEditKm('fn-km-project-edit');
  const headerExtra = `
    <div class="btn-group">
      <button class="btn btn-sm" onclick="exportKmPdf()">📤 Export PDF</button>
      ${canImport ? `<button class="btn btn-sm" onclick="openKmImportModal()">📥 Import PDF</button>` : ''}
    </div>
  `;
  const rightHtml = `
    <div class="panel clickable-box" onclick="nav('#/km/general')" style="display:flex;align-items:center;gap:14px;">
      <div style="font-size:26px">ℹ️</div>
      <div>
        <div class="panel-title" style="margin-bottom:2px">General Information</div>
        <div class="muted" style="font-size:12px">Contacts, credentials, follow-up guideline, meeting procedure, team cooperation</div>
      </div>
    </div>
    <div class="empty-state" style="text-align:left;padding:20px 4px">Pick a project from the sidebar to browse its background, data entries and checklists.</div>
  `;
  renderKmShell(main, {
    title: 'Knowledge Management', sub: 'Site-wide reference information and per-project engagement knowledge',
    headerExtra, pageScope: 'home',
  }, rightHtml);
}

// ===================================================================
// KM shared shell — one persistent sidebar (General Information + every project, each with its
// own expand/collapse-able TOC tree) used on every KM page, plus the page-header/workspace/
// footer wrapper. Replaces the old per-page bespoke sidebars (General had its own, each Project
// page had its own showing only that project's tree) with a single navigable structure so users
// can jump between projects/topics without going back to the KM home page first.
// ===================================================================
function renderKmShell(main, opts, rightHtml) {
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">${escapeHtml(opts.title)}</div><div class="page-sub">${escapeHtml(opts.sub || '')}</div></div>
      ${opts.headerExtra || ''}
    </div>
    <div class="km-shell">
      <div class="km-sidebar">${renderKmSidebar(opts.pageScope, opts.activeProjectId, opts.activeNodeId)}</div>
      <div class="km-workspace"${opts.workspaceId ? ` id="${opts.workspaceId}"` : ''}>${rightHtml || ''}</div>
    </div>
  `;
  // Clicking a topic (to select it for editing, or to view a different page) re-renders this
  // whole shell — without this, the rebuild would reset both the window and the sidebar's own
  // scroll back to the top, forcing the user to scroll back down to find where they just were.
  // route() captures the pre-render scroll into PENDING_KM_SCROLL_RESTORE; restore it here.
  if (PENDING_KM_SCROLL_RESTORE) {
    const { windowY, sidebarY } = PENDING_KM_SCROLL_RESTORE;
    const sidebarEl = main.querySelector('.km-sidebar');
    if (sidebarEl) sidebarEl.scrollTop = sidebarY;
    window.scrollTo(0, windowY);
    PENDING_KM_SCROLL_RESTORE = null;
  }
}

function toggleKmSidebarGroup(key, toggleEl) {
  const body = toggleEl.closest('.km-sidebar-project').querySelector(':scope > .km-sidebar-project-body');
  const collapsed = body.classList.toggle('hidden');
  toggleEl.textContent = collapsed ? '▸' : '▾';
  if (collapsed) KM_SIDEBAR_EXPANDED.delete(key); else KM_SIDEBAR_EXPANDED.add(key);
}

// pageScope tells the sidebar which group (if any) is "the page you're currently on" — only
// that group gets the Expand All/Collapse All/Edit Structure toolbar and keeps a stable,
// well-known tree id (#kmgen-toc-tree / #km-toc-tree) for those buttons and for deep-linked
// clicks to target; every other project is just a plain, independently expandable nav tree.
function renderKmSidebar(pageScope, activeProjectId, activeNodeId) {
  const isGeneralActive = pageScope === 'general';
  if (isGeneralActive) KM_SIDEBAR_EXPANDED.add('general');
  if (pageScope === 'project' && activeProjectId) KM_SIDEBAR_EXPANDED.add('project:' + activeProjectId);

  const genExpanded = KM_SIDEBAR_EXPANDED.has('general');
  const genActivePath = isGeneralActive && activeNodeId ? (findTocPath(activeNodeId, DB.data.kmGeneralTocTree) || []) : [];
  const generalHtml = `
    <div class="km-sidebar-project ${isGeneralActive ? 'km-sidebar-active-group' : ''}">
      <div class="km-sidebar-project-row">
        <span class="km-sidebar-chevron" onclick="toggleKmSidebarGroup('general', this)">${genExpanded ? '▾' : '▸'}</span>
        <span class="km-sidebar-project-name" onclick="nav('#/km/general')">ℹ️ General Information</span>
      </div>
      <div class="km-sidebar-project-body ${genExpanded ? '' : 'hidden'}">
        ${isGeneralActive ? `<div class="km-sidebar-sticky-header">${renderKmSidebarToolbar('general')}</div>` : ''}
        <div class="km-toc-tree" id="kmgen-toc-tree">${DB.data.kmGeneralTocTree.map(n => renderTocNodeHtml(n, null, isGeneralActive ? activeNodeId : null, genActivePath, isGeneralActive && TOC_STRUCTURE_EDIT_MODE, 'general')).join('')}</div>
      </div>
    </div>
  `;

  const groups = {};
  DB.data.projects.forEach(p => { (groups[p.countryId] ||= []).push(p); });
  const projectsHtml = DB.data.countries.map(country => {
    const projects = groups[country.id] || [];
    if (!projects.length) return '';
    return `
      <div class="km-sidebar-country">${escapeHtml(country.name)}</div>
      ${projects.map(p => {
        const key = 'project:' + p.id;
        const isActiveProject = pageScope === 'project' && p.id === activeProjectId;
        const expanded = KM_SIDEBAR_EXPANDED.has(key);
        const tree = DB.data.kmTocTrees[p.id] || [];
        const activePath = isActiveProject && activeNodeId ? (findTocPath(activeNodeId, tree) || []) : [];
        return `
          <div class="km-sidebar-project ${isActiveProject ? 'km-sidebar-active-group' : ''}">
            <div class="km-sidebar-project-row">
              <span class="km-sidebar-chevron" onclick="toggleKmSidebarGroup('${key}', this)">${expanded ? '▾' : '▸'}</span>
              <span class="km-sidebar-project-name" onclick="nav('#/km/project/${p.id}')">${escapeHtml(p.name)}</span>
            </div>
            <div class="km-sidebar-project-body ${expanded ? '' : 'hidden'}">
              <div class="km-sidebar-sticky-header">
                <div class="km-sidebar-bg-box ${isActiveProject && !activeNodeId ? 'active' : ''}" onclick="nav('#/km/project/${p.id}')">
                  <span style="font-size:15px">📘</span> Project Background &amp; Data Entries
                </div>
                ${isActiveProject ? renderKmSidebarToolbar('project') : ''}
              </div>
              <div class="km-toc-tree"${isActiveProject ? ' id="km-toc-tree"' : ''}>${tree.map(n => renderTocNodeHtml(n, p.id, isActiveProject ? activeNodeId : null, activePath, isActiveProject && TOC_STRUCTURE_EDIT_MODE, 'project')).join('')}</div>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }).join('');

  return `
    <div class="km-sidebar-title">Knowledge Base</div>
    ${generalHtml}
    <div class="km-sidebar-divider">Projects</div>
    ${projectsHtml}
  `;
}

// The Expand All / Collapse All / Edit Structure controls plus (while editing) the shared
// select-then-edit toolbar — shown only under whichever sidebar group is the current page.
function renderKmSidebarToolbar(scope) {
  const canManage = canEditKm(scope === 'general' ? 'fn-km-general-edit' : 'fn-km-project-edit');
  const expandFn = scope === 'general' ? 'kmGenExpandAll' : 'tocExpandAll';
  return `
    <div class="btn-group km-sidebar-toolbar" style="margin:6px 0;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="${expandFn}(false)">Expand All</button>
      <button class="btn btn-sm" onclick="${expandFn}(true)">Collapse All</button>
      ${canManage ? `<button class="btn btn-sm ${TOC_STRUCTURE_EDIT_MODE ? 'btn-primary' : ''}" onclick="toggleTocStructureEditMode()">${TOC_STRUCTURE_EDIT_MODE ? 'Done Editing' : '✎ Edit Structure'}</button>` : ''}
    </div>
    ${canManage && TOC_STRUCTURE_EDIT_MODE ? renderTocEditToolbar() : ''}
  `;
}

function renderTocEditToolbar() {
  const sel = TOC_SELECTED_NODE_ID;
  const ctx = sel ? findTocContext(sel) : null;
  const has = !!ctx;
  return `
    <div class="toc-edit-toolbar">
      <button class="toc-mbtn" title="${has ? 'Add sub-topic under selected' : 'Add topic'}" onclick="openTocNodeAddForm('${has ? sel : ''}')">+</button>
      <button class="toc-mbtn" title="Move up" ${has ? '' : 'disabled'} onclick="moveTocNodeUp('${sel || ''}')">▲</button>
      <button class="toc-mbtn" title="Move down" ${has ? '' : 'disabled'} onclick="moveTocNodeDown('${sel || ''}')">▼</button>
      <button class="toc-mbtn" title="Nest under previous topic" ${has ? '' : 'disabled'} onclick="indentTocNode('${sel || ''}')">⇥</button>
      <button class="toc-mbtn" title="Promote up a level" ${has ? '' : 'disabled'} onclick="outdentTocNode('${sel || ''}')">⇤</button>
      <button class="toc-mbtn" title="Edit title / deprecated" ${has ? '' : 'disabled'} onclick="openTocNodeEditForm('${sel || ''}')">✎</button>
      <button class="toc-mbtn toc-mbtn-danger" title="Delete" ${has ? '' : 'disabled'} onclick="deleteTocNode('${sel || ''}')">✕</button>
      <span class="toc-edit-toolbar-hint">${has ? 'Editing: ' + escapeHtml(ctx.node.title) : 'Click a topic below to edit it'}</span>
    </div>
  `;
}

function selectTocNode(nodeId) {
  TOC_SELECTED_NODE_ID = (TOC_SELECTED_NODE_ID === nodeId) ? null : nodeId;
  route();
}

// ===================================================================
// KM Export/Import (PDF) — renders human-readable content pages with jsPDF, then appends a
// final page that embeds the underlying KM data (kmGeneral/kmDataEntries/kmTocTrees/
// kmGeneralTocTree/kmTocPages) as Base64 JSON between plain-text markers. Import reads the
// PDF's text back out with pdf.js, recovers that block, and restores it — a real, working
// round trip, not just a one-way print. Credential passwords are redacted in the export.
// ===================================================================
const KM_PDF_DATA_START = '-----BEGIN KM DATA-----';
const KM_PDF_DATA_END = '-----END KM DATA-----';
function exportKmPdf() {
  if (!window.jspdf) { toast('PDF library unavailable (offline?).', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  function ensureSpace(lines) {
    if (y + lines * 12 > pageHeight - margin) { doc.addPage(); y = margin; }
  }
  function heading(text, size) {
    ensureSpace(2);
    doc.setFontSize(size || 13); doc.setFont(undefined, 'bold');
    doc.text(text, margin, y); y += (size || 13) + 6;
    doc.setFont(undefined, 'normal'); doc.setFontSize(9.5);
  }
  function para(text) {
    const lines = doc.splitTextToSize(String(text ?? '—'), maxWidth);
    ensureSpace(lines.length);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  }
  const g = DB.data.kmGeneral;
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text('Carrier Engagement — Knowledge Management Export', margin, y); y += 26;
  doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
  para('Generated ' + new Date().toISOString().slice(0, 10));

  heading('General Information — Internal Contacts');
  g.internalContacts.forEach(c => para(`${c.role}: ${c.name} — ${c.email} — ${c.phone}`));
  heading('General Information — External Contacts');
  g.externalContact.forEach(c => para(`${c.org}: ${c.name} — ${c.email} — ${c.phone}`));
  heading('URL & Username & Password (passwords redacted)');
  g.credentialsList.forEach(c => para(`${c.label}: ${c.url} (user: ${c.username})`));
  heading('Follow Up Guideline');
  para('KPI: ' + g.followUp.kpi);
  para('Internal: ' + g.followUp.internal);
  para('External: ' + g.followUp.external);
  heading('Meeting Procedure');
  para('Internal Meeting: ' + g.meeting.internalMeeting + ' | MOM: ' + g.meeting.internalMOM);
  para('External Meeting: ' + g.meeting.externalMeeting + ' | MOM: ' + g.meeting.externalMOM);
  heading('Relevant Team Cooperation');
  Object.entries(g.cooperation.internal).forEach(([k, v]) => para(`${k}: ${v}`));
  para('Host Information: ' + g.cooperation.external.hostInformation);

  DB.data.projects.forEach(project => {
    doc.addPage(); y = margin;
    heading(project.name, 16);
    para(project.background.replace(/<[^>]+>/g, ' ').trim());
    DB.data.kmDataEntries.filter(e => e.projectId === project.id).forEach(entry => {
      heading(entry.title, 11);
      entry.steps.slice().sort((a, b) => a.order - b.order).forEach(s => para(`Step ${s.order} — ${s.title}: ${s.description}`));
      entry.checklists.forEach(cl => {
        para('Checklist: ' + cl.name);
        cl.items.forEach(item => {
          if (item.banner) { para('  ⚑ ' + item.list); return; }
          para(`  ${item.step} ${item.no}: ${item.list}${item.remark ? ' — ' + item.remark : ''}`);
        });
      });
      entry.faqs.forEach(f => para('FAQ: ' + f.question + ' — ' + f.answer));
    });
  });

  // Machine-readable round-trip page
  doc.addPage(); y = margin;
  heading('Machine-Readable Data (do not edit below)');
  para('This page embeds the underlying KM data as Base64 JSON so it can be restored via "Import PDF" in the app. Editing this text will break re-import.');
  const payload = {
    kmGeneral: DB.data.kmGeneral,
    kmDataEntries: DB.data.kmDataEntries,
    kmTocTrees: DB.data.kmTocTrees,
    kmGeneralTocTree: DB.data.kmGeneralTocTree,
    kmTocPages: DB.data.kmTocPages,
    kmGeneralPages: DB.data.kmGeneralPages,
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  doc.setFont('courier', 'normal'); doc.setFontSize(7);
  para(KM_PDF_DATA_START);
  (b64.match(/.{1,90}/g) || [b64]).forEach(line => para(line));
  para(KM_PDF_DATA_END);

  doc.save(`km-export-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast('KM exported to PDF.');
}
function openKmImportModal() {
  const mid = Modal.open(`
    ${modalHeader('Import KM from PDF', '')}
    <div class="modal-body">
      <p class="muted" style="margin-bottom:10px">Select a KM PDF previously exported from this app ("Export PDF" on the KM home page). Importing overwrites current General Information, Data Entries, and TOC structures.</p>
      <input type="file" id="km-import-file" accept="application/pdf">
      <div id="km-import-status" class="field-hint" style="margin-top:8px"></div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="importKmPdf()">Import</button></div>
  `);
  wireCancel(mid);
}
async function importKmPdf() {
  const statusEl = document.getElementById('km-import-status');
  const file = document.getElementById('km-import-file').files[0];
  if (!file) { toast('Choose a PDF file first.', 'error'); return; }
  if (!window.pdfjsLib) { toast('PDF library unavailable (offline?).', 'error'); return; }
  statusEl.textContent = 'Reading PDF…';
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(it => it.str).join('\n') + '\n';
    }
    // jsPDF/pdf.js can split a text run into separate items per word (extra whitespace
    // appears between words in the extracted text), so search on a whitespace-stripped
    // copy rather than assuming the marker survives as one contiguous literal substring.
    const normalized = fullText.replace(/\s+/g, '');
    const startMarker = KM_PDF_DATA_START.replace(/\s+/g, '');
    const endMarker = KM_PDF_DATA_END.replace(/\s+/g, '');
    const startIdx = normalized.indexOf(startMarker);
    const endIdx = normalized.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1) { statusEl.textContent = ''; toast('This PDF does not contain importable KM data.', 'error'); return; }
    const b64 = normalized.slice(startIdx + startMarker.length, endIdx);
    const payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!payload.kmGeneral || !payload.kmDataEntries) { statusEl.textContent = ''; toast('KM data in this PDF looks incomplete.', 'error'); return; }
    if (!confirm('Import this KM data? This overwrites current General Information, Data Entries, and TOC structures.')) { statusEl.textContent = ''; return; }
    DB.data.kmGeneral = payload.kmGeneral;
    DB.data.kmDataEntries = payload.kmDataEntries;
    DB.data.kmTocTrees = payload.kmTocTrees;
    DB.data.kmGeneralTocTree = payload.kmGeneralTocTree;
    DB.data.kmTocPages = payload.kmTocPages;
    // Older exports (before per-topic Table/Free Text pages existed) won't have this key.
    DB.data.kmGeneralPages = payload.kmGeneralPages || [];
    DB.save();
    Modal.closeAll();
    toast('KM data imported successfully.');
    route();
  } catch (e) {
    console.error(e);
    statusEl.textContent = '';
    toast('Import failed: ' + e.message, 'error');
  }
}

// KM editing no longer requires an unlock passcode — any user with the relevant
// permission can hit a section's "Edit" button directly and make changes.
function canEditKm(fnId) {
  const user = Session.currentUser();
  return hasPerm(user, 'program', fnId);
}

// ---------------- KM General Information ----------------
let KM_GENERAL_EDIT_MODE = false;
let KM_GENERAL_DRAFT = null;
const KM_GENERAL_ARRAY_FIELDS = {
  internalContacts: [{ key: 'role', label: 'Role' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }],
  externalContact: [{ key: 'org', label: 'Organization' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }],
  credentialsList: [{ key: 'label', label: 'System' }, { key: 'url', label: 'URL' }, { key: 'username', label: 'Username' }, { key: 'password', label: 'Password', type: 'password' }],
};
// Sidebar TOC — DB.data.kmGeneralTocTree is a single site-wide tree (no per-project copies),
// structurally editable exactly like a Project's TOC (Add/Edit/Delete/Move/Indent/Outdent —
// see the shared engine above: currentTocTree(), findTocContext(), moveTocNodeUp(), etc., all
// keyed off CURRENT_TOC_SCOPE). Each seeded leaf carries a targetId; clicking it scrolls the
// matching panel/row into view instead of navigating. Topics added later have no targetId and
// are just organizational (no click target) until content is wired up for them.
function scrollToKmGenSection(targetId) {
  const el = targetId && document.getElementById(targetId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function renderKmGeneral(main) {
  CURRENT_TOC_SCOPE = 'general';
  const editable = canEditKm('fn-km-general-edit');
  const node = CURRENT_KM_GENERAL_NODE_ID ? findTocNode(CURRENT_KM_GENERAL_NODE_ID, DB.data.kmGeneralTocTree) : null;
  // Every originally-seeded General topic carries a targetId and keeps using the built-in
  // structured section views below; any topic added later via "+ Add Topic" has none and gets
  // its own free-form page instead (see the generic content-page system above).
  const isCustomNode = !!(node && !node.targetId);
  let headerExtra;
  if (isCustomNode) {
    const hasPage = !!getActiveKmPage();
    headerExtra = KM_PAGE_EDIT_MODE
      ? `<div class="btn-group"><button class="btn btn-primary btn-sm" onclick="saveKmPage()">Save</button><button class="btn btn-sm" onclick="cancelKmPageEdit()">Cancel</button></div>`
      : (editable && hasPage ? `<div class="btn-group"><button class="btn btn-sm" onclick="toggleKmPageEdit()">Edit</button></div>` : '');
  } else {
    // Save/Cancel must always be reachable once editing has started (even if, mid-edit, the
    // user clicks a different sidebar entry and CURRENT_KM_GENERAL_NODE_ID changes) — only the
    // initial "Edit" entry point requires a topic to already be selected, since edit mode now
    // scopes to just that one section rather than bulk-editing everything at once.
    headerExtra = KM_GENERAL_EDIT_MODE
      ? `<div class="btn-group"><button class="btn btn-primary btn-sm" onclick="saveKmGeneral()">Save</button><button class="btn btn-sm" onclick="cancelKmGeneralEdit()">Cancel</button></div>`
      : (editable && CURRENT_KM_GENERAL_NODE_ID ? `<div class="btn-group"><button class="btn btn-sm" onclick="toggleKmGeneralEdit()">Edit</button></div>` : '');
  }
  renderKmShell(main, {
    title: 'General Information', sub: 'Site-wide reference information for the Knowledge Management site',
    headerExtra, pageScope: 'general', activeNodeId: CURRENT_KM_GENERAL_NODE_ID, workspaceId: 'km-general-body',
  }, '');
  renderKmGeneralBody();
}
function kmGenExpandAll(collapse) {
  document.querySelectorAll('#kmgen-toc-tree .toc-children').forEach(el => el.classList.toggle('hidden', collapse));
  document.querySelectorAll('#kmgen-toc-tree .toc-toggle').forEach(el => { el.textContent = collapse ? '▸' : '▾'; });
}
// Each top-level General Information topic maps to exactly one of these sections (see the
// `section` key seeded on KM_GENERAL_TOC_TREE in data.js) — clicking anywhere inside that
// topic shows only its section, mirroring how a Project's TOC page shows only that page's
// content instead of one long scrolling document.
function generalSectionForNode(nodeId) {
  const path = findTocPath(nodeId, DB.data.kmGeneralTocTree);
  if (!path || !path.length) return null;
  const topNode = findTocNode(path[0], DB.data.kmGeneralTocTree);
  return topNode ? topNode.section : null;
}
function renderKmGeneralBody() {
  const body = document.getElementById('km-general-body');
  if (!body) return;
  const node = CURRENT_KM_GENERAL_NODE_ID ? findTocNode(CURRENT_KM_GENERAL_NODE_ID, DB.data.kmGeneralTocTree) : null;
  if (node && !node.targetId) {
    body.innerHTML = `
      <div class="panel">
        <div class="panel-title"><span>${escapeHtml(node.title)} ${node.deprecated ? '<span class="text-danger" style="font-size:12px">(deprecated)</span>' : ''}</span></div>
        ${renderKmPageWorkspace()}
      </div>
    `;
    return;
  }
  const g = KM_GENERAL_EDIT_MODE ? KM_GENERAL_DRAFT : DB.data.kmGeneral;
  const section = CURRENT_KM_GENERAL_NODE_ID ? generalSectionForNode(CURRENT_KM_GENERAL_NODE_ID) : null;
  if (KM_GENERAL_EDIT_MODE) {
    const editRenderer = KM_GENERAL_EDIT_SECTION_RENDERERS[section];
    body.innerHTML = editRenderer ? editRenderer(g)
      : `<div class="empty-state" style="text-align:left;padding:20px 4px">Select a topic from the sidebar, then click Edit to edit just that section.</div>`;
    return;
  }
  const renderer = KM_GENERAL_SECTION_RENDERERS[section];
  if (!renderer) {
    body.innerHTML = `<div class="empty-state" style="text-align:left;padding:20px 4px">Select a topic from the sidebar to view its information.</div>`;
    return;
  }
  body.innerHTML = renderer(g);
  if (node && node.targetId) requestAnimationFrame(() => scrollToKmGenSection(node.targetId));
}
function toggleKmGeneralEdit() {
  if (!canEditKm('fn-km-general-edit')) { toast('Not permitted.', 'error'); return; }
  KM_GENERAL_DRAFT = JSON.parse(JSON.stringify(DB.data.kmGeneral));
  KM_GENERAL_EDIT_MODE = true;
  route();
}
function cancelKmGeneralEdit() {
  KM_GENERAL_EDIT_MODE = false;
  KM_GENERAL_DRAFT = null;
  route();
}
function saveKmGeneral() {
  if (!canEditKm('fn-km-general-edit')) { toast('Not permitted.', 'error'); return; }
  DB.data.kmGeneral = KM_GENERAL_DRAFT;
  DB.save();
  KM_GENERAL_EDIT_MODE = false;
  KM_GENERAL_DRAFT = null;
  toast('General Information updated.');
  route();
}
// Split by section (rather than one giant renderKmGeneralViewHtml) so General Information's
// sidebar can show only the clicked topic's content, the same way a Project's TOC page does —
// see renderKmGeneralBody() / generalSectionForNode() / KM_GENERAL_SECTION_RENDERERS.
function renderGenSecContact(g) {
  return `
    <div class="panel" id="kmgen-sec-internal-contact">
      <div class="panel-title">Contact Information — Internal Contact</div>
      <div class="table-wrap table-scroll"><table><thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
      <tbody>${g.internalContacts.map((c, i) => `<tr id="kmgen-ic-row-${i}"><td>${escapeHtml(c.role)}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.phone)}</td></tr>`).join('')}</tbody></table></div>
    </div>

    <div class="panel" id="kmgen-sec-external-contact">
      <div class="panel-title">Contact Information — External Contact</div>
      <div class="table-wrap table-scroll"><table><thead><tr><th>Organization</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
      <tbody>${g.externalContact.map((c, i) => `<tr id="kmgen-ec-row-${i}"><td>${escapeHtml(c.org)}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.phone)}</td></tr>`).join('')}</tbody></table></div>
    </div>
  `;
}
function renderGenSecCredentials(g) {
  return `
    <div class="panel" id="kmgen-sec-credentials">
      <div class="panel-title">URL &amp; Username &amp; Password<span class="credential-flag">restricted</span></div>
      <div class="table-wrap table-scroll"><table><thead><tr><th>System</th><th>URL</th><th>Username</th><th>Password</th></tr></thead>
      <tbody>${g.credentialsList.map((c, i) => `
        <tr id="kmgen-cred-row-${i}"><td>${escapeHtml(c.label)}</td><td>${escapeHtml(c.url)}</td><td>${escapeHtml(c.username)}</td>
          <td><span class="masked" id="km-cred-pw-${c.id}">••••••••</span>
          <button class="btn btn-sm" onclick="document.getElementById('km-cred-pw-${c.id}').textContent='${escapeHtml(c.password)}'">Reveal</button></td></tr>
      `).join('')}</tbody></table></div>
    </div>
  `;
}
function renderGenSecFollowup(g) {
  return `
    <div class="panel" id="kmgen-sec-followup">
      <div class="panel-title">Follow Up Guideline</div>
      <div class="form-row"><div class="field" id="kmgen-fu-kpi"><label>KPI</label><div>${escapeHtml(g.followUp.kpi)}</div></div></div>
      <div class="form-row">
        <div class="field" id="kmgen-fu-internal"><label>Internal Follow Up</label><div>${escapeHtml(g.followUp.internal)}</div></div>
        <div class="field" id="kmgen-fu-external"><label>External Follow Up</label><div>${escapeHtml(g.followUp.external)}</div></div>
      </div>
    </div>
  `;
}
function renderGenSecMeeting(g) {
  return `
    <div class="panel" id="kmgen-sec-meeting">
      <div class="panel-title">Meeting Procedure</div>
      <div class="form-row">
        <div class="field" id="kmgen-mt-internal"><label>Internal Meeting</label><div>${escapeHtml(g.meeting.internalMeeting)}</div></div>
        <div class="field" id="kmgen-mt-internal-mom"><label>Internal MOM</label><div>${escapeHtml(g.meeting.internalMOM)}</div></div>
      </div>
      <div class="form-row">
        <div class="field" id="kmgen-mt-external"><label>External Meeting</label><div>${escapeHtml(g.meeting.externalMeeting)}</div></div>
        <div class="field" id="kmgen-mt-external-mom"><label>External MOM</label><div>${escapeHtml(g.meeting.externalMOM)}</div></div>
      </div>
    </div>
  `;
}
function renderGenSecCoop(g) {
  return `
    <div class="panel" id="kmgen-sec-coop">
      <div class="panel-title">Relevant Team Cooperation</div>
      <div id="kmgen-coop-internal" style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">Internal</div>
      <div class="table-wrap table-scroll" style="margin-bottom:14px"><table><thead><tr><th>Team</th><th>Notes</th></tr></thead>
      <tbody>${Object.entries(g.cooperation.internal).map(([k, v], i) => `<tr id="kmgen-coop-int-row-${i}"><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</tbody></table></div>
      <div id="kmgen-coop-host" style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">External — Host Information</div>
      <div>${escapeHtml(g.cooperation.external.hostInformation)}</div>
    </div>
  `;
}
const KM_GENERAL_SECTION_RENDERERS = {
  contact: renderGenSecContact, credentials: renderGenSecCredentials,
  followup: renderGenSecFollowup, meeting: renderGenSecMeeting, coop: renderGenSecCoop,
};
const KM_GENERAL_SECTION_ANCHORS = {
  internalContacts: { panelId: 'kmgen-sec-internal-contact', rowPrefix: 'kmgen-ic-row-' },
  externalContact: { panelId: 'kmgen-sec-external-contact', rowPrefix: 'kmgen-ec-row-' },
  credentialsList: { panelId: 'kmgen-sec-credentials', rowPrefix: 'kmgen-cred-row-' },
};
function kmGeneralArrayEditor(sectionKey, title) {
  const fields = KM_GENERAL_ARRAY_FIELDS[sectionKey];
  const rows = KM_GENERAL_DRAFT[sectionKey];
  const anchors = KM_GENERAL_SECTION_ANCHORS[sectionKey];
  return `
    <div class="panel" id="${anchors.panelId}">
      <div class="panel-title">${title}<button class="btn btn-sm" onclick="kmGeneralAddRow('${sectionKey}')">+ Add Row</button></div>
      <div class="table-wrap table-scroll"><table><thead><tr>${fields.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.length === 0 ? `<tr><td colspan="${fields.length + 1}" class="empty-state">No rows yet.</td></tr>` : rows.map((r, i) => `
        <tr id="${anchors.rowPrefix}${i}">${fields.map(f => `<td><input type="${f.type || 'text'}" value="${escapeHtml(r[f.key] || '')}" onchange="kmGeneralUpdateRow('${sectionKey}',${i},'${f.key}',this.value)"></td>`).join('')}
        <td><button class="btn btn-sm btn-danger" onclick="kmGeneralRemoveRow('${sectionKey}',${i})">✕</button></td></tr>
      `).join('')}</tbody></table></div>
    </div>
  `;
}
function kmGeneralAddRow(sectionKey) {
  const blank = {};
  KM_GENERAL_ARRAY_FIELDS[sectionKey].forEach(f => { blank[f.key] = ''; });
  if (sectionKey === 'credentialsList') blank.id = uid('cred-gen');
  KM_GENERAL_DRAFT[sectionKey].push(blank);
  renderKmGeneralBody();
}
function kmGeneralUpdateRow(sectionKey, idx, key, value) {
  KM_GENERAL_DRAFT[sectionKey][idx][key] = value;
}
function kmGeneralRemoveRow(sectionKey, idx) {
  KM_GENERAL_DRAFT[sectionKey].splice(idx, 1);
  renderKmGeneralBody();
}
function kmGeneralCoopInternalHtml(internal) {
  const entries = Object.entries(internal);
  return `
    <div id="kmgen-coop-internal" style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">Internal <button class="btn btn-sm" onclick="kmGeneralAddCoopRow()">+ Add Team</button></div>
    <div class="table-wrap table-scroll" style="margin-bottom:14px"><table><thead><tr><th>Team</th><th>Notes</th><th></th></tr></thead>
    <tbody>${entries.length === 0 ? '<tr><td colspan="3" class="empty-state">No rows yet.</td></tr>' : entries.map(([k, v], i) => `
      <tr id="kmgen-coop-int-row-${i}" data-key="${escapeHtml(k)}">
        <td><input value="${escapeHtml(k)}" onchange="kmGeneralRenameCoopKeyEl(this)"></td>
        <td><input value="${escapeHtml(v)}" onchange="kmGeneralSetCoopValueEl(this)"></td>
        <td><button class="btn btn-sm btn-danger" onclick="kmGeneralRemoveCoopRowEl(this)">✕</button></td>
      </tr>
    `).join('')}</tbody></table></div>
  `;
}
function kmGeneralAddCoopRow() {
  let key = 'New Team', i = 1;
  while (KM_GENERAL_DRAFT.cooperation.internal[key] !== undefined) { key = 'New Team ' + (++i); }
  KM_GENERAL_DRAFT.cooperation.internal[key] = '';
  renderKmGeneralBody();
}
function kmGeneralRenameCoopKeyEl(input) {
  const row = input.closest('tr');
  const oldKey = row.dataset.key;
  const newKey = input.value.trim() || oldKey;
  const obj = KM_GENERAL_DRAFT.cooperation.internal;
  const val = obj[oldKey];
  delete obj[oldKey];
  obj[newKey] = val;
  renderKmGeneralBody();
}
function kmGeneralSetCoopValueEl(input) {
  KM_GENERAL_DRAFT.cooperation.internal[input.closest('tr').dataset.key] = input.value;
}
function kmGeneralRemoveCoopRowEl(btn) {
  delete KM_GENERAL_DRAFT.cooperation.internal[btn.closest('tr').dataset.key];
  renderKmGeneralBody();
}
// Split by section, mirroring KM_GENERAL_SECTION_RENDERERS (view mode) — edit mode now scopes
// to whichever topic is selected instead of exposing every section's editor at once.
function renderGenEditContact() {
  return `
    ${kmGeneralArrayEditor('internalContacts', 'Contact Information — Internal Contact')}
    ${kmGeneralArrayEditor('externalContact', 'Contact Information — External Contact')}
  `;
}
function renderGenEditCredentials() {
  return kmGeneralArrayEditor('credentialsList', 'URL &amp; Username &amp; Password');
}
function renderGenEditFollowup(g) {
  return `
    <div class="panel" id="kmgen-sec-followup">
      <div class="panel-title">Follow Up Guideline</div>
      <div class="field" id="kmgen-fu-kpi"><label>KPI</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.followUp.kpi=this.value">${escapeHtml(g.followUp.kpi)}</textarea></div>
      <div class="form-row">
        <div class="field" id="kmgen-fu-internal"><label>Internal Follow Up</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.followUp.internal=this.value">${escapeHtml(g.followUp.internal)}</textarea></div>
        <div class="field" id="kmgen-fu-external"><label>External Follow Up</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.followUp.external=this.value">${escapeHtml(g.followUp.external)}</textarea></div>
      </div>
    </div>
  `;
}
function renderGenEditMeeting(g) {
  return `
    <div class="panel" id="kmgen-sec-meeting">
      <div class="panel-title">Meeting Procedure</div>
      <div class="form-row">
        <div class="field" id="kmgen-mt-internal"><label>Internal Meeting</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.meeting.internalMeeting=this.value">${escapeHtml(g.meeting.internalMeeting)}</textarea></div>
        <div class="field" id="kmgen-mt-internal-mom"><label>Internal MOM</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.meeting.internalMOM=this.value">${escapeHtml(g.meeting.internalMOM)}</textarea></div>
      </div>
      <div class="form-row">
        <div class="field" id="kmgen-mt-external"><label>External Meeting</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.meeting.externalMeeting=this.value">${escapeHtml(g.meeting.externalMeeting)}</textarea></div>
        <div class="field" id="kmgen-mt-external-mom"><label>External MOM</label><textarea rows="2" onchange="KM_GENERAL_DRAFT.meeting.externalMOM=this.value">${escapeHtml(g.meeting.externalMOM)}</textarea></div>
      </div>
    </div>
  `;
}
function renderGenEditCoop(g) {
  return `
    <div class="panel" id="kmgen-sec-coop">
      <div class="panel-title">Relevant Team Cooperation</div>
      ${kmGeneralCoopInternalHtml(g.cooperation.internal)}
      <div id="kmgen-coop-host" style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">External — Host Information</div>
      <div class="field"><textarea rows="2" onchange="KM_GENERAL_DRAFT.cooperation.external.hostInformation=this.value">${escapeHtml(g.cooperation.external.hostInformation)}</textarea></div>
    </div>
  `;
}
const KM_GENERAL_EDIT_SECTION_RENDERERS = {
  contact: renderGenEditContact, credentials: renderGenEditCredentials,
  followup: renderGenEditFollowup, meeting: renderGenEditMeeting, coop: renderGenEditCoop,
};

// ---------------- KM Project Sub-Menu (TOC tree) ----------------
// The TOC tree lives in a persistent left sidebar for every project page (background/data
// entries, and each TOC content page); renderKmProjectShell() supplies that sidebar and drops
// whatever the current view needs into the right-hand workspace pane. Each project owns an
// independent, editable copy (DB.data.kmTocTrees[projectId]) — Add/Edit/Delete/Move never
// touch the shared KM_TOC_TREE seed shape in data.js.
let CURRENT_TOC_NODE_ID = null;
let TOC_STRUCTURE_EDIT_MODE = false;
// 'project' (DB.data.kmTocTrees[projectId]) or 'general' (the single site-wide
// DB.data.kmGeneralTocTree) — set by whichever shell renders last, so every generic TOC
// function below (find/move/indent/outdent/add/edit/delete) transparently operates on
// whichever tree is currently on screen.
let CURRENT_TOC_SCOPE = 'project';
function currentTocTree() { return CURRENT_TOC_SCOPE === 'general' ? DB.data.kmGeneralTocTree : DB.data.kmTocTrees[CURRENT_KM_PROJECT_ID]; }
function findTocNode(nodeId, nodes) {
  nodes = nodes || currentTocTree();
  for (const n of nodes) {
    if (n.id === nodeId) return n;
    if (n.children) { const found = findTocNode(nodeId, n.children); if (found) return found; }
  }
  return null;
}
function findTocPath(nodeId, nodes, path) {
  nodes = nodes || currentTocTree();
  path = path || [];
  for (const n of nodes) {
    const nextPath = path.concat(n.id);
    if (n.id === nodeId) return nextPath;
    if (n.children) { const found = findTocPath(nodeId, n.children, nextPath); if (found) return found; }
  }
  return null;
}
// Finds a node plus everything needed to move it: its own siblings array/index, and the same
// for every ancestor (so outdent can splice it back in right after its former parent).
function findTocContext(nodeId, nodes, ancestors) {
  nodes = nodes || currentTocTree();
  ancestors = ancestors || [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === nodeId) return { siblings: nodes, index: i, node: n, ancestors };
    if (n.children) {
      const found = findTocContext(nodeId, n.children, ancestors.concat([{ siblings: nodes, index: i, node: n }]));
      if (found) return found;
    }
  }
  return null;
}
function toggleTocStructureEditMode() {
  const permId = CURRENT_TOC_SCOPE === 'general' ? 'fn-km-general-edit' : 'fn-km-project-edit';
  if (!canEditKm(permId)) { toast('Not permitted.', 'error'); return; }
  TOC_STRUCTURE_EDIT_MODE = !TOC_STRUCTURE_EDIT_MODE;
  TOC_SELECTED_NODE_ID = null;
  route();
}
function moveTocNodeUp(nodeId) {
  const ctx = findTocContext(nodeId);
  if (!ctx || ctx.index === 0) { toast('Already first in this list.', 'error'); return; }
  const s = ctx.siblings;
  [s[ctx.index - 1], s[ctx.index]] = [s[ctx.index], s[ctx.index - 1]];
  DB.save(); route();
}
function moveTocNodeDown(nodeId) {
  const ctx = findTocContext(nodeId);
  if (!ctx || ctx.index >= ctx.siblings.length - 1) { toast('Already last in this list.', 'error'); return; }
  const s = ctx.siblings;
  [s[ctx.index], s[ctx.index + 1]] = [s[ctx.index + 1], s[ctx.index]];
  DB.save(); route();
}
// "Move to child topic" — nests the node under its immediately preceding sibling.
function indentTocNode(nodeId) {
  const ctx = findTocContext(nodeId);
  if (!ctx || ctx.index === 0) { toast('No preceding topic to nest this under.', 'error'); return; }
  const priorSibling = ctx.siblings[ctx.index - 1];
  ctx.siblings.splice(ctx.index, 1);
  priorSibling.type = 'folder';
  priorSibling.children = priorSibling.children || [];
  priorSibling.children.push(ctx.node);
  DB.save(); route();
}
// "Move to new topic" — promotes the node one level up, placed right after its former parent.
function outdentTocNode(nodeId) {
  const ctx = findTocContext(nodeId);
  if (!ctx || ctx.ancestors.length === 0) { toast('Already a top-level topic.', 'error'); return; }
  const parentCtx = ctx.ancestors[ctx.ancestors.length - 1];
  ctx.siblings.splice(ctx.index, 1);
  parentCtx.siblings.splice(parentCtx.index + 1, 0, ctx.node);
  DB.save(); route();
}
function openTocNodeAddForm(parentNodeId) {
  const mid = Modal.open(`
    ${modalHeader(parentNodeId ? 'Add Sub-Topic' : 'Add Topic', '')}
    <div class="modal-body"><div class="field"><label>Title</label><input id="toc-new-title" placeholder="Topic title" onkeydown="if(event.key==='Enter'){event.preventDefault();saveTocNodeAdd('${parentNodeId || ''}')}"></div></div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveTocNodeAdd('${parentNodeId || ''}')">Add</button></div>
  `);
  wireCancel(mid);
  document.getElementById('toc-new-title').focus();
}
function saveTocNodeAdd(parentNodeId) {
  const title = document.getElementById('toc-new-title').value.trim();
  if (!title) { toast('Title required.', 'error'); return; }
  const newNode = { id: uid('toc'), type: 'doc', title };
  if (!parentNodeId) {
    currentTocTree().push(newNode);
  } else {
    const ctx = findTocContext(parentNodeId);
    ctx.node.type = 'folder';
    ctx.node.children = ctx.node.children || [];
    ctx.node.children.push(newNode);
  }
  DB.save();
  Modal.closeAll();
  route();
}
// Preset choices for the icon picker in the Edit Topic modal — the text input still accepts
// any pasted/typed emoji, this is just a quick-pick shortcut for common ones.
const TOC_ICON_PRESETS = ['📁', '📄', 'ℹ️', '⭐', '⚠️', '🔗', '🔒', '📌', '🧾', '📊'];
function tocDefaultIcon(node) { return node.type === 'folder' ? '📁' : '📄'; }
function openTocNodeEditForm(nodeId) {
  const ctx = findTocContext(nodeId);
  const currentIcon = ctx.node.icon || tocDefaultIcon(ctx.node);
  const mid = Modal.open(`
    ${modalHeader('Edit Topic', '')}
    <div class="modal-body">
      <div class="field"><label>Title</label><input id="toc-edit-title" value="${escapeHtml(ctx.node.title)}"></div>
      <div class="field">
        <label>Icon</label>
        <input id="toc-edit-icon" value="${escapeHtml(currentIcon)}" maxlength="4" style="width:70px">
        <div class="icon-picker">
          ${TOC_ICON_PRESETS.map(ic => `<button type="button" class="icon-picker-btn" onclick="document.getElementById('toc-edit-icon').value='${ic}'">${ic}</button>`).join('')}
        </div>
      </div>
      <label class="checkbox-row"><input type="checkbox" id="toc-edit-deprecated" ${ctx.node.deprecated ? 'checked' : ''}> Deprecated (shown greyed out / struck through)</label>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveTocNodeEdit('${nodeId}')">Save</button></div>
  `);
  wireCancel(mid);
}
function saveTocNodeEdit(nodeId) {
  const title = document.getElementById('toc-edit-title').value.trim();
  if (!title) { toast('Title required.', 'error'); return; }
  const node = findTocContext(nodeId).node;
  node.title = title;
  node.icon = document.getElementById('toc-edit-icon').value.trim() || tocDefaultIcon(node);
  node.deprecated = document.getElementById('toc-edit-deprecated').checked;
  DB.save();
  Modal.closeAll();
  route();
}
// A node or any of its descendants — used by deleteTocNode to tell whether the topic that's
// currently displayed/selected is being removed by this deletion (folders cascade-delete).
function tocNodeContains(node, targetId) {
  if (node.id === targetId) return true;
  return !!(node.children && node.children.some(c => tocNodeContains(c, targetId)));
}
function deleteTocNode(nodeId) {
  const ctx = findTocContext(nodeId);
  if (!ctx) return;
  const cascadeNote = ctx.node.children && ctx.node.children.length ? ' and everything nested under it' : '';
  if (!confirm(`Delete "${ctx.node.title}"${cascadeNote}? This cannot be undone.`)) return;
  const parentId = ctx.ancestors.length ? ctx.ancestors[ctx.ancestors.length - 1].node.id : null;
  const scope = CURRENT_TOC_SCOPE;
  const projectId = CURRENT_KM_PROJECT_ID;
  const viewedId = scope === 'general' ? CURRENT_KM_GENERAL_NODE_ID : CURRENT_TOC_NODE_ID;
  const viewedWasRemoved = !!viewedId && tocNodeContains(ctx.node, viewedId);
  ctx.siblings.splice(ctx.index, 1);
  DB.save();
  if (TOC_SELECTED_NODE_ID && tocNodeContains(ctx.node, TOC_SELECTED_NODE_ID)) TOC_SELECTED_NODE_ID = null;
  if (!viewedWasRemoved) { route(); return; }
  // The deleted topic (or something nested under it) was what's currently displayed — fall
  // back to its parent topic instead of leaving the workspace pointed at content that's gone.
  if (scope === 'general') { nav('#/km/general' + (parentId ? '/' + parentId : '')); return; }
  if (parentId) { nav(`#/km/toc/${projectId}/${parentId}`); } else { nav(`#/km/project/${projectId}`); }
}
function renderTocNodeHtml(node, projectId, activeNodeId, activePath, structureEditMode, scope) {
  scope = scope || 'project';
  const hasChildren = node.children && node.children.length > 0;
  const icon = node.icon || tocDefaultIcon(node);
  const isActive = node.id === activeNodeId;
  const isSelected = structureEditMode && node.id === TOC_SELECTED_NODE_ID;
  const expanded = structureEditMode || !!(activePath && activePath.includes(node.id));
  // While editing structure, clicking a topic selects it for the shared toolbar above the
  // tree instead of navigating — keeps each row to just an icon+title (see renderTocEditToolbar).
  const clickHandler = structureEditMode ? `selectTocNode('${node.id}')` : 'navTocNode(this)';
  return `
    <div class="toc-node">
      <div class="toc-row">
        ${hasChildren ? `<span class="toc-toggle" onclick="toggleTocNode(this)">${expanded ? '▾' : '▸'}</span>` : `<span class="toc-toggle-spacer"></span>`}
        <span class="toc-label ${node.deprecated ? 'toc-deprecated' : ''} ${isActive ? 'toc-active' : ''} ${isSelected ? 'toc-selected' : ''}" data-scope="${scope}" data-project="${projectId || ''}" data-node="${node.id}" data-link="${node.linkDataType || ''}" data-title="${escapeHtml(node.title)}" data-target="${node.targetId || ''}" title="${escapeHtml(node.title)}" onclick="${clickHandler}">${icon} ${escapeHtml(node.title)}</span>
      </div>
      ${hasChildren ? `<div class="toc-children ${expanded ? '' : 'hidden'}">${node.children.map(c => renderTocNodeHtml(c, projectId, activeNodeId, activePath, structureEditMode, scope)).join('')}</div>` : ''}
    </div>
  `;
}
function toggleTocNode(toggleEl) {
  const childrenDiv = toggleEl.closest('.toc-node').querySelector(':scope > .toc-children');
  const collapsed = childrenDiv.classList.toggle('hidden');
  toggleEl.textContent = collapsed ? '▸' : '▾';
}
function tocExpandAll(collapse) {
  document.querySelectorAll('#km-toc-tree .toc-children').forEach(el => el.classList.toggle('hidden', collapse));
  document.querySelectorAll('#km-toc-tree .toc-toggle').forEach(el => { el.textContent = collapse ? '▸' : '▾'; });
}
function navTocNode(el) {
  const { scope, project, node, link, title } = el.dataset;
  if (scope === 'general') { nav(`#/km/general/${node}`); return; }
  if (link) {
    const entry = DB.data.kmDataEntries.find(d => d.projectId === project && d.title === title);
    if (entry) { nav(`#/km/data/${entry.id}`); return; }
  }
  nav(`#/km/toc/${project}/${node}`);
}
// ===================================================================
// Generic per-topic content page — used for any TOC topic that doesn't have a fixed built-in
// view: every Project TOC topic, plus General Information topics added via "+ Add Topic" (the
// originally-seeded General topics all carry a targetId and keep using the structured section
// views in renderGenSec*/renderKmGeneral instead — see the targetId check in
// renderKmGeneralBody). A topic starts with no page at all; the first save picks one of two
// formats and that choice sticks:
//   - 'table'    — one independent table per topic (add/remove columns and rows, cells can
//                  hold text or an inserted image), read the same way whether it's General
//                  Info or a Project topic.
//   - 'richtext' — a contenteditable page with headings, multi-column layout blocks and
//                  inline images via the shared richToolbarHtml()/rteExec() toolbar.
// Both scopes (CURRENT_TOC_SCOPE 'general' | 'project') share one edit/save/cancel lifecycle
// below, keyed off whichever of CURRENT_KM_GENERAL_NODE_ID / CURRENT_TOC_NODE_ID applies.
// ===================================================================
let KM_PAGE_EDIT_MODE = false;
let KM_PAGE_DRAFT = null; // { format: 'richtext'|'table', content?, table? }
function isKmImageValue(v) { return typeof v === 'string' && v.indexOf('data:image') === 0; }
function blankKmTable() {
  const c1 = uid('col'), c2 = uid('col');
  return { columns: [{ id: c1, label: 'Column 1' }, { id: c2, label: 'Column 2' }], rows: [{ id: uid('row'), cells: { [c1]: '', [c2]: '' } }] };
}
function getActiveKmPage() {
  if (CURRENT_TOC_SCOPE === 'general') {
    return CURRENT_KM_GENERAL_NODE_ID ? (DB.data.kmGeneralPages.find(p => p.nodeId === CURRENT_KM_GENERAL_NODE_ID) || null) : null;
  }
  return CURRENT_TOC_NODE_ID ? (DB.data.kmTocPages.find(p => p.projectId === CURRENT_KM_PROJECT_ID && p.nodeId === CURRENT_TOC_NODE_ID) || null) : null;
}
// Re-renders whichever workspace is currently on screen — used after table row/column edits
// so the editor updates immediately without a full page reload.
function rerenderKmPageWorkspace() {
  if (document.getElementById('km-general-body')) { renderKmGeneralBody(); return; }
  if (document.getElementById('km-toc-page-body')) { renderKmTocPageBody(); return; }
}
function startCreateKmPage(format) {
  KM_PAGE_DRAFT = format === 'table' ? { format, table: blankKmTable() } : { format, content: '' };
  KM_PAGE_EDIT_MODE = true;
  route();
}
function toggleKmPageEdit() {
  const existing = getActiveKmPage();
  KM_PAGE_DRAFT = existing
    ? JSON.parse(JSON.stringify({ format: existing.format || 'richtext', content: existing.content, table: existing.table }))
    : { format: 'richtext', content: '' };
  KM_PAGE_EDIT_MODE = true;
  route();
}
function cancelKmPageEdit() {
  KM_PAGE_EDIT_MODE = false;
  KM_PAGE_DRAFT = null;
  route();
}
function saveKmPage() {
  if (!KM_PAGE_DRAFT) return;
  if (KM_PAGE_DRAFT.format === 'richtext') {
    const el = document.getElementById('km-page-rte');
    if (el) KM_PAGE_DRAFT.content = el.innerHTML;
  }
  const scope = CURRENT_TOC_SCOPE;
  if (scope === 'general') {
    if (!canEditKm('fn-km-general-edit')) { toast('Not permitted.', 'error'); return; }
    let entry = DB.data.kmGeneralPages.find(p => p.nodeId === CURRENT_KM_GENERAL_NODE_ID);
    if (!entry) { entry = { id: uid('kmgenpg'), nodeId: CURRENT_KM_GENERAL_NODE_ID }; DB.data.kmGeneralPages.push(entry); }
    entry.format = KM_PAGE_DRAFT.format; entry.content = KM_PAGE_DRAFT.content; entry.table = KM_PAGE_DRAFT.table;
  } else {
    if (!canEditKm('fn-km-project-edit')) { toast('Not permitted.', 'error'); return; }
    let entry = DB.data.kmTocPages.find(p => p.projectId === CURRENT_KM_PROJECT_ID && p.nodeId === CURRENT_TOC_NODE_ID);
    if (!entry) { entry = { id: uid('tocpg'), projectId: CURRENT_KM_PROJECT_ID, nodeId: CURRENT_TOC_NODE_ID }; DB.data.kmTocPages.push(entry); }
    entry.format = KM_PAGE_DRAFT.format; entry.content = KM_PAGE_DRAFT.content; entry.table = KM_PAGE_DRAFT.table;
  }
  DB.save();
  KM_PAGE_EDIT_MODE = false;
  KM_PAGE_DRAFT = null;
  toast('Page saved.');
  route();
}
function kmTableAddColumn() {
  const id = uid('col');
  KM_PAGE_DRAFT.table.columns.push({ id, label: 'New Column' });
  KM_PAGE_DRAFT.table.rows.forEach(r => { r.cells[id] = ''; });
  rerenderKmPageWorkspace();
}
function kmTableRemoveColumn(colId) {
  if (KM_PAGE_DRAFT.table.columns.length <= 1) { toast('A table needs at least one column.', 'error'); return; }
  KM_PAGE_DRAFT.table.columns = KM_PAGE_DRAFT.table.columns.filter(c => c.id !== colId);
  KM_PAGE_DRAFT.table.rows.forEach(r => { delete r.cells[colId]; });
  rerenderKmPageWorkspace();
}
function kmTableRenameColumn(colId, label) {
  const col = KM_PAGE_DRAFT.table.columns.find(c => c.id === colId);
  if (col) col.label = label;
}
function kmTableAddRow() {
  const cells = {};
  KM_PAGE_DRAFT.table.columns.forEach(c => { cells[c.id] = ''; });
  KM_PAGE_DRAFT.table.rows.push({ id: uid('row'), cells });
  rerenderKmPageWorkspace();
}
function kmTableRemoveRow(rowId) {
  KM_PAGE_DRAFT.table.rows = KM_PAGE_DRAFT.table.rows.filter(r => r.id !== rowId);
  rerenderKmPageWorkspace();
}
function kmTableSetCell(rowId, colId, value) {
  const row = KM_PAGE_DRAFT.table.rows.find(r => r.id === rowId);
  if (row) row.cells[colId] = value;
}
function kmTableInsertCellImage(event, rowId, colId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const row = KM_PAGE_DRAFT.table.rows.find(r => r.id === rowId);
    if (row) row.cells[colId] = reader.result;
    rerenderKmPageWorkspace();
  };
  reader.readAsDataURL(file);
}
function kmTableClearCellImage(rowId, colId) {
  const row = KM_PAGE_DRAFT.table.rows.find(r => r.id === rowId);
  if (row) row.cells[colId] = '';
  rerenderKmPageWorkspace();
}
function renderKmPageChooser() {
  return `
    <div class="empty-state" style="text-align:left;padding:6px 4px 18px">This topic has no content yet. Choose a format to get started:</div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="startCreateKmPage('richtext')">📝 Free Text</button>
      <button class="btn btn-primary" onclick="startCreateKmPage('table')">📊 Table</button>
    </div>
  `;
}
function renderKmTableView(t) {
  return `
    <div class="table-wrap table-scroll"><table><thead><tr>${t.columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r => `<tr>${t.columns.map(c => `<td>${isKmImageValue(r.cells[c.id]) ? `<img src="${r.cells[c.id]}" style="max-width:140px;max-height:90px;border-radius:4px">` : escapeHtml(r.cells[c.id] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  `;
}
function renderKmTableEditor() {
  const t = KM_PAGE_DRAFT.table;
  return `
    <div class="btn-group" style="margin-bottom:8px"><button class="btn btn-sm" onclick="kmTableAddColumn()">+ Column</button></div>
    <div class="table-wrap table-scroll"><table><thead><tr>
      ${t.columns.map(c => `<th><div style="display:flex;gap:4px;align-items:center"><input value="${escapeHtml(c.label)}" onchange="kmTableRenameColumn('${c.id}',this.value)"><button class="btn btn-sm btn-danger" title="Delete column" onclick="kmTableRemoveColumn('${c.id}')">✕</button></div></th>`).join('')}
      <th></th>
    </tr></thead>
    <tbody>${t.rows.map(r => `
      <tr>${t.columns.map(c => `
        <td>${isKmImageValue(r.cells[c.id])
      ? `<div style="display:flex;align-items:center;gap:6px"><img src="${r.cells[c.id]}" style="max-width:80px;max-height:60px;border-radius:4px"><button class="btn btn-sm btn-danger" onclick="kmTableClearCellImage('${r.id}','${c.id}')">✕</button></div>`
      : `<div style="display:flex;gap:4px;align-items:center"><input value="${escapeHtml(r.cells[c.id] || '')}" onchange="kmTableSetCell('${r.id}','${c.id}',this.value)"><label class="btn btn-sm" title="Insert image" style="cursor:pointer">🖼<input type="file" accept="image/*" class="hidden" onchange="kmTableInsertCellImage(event,'${r.id}','${c.id}')"></label></div>`}
        </td>
      `).join('')}
        <td><button class="btn btn-sm btn-danger" onclick="kmTableRemoveRow('${r.id}')">✕ Row</button></td>
      </tr>
    `).join('')}</tbody></table></div>
    <button class="btn btn-sm" style="margin-top:8px" onclick="kmTableAddRow()">+ Add Row</button>
  `;
}
function renderKmRichEditor() {
  return `
    ${richToolbarHtml('km-page-rte')}
    <div id="km-page-rte" class="rte-editor" contenteditable="true">${KM_PAGE_DRAFT.content || ''}</div>
  `;
}
function renderKmPageWorkspace() {
  if (KM_PAGE_EDIT_MODE) {
    if (!KM_PAGE_DRAFT) return '<div class="empty-state">Nothing to edit.</div>';
    return KM_PAGE_DRAFT.format === 'table' ? renderKmTableEditor() : renderKmRichEditor();
  }
  const page = getActiveKmPage();
  if (!page) return renderKmPageChooser();
  return page.format === 'table' ? renderKmTableView(page.table) : `<div class="rich-content">${page.content || ''}</div>`;
}

// Shared shell: unified sidebar (every project + General Info, see renderKmSidebar) on the
// left, whatever workspace HTML the caller supplies on the right.
function renderKmProjectShell(main, project, activeNodeId, rightHtml) {
  CURRENT_TOC_SCOPE = 'project';
  renderKmShell(main, {
    title: project.name, sub: 'Knowledge Management — Project Sub-Menu',
    pageScope: 'project', activeProjectId: project.id, activeNodeId,
  }, rightHtml);
}

// ---------------- KM Project (background + data entries) ----------------
function renderKmProject(main) {
  const project = byId(DB.data.projects, CURRENT_KM_PROJECT_ID);
  const entries = DB.data.kmDataEntries.filter(d => d.projectId === project.id);
  const canEditBg = canEditKm('fn-km-project-edit');
  const canAddData = canEditKm('fn-km-data-add');

  const rightHtml = `
    <div class="panel">
      <div class="panel-title">Project Background
        ${canEditBg ? `<button class="btn btn-sm" onclick="toggleBgEdit()">Edit</button>` : ''}
      </div>
      <div id="bg-view" class="rich-content">${project.background}</div>
      <div id="bg-edit" class="hidden">
        ${richToolbarHtml('bg-editor')}
        <div id="bg-editor" class="rte-editor" contenteditable="true">${project.background}</div>
        <div class="btn-group" style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="saveBg()">Save</button><button class="btn btn-sm" onclick="toggleBgEdit()">Cancel</button></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Data Entries
        ${canAddData ? `<button class="btn btn-sm btn-primary" onclick="openDataEntryForm()">+ Add Data Entry</button>` : ''}
      </div>
      ${entries.length === 0 ? '<div class="empty-state">No data entries yet.</div>' : `
      <div class="table-wrap"><table><thead><tr><th>Title</th><th>Docs</th><th>Contacts</th><th></th></tr></thead>
      <tbody>${entries.map(e => `
        <tr>
          <td><a href="#" onclick="nav('#/km/data/${e.id}');return false;">${escapeHtml(e.title)}</a></td>
          <td>${e.documents.length}</td>
          <td>${e.contacts.length}</td>
          <td style="text-align:right">
            ${canAddData ? `<button class="btn btn-sm" onclick="openDataEntryForm('${e.id}')">Edit</button>` : ''}
            ${canEditKm('fn-km-data-delete') ? `<button class="btn btn-sm btn-danger" onclick="deleteDataEntry('${e.id}')">Delete</button>` : ''}
          </td>
        </tr>
      `).join('')}</tbody></table></div>`}
    </div>
  `;
  renderKmProjectShell(main, project, null, rightHtml);
}
function toggleBgEdit() {
  document.getElementById('bg-view').classList.toggle('hidden');
  document.getElementById('bg-edit').classList.toggle('hidden');
}
function saveBg() {
  if (!canEditKm('fn-km-project-edit')) { toast('Not permitted.', 'error'); return; }
  const project = byId(DB.data.projects, CURRENT_KM_PROJECT_ID);
  project.background = document.getElementById('bg-editor').innerHTML;
  DB.save();
  toast('Project background updated.');
  route();
}

// ---------------- KM Project Sub-Menu content page ----------------
function renderKmTocPage(main) {
  const project = byId(DB.data.projects, CURRENT_KM_PROJECT_ID);
  const node = findTocNode(CURRENT_TOC_NODE_ID);
  const rightHtml = `
    <div class="panel">
      <div class="panel-title">
        <span>${escapeHtml(node.title)} ${node.deprecated ? '<span class="text-danger" style="font-size:12px">(deprecated)</span>' : ''}</span>
        <span id="km-toc-page-actions"></span>
      </div>
      <div id="km-toc-page-body"></div>
    </div>
  `;
  renderKmProjectShell(main, project, node.id, rightHtml);
  renderKmTocPageBody();
}
function renderKmTocPageBody() {
  const body = document.getElementById('km-toc-page-body');
  if (!body) return;
  body.innerHTML = renderKmPageWorkspace();
  const actionsEl = document.getElementById('km-toc-page-actions');
  if (!actionsEl) return;
  const canEdit = canEditKm('fn-km-project-edit');
  const hasPage = !!getActiveKmPage();
  actionsEl.innerHTML = KM_PAGE_EDIT_MODE
    ? `<button class="btn btn-primary btn-sm" onclick="saveKmPage()">Save</button> <button class="btn btn-sm" onclick="cancelKmPageEdit()">Cancel</button>`
    : (canEdit && hasPage ? `<button class="btn btn-sm" onclick="toggleKmPageEdit()">Edit</button>` : '');
}
function openDataEntryForm(entryId) {
  const entry = entryId ? byId(DB.data.kmDataEntries, entryId) : null;
  const mid = Modal.open(`
    ${modalHeader(entry ? 'Edit Data Entry' : 'Add Data Entry', '')}
    <div class="modal-body">
      <div class="field"><label>Title</label><input id="de-title" value="${entry ? escapeHtml(entry.title) : ''}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" data-cancel>Cancel</button>
      <button class="btn btn-primary" onclick="saveDataEntry('${entry ? entry.id : ''}')">Save</button>
    </div>
  `);
  wireCancel(mid);
}
function saveDataEntry(entryId) {
  const title = document.getElementById('de-title').value.trim();
  if (!title) { toast('Title is required.', 'error'); return; }
  if (entryId) {
    byId(DB.data.kmDataEntries, entryId).title = title;
  } else {
    DB.data.kmDataEntries.push({
      id: uid('kmd'), projectId: CURRENT_KM_PROJECT_ID, title,
      documents: [], steps: [], checklists: [], faqs: [], others: [], contacts: [], credentials: [],
    });
  }
  DB.save();
  Modal.closeAll();
  toast('Data entry saved.');
  route();
}
function deleteDataEntry(entryId) {
  if (!confirm('Delete this data entry? This cannot be undone.')) return;
  DB.data.kmDataEntries = DB.data.kmDataEntries.filter(d => d.id !== entryId);
  DB.save();
  toast('Data entry deleted.');
  route();
}

// ---------------- KM Data Entry (7 sub-tabs) ----------------
const KM_DATA_TABS = [
  ['documents', 'Documents'], ['steps', 'Engagement Steps'], ['checklist', 'Checklist'],
  ['faq', 'FAQ'], ['others', 'Others'], ['contacts', 'Contacts'], ['credentials', 'Credentials'],
];
function renderKmDataEntry(main) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const project = byId(DB.data.projects, entry.projectId);
  KM_CHECKLIST_EDIT_MODE = false;
  CURRENT_TOC_SCOPE = 'project';
  CURRENT_KM_PROJECT_ID = project.id;
  const rightHtml = `
    <div class="tabs">
      ${KM_DATA_TABS.map(([key, label]) => `<div class="tab ${CURRENT_KM_DATA_TAB === key ? 'active' : ''}" onclick="setKmDataTab('${key}')">${label}</div>`).join('')}
    </div>
    <div class="subtab-body" id="km-subtab-body"></div>
  `;
  renderKmShell(main, {
    title: entry.title, sub: project.name,
    pageScope: 'project', activeProjectId: project.id,
  }, rightHtml);
  renderKmDataSubtab();
}
function setKmDataTab(key) { CURRENT_KM_DATA_TAB = key; renderKmDataSubtab(); document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active')); route(); }
function renderKmDataSubtab() {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const body = document.getElementById('km-subtab-body');
  if (!body) return;
  const canEdit = canEditKm('fn-km-data-edit');
  const renderers = {
    documents: renderKmDocuments, steps: renderKmSteps, checklist: renderKmChecklist,
    faq: renderKmFaq, others: renderKmOthers, contacts: renderKmContacts, credentials: renderKmCredentials,
  };
  body.innerHTML = renderers[CURRENT_KM_DATA_TAB](entry, canEdit);
}

function renderKmDocuments(entry, canEdit) {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      ${canEdit ? `<label class="btn btn-sm btn-primary" style="cursor:pointer">+ Upload<input type="file" class="hidden" onchange="uploadKmDocument(event)"></label>` : ''}
    </div>
    <div class="doc-list">
      ${entry.documents.length === 0 ? '<div class="empty-state">No documents.</div>' : entry.documents.map(d => `
        <div class="doc-item">
          <div class="name">📄 ${escapeHtml(d.name)} <span class="subtle">(${d.uploadedAt})</span></div>
          <div class="btn-group">
            <button class="btn btn-sm" onclick="downloadKmDocument('${d.id}')">Download</button>
            ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="deleteKmDocument('${d.id}')">Delete</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function uploadKmDocument(event) {
  if (!canEditKm('fn-km-data-edit')) { toast('Not permitted.', 'error'); return; }
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
    entry.documents.push({ id: uid('doc'), name: file.name, uploadedAt: new Date().toISOString().slice(0, 10), dataUrl: reader.result });
    DB.save();
    toast('Document uploaded.');
    renderKmDataSubtab();
  };
  reader.readAsDataURL(file);
}
function downloadKmDocument(docId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const doc = byId(entry.documents, docId);
  if (doc.dataUrl) {
    const a = document.createElement('a'); a.href = doc.dataUrl; a.download = doc.name; a.click();
  } else {
    toast('This is seed/demo metadata with no underlying file — upload a real one to download it.', 'error');
  }
}
function deleteKmDocument(docId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.documents = entry.documents.filter(d => d.id !== docId);
  DB.save(); renderKmDataSubtab();
}

function renderKmSteps(entry, canEdit) {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openStepForm()">+ Add Step</button>` : ''}</div>
    <div class="step-list">
      ${entry.steps.length === 0 ? '<div class="empty-state">No engagement steps.</div>' : entry.steps.sort((a, b) => a.order - b.order).map(s => `
        <div class="step-item">
          <div class="step-order">${s.order}</div>
          <div style="flex:1"><div style="font-weight:600">${escapeHtml(s.title)}</div><div class="muted" style="font-size:12px">${escapeHtml(s.description)}</div></div>
          ${canEdit ? `<div class="btn-group"><button class="btn btn-sm" onclick="openStepForm('${s.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteStep('${s.id}')">Delete</button></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
function openStepForm(stepId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const step = stepId ? byId(entry.steps, stepId) : null;
  const mid = Modal.open(`
    ${modalHeader(step ? 'Edit Step' : 'Add Step', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Order</label><input id="step-order" type="number" value="${step ? step.order : entry.steps.length + 1}"></div>
        <div class="field"><label>Title</label><input id="step-title" value="${step ? escapeHtml(step.title) : ''}"></div>
      </div>
      <div class="field"><label>Description</label><textarea id="step-desc" rows="3">${step ? escapeHtml(step.description) : ''}</textarea></div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveStep('${step ? step.id : ''}')">Save</button></div>
  `);
  wireCancel(mid);
}
function wireCancel(modalId) {
  const btn = document.querySelector(`[data-modal-id="${modalId}"] [data-cancel]`);
  if (btn) btn.setAttribute('onclick', `Modal.close('${modalId}')`);
}
function saveStep(stepId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const order = parseInt(document.getElementById('step-order').value, 10) || 1;
  const title = document.getElementById('step-title').value.trim();
  const description = document.getElementById('step-desc').value.trim();
  if (!title) { toast('Title required.', 'error'); return; }
  if (stepId) {
    Object.assign(byId(entry.steps, stepId), { order, title, description });
  } else {
    entry.steps.push({ id: uid('step'), order, title, description });
  }
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteStep(stepId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.steps = entry.steps.filter(s => s.id !== stepId);
  DB.save(); renderKmDataSubtab();
}

// ---------------- Checklist (supports COPY/DUPLICATE per airline) ----------------
// Shared checklist table renderer (KM's read-only example AND an airline's Engagement Page
// instance both use this) — columns match the real iAPI THA engagement checklist reference:
// Steps / No. / Check / List / Remark / Announce Space / Coordinator, with Date appended
// only for a duplicated-onto-an-airline instance (a template has no real dates to track).
// opts.fullEdit turns on inline editing of No./List/Remark/Announce Space/Coordinator plus a
// per-row delete column — used only by the airline's own Engagement Page checklist (its copy
// is independent of the KM template once duplicated). opts.onStepTemplate, when supplied, adds
// a small "Template" button to each step's cell that jumps straight to the matching template.
function renderChecklistTable(items, opts) {
  opts = opts || {};
  const stepColor = { Development: '#4f81bd', Certificate: '#9b59b6', Cutover: '#70ad47' };
  const totalCols = (opts.showDate ? 8 : 7) + (opts.fullEdit ? 1 : 0);
  let rows = '';
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.banner) {
      rows += `<tr class="checklist-banner checklist-banner-${item.bannerStyle || 'red'}"><td colspan="${totalCols}">${escapeHtml(item.list)}</td></tr>`;
      continue;
    }
    const isFirstOfStep = idx === 0 || items[idx - 1].banner || items[idx - 1].step !== item.step;
    let span = 0;
    if (isFirstOfStep) { for (let j = idx; j < items.length && !items[j].banner && items[j].step === item.step; j++) span++; }
    const bgStyle = stepColor[item.step] ? `background:color-mix(in srgb, ${stepColor[item.step]} 20%, transparent)` : '';
    rows += `<tr>`;
    if (isFirstOfStep) {
      rows += `<td rowspan="${span}" class="checklist-step-cell" style="${bgStyle}">${escapeHtml(item.step)}${opts.onStepTemplate ? `<button type="button" class="btn btn-sm" style="display:block;margin:6px auto 0;font-size:10px" onclick="(${opts.onStepTemplate})('${item.step}')">✉ Template</button>` : ''}</td>`;
    }
    rows += `<td style="${bgStyle}">${opts.fullEdit
      ? `<input class="cki-no" value="${escapeHtml(item.no || '')}" style="width:60px;min-width:0" onchange="(${opts.onField})(${idx},'no',this.value)">`
      : escapeHtml(item.no || '')}</td>`;
    rows += `<td style="${bgStyle};text-align:center">${opts.editable
      ? `<input type="checkbox" ${item.done ? 'checked' : ''} onchange="(${opts.onCheck})(${idx}, this.checked)">`
      : `<input type="checkbox" disabled ${item.done ? 'checked' : ''}>`}</td>`;
    rows += `<td style="${bgStyle}">${opts.fullEdit
      ? `<input value="${escapeHtml(item.list)}" onchange="(${opts.onField})(${idx},'list',this.value)">`
      : escapeHtml(item.list)}${opts.showItemActions ? ` <button type="button" class="btn btn-sm btn-danger" style="float:right" onclick="(${opts.onDeleteItem})(${idx})">✕</button>` : ''}</td>`;
    rows += `<td style="${bgStyle};font-size:11.5px">${opts.fullEdit
      ? `<textarea rows="2" style="width:100%" onchange="(${opts.onField})(${idx},'remark',this.value)">${escapeHtml(item.remark || '')}</textarea>`
      : `<span style="white-space:pre-wrap">${escapeHtml(item.remark || '')}</span>`}</td>`;
    rows += `<td style="${bgStyle};font-size:11.5px">${opts.fullEdit
      ? `<input value="${escapeHtml(item.announceSpace || '')}" onchange="(${opts.onField})(${idx},'announceSpace',this.value)">`
      : escapeHtml(item.announceSpace || '')}</td>`;
    rows += `<td style="${bgStyle};font-size:11.5px">${opts.fullEdit
      ? `<input value="${escapeHtml(item.coordinator || '')}" onchange="(${opts.onField})(${idx},'coordinator',this.value)">`
      : escapeHtml(item.coordinator || '')}</td>`;
    if (opts.showDate) {
      rows += `<td style="${bgStyle}">${opts.editable
        ? `<input type="date" value="${item.date || ''}" onchange="(${opts.onDate})(${idx}, this.value)">`
        : escapeHtml(item.date || '')}</td>`;
    }
    if (opts.fullEdit) rows += `<td><button type="button" class="btn btn-sm btn-danger" onclick="(${opts.onDeleteRow})(${idx})">✕</button></td>`;
    rows += `</tr>`;
  }
  return `
    <div class="table-wrap table-scroll"><table class="checklist-table"><thead><tr>
      <th>Steps</th><th>No.</th><th>Check</th><th>List</th><th>Remark</th><th>Announce Space</th><th>Coordinator</th>${opts.showDate ? '<th>Date</th>' : ''}${opts.fullEdit ? '<th></th>' : ''}
    </tr></thead><tbody>${rows || `<tr><td colspan="${totalCols}" class="empty-state">No checklist items.</td></tr>`}</tbody></table></div>
  `;
}
// Non-editable by default — click Edit to reveal inline text-field editing (Add/+Item/Delete
// all live behind that same toggle too); Duplicate stays available either way since it doesn't
// modify the template itself.
let KM_CHECKLIST_EDIT_MODE = false;
function toggleKmChecklistEditMode() {
  KM_CHECKLIST_EDIT_MODE = !KM_CHECKLIST_EDIT_MODE;
  renderKmDataSubtab();
}
function renderKmChecklist(entry, canEdit) {
  const editing = canEdit && KM_CHECKLIST_EDIT_MODE;
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;gap:8px">
      ${canEdit ? `<button class="btn btn-sm ${editing ? 'btn-primary' : ''}" onclick="toggleKmChecklistEditMode()">${editing ? 'Done Editing' : '✎ Edit'}</button>` : ''}
      ${editing ? `<button class="btn btn-sm btn-primary" onclick="openChecklistForm()">+ New Checklist</button>` : ''}
    </div>
    ${entry.checklists.length === 0 ? '<div class="empty-state">No checklists.</div>' : entry.checklists.map(cl => `
      <div class="checklist-block">
        <div class="checklist-header">
          <div><b>${escapeHtml(cl.name)}</b> <span class="muted" style="font-size:11px">— example/reference. Duplicate it onto an airline or host to start tracking a real engagement.</span></div>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="openDuplicateChecklistModal('${cl.id}')">Duplicate</button>
            ${editing ? `<button class="btn btn-sm" onclick="openChecklistItemForm('${cl.id}')">+ Item</button>` : ''}
            ${editing ? `<button class="btn btn-sm btn-danger" onclick="deleteChecklist('${cl.id}')">Delete Checklist</button>` : ''}
          </div>
        </div>
        ${renderChecklistTable(cl.items, {
          showDate: false, editable: false, fullEdit: editing,
          onField: `(i,f,v)=>updateChecklistItemField('${cl.id}',i,f,v)`,
          onDeleteRow: `(i)=>deleteChecklistItemAt('${cl.id}', i)`,
        })}
      </div>
    `).join('')}
  `;
}
function updateChecklistItemField(checklistId, itemIndex, field, value) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  byId(entry.checklists, checklistId).items[itemIndex][field] = value;
  DB.save();
}
function openChecklistForm() {
  const mid = Modal.open(`
    ${modalHeader('New Checklist', '')}
    <div class="modal-body"><div class="field"><label>Name</label><input id="cl-name" placeholder="e.g. Standard iAPI Checklist"></div></div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveNewChecklist()">Create</button></div>
  `);
  wireCancel(mid);
}
function saveNewChecklist() {
  const name = document.getElementById('cl-name').value.trim();
  if (!name) { toast('Name required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.checklists.push({ id: uid('chk'), name, items: [] });
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function openDuplicateChecklistModal(checklistId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const airlines = DB.data.airlines.filter(a => a.projectId === entry.projectId);
  const hosts = DB.data.hosts.filter(h => h.projectId === entry.projectId);
  if (airlines.length === 0 && hosts.length === 0) { toast('No airlines or hosts in this project yet.', 'error'); return; }
  const mid = Modal.open(`
    ${modalHeader('Duplicate Checklist', '')}
    <div class="modal-body">
      <div class="field"><label>Duplicate To</label>
        <select id="dup-checklist-target-type" onchange="renderDuplicateChecklistTargetOptions()">
          ${airlines.length ? `<option value="airline">Airline</option>` : ''}
          ${hosts.length ? `<option value="host">Host</option>` : ''}
        </select>
      </div>
      <div class="field"><label id="dup-checklist-target-label">Airline</label>
        <select id="dup-checklist-target"></select>
      </div>
      <div class="field-hint">A copy of this checklist is added to the selected airline's Engagement Page or host's Detail view (Engagement Log → View Details). The example here in KM stays unchanged.</div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="confirmDuplicateChecklist('${checklistId}')">Duplicate</button></div>
  `);
  wireCancel(mid);
  renderDuplicateChecklistTargetOptions();
}
function renderDuplicateChecklistTargetOptions() {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const targetType = document.getElementById('dup-checklist-target-type').value;
  const label = document.getElementById('dup-checklist-target-label');
  const select = document.getElementById('dup-checklist-target');
  if (targetType === 'host') {
    label.textContent = 'Host';
    select.innerHTML = DB.data.hosts.filter(h => h.projectId === entry.projectId)
      .map(h => `<option value="${h.id}">${escapeHtml(h.name)}${h.status === 'inactive' ? ' — inactive' : ''}</option>`).join('');
  } else {
    label.textContent = 'Airline';
    select.innerHTML = DB.data.airlines.filter(a => a.projectId === entry.projectId)
      .map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.iata)})${a.status === 'inactive' ? ' — inactive' : ''}</option>`).join('');
  }
}
function confirmDuplicateChecklist(checklistId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const source = byId(entry.checklists, checklistId);
  const targetType = document.getElementById('dup-checklist-target-type').value;
  const targetId = document.getElementById('dup-checklist-target').value;
  const targetArr = targetType === 'host' ? DB.data.hosts : DB.data.airlines;
  const target = byId(targetArr, targetId);
  if (!target) { toast(`Select a ${targetType}.`, 'error'); return; }
  target.checklists = target.checklists || [];
  target.checklists.push({
    id: uid('achk'), name: source.name, sourceEntryId: entry.id, sourceEntryTitle: entry.title, dataTypeId: entry.dataTypeId,
    items: source.items.map(i => i.banner
      ? { id: uid('acki'), banner: true, bannerStyle: i.bannerStyle, list: i.list }
      : { id: uid('acki'), step: i.step, no: i.no, list: i.list, remark: i.remark, announceSpace: i.announceSpace, coordinator: i.coordinator, done: false, date: '' }),
  });
  DB.save();
  Modal.closeAll();
  toast(`Checklist duplicated to ${target.name}'s ${targetType === 'host' ? 'Detail view' : 'Engagement Page'}.`);
}
function deleteChecklist(checklistId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.checklists = entry.checklists.filter(c => c.id !== checklistId);
  DB.save(); renderKmDataSubtab();
}
function openChecklistItemForm(checklistId) {
  const mid = Modal.open(`
    ${modalHeader('Add Checklist Item', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Step</label><input id="cli-step" placeholder="e.g. Contact"></div>
        <div class="field"><label>No.</label><input id="cli-no" placeholder="e.g. 2.1"></div>
      </div>
      <div class="field"><label>List</label><input id="cli-list" placeholder="What this checklist row is for"></div>
      <div class="field"><label>Remark</label><textarea id="cli-remark" rows="2"></textarea></div>
      <div class="form-row">
        <div class="field"><label>Announce Space</label><input id="cli-announce" placeholder="e.g. Zulip : Carrier Engagement Team"></div>
        <div class="field"><label>Coordinator</label><input id="cli-coordinator"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveChecklistItem('${checklistId}')">Add</button></div>
  `);
  wireCancel(mid);
}
function saveChecklistItem(checklistId) {
  const step = document.getElementById('cli-step').value.trim();
  const list = document.getElementById('cli-list').value.trim();
  if (!step || !list) { toast('Step and List are required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  byId(entry.checklists, checklistId).items.push({
    id: uid('ci'), step, no: document.getElementById('cli-no').value.trim(), list,
    remark: document.getElementById('cli-remark').value.trim(),
    announceSpace: document.getElementById('cli-announce').value.trim(),
    coordinator: document.getElementById('cli-coordinator').value.trim(),
  });
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteChecklistItemAt(checklistId, itemIndex) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  byId(entry.checklists, checklistId).items.splice(itemIndex, 1);
  DB.save(); renderKmDataSubtab();
}

// ---------------- FAQ ----------------
function renderKmFaq(entry, canEdit) {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openFaqForm()">+ Add FAQ</button>` : ''}</div>
    ${entry.faqs.length === 0 ? '<div class="empty-state">No FAQs.</div>' : entry.faqs.map(f => `
      <div class="faq-item">
        <div class="faq-q">Q: ${escapeHtml(f.question)}</div>
        <div class="faq-a">A: ${escapeHtml(f.answer)}</div>
        ${canEdit ? `<div class="btn-group" style="margin-top:6px"><button class="btn btn-sm" onclick="openFaqForm('${f.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteFaq('${f.id}')">Delete</button></div>` : ''}
      </div>
    `).join('')}
  `;
}
function openFaqForm(faqId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  const faq = faqId ? byId(entry.faqs, faqId) : null;
  const mid = Modal.open(`
    ${modalHeader(faq ? 'Edit FAQ' : 'Add FAQ', '')}
    <div class="modal-body">
      <div class="field"><label>Question</label><input id="faq-q" value="${faq ? escapeHtml(faq.question) : ''}"></div>
      <div class="field"><label>Answer</label><textarea id="faq-a" rows="3">${faq ? escapeHtml(faq.answer) : ''}</textarea></div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveFaq('${faqId || ''}')">${faq ? 'Save' : 'Add'}</button></div>
  `);
  wireCancel(mid);
}
function saveFaq(faqId) {
  const question = document.getElementById('faq-q').value.trim();
  const answer = document.getElementById('faq-a').value.trim();
  if (!question || !answer) { toast('Question and answer required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  if (faqId) {
    Object.assign(byId(entry.faqs, faqId), { question, answer });
  } else {
    entry.faqs.push({ id: uid('faq'), question, answer });
  }
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteFaq(faqId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.faqs = entry.faqs.filter(f => f.id !== faqId);
  DB.save(); renderKmDataSubtab();
}

// ---------------- Others ----------------
function renderKmOthers(entry, canEdit) {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openOtherForm()">+ Add Note</button>` : ''}</div>
    ${entry.others.length === 0 ? '<div class="empty-state">No other notes.</div>' : entry.others.map(o => `
      <div class="faq-item">
        <div>${escapeHtml(o.note)}</div>
        ${canEdit ? `<div style="margin-top:6px"><button class="btn btn-sm btn-danger" onclick="deleteOther('${o.id}')">Delete</button></div>` : ''}
      </div>
    `).join('')}
  `;
}
function openOtherForm() {
  const mid = Modal.open(`
    ${modalHeader('Add Note', '')}
    <div class="modal-body"><div class="field"><label>Note</label><textarea id="oth-note" rows="3"></textarea></div></div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveOther()">Add</button></div>
  `);
  wireCancel(mid);
}
function saveOther() {
  const note = document.getElementById('oth-note').value.trim();
  if (!note) { toast('Note required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.others.push({ id: uid('oth'), note });
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteOther(otherId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.others = entry.others.filter(o => o.id !== otherId);
  DB.save(); renderKmDataSubtab();
}

// ---------------- Contacts ----------------
function renderKmContacts(entry, canEdit) {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openKmContactForm()">+ Add Contact</button>` : ''}</div>
    <div class="table-wrap table-scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Org</th><th>Phone</th><th>Email</th>${canEdit ? '<th></th>' : ''}</tr></thead>
    <tbody>${entry.contacts.map(c => `
      <tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.role)}</td><td>${escapeHtml(c.org)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td>
      ${canEdit ? `<td><button class="btn btn-sm btn-danger" onclick="deleteKmContact('${c.id}')">Delete</button></td>` : ''}</tr>
    `).join('')}</tbody></table></div>
  `;
}
function openKmContactForm() {
  const mid = Modal.open(`
    ${modalHeader('Add Contact', '')}
    <div class="modal-body">
      <div class="form-row"><div class="field"><label>Name</label><input id="kc-name"></div><div class="field"><label>Role</label><input id="kc-role"></div></div>
      <div class="form-row"><div class="field"><label>Organization</label><input id="kc-org"></div></div>
      <div class="form-row"><div class="field"><label>Phone</label><input id="kc-phone"></div><div class="field"><label>Email</label><input id="kc-email"></div></div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveKmContact()">Add</button></div>
  `);
  wireCancel(mid);
}
function saveKmContact() {
  const name = document.getElementById('kc-name').value.trim();
  if (!name) { toast('Name required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.contacts.push({
    id: uid('kc'), name, role: document.getElementById('kc-role').value.trim(),
    org: document.getElementById('kc-org').value.trim(), phone: document.getElementById('kc-phone').value.trim(),
    email: document.getElementById('kc-email').value.trim(),
  });
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteKmContact(contactId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.contacts = entry.contacts.filter(c => c.id !== contactId);
  DB.save(); renderKmDataSubtab();
}

// ---------------- Credentials (restricted/sensitive) ----------------
function renderKmCredentials(entry, canEdit) {
  const user = Session.currentUser();
  const canView = hasPerm(user, 'program', 'fn-km-credentials-view');
  if (!canView) return `<div class="empty-state">🔒 You do not have permission to view credentials.</div>`;
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openKmCredentialForm()">+ Add Credential</button>` : ''}</div>
    ${entry.credentials.length === 0 ? '<div class="empty-state">No credentials stored.</div>' : entry.credentials.map(c => `
      <div class="credential-item">
        <div class="credential-flag">restricted · AES-encrypted at rest</div>
        <div class="form-row" style="margin-top:6px">
          <div class="field"><label>System</label><div>${escapeHtml(c.system)}</div></div>
          <div class="field"><label>Type</label><div>${escapeHtml(c.type)}</div></div>
          <div class="field"><label>Host</label><div class="mono">${escapeHtml(c.host)}</div></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Username</label><div class="mono">${escapeHtml(c.username)}</div></div>
          <div class="field"><label>Secret</label><div class="masked" id="cred-secret-${c.id}">••••••••••</div></div>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm" onclick="document.getElementById('cred-secret-${c.id}').textContent='${escapeHtml(c.secret)}'">Reveal</button>
          ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="deleteKmCredential('${c.id}')">Delete</button>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}
function openKmCredentialForm() {
  const mid = Modal.open(`
    ${modalHeader('Add Credential', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>System</label><input id="cred-system"></div>
        <div class="field"><label>Type</label><select id="cred-type"><option>Host</option><option>VPN</option><option>SFTP</option></select></div>
      </div>
      <div class="form-row"><div class="field"><label>Host</label><input id="cred-host"></div></div>
      <div class="form-row">
        <div class="field"><label>Username</label><input id="cred-username"></div>
        <div class="field"><label>Secret</label><input id="cred-secret" type="password"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveKmCredential()">Add</button></div>
  `);
  wireCancel(mid);
}
function saveKmCredential() {
  const system = document.getElementById('cred-system').value.trim();
  if (!system) { toast('System name required.', 'error'); return; }
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.credentials.push({
    id: uid('cred'), system, type: document.getElementById('cred-type').value,
    host: document.getElementById('cred-host').value.trim(), username: document.getElementById('cred-username').value.trim(),
    secret: document.getElementById('cred-secret').value, restricted: true,
  });
  DB.save(); Modal.closeAll(); renderKmDataSubtab();
}
function deleteKmCredential(credId) {
  const entry = byId(DB.data.kmDataEntries, CURRENT_KM_DATA_ID);
  entry.credentials = entry.credentials.filter(c => c.id !== credId);
  DB.save(); renderKmDataSubtab();
}

// ===================================================================
// ENGAGEMENT LOG SITE
// ===================================================================
let CURRENT_ENG_PROJECT_ID = null;
let CURRENT_ENG_TAB = 'airline';
// Per-tab search/filter/pagination state for the Airline & Host lists.
function defaultEngFilter(tab) {
  return tab === 'airline'
    ? { name: '', iata: '', dataTypeIds: [], statusIds: [], activeFilter: 'active', pageSize: 20, page: 1 }
    : { name: '', dataTypeIds: [], statusIds: [], activeFilter: 'active', pageSize: 20, page: 1 };
}
let engFilters = { airline: defaultEngFilter('airline'), host: defaultEngFilter('host') };

function renderEngagementRoute(parts) {
  if (parts[1] === 'project' && parts[2]) {
    CURRENT_ENG_PROJECT_ID = parts[2];
    const project = byId(DB.data.projects, parts[2]);
    renderShell(renderEngagementProject, { crumbs: [['Home', '#/landing'], ['Engagement Log', '#/engagement'], [project?.name || 'Project', null]] });
    return;
  }
  renderShell(renderEngagementHome, { crumbs: [['Home', '#/landing'], ['Engagement Log', null]] });
}
function renderEngagementHome(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Engagement Log</div><div class="page-sub">Airline &amp; Host certification tracking, by project</div></div>
    </div>
    ${renderProjectBrowser('#/engagement')}
  `;
}

function airlineHostSummary(airlineId) {
  const links = DB.data.airlineHostLinks.filter(l => l.airlineId === airlineId);
  if (links.length === 0) return '<span class="subtle">— none —</span>';
  return links.map(l => {
    const host = byId(DB.data.hosts, l.hostId);
    const dirLabel = l.routeDirection === 'both' ? '' : ` (${l.routeDirection})`;
    return `${escapeHtml(host?.name || '?')}${dirLabel}`;
  }).join(', ');
}

function statusBadge(statusId) {
  const s = byId(DB.data.statuses, statusId);
  if (!s) return '';
  return `<span class="badge" style="background:color-mix(in srgb, ${s.color} 18%, transparent); color:${s.color}"><span class="badge-dot" style="background:${s.color}"></span>${escapeHtml(s.label)}</span>`;
}
function statusSelect(currentId, onchangeAttr) {
  return `<select class="status-select" onchange="${onchangeAttr}">
    ${DB.data.statuses.map(s => `<option value="${s.id}" ${s.id === currentId ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
  </select>`;
}
function renderStatusSummaryStrip(records) {
  const counts = {};
  records.forEach(r => { counts[r.statusId] = (counts[r.statusId] || 0) + 1; });
  const total = records.length;
  return `
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total</div><div class="value">${total}</div></div>
      ${DB.data.statuses.filter(s => counts[s.id]).map(s => `
        <div class="summary-card" style="border-left:3px solid ${s.color}">
          <div class="label">${escapeHtml(s.label)}</div>
          <div class="value" style="color:${s.color}">${counts[s.id]}</div>
          <div class="sub">${pct(counts[s.id], total)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEngagementProject(main) {
  const project = byId(DB.data.projects, CURRENT_ENG_PROJECT_ID);
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">${escapeHtml(project.name)}</div><div class="page-sub">Engagement Log</div></div>
      <div class="btn-group">
        ${hasPerm(Session.currentUser(), 'report', 'fn-report-progress-export') ? `<button class="btn btn-sm" onclick="openProgressReportModal()">📤 Progress Report</button>` : ''}
        ${hasPerm(Session.currentUser(), 'report', 'fn-report-quicksum') ? `<button class="btn btn-sm" onclick="openQuickSumModal()">🗓 Quick Sum Monthly Report</button>` : ''}
      </div>
    </div>
    <div class="tabs">
      <div class="tab ${CURRENT_ENG_TAB === 'airline' ? 'active' : ''}" onclick="setEngTab('airline')">✈ Airline</div>
      <div class="tab ${CURRENT_ENG_TAB === 'host' ? 'active' : ''}" onclick="setEngTab('host')">🖥 Host</div>
    </div>
    <div id="eng-tab-body"></div>
    ${pageFooter('#/engagement', '← Back to Engagement Log')}
  `;
  renderEngTabBody();
}
function setEngTab(tab) { CURRENT_ENG_TAB = tab; route(); }
function renderEngTabBody() {
  const body = document.getElementById('eng-tab-body');
  if (!body) return;
  body.innerHTML = `
    <div id="eng-summary"></div>
    ${renderEngFilterBar(CURRENT_ENG_TAB)}
    <div id="eng-results"></div>
  `;
  renderEngResults();
}
function renderEngResults() {
  const summary = document.getElementById('eng-summary');
  const results = document.getElementById('eng-results');
  if (!results) return;
  if (CURRENT_ENG_TAB === 'airline') {
    const filtered = filterAirlines();
    const summaryRecords = DB.data.engagementRecords.filter(r => r.projectId === CURRENT_ENG_PROJECT_ID && filtered.some(a => a.id === r.airlineId));
    summary.innerHTML = renderStatusSummaryStrip(summaryRecords);
    results.innerHTML = renderAirlineResults(filtered);
  } else {
    const filtered = filterHosts();
    const summaryRecords = DB.data.engagementRecords.filter(r => r.projectId === CURRENT_ENG_PROJECT_ID && filtered.some(hh => hh.id === r.hostId));
    summary.innerHTML = renderStatusSummaryStrip(summaryRecords);
    results.innerHTML = renderHostResults(filtered);
  }
}

// ---------------- Search / filter bar (shared shape, Airline & Host tabs) ----------------
function renderEngFilterBar(tab) {
  const f = engFilters[tab];
  return `
    <div class="eng-filter-bar">
      <div class="eng-filter-row">
        <div class="field" style="max-width:200px;margin-bottom:0"><label>${tab === 'airline' ? 'Airline Name' : 'Host Name'}</label>
          <input value="${escapeHtml(f.name)}" placeholder="Search name…" oninput="setEngFilterText('${tab}','name',this.value)">
        </div>
        ${tab === 'airline' ? `<div class="field" style="max-width:120px;margin-bottom:0"><label>IATA Code</label>
          <input value="${escapeHtml(f.iata)}" maxlength="3" placeholder="e.g. TG" oninput="setEngFilterText('${tab}','iata',this.value)"></div>` : ''}
        <div class="field" style="max-width:150px;margin-bottom:0"><label>Activate Status</label>
          <select onchange="setEngFilterOther('${tab}','activeFilter',this.value)">
            <option value="active" ${f.activeFilter === 'active' ? 'selected' : ''}>Active only</option>
            <option value="inactive" ${f.activeFilter === 'inactive' ? 'selected' : ''}>Inactive only</option>
            <option value="all" ${f.activeFilter === 'all' ? 'selected' : ''}>All</option>
          </select>
        </div>
        <div class="field" style="max-width:120px;margin-bottom:0"><label>Records / Page</label>
          <select onchange="setEngFilterOther('${tab}','pageSize',parseInt(this.value,10))">
            ${[10, 20, 50, 100].map(n => `<option value="${n}" ${f.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="eng-filter-row">
        <div class="eng-filter-group"><span class="eng-filter-label">Data:</span>
          ${DB.data.dataTypes.map(dt => `<label class="chip-check"><input type="checkbox" ${f.dataTypeIds.includes(dt.id) ? 'checked' : ''} onchange="toggleEngFilterList('${tab}','dataTypeIds','${dt.id}',this.checked)">${escapeHtml(dt.code)}</label>`).join('')}
        </div>
        <div class="eng-filter-group"><span class="eng-filter-label">Engagement Status:</span>
          ${DB.data.statuses.map(s => `<label class="chip-check"><input type="checkbox" ${f.statusIds.includes(s.id) ? 'checked' : ''} onchange="toggleEngFilterList('${tab}','statusIds','${s.id}',this.checked)">${escapeHtml(s.label)}</label>`).join('')}
        </div>
        <button class="btn btn-sm" onclick="clearEngFilter('${tab}')">Clear Filters</button>
      </div>
    </div>
  `;
}
function setEngFilterText(tab, key, val) { engFilters[tab][key] = val; engFilters[tab].page = 1; renderEngResults(); }
function setEngFilterOther(tab, key, val) { engFilters[tab][key] = val; engFilters[tab].page = 1; renderEngResults(); }
function toggleEngFilterList(tab, key, id, checked) {
  const list = engFilters[tab][key];
  engFilters[tab][key] = checked ? [...list, id] : list.filter(x => x !== id);
  engFilters[tab].page = 1;
  renderEngResults();
}
function clearEngFilter(tab) { engFilters[tab] = defaultEngFilter(tab); renderEngTabBody(); }

function filterAirlines() {
  const f = engFilters.airline;
  let list = DB.data.airlines.filter(a => a.projectId === CURRENT_ENG_PROJECT_ID);
  if (f.activeFilter !== 'all') list = list.filter(a => a.status === f.activeFilter);
  if (f.name.trim()) { const q = f.name.trim().toLowerCase(); list = list.filter(a => a.name.toLowerCase().includes(q)); }
  if (f.iata.trim()) { const q = f.iata.trim().toLowerCase(); list = list.filter(a => a.iata.toLowerCase().includes(q)); }
  if (f.dataTypeIds.length || f.statusIds.length) {
    list = list.filter(a => {
      const recs = DB.data.engagementRecords.filter(r => r.airlineId === a.id && (f.dataTypeIds.length === 0 || f.dataTypeIds.includes(r.dataTypeId)));
      if (recs.length === 0) return false;
      return f.statusIds.length === 0 || recs.some(r => f.statusIds.includes(r.statusId));
    });
  }
  return list;
}
function filterHosts() {
  const f = engFilters.host;
  let list = DB.data.hosts.filter(h => h.projectId === CURRENT_ENG_PROJECT_ID);
  if (f.activeFilter !== 'all') list = list.filter(h => h.status === f.activeFilter);
  if (f.name.trim()) { const q = f.name.trim().toLowerCase(); list = list.filter(h => h.name.toLowerCase().includes(q)); }
  if (f.dataTypeIds.length || f.statusIds.length) {
    list = list.filter(h => {
      const recs = DB.data.engagementRecords.filter(r => r.hostId === h.id && (f.dataTypeIds.length === 0 || f.dataTypeIds.includes(r.dataTypeId)));
      if (recs.length === 0) return false;
      return f.statusIds.length === 0 || recs.some(r => f.statusIds.includes(r.statusId));
    });
  }
  return list;
}
function paginate(list, f) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / f.pageSize));
  if (f.page > totalPages) f.page = totalPages;
  const start = (f.page - 1) * f.pageSize;
  return { pageItems: list.slice(start, start + f.pageSize), total, totalPages, start };
}
function pagerHtml(tab, total, totalPages, page, start, countOnPage) {
  if (total === 0) return '';
  return `
    <div class="eng-pager">
      <span class="muted" style="font-size:11.5px">${start + 1}–${start + countOnPage} of ${total}</span>
      <div class="btn-group">
        <button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="setEngPage('${tab}',${page - 1})">‹ Prev</button>
        <span class="muted" style="font-size:11.5px;align-self:center">Page ${page} / ${totalPages}</span>
        <button class="btn btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="setEngPage('${tab}',${page + 1})">Next ›</button>
      </div>
    </div>
  `;
}
function setEngPage(tab, page) { engFilters[tab].page = page; renderEngResults(); }

function renderAirlineResults(airlines) {
  const user = Session.currentUser();
  const canEditStatus = hasPerm(user, 'program', 'fn-eng-airline-status');
  const canAdd = hasPerm(user, 'program', 'fn-eng-airline-add');
  const canEdit = hasPerm(user, 'program', 'fn-eng-airline-edit');
  const f = engFilters.airline;
  const { pageItems, total, totalPages, start } = paginate(airlines, f);
  const colCount = 5 + DB.data.dataTypes.length;
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="muted" style="font-size:11.5px">${total} airline${total === 1 ? '' : 's'} match filters</span>
      ${canAdd ? `<button class="btn btn-sm btn-primary" onclick="openAirlineForm()">+ Add Airline</button>` : ''}
    </div>
    <div class="table-wrap table-scroll table-scroll-20"><table class="eng-table"><thead><tr>
      <th>Airline</th><th>IATA</th><th>Host</th>
      ${DB.data.dataTypes.map(dt => `<th>${escapeHtml(dt.code)}</th>`).join('')}
      <th>Status</th><th></th>
    </tr></thead>
    <tbody>${pageItems.length === 0 ? `<tr><td colspan="${colCount}" class="empty-state">No airlines match these filters.</td></tr>` : pageItems.map(a => `
      <tr class="${a.status === 'inactive' ? 'inactive-row' : ''}">
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.iata)}</td>
        <td style="font-size:12px">${airlineHostSummary(a.id)}</td>
        ${DB.data.dataTypes.map(dt => {
          const rec = DB.data.engagementRecords.find(r => r.airlineId === a.id && r.dataTypeId === dt.id);
          return `<td>
            ${rec ? (canEditStatus ? statusSelect(rec.statusId, `updateEngagementStatus('${rec.id}', this.value)`) : statusBadge(rec.statusId)) : '—'}
            <div><button class="btn btn-sm" style="margin-top:4px" onclick="openAirlineDetailModal('${a.id}','${dt.id}')">View Details</button></div>
          </td>`;
        }).join('')}
        <td>${a.status === 'active' ? '<span class="subtle">active</span>' : '<span class="text-danger">inactive</span>'}</td>
        <td style="white-space:nowrap">
          ${canEdit ? `<button class="btn btn-sm btn-icon" title="Edit" onclick="openAirlineForm('${a.id}')">✎</button>` : ''}
          ${canEdit ? (a.status === 'active'
            ? `<button class="btn btn-sm btn-icon btn-danger" title="Deactivate" onclick="setAirlineStatus('${a.id}','inactive')">🚫</button>`
            : `<button class="btn btn-sm btn-icon" title="Reactivate" onclick="setAirlineStatus('${a.id}','active')">▶</button>`) : ''}
        </td>
      </tr>
    `).join('')}</tbody></table></div>
    ${pagerHtml('airline', total, totalPages, f.page, start, pageItems.length)}
  `;
}
function updateEngagementStatus(recordId, statusId) {
  const rec = byId(DB.data.engagementRecords, recordId);
  rec.statusId = statusId;
  rec.lastUpdated = new Date().toISOString().slice(0, 10);
  DB.data.auditLog.unshift({ id: uid('audit'), timestamp: new Date().toISOString(), username: Session.currentUser().username, action: 'Update Engagement Status', details: `record ${recordId} -> ${statusId}` });
  DB.save();
  toast('Status updated.');
  renderEngResults();
}
function openAirlineForm(airlineId) {
  const airline = airlineId ? byId(DB.data.airlines, airlineId) : null;
  const mid = Modal.open(`
    ${modalHeader(airline ? 'Edit Airline' : 'Add Airline', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Airline Name</label><input id="al-name" value="${airline ? escapeHtml(airline.name) : ''}"></div>
        <div class="field"><label>IATA Code</label><input id="al-iata" maxlength="3" value="${airline ? escapeHtml(airline.iata) : ''}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>ICAO Code</label><input id="al-icao" maxlength="4" value="${airline ? escapeHtml(airline.icao || '') : ''}"></div>
        <div class="field"><label>Country</label><input id="al-country" value="${airline ? escapeHtml(airline.homeCountry || '') : ''}"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveAirline('${airline ? airline.id : ''}')">Save</button></div>
  `);
  wireCancel(mid);
}
function saveAirline(airlineId) {
  const name = document.getElementById('al-name').value.trim();
  const iata = document.getElementById('al-iata').value.trim().toUpperCase();
  const icao = document.getElementById('al-icao').value.trim().toUpperCase();
  const homeCountry = document.getElementById('al-country').value.trim();
  if (!name) { toast('Name required.', 'error'); return; }
  if (airlineId) {
    Object.assign(byId(DB.data.airlines, airlineId), { name, iata, icao, homeCountry });
  } else {
    const newAirline = {
      id: uid('al'), projectId: CURRENT_ENG_PROJECT_ID, name, iata, icao, homeCountry, status: 'active',
      dcsHostInboundId: '', dcsHostOutboundId: '', ars: '', dateContacted: '', goLiveStatus: 'not_started',
      cutoverDirection: '', port: '', crewSubmission: 'no', checklists: [],
    };
    DB.data.airlines.push(newAirline);
    DB.data.dataTypes.forEach(dt => {
      DB.data.engagementRecords.push({ id: uid('er'), projectId: CURRENT_ENG_PROJECT_ID, airlineId: newAirline.id, hostId: null, dataTypeId: dt.id, statusId: 'not_started', pax: 0, lastUpdated: new Date().toISOString().slice(0, 10) });
    });
  }
  DB.save(); Modal.closeAll(); renderEngResults();
}
function setAirlineStatus(airlineId, status) {
  byId(DB.data.airlines, airlineId).status = status;
  DB.save(); renderEngResults();
}

// ---------------- Airline Engagement Page ("View Details" popup) ----------------
// Opened from the Airline table. View mode is closable at any time; clicking Edit locks the
// modal (no backdrop-dismiss, no close icon) until Save or Cancel — enforced by keeping the
// modal permanently `persistent` and only rendering a close control in view mode.
// Shared step vocabulary — checklist item .step values AND coordinationTemplates .step values
// both draw from this list, so a checklist row's "Template" button can filter templates by step.
const CHECKLIST_STEPS = ['Pre-Engage', 'Contact', 'Development', 'Certificate', 'Cutover', 'Post-Cutover'];
const GO_LIVE_STATUSES = [['not_started', 'Not Started'], ['in_progress', 'In Progress'], ['live', 'Live']];
const CUTOVER_DIRECTIONS = [['', '—'], ['inbound', 'Inbound'], ['outbound', 'Outbound'], ['both', 'Both']];
let AIRLINE_DETAIL_MODAL_ID = null;
let AIRLINE_DETAIL_AIRLINE_ID = null;
let AIRLINE_DETAIL_DATA_TYPE_ID = null;
let AIRLINE_DETAIL_EDIT = false;
let AIRLINE_DETAIL_DRAFT = null;
// Opened per data type (one "View Details" box per APP/iAPI/PNR/PAXLST column) — the shared
// airline fields (name, hosts, ARS, ...) always show, but the checklist section is filtered
// to just this data type's checklist(s), matching how the airline was actually duplicated onto.
function openAirlineDetailModal(airlineId, dataTypeId) {
  AIRLINE_DETAIL_AIRLINE_ID = airlineId;
  AIRLINE_DETAIL_DATA_TYPE_ID = dataTypeId;
  AIRLINE_DETAIL_EDIT = false;
  AIRLINE_DETAIL_DRAFT = null;
  AIRLINE_DETAIL_MODAL_ID = Modal.open('', { xwide: true, persistent: true });
  renderAirlineDetailModal();
}
function renderAirlineDetailModal() {
  const modalEl = document.querySelector(`[data-modal-id="${AIRLINE_DETAIL_MODAL_ID}"] .modal`);
  if (!modalEl) return;
  const airline = byId(DB.data.airlines, AIRLINE_DETAIL_AIRLINE_ID);
  const a = AIRLINE_DETAIL_EDIT ? AIRLINE_DETAIL_DRAFT : airline;
  modalEl.innerHTML = AIRLINE_DETAIL_EDIT ? renderAirlineDetailEditHtml(a) : renderAirlineDetailViewHtml(a);
}
function toggleAirlineDetailEdit() {
  if (!hasPerm(Session.currentUser(), 'program', 'fn-eng-airline-edit')) { toast('Not permitted.', 'error'); return; }
  AIRLINE_DETAIL_DRAFT = JSON.parse(JSON.stringify(byId(DB.data.airlines, AIRLINE_DETAIL_AIRLINE_ID)));
  AIRLINE_DETAIL_EDIT = true;
  renderAirlineDetailModal();
}
function cancelAirlineDetailEdit() {
  AIRLINE_DETAIL_EDIT = false;
  AIRLINE_DETAIL_DRAFT = null;
  renderAirlineDetailModal();
}
function saveAirlineDetailEdit() {
  Object.assign(byId(DB.data.airlines, AIRLINE_DETAIL_AIRLINE_ID), AIRLINE_DETAIL_DRAFT);
  DB.save();
  AIRLINE_DETAIL_EDIT = false;
  AIRLINE_DETAIL_DRAFT = null;
  toast('Engagement page updated.');
  renderAirlineDetailModal();
  renderEngResults();
}
function closeAirlineDetailModal() {
  if (AIRLINE_DETAIL_EDIT) { toast('Save or Cancel your changes first.', 'error'); return; }
  Modal.close(AIRLINE_DETAIL_MODAL_ID);
  AIRLINE_DETAIL_MODAL_ID = null;
  AIRLINE_DETAIL_AIRLINE_ID = null;
  AIRLINE_DETAIL_DATA_TYPE_ID = null;
}
// checklists on an airline are filtered by data type for display, but callbacks always index
// into the FULL array (checklists.map keeps the true index alongside each filtered entry).
function relevantAirlineChecklists(a) {
  return (a.checklists || []).map((cl, idx) => ({ cl, idx })).filter(({ cl }) => cl.dataTypeId === AIRLINE_DETAIL_DATA_TYPE_ID);
}
function airlineDetailSetChecklistField(clIdx, itemIdx, field, value) {
  AIRLINE_DETAIL_DRAFT.checklists[clIdx].items[itemIdx][field] = value;
}
function airlineDetailHostOptions(projectId, selectedId) {
  return `<option value="">—</option>${DB.data.hosts.filter(h => h.projectId === projectId).map(h => `<option value="${h.id}" ${h.id === selectedId ? 'selected' : ''}>${escapeHtml(h.name)}</option>`).join('')}`;
}
function airlineDetailDataTypeLabel() {
  const dt = byId(DB.data.dataTypes, AIRLINE_DETAIL_DATA_TYPE_ID);
  return dt ? dt.name : '';
}
function renderAirlineDetailViewHtml(a) {
  const hostName = (id) => { const h = byId(DB.data.hosts, id); return h ? escapeHtml(h.name) : '—'; };
  const goLive = GO_LIVE_STATUSES.find(([v]) => v === a.goLiveStatus);
  const cutover = CUTOVER_DIRECTIONS.find(([v]) => v === a.cutoverDirection);
  const checklists = relevantAirlineChecklists(a);
  return `
    <div class="modal-header">
      <h3>${escapeHtml(a.name)} — ${escapeHtml(airlineDetailDataTypeLabel())} Engagement Page</h3>
      <div class="btn-group">
        ${hasPerm(Session.currentUser(), 'program', 'fn-eng-airline-edit') ? `<button class="btn btn-sm" onclick="toggleAirlineDetailEdit()">Edit</button>` : ''}
        <div class="modal-close" onclick="closeAirlineDetailModal()">&times;</div>
      </div>
    </div>
    <div class="modal-body">
      <div class="eng-page-grid">
        <div class="field"><label>DCS Host Inbound</label><div>${hostName(a.dcsHostInboundId)}</div></div>
        <div class="field"><label>DCS Host Outbound</label><div>${hostName(a.dcsHostOutboundId)}</div></div>
        <div class="field"><label>ARS</label><div>${escapeHtml(a.ars || '—')}</div></div>
        <div class="field"><label>Date Contacted</label><div>${escapeHtml(a.dateContacted || '—')}</div></div>
        <div class="field"><label>Go-Live Status</label><div>${escapeHtml(goLive ? goLive[1] : '—')}</div></div>
        <div class="field"><label>Cutover Direction</label><div>${escapeHtml(cutover ? cutover[1] : '—')}</div></div>
        <div class="field"><label>Port</label><div>${escapeHtml(a.port || '—')}</div></div>
        <div class="field"><label>Crew Submission</label><div>${a.crewSubmission === 'yes' ? 'Yes' : 'No'}</div></div>
      </div>
      <div class="divider"></div>
      <div class="panel-title" style="margin-bottom:10px">${escapeHtml(airlineDetailDataTypeLabel())} Checklist</div>
      ${checklists.length === 0 ? '<div class="empty-state">No checklist duplicated for this data type yet — use "Duplicate to Airline" on the matching KM Data Entry\'s Checklist tab.</div>' :
        checklists.map(({ cl }) => `
          <div class="checklist-block">
            <div class="checklist-header"><div><b>${escapeHtml(cl.name)}</b> ${cl.sourceEntryTitle ? `<span class="duplicate-tag">from ${escapeHtml(cl.sourceEntryTitle)}</span>` : ''}</div></div>
            ${renderChecklistTable(cl.items, { showDate: true, editable: false, onStepTemplate: `(s)=>openTemplatePopup('${a.id}', AIRLINE_DETAIL_DATA_TYPE_ID, s)` })}
          </div>
        `).join('')}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeAirlineDetailModal()">Close</button></div>
  `;
}
function renderAirlineDetailEditHtml(a) {
  const checklists = relevantAirlineChecklists(a);
  return `
    <div class="modal-header">
      <h3>${escapeHtml(a.name)} — ${escapeHtml(airlineDetailDataTypeLabel())} Engagement Page <span class="text-danger" style="font-size:11px;font-weight:500">(editing — Save or Cancel to close)</span></h3>
    </div>
    <div class="modal-body">
      <div class="eng-page-grid">
        <div class="field"><label>DCS Host Inbound</label><select onchange="AIRLINE_DETAIL_DRAFT.dcsHostInboundId=this.value">${airlineDetailHostOptions(a.projectId, a.dcsHostInboundId)}</select></div>
        <div class="field"><label>DCS Host Outbound</label><select onchange="AIRLINE_DETAIL_DRAFT.dcsHostOutboundId=this.value">${airlineDetailHostOptions(a.projectId, a.dcsHostOutboundId)}</select></div>
        <div class="field"><label>ARS</label><input value="${escapeHtml(a.ars || '')}" onchange="AIRLINE_DETAIL_DRAFT.ars=this.value"></div>
        <div class="field"><label>Date Contacted</label><input type="date" value="${escapeHtml(a.dateContacted || '')}" onchange="AIRLINE_DETAIL_DRAFT.dateContacted=this.value"></div>
        <div class="field"><label>Go-Live Status</label><select onchange="AIRLINE_DETAIL_DRAFT.goLiveStatus=this.value">${GO_LIVE_STATUSES.map(([v, l]) => `<option value="${v}" ${v === a.goLiveStatus ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Cutover Direction</label><select onchange="AIRLINE_DETAIL_DRAFT.cutoverDirection=this.value">${CUTOVER_DIRECTIONS.map(([v, l]) => `<option value="${v}" ${v === a.cutoverDirection ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Port</label><input value="${escapeHtml(a.port || '')}" onchange="AIRLINE_DETAIL_DRAFT.port=this.value"></div>
        <div class="field"><label>Crew Submission</label><select onchange="AIRLINE_DETAIL_DRAFT.crewSubmission=this.value"><option value="yes" ${a.crewSubmission === 'yes' ? 'selected' : ''}>Yes</option><option value="no" ${a.crewSubmission !== 'yes' ? 'selected' : ''}>No</option></select></div>
      </div>
      <div class="divider"></div>
      <div class="panel-title" style="margin-bottom:10px">${escapeHtml(airlineDetailDataTypeLabel())} Checklist</div>
      ${checklists.length === 0 ? '<div class="empty-state">No checklist duplicated for this data type yet.</div>' :
        checklists.map(({ cl, idx: clIdx }) => `
          <div class="checklist-block">
            <div class="checklist-header"><div><b>${escapeHtml(cl.name)}</b> ${cl.sourceEntryTitle ? `<span class="duplicate-tag">from ${escapeHtml(cl.sourceEntryTitle)}</span>` : ''}</div></div>
            ${renderChecklistTable(cl.items, {
              showDate: true, editable: true,
              onCheck: `(i,v)=>airlineDetailSetChecklistField(${clIdx},i,'done',v)`,
              onDate: `(i,v)=>airlineDetailSetChecklistField(${clIdx},i,'date',v)`,
              onStepTemplate: `(s)=>openTemplatePopup('${a.id}', AIRLINE_DETAIL_DATA_TYPE_ID, s)`,
            })}
          </div>
        `).join('')}
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveAirlineDetailEdit()">Save</button><button class="btn" onclick="cancelAirlineDetailEdit()">Cancel</button></div>
  `;
}

function renderHostResults(hosts) {
  const user = Session.currentUser();
  const canAdd = hasPerm(user, 'program', 'fn-eng-host-add');
  const canEdit = hasPerm(user, 'program', 'fn-eng-host-edit');
  const canEditStatus = hasPerm(user, 'program', 'fn-eng-host-status');
  const f = engFilters.host;
  const { pageItems, total, totalPages, start } = paginate(hosts, f);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="muted" style="font-size:11.5px">${total} host${total === 1 ? '' : 's'} match filters</span>
      ${canAdd ? `<button class="btn btn-sm btn-primary" onclick="openHostForm()">+ Add Host</button>` : ''}
    </div>
    ${pageItems.length === 0 ? '<div class="empty-state">No hosts match these filters.</div>' : pageItems.map(host => {
      const linkedAirlines = DB.data.airlineHostLinks.filter(l => l.hostId === host.id).map(l => {
        const a = byId(DB.data.airlines, l.airlineId);
        return `${escapeHtml(a?.name || '?')} <span class="subtle">(${l.routeDirection})</span>`;
      });
      return `
      <div class="panel ${host.status === 'inactive' ? 'inactive-row' : ''}">
        <div class="panel-title">
          <span>${escapeHtml(host.name)} ${host.status === 'inactive' ? '<span class="text-danger" style="font-size:11px">(inactive)</span>' : ''}
            <span class="badge" style="background:var(--surface2);color:var(--muted);margin-left:6px">${escapeHtml(host.operationType || 'Both')}</span>
          </span>
          <div class="btn-group">
            ${canEdit ? `<button class="btn btn-sm btn-icon" title="Edit" onclick="openHostForm('${host.id}')">✎</button>` : ''}
            ${canEdit ? (host.status === 'active'
              ? `<button class="btn btn-sm btn-icon btn-danger" title="Deactivate" onclick="setHostStatus('${host.id}','inactive')">🚫</button>`
              : `<button class="btn btn-sm btn-icon" title="Reactivate" onclick="setHostStatus('${host.id}','active')">▶</button>`) : ''}
          </div>
        </div>
        ${host.contactDate ? `<div class="muted" style="font-size:11.5px;margin-bottom:8px">Contact Date: ${escapeHtml(host.contactDate)}</div>` : ''}
        <div class="form-row" style="margin-bottom:10px">
          ${DB.data.dataTypes.map(dt => {
            const rec = DB.data.engagementRecords.find(r => r.hostId === host.id && r.dataTypeId === dt.id);
            const ed = host.engagementData?.find(e => e.dataTypeId === dt.id);
            return `<div class="field"><label>${escapeHtml(dt.code)}</label>
              ${rec ? (canEditStatus ? statusSelect(rec.statusId, `updateEngagementStatus('${rec.id}', this.value)`) : statusBadge(rec.statusId)) : '—'}
              ${ed ? `<div class="muted" style="font-size:10px;margin-top:3px">MQ: ${escapeHtml(ed.mqType === 'client' ? 'Client' : 'Server')} · PSK: ${escapeHtml(ed.pskProvidedBy === 'host' ? 'Host' : 'SI Team')}${(ed.documents || []).length ? ` · Docs: ${ed.documents.length}` : ''}</div>` : ''}
              <div><button class="btn btn-sm" style="margin-top:4px" onclick="openHostDetailModal('${host.id}','${dt.id}')">View Details</button></div>
            </div>`;
          }).join('')}
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px">Contacts</div>
        <div class="table-wrap table-scroll" style="margin-bottom:10px"><table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th></tr></thead>
        <tbody>${host.contacts.length === 0 ? '<tr><td colspan="4" class="empty-state">No contacts.</td></tr>' : host.contacts.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.role)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td></tr>`).join('')}</tbody></table></div>
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px">Linked Airlines</div>
        <div style="font-size:12.5px">${linkedAirlines.length ? linkedAirlines.join(', ') : '<span class="subtle">none linked</span>'}</div>
      </div>
    `; }).join('')}
    ${pagerHtml('host', total, totalPages, f.page, start, pageItems.length)}
  `;
}

// ---------------- Host Detail modal ("View Details" per data type) ----------------
// Mirrors the Airline Engagement Page pattern: locked while editing (no backdrop/close icon),
// Check/Date-only checklist editing (full item-text editing lives only in KM).
let HOST_DETAIL_MODAL_ID = null;
let HOST_DETAIL_HOST_ID = null;
let HOST_DETAIL_DATA_TYPE_ID = null;
let HOST_DETAIL_EDIT = false;
let HOST_DETAIL_DRAFT = null;
function relevantHostChecklists(h) {
  return (h.checklists || []).map((cl, idx) => ({ cl, idx })).filter(({ cl }) => cl.dataTypeId === HOST_DETAIL_DATA_TYPE_ID);
}
function hostDetailDataTypeLabel() {
  const dt = byId(DB.data.dataTypes, HOST_DETAIL_DATA_TYPE_ID);
  return dt ? dt.name : '';
}
function openHostDetailModal(hostId, dataTypeId) {
  HOST_DETAIL_HOST_ID = hostId;
  HOST_DETAIL_DATA_TYPE_ID = dataTypeId;
  HOST_DETAIL_EDIT = false;
  HOST_DETAIL_DRAFT = null;
  HOST_DETAIL_MODAL_ID = Modal.open('', { wide: true, persistent: true });
  renderHostDetailModal();
}
function renderHostDetailModal() {
  const modalEl = document.querySelector(`[data-modal-id="${HOST_DETAIL_MODAL_ID}"] .modal`);
  if (!modalEl) return;
  const host = byId(DB.data.hosts, HOST_DETAIL_HOST_ID);
  const h = HOST_DETAIL_EDIT ? HOST_DETAIL_DRAFT : host;
  modalEl.innerHTML = HOST_DETAIL_EDIT ? renderHostDetailEditHtml(h) : renderHostDetailViewHtml(h);
}
function toggleHostDetailEdit() {
  if (!hasPerm(Session.currentUser(), 'program', 'fn-eng-host-edit')) { toast('Not permitted.', 'error'); return; }
  HOST_DETAIL_DRAFT = JSON.parse(JSON.stringify(byId(DB.data.hosts, HOST_DETAIL_HOST_ID)));
  HOST_DETAIL_EDIT = true;
  renderHostDetailModal();
}
function cancelHostDetailEdit() {
  HOST_DETAIL_EDIT = false;
  HOST_DETAIL_DRAFT = null;
  renderHostDetailModal();
}
function saveHostDetailEdit() {
  Object.assign(byId(DB.data.hosts, HOST_DETAIL_HOST_ID), HOST_DETAIL_DRAFT);
  DB.save();
  HOST_DETAIL_EDIT = false;
  HOST_DETAIL_DRAFT = null;
  toast('Host detail updated.');
  renderHostDetailModal();
  renderEngResults();
}
function closeHostDetailModal() {
  if (HOST_DETAIL_EDIT) { toast('Save or Cancel your changes first.', 'error'); return; }
  Modal.close(HOST_DETAIL_MODAL_ID);
  HOST_DETAIL_MODAL_ID = null;
  HOST_DETAIL_HOST_ID = null;
  HOST_DETAIL_DATA_TYPE_ID = null;
}
function hostDetailSetChecklistField(clIdx, itemIdx, field, value) {
  HOST_DETAIL_DRAFT.checklists[clIdx].items[itemIdx][field] = value;
}
function renderHostDetailViewHtml(h) {
  const rec = DB.data.engagementRecords.find(r => r.hostId === h.id && r.dataTypeId === HOST_DETAIL_DATA_TYPE_ID);
  const ed = h.engagementData?.find(e => e.dataTypeId === HOST_DETAIL_DATA_TYPE_ID);
  const checklists = relevantHostChecklists(h);
  return `
    <div class="modal-header">
      <h3>${escapeHtml(h.name)} — ${escapeHtml(hostDetailDataTypeLabel())} Details</h3>
      <div class="btn-group">
        ${hasPerm(Session.currentUser(), 'program', 'fn-eng-host-edit') ? `<button class="btn btn-sm" onclick="toggleHostDetailEdit()">Edit</button>` : ''}
        <div class="modal-close" onclick="closeHostDetailModal()">&times;</div>
      </div>
    </div>
    <div class="modal-body">
      <div class="eng-page-grid">
        <div class="field"><label>Engagement Status</label><div>${rec ? statusBadge(rec.statusId) : '—'}</div></div>
        <div class="field"><label>MQ Type</label><div>${ed ? (ed.mqType === 'client' ? 'MQ Client' : 'MQ Server') : '—'}</div></div>
        <div class="field"><label>PSK Provided By</label><div>${ed ? (ed.pskProvidedBy === 'host' ? 'Host' : 'SI Team') : '—'}</div></div>
        <div class="field"><label>Message Format</label><div>${escapeHtml(ed?.messageFormat || '—')}</div></div>
      </div>
      <div class="field-hint" style="margin-bottom:10px">Edit MQ Type/PSK/Message Format/Documents from the main "Edit Host" form.</div>
      <div class="divider"></div>
      <div class="panel-title" style="margin-bottom:10px">${escapeHtml(hostDetailDataTypeLabel())} Checklist</div>
      ${checklists.length === 0 ? '<div class="empty-state">No checklist duplicated for this data type yet — use "Duplicate" (target: Host) on the matching KM Data Entry\'s Checklist tab.</div>' :
        checklists.map(({ cl }) => `
          <div class="checklist-block">
            <div class="checklist-header"><div><b>${escapeHtml(cl.name)}</b> ${cl.sourceEntryTitle ? `<span class="duplicate-tag">from ${escapeHtml(cl.sourceEntryTitle)}</span>` : ''}</div></div>
            ${renderChecklistTable(cl.items, { showDate: true, editable: false })}
          </div>
        `).join('')}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeHostDetailModal()">Close</button></div>
  `;
}
function renderHostDetailEditHtml(h) {
  const rec = DB.data.engagementRecords.find(r => r.hostId === h.id && r.dataTypeId === HOST_DETAIL_DATA_TYPE_ID);
  const ed = h.engagementData?.find(e => e.dataTypeId === HOST_DETAIL_DATA_TYPE_ID);
  const checklists = relevantHostChecklists(h);
  return `
    <div class="modal-header">
      <h3>${escapeHtml(h.name)} — ${escapeHtml(hostDetailDataTypeLabel())} Details <span class="text-danger" style="font-size:11px;font-weight:500">(editing — Save or Cancel to close)</span></h3>
    </div>
    <div class="modal-body">
      <div class="eng-page-grid">
        <div class="field"><label>Engagement Status</label>${rec ? statusSelect(rec.statusId, `updateEngagementStatus('${rec.id}', this.value)`) : '<div>—</div>'}</div>
        <div class="field"><label>MQ Type</label><div>${ed ? (ed.mqType === 'client' ? 'MQ Client' : 'MQ Server') : '—'}</div></div>
        <div class="field"><label>PSK Provided By</label><div>${ed ? (ed.pskProvidedBy === 'host' ? 'Host' : 'SI Team') : '—'}</div></div>
        <div class="field"><label>Message Format</label><div>${escapeHtml(ed?.messageFormat || '—')}</div></div>
      </div>
      <div class="field-hint" style="margin-bottom:10px">Edit MQ Type/PSK/Message Format/Documents from the main "Edit Host" form.</div>
      <div class="divider"></div>
      <div class="panel-title" style="margin-bottom:10px">${escapeHtml(hostDetailDataTypeLabel())} Checklist</div>
      ${checklists.length === 0 ? '<div class="empty-state">No checklist duplicated for this data type yet.</div>' :
        checklists.map(({ cl, idx: clIdx }) => `
          <div class="checklist-block">
            <div class="checklist-header"><div><b>${escapeHtml(cl.name)}</b> ${cl.sourceEntryTitle ? `<span class="duplicate-tag">from ${escapeHtml(cl.sourceEntryTitle)}</span>` : ''}</div></div>
            ${renderChecklistTable(cl.items, {
              showDate: true, editable: true,
              onCheck: `(i,v)=>hostDetailSetChecklistField(${clIdx},i,'done',v)`,
              onDate: `(i,v)=>hostDetailSetChecklistField(${clIdx},i,'date',v)`,
            })}
          </div>
        `).join('')}
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveHostDetailEdit()">Save</button><button class="btn" onclick="cancelHostDetailEdit()">Cancel</button></div>
  `;
}

// ---------------- Host contact rows (add as many as needed) ----------------
function hostContactRowHtml(c) {
  c = c || {};
  return `
    <div class="host-contact-row" style="display:flex;gap:6px;margin-bottom:6px">
      <input class="hc-name" placeholder="Name" value="${escapeHtml(c.name || '')}" style="flex:1">
      <input class="hc-role" placeholder="Role" value="${escapeHtml(c.role || '')}" style="flex:1">
      <input class="hc-phone" placeholder="Phone" value="${escapeHtml(c.phone || '')}" style="flex:1">
      <input class="hc-email" placeholder="Email" value="${escapeHtml(c.email || '')}" style="flex:1">
      <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.host-contact-row').remove()">✕</button>
    </div>
  `;
}
function addHostContactRow() {
  document.getElementById('host-contacts-rows').insertAdjacentHTML('beforeend', hostContactRowHtml());
}
// ---------------- Host per-data-type engagement box (MQ Type / PSK / Message Format / Docs) ----------------
let HOST_FORM_DOCS = {};
function hostDocRowHtml(dataTypeId, d) {
  return `<div class="doc-item"><div class="name">📄 ${escapeHtml(d.name)} <span class="subtle">(${d.uploadedAt})</span></div><button type="button" class="btn btn-sm btn-danger" onclick="removeHostDocument('${dataTypeId}','${d.id}')">✕</button></div>`;
}
function renderHostFormDocs(dataTypeId) {
  const docs = HOST_FORM_DOCS[dataTypeId] || [];
  document.getElementById(`hed-docs-${dataTypeId}`).innerHTML = docs.length === 0 ? '<div class="empty-state" style="padding:10px">No documents.</div>' : docs.map(d => hostDocRowHtml(dataTypeId, d)).join('');
}
function uploadHostDocument(dataTypeId, event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    HOST_FORM_DOCS[dataTypeId] = HOST_FORM_DOCS[dataTypeId] || [];
    HOST_FORM_DOCS[dataTypeId].push({ id: uid('hdoc'), name: file.name, uploadedAt: new Date().toISOString().slice(0, 10), dataUrl: reader.result });
    renderHostFormDocs(dataTypeId);
  };
  reader.readAsDataURL(file);
}
function removeHostDocument(dataTypeId, docId) {
  HOST_FORM_DOCS[dataTypeId] = (HOST_FORM_DOCS[dataTypeId] || []).filter(d => d.id !== docId);
  renderHostFormDocs(dataTypeId);
}
function hostEngagementDataBoxHtml(dt, ed) {
  ed = ed || {};
  return `
    <div class="panel" style="margin-bottom:10px">
      <div class="panel-title" style="margin-bottom:8px">${escapeHtml(dt.name)}</div>
      <div class="form-row">
        <div class="field"><label>MQ Type</label>
          <select id="hed-mqtype-${dt.id}">
            <option value="server" ${ed.mqType === 'server' ? 'selected' : ''}>MQ Server</option>
            <option value="client" ${ed.mqType === 'client' ? 'selected' : ''}>MQ Client</option>
          </select>
        </div>
        <div class="field"><label>PSK Provided By</label>
          <select id="hed-psk-${dt.id}">
            <option value="si_team" ${ed.pskProvidedBy === 'si_team' ? 'selected' : ''}>SI Team</option>
            <option value="host" ${ed.pskProvidedBy === 'host' ? 'selected' : ''}>Host</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Message Format</label><input id="hed-msgformat-${dt.id}" value="${escapeHtml(ed.messageFormat || '')}"></div>
      <div class="field">
        <label>Documents</label>
        <div id="hed-docs-${dt.id}">${(ed.documents || []).length === 0 ? '<div class="empty-state" style="padding:10px">No documents.</div>' : ed.documents.map(d => hostDocRowHtml(dt.id, d)).join('')}</div>
        <label class="btn btn-sm" style="cursor:pointer;margin-top:6px">+ Upload<input type="file" class="hidden" onchange="uploadHostDocument('${dt.id}', event)"></label>
      </div>
    </div>
  `;
}
function openHostForm(hostId) {
  const host = hostId ? byId(DB.data.hosts, hostId) : null;
  HOST_FORM_DOCS = {};
  DB.data.dataTypes.forEach(dt => {
    const existing = host?.engagementData?.find(e => e.dataTypeId === dt.id);
    HOST_FORM_DOCS[dt.id] = existing ? [...(existing.documents || [])] : [];
  });
  const op = host?.operationType || 'Both';
  const mid = Modal.open(`
    ${modalHeader(host ? 'Edit Host' : 'Add Host', '')}
    <div class="modal-body">
      <div class="field"><label>Host Name</label><input id="host-name" value="${host ? escapeHtml(host.name) : ''}"></div>
      <div class="field"><label>Host Operation</label>
        <div class="btn-group">
          <label class="checkbox-row"><input type="radio" name="host-op" value="DCS" ${op === 'DCS' ? 'checked' : ''}> DCS</label>
          <label class="checkbox-row"><input type="radio" name="host-op" value="ARS" ${op === 'ARS' ? 'checked' : ''}> ARS</label>
          <label class="checkbox-row"><input type="radio" name="host-op" value="Both" ${op === 'Both' ? 'checked' : ''}> Both</label>
        </div>
      </div>
      <div class="field"><label>Contact Date</label><input type="date" id="host-contact-date" value="${host ? escapeHtml(host.contactDate || '') : ''}"></div>
      <div class="field">
        <label>Contacts <span class="muted" style="font-weight:400">(name / role / phone / email — add as many as needed)</span></label>
        <div id="host-contacts-rows">${(host?.contacts || []).map(c => hostContactRowHtml(c)).join('')}</div>
        <button type="button" class="btn btn-sm" style="margin-top:6px" onclick="addHostContactRow()">+ Add Contact</button>
      </div>
      <div class="divider"></div>
      <div class="panel-title" style="margin-bottom:8px">Engagement Data</div>
      ${DB.data.dataTypes.map(dt => hostEngagementDataBoxHtml(dt, host?.engagementData?.find(e => e.dataTypeId === dt.id))).join('')}
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveHost('${host ? host.id : ''}')">Save</button></div>
  `, { xwide: true });
  wireCancel(mid);
}
function saveHost(hostId) {
  const name = document.getElementById('host-name').value.trim();
  if (!name) { toast('Name required.', 'error'); return; }
  const operationType = document.querySelector('input[name="host-op"]:checked')?.value || 'Both';
  const contactDate = document.getElementById('host-contact-date').value;
  const contacts = [...document.querySelectorAll('#host-contacts-rows .host-contact-row')].map(row => ({
    id: uid('hc'),
    name: row.querySelector('.hc-name').value.trim(),
    role: row.querySelector('.hc-role').value.trim(),
    phone: row.querySelector('.hc-phone').value.trim(),
    email: row.querySelector('.hc-email').value.trim(),
  })).filter(c => c.name);
  const engagementData = DB.data.dataTypes.map(dt => ({
    dataTypeId: dt.id,
    mqType: document.getElementById(`hed-mqtype-${dt.id}`).value,
    pskProvidedBy: document.getElementById(`hed-psk-${dt.id}`).value,
    messageFormat: document.getElementById(`hed-msgformat-${dt.id}`).value.trim(),
    documents: HOST_FORM_DOCS[dt.id] || [],
  }));
  if (hostId) {
    Object.assign(byId(DB.data.hosts, hostId), { name, operationType, contactDate, contacts, engagementData });
  } else {
    const newHost = { id: uid('host'), projectId: CURRENT_ENG_PROJECT_ID, name, status: 'active', operationType, contactDate, contacts, engagementData };
    DB.data.hosts.push(newHost);
    DB.data.dataTypes.forEach(dt => {
      DB.data.engagementRecords.push({ id: uid('er'), projectId: CURRENT_ENG_PROJECT_ID, airlineId: null, hostId: newHost.id, dataTypeId: dt.id, statusId: 'not_started', pax: 0, lastUpdated: new Date().toISOString().slice(0, 10) });
    });
  }
  DB.save(); Modal.closeAll(); renderEngResults();
}
function setHostStatus(hostId, status) {
  byId(DB.data.hosts, hostId).status = status;
  DB.save(); renderEngResults();
}

// ---------------- Coordination Templates popup ----------------
// Templates are global (shared across every project — see DB.data.coordinationTemplates in
// data.js), keyed by data type instead of project. Editing one here, or on the central
// Template Configuration page (#/templates), updates the same object everywhere it's used —
// there is no per-project copy to keep in sync.
let templatePopupAirlineId = null;
let templatePopupChannel = 'email';
let templatePopupDataTypeId = null;
let templatePopupStep = 'all';
function openTemplatePopup(airlineId, presetDataTypeId, presetStep) {
  templatePopupAirlineId = airlineId;
  templatePopupChannel = 'email';
  templatePopupStep = presetStep || 'all';
  if (presetDataTypeId) {
    templatePopupDataTypeId = presetDataTypeId;
  } else {
    const engaged = DB.data.engagementRecords.find(r => r.airlineId === airlineId && r.statusId !== 'not_started');
    templatePopupDataTypeId = (engaged && engaged.dataTypeId) || DB.data.dataTypes[0].id;
  }
  const mid = Modal.open(`
    ${modalHeader('Coordination Templates', '')}
    <div class="modal-body" style="display:flex;flex-direction:column;max-height:60vh">
      <div class="form-row" style="margin-bottom:10px">
        <div class="field" style="margin-bottom:0"><label>Data Type</label>
          <select id="tpl-popup-datatype">${DB.data.dataTypes.map(dt => `<option value="${dt.id}" ${dt.id === templatePopupDataTypeId ? 'selected' : ''}>${escapeHtml(dt.name)}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin-bottom:0"><label>Engagement Step</label>
          <select id="tpl-popup-step">
            <option value="all" ${templatePopupStep === 'all' ? 'selected' : ''}>All Steps</option>
            ${CHECKLIST_STEPS.map(s => `<option value="${s}" ${s === templatePopupStep ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="tabs" style="margin-bottom:10px">
        <div class="tab active" id="tpl-tab-email" onclick="setTemplateChannel('email')">📧 Email (external)</div>
        <div class="tab" id="tpl-tab-zulip" onclick="setTemplateChannel('zulip')">💬 Zulip (internal)</div>
      </div>
      <div class="template-popup-body">
        <div class="template-scroll" id="template-scroll-area"></div>
        <div class="pinned-followup" id="pinned-followup-area"></div>
      </div>
    </div>
    <div class="modal-footer">
      <span class="muted" style="font-size:11px;margin-right:auto">Shared across all projects. <a href="#" onclick="Modal.closeAll();nav('#/templates');return false;">Manage all templates →</a></span>
      <button class="btn" onclick="Modal.closeAll()">Close</button>
    </div>
  `, { wide: true });
  document.getElementById('tpl-popup-datatype').onchange = (e) => { templatePopupDataTypeId = e.target.value; renderTemplatePopupBody(); };
  document.getElementById('tpl-popup-step').onchange = (e) => { templatePopupStep = e.target.value; renderTemplatePopupBody(); };
  renderTemplatePopupBody();
}
function setTemplateChannel(channel) {
  templatePopupChannel = channel;
  document.getElementById('tpl-tab-email').classList.toggle('active', channel === 'email');
  document.getElementById('tpl-tab-zulip').classList.toggle('active', channel === 'zulip');
  renderTemplatePopupBody();
}
function renderTemplatePopupBody() {
  const canManage = hasPerm(Session.currentUser(), 'program', 'fn-eng-template-manage');
  let channelTemplates = DB.data.coordinationTemplates.filter(t => t.category === 'engagement' && t.channel === templatePopupChannel && t.dataTypeId === templatePopupDataTypeId);
  if (templatePopupStep !== 'all') channelTemplates = channelTemplates.filter(t => t.step === templatePopupStep);
  const followups = DB.data.coordinationTemplates.filter(t => t.category === 'followup');

  document.getElementById('template-scroll-area').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">${canManage ? `<button class="btn btn-sm btn-primary" onclick="openTemplateEditForm('${templatePopupChannel}','engagement','','${templatePopupDataTypeId}')">+ Add Template</button>` : ''}</div>
    ${channelTemplates.length === 0 ? '<div class="empty-state">No templates for this data type/channel/step yet.</div>' : channelTemplates.map(t => `
      <div class="template-item">
        <div class="tname">${escapeHtml(t.name)} ${t.step ? `<span class="duplicate-tag">${escapeHtml(t.step)}</span>` : ''} ${canManage ? `<span style="float:right"><button class="btn btn-sm" onclick="openTemplateEditForm('${t.channel}','${t.category}','${t.id}')">Edit</button> <button class="btn btn-sm" onclick="duplicateTemplate('${t.id}')">Duplicate</button> <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">Delete</button></span>` : ''}</div>
        ${t.description ? `<div class="muted" style="font-size:11.5px;margin-bottom:6px">${escapeHtml(t.description)}</div>` : ''}
        ${t.subject ? `<div style="font-size:11.5px;margin-bottom:6px"><b>Subject:</b> ${escapeHtml(t.subject)}</div>` : ''}
        ${templateConditionTagsHtml(t.conditions)}
        <pre>${escapeHtml(t.body)}</pre>
        ${templateKeywordTagsHtml(t.keywords)}
      </div>
    `).join('')}
  `;
  document.getElementById('pinned-followup-area').innerHTML = `
    <div class="pin-label">📌 Follow-Up Templates (pinned, shared across all data types)</div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:6px">${canManage ? `<button class="btn btn-sm" onclick="openTemplateEditForm(null,'followup')">+ Add Follow-Up</button>` : ''}</div>
    ${followups.length === 0 ? '<div class="muted" style="font-size:12px">No follow-up templates yet.</div>' : followups.map(t => `
      <div class="template-item">
        <div class="tname">${escapeHtml(t.name)} ${canManage ? `<span style="float:right"><button class="btn btn-sm" onclick="openTemplateEditForm(null,'followup','${t.id}')">Edit</button> <button class="btn btn-sm" onclick="duplicateTemplate('${t.id}')">Duplicate</button> <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">Delete</button></span>` : ''}</div>
        ${t.description ? `<div class="muted" style="font-size:11.5px;margin-bottom:6px">${escapeHtml(t.description)}</div>` : ''}
        ${t.subject ? `<div style="font-size:11.5px;margin-bottom:6px"><b>Subject:</b> ${escapeHtml(t.subject)}</div>` : ''}
        ${templateConditionTagsHtml(t.conditions)}
        <pre>${escapeHtml(t.body)}</pre>
        ${templateKeywordTagsHtml(t.keywords)}
      </div>
    `).join('')}
  `;
}

// Condition / keyword tag renderers — shared by the airline-side popup, the config-page
// grid/table, and the preview modal.
function templateConditionTagsHtml(conditions) {
  if (!conditions || conditions.length === 0) return '';
  return `<div class="tpl-conds">${conditions.map(c => `<span class="ctag ${c.value === 'yes' ? 'yes' : 'no'}">${escapeHtml(c.key)}: ${escapeHtml(c.value)}</span>`).join('')}</div>`;
}
function templateKeywordTagsHtml(keywords) {
  if (!keywords || keywords.length === 0) return '';
  return `<div class="tpl-keywords">${keywords.map(k => `<span class="kw-tag">#${escapeHtml(k)}</span>`).join('')}</div>`;
}
function tplConditionRowHtml(key, value) {
  return `
    <div class="tpl-cond-row">
      <input class="tpl-cond-key" placeholder="Condition (e.g. Airline contact confirmed)" value="${escapeHtml(key || '')}">
      <select class="tpl-cond-val">
        <option value="yes" ${value !== 'no' ? 'selected' : ''}>Yes</option>
        <option value="no" ${value === 'no' ? 'selected' : ''}>No</option>
      </select>
      <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.tpl-cond-row').remove()">✕</button>
    </div>
  `;
}
function addTplConditionRow() {
  document.getElementById('tpl-cond-rows').insertAdjacentHTML('beforeend', tplConditionRowHtml('', 'yes'));
}
function openTemplateEditForm(channel, category, templateId, defaultDataTypeId) {
  const t = templateId ? byId(DB.data.coordinationTemplates, templateId) : null;
  const showDataType = category === 'engagement';
  const showSubject = category === 'followup' || channel === 'email';
  const currentDt = t ? t.dataTypeId : defaultDataTypeId;
  const conditions = t ? (t.conditions || []) : [];
  const mid = Modal.open(`
    ${modalHeader(t ? 'Edit Template' : 'Add Template', '')}
    <div class="modal-body">
      ${showDataType ? `<div class="field"><label>Data Type</label><select id="tpl-datatype">${DB.data.dataTypes.map(dt => `<option value="${dt.id}" ${currentDt === dt.id ? 'selected' : ''}>${escapeHtml(dt.name)}</option>`).join('')}</select></div>` : ''}
      ${showDataType ? `<div class="field"><label>Engagement Step</label><select id="tpl-step"><option value="">— Not step-specific —</option>${CHECKLIST_STEPS.map(s => `<option value="${s}" ${t && t.step === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Name</label><input id="tpl-name" value="${t ? escapeHtml(t.name) : ''}"></div>
      <div class="field"><label>Description</label><input id="tpl-desc" placeholder="When to use this template" value="${t ? escapeHtml(t.description || '') : ''}"></div>
      ${showSubject ? `<div class="field"><label>Email Subject</label><input id="tpl-subject" placeholder="e.g. [iAPI] Certification Kickoff — {{airline_name}}" value="${t ? escapeHtml(t.subject || '') : ''}"></div>` : ''}
      <div class="field"><label>Body</label><textarea id="tpl-body" rows="6">${t ? escapeHtml(t.body) : ''}</textarea></div>
      <div class="field"><label>Keywords <span class="muted" style="font-weight:400">(comma separated — used by search)</span></label><input id="tpl-keywords" value="${t ? escapeHtml((t.keywords || []).join(', ')) : ''}"></div>
      <div class="field">
        <label>Conditions <span class="muted" style="font-weight:400">(when this template applies)</span></label>
        <div id="tpl-cond-rows">${conditions.map(c => tplConditionRowHtml(c.key, c.value)).join('')}</div>
        <button type="button" class="btn btn-sm" style="margin-top:6px" onclick="addTplConditionRow()">+ Add Condition</button>
      </div>
      <div class="field-hint">This template is shared — saving updates it everywhere it's used, across every project.</div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveTemplate('${channel || ''}','${category}','${templateId || ''}')">Save</button></div>
  `, { wide: true });
  wireCancel(mid);
}
function saveTemplate(channel, category, templateId) {
  const name = document.getElementById('tpl-name').value.trim();
  const body = document.getElementById('tpl-body').value;
  const dtSelect = document.getElementById('tpl-datatype');
  const stepSelect = document.getElementById('tpl-step');
  const subjEl = document.getElementById('tpl-subject');
  if (!name) { toast('Name required.', 'error'); return; }
  const description = document.getElementById('tpl-desc').value.trim();
  const subject = subjEl ? subjEl.value.trim() : null;
  const keywords = document.getElementById('tpl-keywords').value.split(',').map(k => k.trim()).filter(Boolean);
  const conditions = [...document.querySelectorAll('#tpl-cond-rows .tpl-cond-row')].map(row => ({
    key: row.querySelector('.tpl-cond-key').value.trim(),
    value: row.querySelector('.tpl-cond-val').value,
  })).filter(c => c.key);
  if (templateId) {
    Object.assign(byId(DB.data.coordinationTemplates, templateId), { name, body, description, subject, keywords, conditions, ...(dtSelect ? { dataTypeId: dtSelect.value } : {}), ...(stepSelect ? { step: stepSelect.value || null } : {}) });
  } else {
    DB.data.coordinationTemplates.push({ id: uid('tpl'), dataTypeId: dtSelect ? dtSelect.value : null, step: stepSelect ? (stepSelect.value || null) : null, channel: channel || null, category, name, body, description, subject, keywords, conditions });
  }
  DB.save();
  toast('Template saved.');
  Modal.close(Modal.stack[Modal.stack.length - 1]);
  if (document.getElementById('template-scroll-area')) renderTemplatePopupBody();
  if (document.getElementById('templates-page-body')) renderTemplatesPageBody();
}
function duplicateTemplate(templateId) {
  const t = byId(DB.data.coordinationTemplates, templateId);
  if (!t) return;
  const copy = JSON.parse(JSON.stringify(t));
  copy.id = uid('tpl');
  copy.name = t.name + ' (Copy)';
  DB.data.coordinationTemplates.push(copy);
  DB.save();
  toast('Template duplicated.');
  if (document.getElementById('template-scroll-area')) renderTemplatePopupBody();
  if (document.getElementById('templates-page-body')) renderTemplatesPageBody();
}
function deleteTemplate(templateId) {
  if (!confirm('Delete this shared template? It will be removed everywhere it appears.')) return;
  DB.data.coordinationTemplates = DB.data.coordinationTemplates.filter(t => t.id !== templateId);
  TEMPLATE_SELECTED.delete(templateId);
  DB.save();
  if (document.getElementById('template-scroll-area')) renderTemplatePopupBody();
  if (document.getElementById('templates-page-body')) renderTemplatesPageBody();
}

// ===================================================================
// TEMPLATE CONFIGURATION (central library — modelled on email-template-library.html:
// search, per-dimension filter tabs, grid/table views, sortable columns, multi-select with
// bulk delete, a preview modal, and duplicate — over the same shared per-data-type templates
// used by every project's Coordination Templates popup. Editing or deleting here changes it
// everywhere at once.)
// ===================================================================
let TEMPLATE_FILTER = 'all'; // 'all' | dataTypeId | 'followup'
let TEMPLATE_STEP_FILTER = 'all'; // 'all' | one of CHECKLIST_STEPS
let TEMPLATE_SEARCH = '';
let TEMPLATE_VIEW = 'grid'; // 'grid' | 'table'
let TEMPLATE_SORT = { col: 'name', dir: 1 };
let TEMPLATE_SELECTED = new Set();
function renderTemplatesPage(main) {
  TEMPLATE_FILTER = 'all';
  TEMPLATE_STEP_FILTER = 'all';
  TEMPLATE_SEARCH = '';
  TEMPLATE_VIEW = 'grid';
  TEMPLATE_SORT = { col: 'name', dir: 1 };
  TEMPLATE_SELECTED = new Set();
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Template Configuration</div><div class="page-sub">Email &amp; Zulip coordination templates — shared across every project. Edit once, applies everywhere.</div></div>
    </div>
    <div class="tabs" id="tpl-filter-tabs">
      <div class="tab active" data-filter="all" onclick="setTemplateFilter('all')">All</div>
      ${DB.data.dataTypes.map(dt => `<div class="tab" data-filter="${dt.id}" onclick="setTemplateFilter('${dt.id}')">${escapeHtml(dt.code)}</div>`).join('')}
      <div class="tab" data-filter="followup" onclick="setTemplateFilter('followup')">📌 Follow-Up</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div class="field" style="margin-bottom:0;max-width:280px;flex:1"><input id="tpl-search" placeholder="Search name, body, description, keywords…" oninput="TEMPLATE_SEARCH=this.value;renderTemplatesPageBody()"></div>
      <div class="field" style="margin-bottom:0;max-width:160px">
        <select onchange="TEMPLATE_STEP_FILTER=this.value;renderTemplatesPageBody()">
          <option value="all">All Steps</option>
          ${CHECKLIST_STEPS.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="btn-group" id="tpl-view-toggle">
        <button class="btn btn-sm active" data-view="grid" onclick="setTemplateView('grid')">▦ Grid</button>
        <button class="btn btn-sm" data-view="table" onclick="setTemplateView('table')">☰ Table</button>
      </div>
      <div class="btn-group">
        <button class="btn btn-sm btn-primary" onclick="openTemplateEditForm('email','engagement','', TEMPLATE_FILTER!=='all'&&TEMPLATE_FILTER!=='followup'?TEMPLATE_FILTER:DB.data.dataTypes[0].id)">+ Add Email Template</button>
        <button class="btn btn-sm btn-primary" onclick="openTemplateEditForm('zulip','engagement','', TEMPLATE_FILTER!=='all'&&TEMPLATE_FILTER!=='followup'?TEMPLATE_FILTER:DB.data.dataTypes[0].id)">+ Add Zulip Template</button>
        <button class="btn btn-sm" onclick="openTemplateEditForm(null,'followup')">+ Add Follow-Up</button>
      </div>
    </div>
    <div id="templates-page-body"></div>
  `;
  renderTemplatesPageBody();
}
function setTemplateFilter(filter) {
  TEMPLATE_FILTER = filter;
  document.querySelectorAll('#tpl-filter-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.filter === filter));
  renderTemplatesPageBody();
}
function setTemplateView(view) {
  TEMPLATE_VIEW = view;
  document.querySelectorAll('#tpl-view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderTemplatesPageBody();
}
function setTemplateSort(col) {
  if (TEMPLATE_SORT.col === col) TEMPLATE_SORT.dir *= -1;
  else TEMPLATE_SORT = { col, dir: 1 };
  renderTemplatesPageBody();
}
function tplSortIcon(col) { return TEMPLATE_SORT.col === col ? (TEMPLATE_SORT.dir === 1 ? ' ▲' : ' ▼') : ''; }
function toggleTemplateSelection(id, checked) {
  if (checked) TEMPLATE_SELECTED.add(id); else TEMPLATE_SELECTED.delete(id);
  renderTemplatesPageBody();
}
function toggleAllTemplateSelection(checked, ids) {
  ids.forEach(id => { if (checked) TEMPLATE_SELECTED.add(id); else TEMPLATE_SELECTED.delete(id); });
  renderTemplatesPageBody();
}
function clearTemplateSelection() { TEMPLATE_SELECTED.clear(); renderTemplatesPageBody(); }
function bulkDeleteTemplates() {
  if (!confirm(`Delete ${TEMPLATE_SELECTED.size} selected template(s)? This cannot be undone.`)) return;
  DB.data.coordinationTemplates = DB.data.coordinationTemplates.filter(t => !TEMPLATE_SELECTED.has(t.id));
  TEMPLATE_SELECTED.clear();
  DB.save();
  toast('Selected templates deleted.');
  renderTemplatesPageBody();
}
function templateChannelBadge(channel) {
  if (channel === 'email') return '<span class="badge" style="background:color-mix(in srgb, #58a6ff 18%, transparent);color:#58a6ff">📧 Email</span>';
  if (channel === 'zulip') return '<span class="badge" style="background:color-mix(in srgb, #a371f7 18%, transparent);color:#a371f7">💬 Zulip</span>';
  return '<span class="badge" style="background:color-mix(in srgb, #d29922 18%, transparent);color:#d29922">📌 Follow-Up</span>';
}
function openTemplatePreview(templateId) {
  const t = byId(DB.data.coordinationTemplates, templateId);
  if (!t) return;
  const canManage = hasPerm(Session.currentUser(), 'program', 'fn-eng-template-manage');
  const dt = t.dataTypeId ? byId(DB.data.dataTypes, t.dataTypeId) : null;
  Modal.open(`
    ${modalHeader(t.name, '')}
    <div class="modal-body">
      <div class="tpl-card-head" style="margin-bottom:10px">
        ${templateChannelBadge(t.channel)}
        ${dt ? `<span class="badge" style="background:var(--surface2);color:var(--muted)">${escapeHtml(dt.code)}</span>` : ''}
        <span class="badge" style="background:var(--surface2);color:var(--muted);text-transform:capitalize">${escapeHtml(t.category)}</span>
      </div>
      ${t.description ? `<p class="muted" style="margin-bottom:10px">${escapeHtml(t.description)}</p>` : ''}
      ${t.subject ? `<div style="padding:8px 10px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;margin-bottom:10px"><b>Subject:</b> ${escapeHtml(t.subject)}</div>` : ''}
      ${templateConditionTagsHtml(t.conditions)}
      <div style="white-space:pre-wrap;border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;font-size:12.5px;margin-top:8px;background:var(--surface)">${escapeHtml(t.body)}</div>
      ${templateKeywordTagsHtml(t.keywords)}
    </div>
    <div class="modal-footer">
      ${canManage ? `<button class="btn btn-sm" onclick="Modal.closeAll();duplicateTemplate('${t.id}')">Duplicate</button>` : ''}
      ${canManage ? `<button class="btn btn-sm btn-danger" onclick="Modal.closeAll();deleteTemplate('${t.id}')">Delete</button>` : ''}
      ${canManage ? `<button class="btn btn-primary btn-sm" onclick="Modal.closeAll();openTemplateEditForm('${t.channel || ''}','${t.category}','${t.id}')">Edit</button>` : ''}
      <button class="btn btn-sm" onclick="Modal.closeAll()">Close</button>
    </div>
  `, { wide: true });
}
function renderTemplatesPageBody() {
  const body = document.getElementById('templates-page-body');
  if (!body) return;
  const canManage = hasPerm(Session.currentUser(), 'program', 'fn-eng-template-manage');
  let templates = DB.data.coordinationTemplates.slice();
  if (TEMPLATE_FILTER === 'followup') templates = templates.filter(t => t.category === 'followup');
  else if (TEMPLATE_FILTER !== 'all') templates = templates.filter(t => t.dataTypeId === TEMPLATE_FILTER);
  if (TEMPLATE_STEP_FILTER !== 'all') templates = templates.filter(t => t.step === TEMPLATE_STEP_FILTER);
  if (TEMPLATE_SEARCH.trim()) {
    const q = TEMPLATE_SEARCH.trim().toLowerCase();
    templates = templates.filter(t =>
      t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) || (t.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }
  const bulkBarHtml = TEMPLATE_SELECTED.size > 0 ? `
    <div class="tpl-bulkbar">
      <span>${TEMPLATE_SELECTED.size} selected</span>
      <div class="btn-group">
        <button class="btn btn-sm" onclick="clearTemplateSelection()">Deselect all</button>
        ${canManage ? `<button class="btn btn-sm btn-danger" onclick="bulkDeleteTemplates()">Delete selected</button>` : ''}
      </div>
    </div>
  ` : '';
  if (templates.length === 0) { body.innerHTML = '<div class="empty-state">No templates match this filter.</div>' + bulkBarHtml; return; }

  if (TEMPLATE_VIEW === 'table') {
    const dir = TEMPLATE_SORT.dir;
    const sortVal = (t) => (TEMPLATE_SORT.col === 'dataType' ? (byId(DB.data.dataTypes, t.dataTypeId)?.code || '') : (t[TEMPLATE_SORT.col] || '')).toString().toLowerCase();
    templates = templates.slice().sort((a, b) => { const av = sortVal(a), bv = sortVal(b); return av < bv ? -dir : av > bv ? dir : 0; });
    body.innerHTML = `
      <div class="table-wrap table-scroll">
        <table><thead><tr>
          <th style="width:30px"><input type="checkbox" onchange="toggleAllTemplateSelection(this.checked, ${JSON.stringify(templates.map(t => t.id)).replace(/"/g, "'")})" ${templates.every(t => TEMPLATE_SELECTED.has(t.id)) ? 'checked' : ''}></th>
          <th style="cursor:pointer" onclick="setTemplateSort('name')">Name${tplSortIcon('name')}</th>
          <th style="cursor:pointer" onclick="setTemplateSort('channel')">Channel${tplSortIcon('channel')}</th>
          <th style="cursor:pointer" onclick="setTemplateSort('dataType')">Data Type${tplSortIcon('dataType')}</th>
          <th style="cursor:pointer" onclick="setTemplateSort('step')">Step${tplSortIcon('step')}</th>
          <th style="cursor:pointer" onclick="setTemplateSort('category')">Category${tplSortIcon('category')}</th>
          <th></th>
        </tr></thead>
        <tbody>${templates.map(t => {
          const dt = t.dataTypeId ? byId(DB.data.dataTypes, t.dataTypeId) : null;
          return `
          <tr>
            <td><input type="checkbox" ${TEMPLATE_SELECTED.has(t.id) ? 'checked' : ''} onchange="toggleTemplateSelection('${t.id}', this.checked)"></td>
            <td><a href="#" onclick="openTemplatePreview('${t.id}');return false;">${escapeHtml(t.name)}</a></td>
            <td>${templateChannelBadge(t.channel)}</td>
            <td>${dt ? escapeHtml(dt.code) : '—'}</td>
            <td class="muted" style="font-size:11.5px">${escapeHtml(t.step || '—')}</td>
            <td class="muted" style="font-size:11.5px;text-transform:capitalize">${escapeHtml(t.category)}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="btn btn-sm" onclick="openTemplatePreview('${t.id}')">View</button>
              ${canManage ? `<button class="btn btn-sm" onclick="openTemplateEditForm('${t.channel || ''}','${t.category}','${t.id}')">Edit</button>` : ''}
            </td>
          </tr>
        `; }).join('')}</tbody></table>
      </div>
      ${bulkBarHtml}
    `;
    return;
  }

  body.innerHTML = `
    <div class="tpl-grid">
      ${templates.map(t => {
        const dt = t.dataTypeId ? byId(DB.data.dataTypes, t.dataTypeId) : null;
        return `
        <div class="tpl-card">
          <label class="tpl-card-sel"><input type="checkbox" ${TEMPLATE_SELECTED.has(t.id) ? 'checked' : ''} onchange="toggleTemplateSelection('${t.id}', this.checked)"></label>
          <div class="tpl-card-head">
            ${templateChannelBadge(t.channel)}
            ${dt ? `<span class="badge" style="background:var(--surface2);color:var(--muted)">${escapeHtml(dt.code)}</span>` : ''}
            ${t.step ? `<span class="badge" style="background:var(--surface2);color:var(--muted)">${escapeHtml(t.step)}</span>` : ''}
          </div>
          <div class="tname">${escapeHtml(t.name)}</div>
          ${t.description ? `<div class="muted" style="font-size:11.5px;margin-bottom:6px">${escapeHtml(t.description)}</div>` : ''}
          ${templateConditionTagsHtml(t.conditions)}
          <pre>${escapeHtml(t.body.slice(0, 220))}${t.body.length > 220 ? '…' : ''}</pre>
          ${templateKeywordTagsHtml(t.keywords)}
          <div class="btn-group" style="margin-top:8px">
            <button class="btn btn-sm" onclick="openTemplatePreview('${t.id}')">View</button>
            ${canManage ? `<button class="btn btn-sm" onclick="openTemplateEditForm('${t.channel || ''}','${t.category}','${t.id}')">Edit</button>` : ''}
            ${canManage ? `<button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">Delete</button>` : ''}
          </div>
        </div>
      `; }).join('')}
    </div>
    ${bulkBarHtml}
  `;
}

// ===================================================================
// USER MANAGEMENT (Admin only)
// ===================================================================
function renderUsers(main) {
  const user = Session.currentUser();
  const canAdd = hasPerm(user, 'program', 'fn-user-add');
  const canEdit = hasPerm(user, 'program', 'fn-user-edit');
  const canDelete = hasPerm(user, 'program', 'fn-user-delete');
  const canActivate = hasPerm(user, 'program', 'fn-user-active');
  const canDeactivate = hasPerm(user, 'program', 'fn-user-inactive');
  const canReset = hasPerm(user, 'program', 'fn-user-reset-pw');
  const canExport = hasPerm(user, 'program', 'fn-user-export');

  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">User Management</div><div class="page-sub">Users, groups &amp; permissions</div></div>
      <div class="btn-group">
        ${canExport ? `<button class="btn btn-sm" onclick="exportUserReport()">Export User Report</button>` : ''}
        ${canAdd ? `<button class="btn btn-primary btn-sm" onclick="openUserForm()">+ Add User</button>` : ''}
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">User Groups</div>
      <div class="table-wrap"><table><thead><tr><th>Group</th><th>Description</th><th></th></tr></thead>
      <tbody>${DB.data.userGroups.map(g => `
        <tr><td><b>${escapeHtml(g.name)}</b></td><td class="muted">${escapeHtml(g.description)}</td>
        <td style="text-align:right"><button class="btn btn-sm" onclick="nav('#/users/group/${g.id}')">Open Group</button></td></tr>
      `).join('')}</tbody></table></div>
    </div>

    <div class="panel">
      <div class="panel-title">Users</div>
      <div class="field-hint" style="margin-bottom:8px">"Delete User" deactivates the account — it stays listed so audit history and records they created remain intact.</div>
      <div class="table-wrap table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Group</th><th>Status</th><th></th></tr></thead>
      <tbody>${DB.data.users.map(u => `
        <tr class="${u.status === 'inactive' ? 'inactive-row' : ''}">
          <td>${escapeHtml(u.name)} ${escapeHtml(u.surname)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.username)}</td>
          <td>${escapeHtml(userGroup(u)?.name || '')}</td>
          <td>${u.status === 'active' ? '<span class="subtle">active</span>' : '<span class="text-danger">inactive</span>'}</td>
          <td style="text-align:right;white-space:nowrap">
            ${canEdit ? `<button class="btn btn-sm" onclick="openUserForm('${u.id}')">Edit</button>` : ''}
            ${canReset ? `<button class="btn btn-sm" onclick="resetUserPassword('${u.id}')">Reset Password</button>` : ''}
            ${(u.status === 'active' && canDelete) ? `<button class="btn btn-sm btn-danger" onclick="deactivateUser('${u.id}')">Delete User</button>` : ''}
            ${(u.status === 'inactive' && canActivate) ? `<button class="btn btn-sm" onclick="activateUser('${u.id}')">Reactivate</button>` : ''}
          </td>
        </tr>
      `).join('')}</tbody></table></div>
    </div>
  `;
}
function openUserForm(userId) {
  const user = userId ? byId(DB.data.users, userId) : null;
  const mid = Modal.open(`
    ${modalHeader(user ? 'Edit User' : 'Add User', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Name</label><input id="u-name" value="${user ? escapeHtml(user.name) : ''}"></div>
        <div class="field"><label>Surname</label><input id="u-surname" value="${user ? escapeHtml(user.surname) : ''}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Email</label><input id="u-email" type="email" value="${user ? escapeHtml(user.email) : ''}"></div>
        <div class="field"><label>Username</label><input id="u-username" value="${user ? escapeHtml(user.username) : ''}" ${user ? 'disabled' : ''}></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Group</label><select id="u-group">${DB.data.userGroups.map(g => `<option value="${g.id}" ${user && user.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></div>
        ${!user ? `<div class="field"><label>Initial Password</label><input id="u-password" type="text" value="${genRandomPassword()}"></div>` : ''}
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveUser('${user ? user.id : ''}')">Save</button></div>
  `);
  wireCancel(mid);
}
function saveUser(userId) {
  const name = document.getElementById('u-name').value.trim();
  const surname = document.getElementById('u-surname').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const groupId = document.getElementById('u-group').value;
  if (!name || !email) { toast('Name and email are required.', 'error'); return; }

  if (userId) {
    Object.assign(byId(DB.data.users, userId), { name, surname, email, groupId });
  } else {
    const username = document.getElementById('u-username').value.trim();
    if (!username) { toast('Username is required.', 'error'); return; }
    if (DB.data.users.some(u => u.username === username)) { toast('Username already exists.', 'error'); return; }
    if (DB.data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) { toast('Email already exists.', 'error'); return; }
    const password = document.getElementById('u-password').value;
    DB.data.users.push({ id: uid('u'), name, surname, email, username, password, groupId, status: 'active', mustChangePassword: true });
    Outbox.send(email, 'Your Inhouse Application account', `An account has been created for you.\n\nUsername: ${username}\nTemporary password: ${password}\n\nYou will be required to change your password on first login.`);
  }
  DB.save(); Modal.closeAll(); route();
}
function resetUserPassword(userId) {
  const target = byId(DB.data.users, userId);
  if (!confirm(`Reset password for ${target.username}? A new temporary password will be emailed to them.`)) return;
  const temp = genRandomPassword();
  target.password = temp;
  target.mustChangePassword = true;
  DB.save();
  Outbox.send(target.email, 'Your password has been reset', `Your password was reset by an administrator.\n\nTemporary password: ${temp}\n\nYou will be required to change it on next login.`);
  toast('Temporary password sent — check the Outbox (✉).');
}
function deactivateUser(userId) {
  if (!confirm('Deactivate this user? They will immediately lose access, but their account and history are kept.')) return;
  byId(DB.data.users, userId).status = 'inactive';
  DB.save(); route();
}
function activateUser(userId) {
  byId(DB.data.users, userId).status = 'active';
  DB.save(); route();
}
function exportUserReport() {
  const rows = [['Name', 'Surname', 'Email', 'Username', 'Group', 'Status']];
  DB.data.users.forEach(u => rows.push([u.name, u.surname, u.email, u.username, userGroup(u)?.name || '', u.status]));
  downloadCsv('user_report.csv', rows);
}
function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// Real multi-sheet .xlsx export via SheetJS (loaded from CDN in index.html), matching how
// the team's own reporting tools build genuine Excel workbooks client-side. Falls back to
// one CSV per sheet if SheetJS didn't load (e.g. no internet access at prototype-open time).
function downloadXlsx(filenameBase, sheets) {
  if (typeof XLSX === 'undefined') {
    toast('Excel library unavailable offline — exporting as CSV instead.', 'error');
    sheets.forEach(s => downloadCsv(`${filenameBase}_${s.name}.csv`, s.rows));
    return;
  }
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filenameBase}.xlsx`);
}

// ---------------- Permission tree modal (Program + Report, independent) ----------------
function resolveFunctionMeta(category, fnId) {
  for (const sys of PERMISSION_TREE[category]) {
    for (const menu of sys.menus) {
      const fn = menu.functions.find(f => f.id === fnId);
      if (fn) return { systemName: sys.name, menuName: menu.name, functionName: fn.name };
    }
  }
  return { systemName: '?', menuName: '?', functionName: fnId };
}
let currentPermGroupId = null;
let CURRENT_GROUP_ID = null;
let CURRENT_GROUP_TAB = 'info';
const GROUP_TABS = [['info', 'Information detail'], ['permissions', 'Permission information'], ['users', 'Users']];

function renderUserGroupWorkspace(main) {
  currentPermGroupId = CURRENT_GROUP_ID;
  const group = byId(DB.data.userGroups, CURRENT_GROUP_ID);
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">${escapeHtml(group.name)}</div><div class="page-sub">User Group</div></div>
    </div>
    <div class="tabs">
      ${GROUP_TABS.map(([key, label]) => `<div class="tab ${CURRENT_GROUP_TAB === key ? 'active' : ''}" onclick="setGroupTab('${key}')">${label}</div>`).join('')}
    </div>
    <div id="group-tab-body"></div>
    ${pageFooter('#/users', '← Back to User Management')}
  `;
  renderGroupTabBody();
}
function setGroupTab(key) { CURRENT_GROUP_TAB = key; route(); }
function renderGroupTabBody() {
  const body = document.getElementById('group-tab-body');
  if (!body) return;
  if (CURRENT_GROUP_TAB === 'info') { renderGroupInfoTab(body); return; }
  if (CURRENT_GROUP_TAB === 'users') { renderGroupUsersTab(body); return; }
  body.innerHTML = `<div id="perm-modal-body"></div>`;
  renderGroupPermissionsBody();
}
function renderGroupInfoTab(body) {
  const group = byId(DB.data.userGroups, CURRENT_GROUP_ID);
  body.innerHTML = `
    <div class="panel">
      <div class="field"><label>Name</label><input id="grp-info-name" value="${escapeHtml(group.name)}"></div>
      <div class="field"><label>Description</label><textarea id="grp-info-desc" rows="3">${escapeHtml(group.description)}</textarea></div>
      <button class="btn btn-primary btn-sm" onclick="saveGroupInfo()">Save</button>
    </div>
  `;
}
function saveGroupInfo() {
  const group = byId(DB.data.userGroups, CURRENT_GROUP_ID);
  group.name = document.getElementById('grp-info-name').value.trim() || group.name;
  group.description = document.getElementById('grp-info-desc').value.trim();
  DB.save();
  toast('Group updated.');
  route();
}
function renderGroupUsersTab(body) {
  const members = DB.data.users.filter(u => u.groupId === CURRENT_GROUP_ID);
  body.innerHTML = `
    <div class="panel">
      <div class="panel-title">Users in this group</div>
      ${members.length === 0 ? '<div class="empty-state">No users in this group.</div>' : `
      <div class="table-wrap table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Status</th><th></th></tr></thead>
      <tbody>${members.map(u => `
        <tr class="${u.status === 'inactive' ? 'inactive-row' : ''}">
          <td>${escapeHtml(u.name)} ${escapeHtml(u.surname)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.username)}</td>
          <td>${u.status === 'active' ? '<span class="subtle">active</span>' : '<span class="text-danger">inactive</span>'}</td>
          <td style="text-align:right"><button class="btn btn-sm" onclick="nav('#/users')">Manage in User Management →</button></td>
        </tr>
      `).join('')}</tbody></table></div>`}
    </div>
  `;
}
function renderGroupPermissionsBody() {
  const body = document.getElementById('perm-modal-body');
  if (!body) return;
  const gp = DB.data.groupPermissions[currentPermGroupId] || { program: [], report: [] };
  body.innerHTML = ['program', 'report'].map(category => `
    <div class="perm-cat-block">
      <div class="perm-cat-head">
        <h4>${category === 'program' ? 'Program' : 'Report'} Permissions</h4>
        <button class="btn btn-sm btn-primary" onclick="openPermissionPickerModal('${category}')">+ Add</button>
      </div>
      ${gp[category].length === 0 ? '<div class="empty-state">No permissions assigned.</div>' : `
      <div class="table-wrap table-scroll"><table><thead><tr><th>No.</th><th>System name</th><th>Menu name</th><th>Function name</th><th></th></tr></thead>
      <tbody>${gp[category].map((fnId, i) => {
        const meta = resolveFunctionMeta(category, fnId);
        return `<tr><td>${i + 1}</td><td>${escapeHtml(meta.systemName)}</td><td>${escapeHtml(meta.menuName)}</td><td>${escapeHtml(meta.functionName)}</td>
          <td style="text-align:right"><button class="btn btn-sm btn-danger" onclick="removeGroupPermission('${category}','${fnId}')">Remove</button></td></tr>`;
      }).join('')}</tbody></table></div>`}
    </div>
  `).join('');
}
function removeGroupPermission(category, fnId) {
  const gp = DB.data.groupPermissions[currentPermGroupId];
  gp[category] = gp[category].filter(id => id !== fnId);
  DB.save();
  renderGroupPermissionsBody();
}
function openPermissionPickerModal(category) {
  const gp = DB.data.groupPermissions[currentPermGroupId];
  const alreadyAssigned = new Set(gp[category]);
  const mid = Modal.open(`
    ${modalHeader(`${category === 'program' ? 'Program' : 'Report'} data`, '')}
    <div class="modal-body">
      <div class="tree-toolbar">
        <label class="checkbox-row"><input type="checkbox" data-action="all-checkbox"> All</label>
        <button class="btn btn-sm btn-ghost" data-action="collapse-all">− Collapse All</button>
        <button class="btn btn-sm btn-ghost" data-action="expand-all">+ Expand All</button>
      </div>
      <div class="perm-tree" id="perm-tree-root">${renderPermissionTreeHtml(category, alreadyAssigned)}</div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Close</button><button class="btn btn-primary" onclick="applyPermissionPicker('${category}')">OK</button></div>
  `, { wide: true });
  const scope = document.querySelector(`[data-modal-id="${mid}"]`);
  scope.querySelector('[data-action="all-checkbox"]').onchange = (e) => treeSelectAll(mid, e.target.checked);
  scope.querySelector('[data-action="expand-all"]').onclick = () => treeExpandAll(mid, false);
  scope.querySelector('[data-action="collapse-all"]').onclick = () => treeExpandAll(mid, true);
  wireCancel(mid);
}
function renderPermissionTreeHtml(category, alreadyAssignedSet) {
  return PERMISSION_TREE[category].map(sys => `
    <div class="tree-system" data-node="system">
      <div class="tree-row">
        <span class="tree-toggle" onclick="toggleTreeNode(this)">▾</span>
        <input type="checkbox" data-scope="system" onchange="onTreeCheckboxChange(this)">
        <span class="tree-label-system">${escapeHtml(sys.name)}</span>
      </div>
      <div class="tree-children">
        ${sys.menus.map(menu => `
          <div class="tree-menu" data-node="menu">
            <div class="tree-row">
              <span class="tree-toggle" onclick="toggleTreeNode(this)">▾</span>
              <input type="checkbox" data-scope="menu" onchange="onTreeCheckboxChange(this)">
              <span class="tree-label-menu">${escapeHtml(menu.name)}</span>
            </div>
            <div class="tree-children">
              ${menu.functions.map(fn => `
                <div class="tree-fn" data-node="fn">
                  <div class="tree-row">
                    <input type="checkbox" data-scope="fn" data-id="${fn.id}" ${alreadyAssignedSet.has(fn.id) ? 'checked disabled' : ''} onchange="onTreeCheckboxChange(this)">
                    <span class="tree-label-fn">${escapeHtml(fn.name)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
function toggleTreeNode(toggleEl) {
  toggleEl.closest('[data-node]').classList.toggle('tree-collapsed');
  toggleEl.textContent = toggleEl.closest('[data-node]').classList.contains('tree-collapsed') ? '▸' : '▾';
}
function onTreeCheckboxChange(el) {
  const root = el.closest('.perm-tree');
  if (el.dataset.scope !== 'fn') {
    const container = el.closest('[data-node]');
    container.querySelectorAll('input[type=checkbox]').forEach(cb => { if (!cb.disabled) cb.checked = el.checked; });
  }
  refreshTreeParentStates(root);
}
function refreshTreeParentStates(root) {
  root.querySelectorAll('.tree-menu').forEach(menuEl => {
    const ownBox = menuEl.querySelector(':scope > .tree-row > input[type=checkbox]');
    const fnBoxes = [...menuEl.querySelectorAll(':scope > .tree-children .tree-fn input[type=checkbox]')];
    setParentBoxState(ownBox, fnBoxes);
  });
  root.querySelectorAll('.tree-system').forEach(sysEl => {
    const ownBox = sysEl.querySelector(':scope > .tree-row > input[type=checkbox]');
    const menuBoxes = [...sysEl.querySelectorAll(':scope > .tree-children > .tree-menu > .tree-row > input[type=checkbox]')];
    setParentBoxState(ownBox, menuBoxes);
  });
}
function setParentBoxState(ownBox, childBoxes) {
  if (!ownBox || childBoxes.length === 0) return;
  const checkedCount = childBoxes.filter(b => b.checked).length;
  ownBox.checked = checkedCount === childBoxes.length;
  ownBox.indeterminate = checkedCount > 0 && checkedCount < childBoxes.length;
}
function treeSelectAll(modalId, checked) {
  const root = document.querySelector(`[data-modal-id="${modalId}"] .perm-tree`);
  root.querySelectorAll('input[type=checkbox]:not(:disabled)').forEach(cb => { cb.checked = checked; cb.indeterminate = false; });
  refreshTreeParentStates(root);
}
function treeExpandAll(modalId, collapse) {
  const root = document.querySelector(`[data-modal-id="${modalId}"] .perm-tree`);
  root.querySelectorAll('[data-node]').forEach(n => {
    n.classList.toggle('tree-collapsed', collapse);
    const toggle = n.querySelector(':scope > .tree-row > .tree-toggle');
    if (toggle) toggle.textContent = collapse ? '▸' : '▾';
  });
}
function applyPermissionPicker(category) {
  const root = document.querySelector('.modal-overlay:last-child .perm-tree');
  const newIds = [...root.querySelectorAll('input[data-scope="fn"]:checked:not(:disabled)')].map(cb => cb.dataset.id);
  const gp = DB.data.groupPermissions[currentPermGroupId];
  newIds.forEach(id => { if (!gp[category].includes(id)) gp[category].push(id); });
  DB.save();
  Modal.close(Modal.stack[Modal.stack.length - 1]);
  renderGroupPermissionsBody();
  toast(`${newIds.length} permission(s) added.`);
}

// ===================================================================
// SETTINGS — one generic CRUD pattern reused for every "(can be added
// more later)" reference-data list.
// ===================================================================
// Ordered alphabetically by title — kept as the literal source order so the on-screen
// order is obvious from reading this list, rather than sorted at render time.
const CRUD_ENTITIES = [
  { key: 'userGroups', group: 'general', title: 'User Groups', fields: [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }] },
  { key: 'sites', group: 'general', title: 'Sites', fields: [{ key: 'key', label: 'Key' }, { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }] },
  { key: 'countries', group: 'engagement', title: 'Countries', fields: [{ key: 'name', label: 'Name' }] },
  { key: 'projects', group: 'engagement', title: 'Projects', fields: [{ key: 'name', label: 'Name' }, { key: 'countryId', label: 'Country', type: 'select', optionsFrom: 'countries' }] },
  { key: 'dataTypes', group: 'engagement', title: 'Engagement Data Types', fields: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }] },
  { key: 'statuses', group: 'engagement', title: 'Engagement Statuses', fields: [{ key: 'label', label: 'Label' }, { key: 'color', label: 'Color', type: 'color' }] },
];
function renderSettings(main) {
  // dataTypes/statuses only ever drive Engagement Log screens (per-data-type panels, status
  // tracking, templates, reports) — in the KM-only build there's no Engagement Log to use them,
  // so they're just clutter here. Countries/Projects stay: KM's own project browser needs them.
  const entities = window.KM_ONLY_MODE ? CRUD_ENTITIES.filter(c => c.key !== 'dataTypes' && c.key !== 'statuses') : CRUD_ENTITIES;
  const panelHtml = (cfg) => `
    <div class="panel">
      <div class="panel-title">${escapeHtml(cfg.title)}<button class="btn btn-sm btn-primary" onclick="openCrudForm('${cfg.key}')">+ Add</button></div>
      <div id="crud-panel-${cfg.key}"></div>
    </div>
  `;
  main.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Settings</div><div class="page-sub">Generic reference-data admin — extend any of these lists without new development</div></div>
      <div class="btn-group"><button class="btn btn-danger btn-sm" onclick="resetDemoData()">Reset Demo Data</button></div>
    </div>
    <div class="settings-columns">
      <div class="settings-column">
        <div class="settings-column-title">General</div>
        ${entities.filter(c => c.group === 'general').map(panelHtml).join('')}
      </div>
      <div class="settings-column">
        <div class="settings-column-title">${window.KM_ONLY_MODE ? 'Reference Data' : 'Engagement Data'}</div>
        ${entities.filter(c => c.group === 'engagement').map(panelHtml).join('')}
      </div>
    </div>
  `;
  entities.forEach(cfg => renderCrudTable(cfg.key));
}
function crudFieldDisplay(cfg, item, field) {
  if (field.type === 'select' && field.optionsFrom) {
    const opt = byId(DB.data[field.optionsFrom], item[field.key]);
    return opt ? opt.name : '—';
  }
  if (field.type === 'color') return `<span class="badge-dot" style="background:${item[field.key]};display:inline-block"></span> ${escapeHtml(item[field.key])}`;
  return escapeHtml(item[field.key]);
}
function renderCrudTable(entityKey) {
  const cfg = CRUD_ENTITIES.find(c => c.key === entityKey);
  const items = DB.data[entityKey];
  const panel = document.getElementById(`crud-panel-${entityKey}`);
  panel.innerHTML = items.length === 0 ? '<div class="empty-state">No records.</div>' : `
    <div class="table-wrap table-scroll"><table><thead><tr>${cfg.fields.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}<th></th></tr></thead>
    <tbody>${items.map(item => `
      <tr>${cfg.fields.map(f => `<td>${crudFieldDisplay(cfg, item, f)}</td>`).join('')}
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-sm" onclick="openCrudForm('${entityKey}','${item.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCrudItem('${entityKey}','${item.id}')">Delete</button>
        </td>
      </tr>
    `).join('')}</tbody></table></div>
  `;
}
function openCrudForm(entityKey, itemId) {
  const cfg = CRUD_ENTITIES.find(c => c.key === entityKey);
  const item = itemId ? byId(DB.data[entityKey], itemId) : null;
  const fieldHtml = cfg.fields.map(f => {
    const val = item ? item[f.key] : '';
    if (f.type === 'select') {
      return `<div class="field"><label>${escapeHtml(f.label)}</label><select id="crud-f-${f.key}">${DB.data[f.optionsFrom].map(o => `<option value="${o.id}" ${item && item[f.key] === o.id ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'color') {
      return `<div class="field"><label>${escapeHtml(f.label)}</label><input type="color" id="crud-f-${f.key}" value="${val || '#2f81f7'}"></div>`;
    }
    return `<div class="field"><label>${escapeHtml(f.label)}</label><input id="crud-f-${f.key}" value="${escapeHtml(val)}"></div>`;
  }).join('');
  const mid = Modal.open(`
    ${modalHeader(`${item ? 'Edit' : 'Add'} ${cfg.title}`, '')}
    <div class="modal-body">${fieldHtml}</div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="saveCrudItem('${entityKey}','${itemId || ''}')">Save</button></div>
  `);
  wireCancel(mid);
}
function saveCrudItem(entityKey, itemId) {
  const cfg = CRUD_ENTITIES.find(c => c.key === entityKey);
  const values = {};
  for (const f of cfg.fields) {
    const el = document.getElementById(`crud-f-${f.key}`);
    values[f.key] = el.value;
  }
  if (itemId) {
    Object.assign(byId(DB.data[entityKey], itemId), values);
  } else {
    values.id = uid(entityKey.slice(0, 3));
    DB.data[entityKey].push(values);
  }
  DB.save();
  Modal.closeAll();
  toast('Saved.');
  renderCrudTable(entityKey);
}
function deleteCrudItem(entityKey, itemId) {
  if (!confirm('Delete this record? Related data referencing it may become inconsistent in this prototype.')) return;
  DB.data[entityKey] = DB.data[entityKey].filter(x => x.id !== itemId);
  DB.save();
  renderCrudTable(entityKey);
}

// ===================================================================
// REPORTING / EXPORT
// ===================================================================
function pct(num, den) { return den > 0 ? ((num / den) * 100).toFixed(1) + '%' : 'N/A'; }

function openProgressReportModal() {
  const mid = Modal.open(`
    ${modalHeader('Progress Report Export', '')}
    <div class="modal-body">
      <p class="muted" style="margin-bottom:10px">Layout follows the team's iAPI Carrier Progress Report: a Summary sheet (carrier/host rollups + full status breakdown) and a Detail sheet (per airline/host status rows). Pick one data type to also get %Pax Certified and %Pax Cutover sheets, listing each airline's passenger share.</p>
      <div class="field"><label>Data Type</label>
        <select id="pr-datatype-filter">
          <option value="all">All Data Types (Summary + Detail only)</option>
          ${DB.data.dataTypes.map(dt => `<option value="${dt.id}">${escapeHtml(dt.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" onclick="exportProgressReport()">Export</button></div>
  `);
  wireCancel(mid);
}
// Palette lifted directly from iAPI-Carrier-Progress-Report_June 2026.xlsx (section header /
// body fills and the blue/red "Certified"/"Cutover" emphasis font colors), read with ExcelJS.
const REPORT_PALETTE = {
  carrierHeader: lightenHex('#C0504D', 35), carrierBody: lightenHex('#C0504D', 80),
  hostHeader: '#D9B9E1', hostBody: '#F4EAF6',
  bannerGold: '#FFC000',
  statusSectionHeader: '#BFCFE3',
  paxSectionHeader: '#F9E8C7',
  detailHeader: darkenHex('#1F497D', 10),
  certifiedFont: '#00B0F0', cutoverFont: '#FF0000',
};
function argb(hex) { return 'FF' + hex.replace('#', '').toUpperCase(); }
function fillCell(cell, hex) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } }; }
async function downloadExcelWorkbook(filenameBase, wb) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filenameBase}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

async function exportProgressReport() {
  const filterId = document.getElementById('pr-datatype-filter').value;
  const dataTypes = filterId === 'all' ? DB.data.dataTypes : [byId(DB.data.dataTypes, filterId)];
  const project = byId(DB.data.projects, CURRENT_ENG_PROJECT_ID);
  const reportConfig = DB.data.reportConfigs.find(rc => rc.projectId === project.id && !rc.effectiveTo);
  const paxTotal = reportConfig ? reportConfig.reportingPeriodTotalPax : 0;
  const airlines = DB.data.airlines.filter(a => a.projectId === project.id && a.status === 'active');
  const hosts = DB.data.hosts.filter(hh => hh.projectId === project.id && hh.status === 'active');
  const scopeLabel = filterId === 'all' ? 'ALL DATA TYPES' : byId(DB.data.dataTypes, filterId).name.toUpperCase();

  const recordsInScope = (entities, idField) => DB.data.engagementRecords.filter(r =>
    r.projectId === project.id && dataTypes.some(dt => dt.id === r.dataTypeId) && entities.some(e => e.id === r[idField]));
  const airlineRecs = recordsInScope(airlines, 'airlineId');
  const hostRecs = recordsInScope(hosts, 'hostId');
  const countStatus = (records, statusId) => records.filter(r => r.statusId === statusId).length;
  const paxOf = (statusId) => airlineRecs.filter(r => r.statusId === statusId).reduce((s, r) => s + (r.pax || 0), 0);

  if (typeof ExcelJS === 'undefined') {
    toast('Excel styling library unavailable offline — exporting without colors instead.', 'error');
    downloadXlsx(`ProgressReport_${project.name.replace(/\W+/g, '_')}`, [{
      name: 'Summary',
      rows: [[`${scopeLabel}: CARRIER CERTIFICATION REPORT`], ['Total No of Carriers', airlines.length],
        ['No of Certified Carriers', countStatus(airlineRecs, 'certified')], ['No of Cutover Carriers', countStatus(airlineRecs, 'cutover')]],
    }]);
    Modal.closeAll();
    return;
  }

  const wb = new ExcelJS.Workbook();

  // ---- Summary sheet ----
  const sh = wb.addWorksheet('Summary');
  sh.columns = [{ width: 40 }, { width: 16 }, { width: 12 }];
  const titleRow = sh.addRow([`${scopeLabel}: CARRIER CERTIFICATION REPORT`]);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  sh.addRow([`UPDATE DATE: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
  sh.addRow([`PROJECT: ${project.name}`]);
  sh.addRow([]);

  function sectionHeaderRow(cells, fillHex) {
    const row = sh.addRow(cells);
    for (let i = 1; i <= 3; i++) { fillCell(row.getCell(i), fillHex); row.getCell(i).font = { bold: true, size: 12 }; }
    return row;
  }
  function dataRow(cells, fillHex, fontHex) {
    const row = sh.addRow(cells);
    if (fillHex) for (let i = 1; i <= 3; i++) fillCell(row.getCell(i), fillHex);
    if (fontHex) { row.getCell(2).font = { bold: true, color: { argb: argb(fontHex) } }; row.getCell(3).font = { bold: true, color: { argb: argb(fontHex) } }; }
    return row;
  }

  sectionHeaderRow(['SUMMARY', 'No of Carriers', '%'], REPORT_PALETTE.carrierHeader);
  dataRow(['Total No of Carriers', airlines.length, pct(airlines.length, airlines.length)], REPORT_PALETTE.carrierBody);
  dataRow(['No of Certified Carriers', countStatus(airlineRecs, 'certified'), pct(countStatus(airlineRecs, 'certified'), airlineRecs.length)], REPORT_PALETTE.carrierBody, REPORT_PALETTE.certifiedFont);
  dataRow(['No of Cutover Carriers', countStatus(airlineRecs, 'cutover'), pct(countStatus(airlineRecs, 'cutover'), airlineRecs.length)], REPORT_PALETTE.carrierBody, REPORT_PALETTE.cutoverFont);
  sh.addRow([]);

  sectionHeaderRow(['SUMMARY', 'No of Host', '%'], REPORT_PALETTE.hostHeader);
  dataRow(['Total No of Host', hosts.length, pct(hosts.length, hosts.length)], REPORT_PALETTE.hostBody);
  dataRow(['No of Certified Host', countStatus(hostRecs, 'certified'), pct(countStatus(hostRecs, 'certified'), hostRecs.length)], REPORT_PALETTE.hostBody, REPORT_PALETTE.certifiedFont);
  dataRow(['No of Cutover Host', countStatus(hostRecs, 'cutover'), pct(countStatus(hostRecs, 'cutover'), hostRecs.length)], REPORT_PALETTE.hostBody, REPORT_PALETTE.cutoverFont);
  sh.addRow([]);

  sectionHeaderRow(['PROGRESS OF CARRIER CERTIFICATION BY STATUS', '', ''], REPORT_PALETTE.bannerGold);
  sectionHeaderRow(['STATUS BREAKDOWN', 'No of Carriers', '%'], REPORT_PALETTE.statusSectionHeader);
  DB.data.statuses.forEach(s => {
    const n = countStatus(airlineRecs, s.id);
    dataRow([s.label, n, pct(n, airlineRecs.length)], lightenHex(s.color, 82));
  });
  sh.addRow([]);

  sectionHeaderRow(['PAX SUMMARY', '', ''], REPORT_PALETTE.paxSectionHeader);
  dataRow(['Reporting Period Pax Total', paxTotal, ''], lightenHex(REPORT_PALETTE.paxSectionHeader, 60));
  dataRow(['Pax of Certified Carriers', paxOf('certified'), pct(paxOf('certified'), paxTotal)], lightenHex(REPORT_PALETTE.paxSectionHeader, 60), REPORT_PALETTE.certifiedFont);
  dataRow(['Pax of Cutover Carriers', paxOf('cutover'), pct(paxOf('cutover'), paxTotal)], lightenHex(REPORT_PALETTE.paxSectionHeader, 60), REPORT_PALETTE.cutoverFont);

  // ---- Detail sheet: header styled like the reference's dark-navy header row; each data
  // row tinted by its own status color (matching the reference's per-status row highlighting) ----
  const dsh = wb.addWorksheet('Detail');
  dsh.columns = [{ width: 6 }, { width: 26 }, { width: 10 }, { width: 8 }, { width: 16 }, { width: 10 }, { width: 16 }, { width: 14 }, { width: 12 }];
  const headerRow = dsh.addRow(['No', 'Entity', 'Type', 'IATA', 'Country', 'Data Type', 'Status', 'Last Updated', 'Pax']);
  headerRow.eachCell(c => { fillCell(c, REPORT_PALETTE.detailHeader); c.font = { bold: true, color: { argb: argb('#FFFFFF') } }; });

  let rowNo = 1;
  dataTypes.forEach(dt => {
    airlineRecs.filter(r => r.dataTypeId === dt.id).forEach(r => {
      const a = byId(DB.data.airlines, r.airlineId);
      const country = byId(DB.data.countries, project.countryId);
      const status = byId(DB.data.statuses, r.statusId);
      const row = dsh.addRow([rowNo++, a.name, 'Airline', a.iata, country?.name || '', dt.code, status?.label, r.lastUpdated, r.pax]);
      row.eachCell((c, i) => { if (i <= 9) fillCell(c, lightenHex(status.color, 85)); });
      row.getCell(7).font = { bold: true, color: { argb: argb(status.color) } };
    });
    hostRecs.filter(r => r.dataTypeId === dt.id).forEach(r => {
      const hh = byId(DB.data.hosts, r.hostId);
      const status = byId(DB.data.statuses, r.statusId);
      const row = dsh.addRow([rowNo++, hh.name, 'Host', '', '', dt.code, status?.label, r.lastUpdated, '']);
      row.eachCell((c, i) => { if (i <= 9) fillCell(c, lightenHex(status.color, 85)); });
      row.getCell(7).font = { bold: true, color: { argb: argb(status.color) } };
    });
  });

  let sheetCount = 2;
  // %Pax sheets only make sense against a single data type (mirrors the reference workbook,
  // which is scoped to one data type per report).
  if (filterId !== 'all') {
    const dt = byId(DB.data.dataTypes, filterId);
    ['certified', 'cutover'].forEach(statusId => {
      const label = statusId === 'certified' ? 'Certified' : 'Cutover';
      const fontHex = statusId === 'certified' ? REPORT_PALETTE.certifiedFont : REPORT_PALETTE.cutoverFont;
      const psh = wb.addWorksheet(`%Pax ${label}`);
      psh.columns = [{ width: 6 }, { width: 10 }, { width: 26 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 20 }];
      const t = psh.addRow([`Passenger Percentage of ${label} Carriers — ${dt.name}`]);
      t.getCell(1).font = { bold: true, size: 13 };
      psh.addRow([]);
      psh.addRow(['Reporting Period Pax Total:', paxTotal]);
      psh.addRow([]);
      const h = psh.addRow(['No', 'IATA', 'Airline Name', 'Status Date', 'Pax', '%Pax', 'Remark']);
      h.eachCell(c => { fillCell(c, REPORT_PALETTE.detailHeader); c.font = { bold: true, color: { argb: argb('#FFFFFF') } }; });
      let n = 1, sumPax = 0;
      airlineRecs.filter(r => r.dataTypeId === dt.id && r.statusId === statusId).forEach(r => {
        const a = byId(DB.data.airlines, r.airlineId);
        sumPax += (r.pax || 0);
        psh.addRow([n++, a.iata, a.name, r.lastUpdated, r.pax, pct(r.pax, paxTotal), '']);
      });
      const totalRow = psh.addRow(['', '', '', 'Total', sumPax, pct(sumPax, paxTotal), '']);
      totalRow.eachCell(c => { c.font = { bold: true, color: { argb: argb(fontHex) } }; });
      sheetCount++;
    });
  }

  await downloadExcelWorkbook(`ProgressReport_${project.name.replace(/\W+/g, '_')}`, wb);
  Modal.closeAll();
  toast(`Progress report exported (${sheetCount}-sheet .xlsx, colored to match the reference report).`);
}

// Quick Sum Monthly Report — modelled on the team's actual Zulip-style monthly update
// message (e.g. "Thai PNRGOV Progress (Update date: ...)"): a short narrative with one
// bulleted line per status, each showing a count and the IATA codes it covers, plus an
// update-count/detail table for the selected date range. "Copy" puts the narrative text
// on the clipboard ready to paste into Zulip/email.
const QUICK_SUM_ICONS = {
  not_started: '◇', contacted: '◆', in_development: '◆', testing: '◆',
  certified: '◆', cutover: '◆', on_hold: '▲', ceased: '■',
};
function openQuickSumModal() {
  const today = new Date().toISOString().slice(0, 10);
  const project = byId(DB.data.projects, CURRENT_ENG_PROJECT_ID);
  const mid = Modal.open(`
    ${modalHeader('Quick Sum Monthly Report', '')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Data Type</label>
          <select id="qs-datatype">${DB.data.dataTypes.map(dt => `<option value="${dt.id}">${escapeHtml(dt.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Update Date From</label><input type="date" id="qs-from" value="2026-01-01"></div>
        <div class="field"><label>Update Date To</label><input type="date" id="qs-to" value="${today}"></div>
      </div>
      <div class="panel" style="background:var(--bg)">
        <div class="panel-title">Message Preview<button class="btn btn-sm" onclick="copyQuickSumNarrative()">📋 Copy to Clipboard</button></div>
        <pre id="qs-narrative" style="white-space:pre-wrap;font-family:var(--mono);font-size:12.5px;line-height:1.7"></pre>
      </div>
      <div id="qs-results"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="Modal.closeAll()">Close</button>
      <button class="btn" onclick="runQuickSum()">Refresh</button>
      <button class="btn btn-primary" onclick="exportQuickSum()">Export .xlsx</button>
    </div>
  `, { wide: true });
  document.getElementById('qs-datatype').onchange = runQuickSum;
  document.getElementById('qs-from').onchange = runQuickSum;
  document.getElementById('qs-to').onchange = runQuickSum;
  runQuickSum();
}
function quickSumFilteredRecords() {
  const from = document.getElementById('qs-from').value;
  const to = document.getElementById('qs-to').value;
  const dtId = document.getElementById('qs-datatype').value;
  return DB.data.engagementRecords.filter(r => r.projectId === CURRENT_ENG_PROJECT_ID && r.dataTypeId === dtId && r.lastUpdated >= from && r.lastUpdated <= to);
}
function quickSumNarrativeText() {
  const project = byId(DB.data.projects, CURRENT_ENG_PROJECT_ID);
  const dt = byId(DB.data.dataTypes, document.getElementById('qs-datatype').value);
  const allRecords = DB.data.engagementRecords.filter(r => r.projectId === project.id && r.dataTypeId === dt.id && r.airlineId);
  const today = new Date().toLocaleDateString('en-GB').split('/').join('/');
  const lines = [`${project.name} — ${dt.name} Progress (Update date: ${today})`, ''];
  lines.push(`Total No. of Airlines = ${allRecords.length}`);
  DB.data.statuses.forEach(s => {
    const inStatus = allRecords.filter(r => r.statusId === s.id);
    if (inStatus.length === 0) return;
    const codes = inStatus.map(r => byId(DB.data.airlines, r.airlineId)?.iata).filter(Boolean).join(', ');
    lines.push(`${QUICK_SUM_ICONS[s.id] || '◆'} ${s.label} = ${inStatus.length} (${codes})`);
  });
  lines.push('', 'Thank you.');
  return lines.join('\n');
}
function copyQuickSumNarrative() {
  const text = document.getElementById('qs-narrative').textContent;
  navigator.clipboard.writeText(text).then(
    () => toast('Copied to clipboard.'),
    () => toast('Could not access clipboard — select and copy the text manually.', 'error'),
  );
}
function runQuickSum() {
  document.getElementById('qs-narrative').textContent = quickSumNarrativeText();
  const records = quickSumFilteredRecords();
  const results = document.getElementById('qs-results');
  results.innerHTML = `
    <div class="summary-grid" style="margin-top:12px"><div class="summary-card"><div class="label">Updates in Range</div><div class="value">${records.length}</div></div></div>
    <div class="table-wrap table-scroll"><table><thead><tr><th>Entity</th><th>Status</th><th>Last Updated</th></tr></thead>
    <tbody>${records.map(r => {
      const entity = r.airlineId ? byId(DB.data.airlines, r.airlineId) : byId(DB.data.hosts, r.hostId);
      return `<tr><td>${escapeHtml(entity?.name || '?')}</td><td>${statusBadge(r.statusId)}</td><td>${r.lastUpdated}</td></tr>`;
    }).join('')}</tbody></table></div>
  `;
}
function exportQuickSum() {
  const records = quickSumFilteredRecords();
  const rows = [['Entity', 'Status', 'Last Updated']];
  records.forEach(r => {
    const entity = r.airlineId ? byId(DB.data.airlines, r.airlineId) : byId(DB.data.hosts, r.hostId);
    rows.push([entity?.name || '?', byId(DB.data.statuses, r.statusId)?.label, r.lastUpdated]);
  });
  const narrativeRows = quickSumNarrativeText().split('\n').map(line => [line]);
  downloadXlsx('QuickSumMonthlyReport', [{ name: 'Message', rows: narrativeRows }, { name: 'Detail', rows }]);
  toast('Quick Sum Monthly Report exported.');
}

function resetDemoData() {
  if (!confirm('Reset all data back to the original seed data? Any changes made in this prototype session will be lost.')) return;
  DB.reset();
  toast('Demo data reset.');
  route();
}
