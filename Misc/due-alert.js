// ── Due / Overdue Alert Modal ───────────────────────────────────────────────
// Generic "items needing attention" popup. Call it on page load (or whenever)
// with a plain array of { id, title, dueDate } items — no app-specific field
// names required. Anything overdue, due today, or due within `soonDays` is
// shown in a modal with per-item actions: extend the due date, or dismiss.
// The modal auto-closes once every listed item has been resolved. Plain
// vanilla JS, no dependencies. Singleton overlay, reused across calls.
//
// Usage:
//   checkDueAlerts(
//     [
//       { id: 1, title: 'Renew certificate', dueDate: '2026-07-10' },
//       { id: 2, title: 'File report',        dueDate: '2026-07-16' },
//     ],
//     {
//       soonDays: 3,                                   // optional, default 3
//       onExtend: (id, newDate) => myStore.setDue(id, newDate),
//       onDismiss: (id) => myStore.archive(id),
//     }
//   );
//
// Public API:
//   checkDueAlerts(items, opts) -> classifies items, opens the modal if any
//                                  are overdue/due-today/due-soon. No-op if
//                                  none qualify.
//   closeDueAlerts()            -> hides the modal without firing callbacks

(function (global) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let overlay = null;
  let listEl = null;
  let flagged = []; // currently-displayed { id, title, dueDate, status }
  let currentOpts = {};

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    return { y: parseInt(m[1], 10), mo: parseInt(m[2], 10) - 1, d: parseInt(m[3], 10) };
  }

  function daysUntil(iso, todayIsoStr) {
    const due = parseIso(iso);
    const now = parseIso(todayIsoStr);
    if (!due || !now) return null;
    const dueDate = new Date(due.y, due.mo, due.d);
    const nowDate = new Date(now.y, now.mo, now.d);
    return Math.round((dueDate - nowDate) / 86400000);
  }

  function formatDisplay(iso) {
    const p = parseIso(iso);
    if (!p) return '';
    return `${p.d} ${MONTHS[p.mo]} ${p.y}`;
  }

  // ── Classification ──
  function classify(item, todayIsoStr, soonDays) {
    if (!item || !item.dueDate) return null;
    const diff = daysUntil(item.dueDate, todayIsoStr);
    if (diff === null) return null;
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    if (diff <= soonDays) return 'soon';
    return null;
  }

  function labelFor(status, item, todayIsoStr) {
    if (status === 'overdue') return `Overdue · ${formatDisplay(item.dueDate)}`;
    if (status === 'today') return 'Due today';
    const diff = daysUntil(item.dueDate, todayIsoStr);
    return `Due in ${diff} day${diff === 1 ? '' : 's'} · ${formatDisplay(item.dueDate)}`;
  }

  // ── Icon builders (match date-picker.js's createElementNS convention) ──
  function warningIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'due-alert-icon');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '12'); line1.setAttribute('y1', '8');
    line1.setAttribute('x2', '12'); line1.setAttribute('y2', '12');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '12'); line2.setAttribute('y1', '16');
    line2.setAttribute('x2', '12.01'); line2.setAttribute('y2', '16');

    svg.appendChild(circle);
    svg.appendChild(line1);
    svg.appendChild(line2);
    return svg;
  }

  function closeIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '18'); line1.setAttribute('y1', '6');
    line1.setAttribute('x2', '6'); line1.setAttribute('y2', '18');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '6'); line2.setAttribute('y1', '6');
    line2.setAttribute('x2', '18'); line2.setAttribute('y2', '18');

    svg.appendChild(line1);
    svg.appendChild(line2);
    return svg;
  }

  // ── Popover construction (once, lazily) ──
  function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'due-alert-overlay';
    overlay.className = 'due-alert-overlay';

    const modal = document.createElement('div');
    modal.className = 'due-alert-modal';

    const header = document.createElement('div');
    header.className = 'due-alert-header';
    header.appendChild(warningIconSvg());

    const title = document.createElement('h2');
    title.className = 'due-alert-title';
    title.textContent = 'Tasks Needing Attention';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'due-alert-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(closeIconSvg());
    closeBtn.addEventListener('click', closeDueAlerts);
    header.appendChild(closeBtn);

    listEl = document.createElement('div');
    listEl.className = 'due-alert-list';

    const footer = document.createElement('div');
    footer.className = 'due-alert-footer';

    const dismissAllBtn = document.createElement('button');
    dismissAllBtn.type = 'button';
    dismissAllBtn.className = 'due-alert-btn due-alert-dismiss-all';
    dismissAllBtn.textContent = 'Dismiss all';
    dismissAllBtn.addEventListener('click', closeDueAlerts);
    footer.appendChild(dismissAllBtn);

    modal.appendChild(header);
    modal.appendChild(listEl);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ── Row rendering ──
  function buildRow(item) {
    const row = document.createElement('div');
    row.className = `due-alert-item ${item.status}`;
    row.dataset.id = String(item.id);

    const titleEl = document.createElement('div');
    titleEl.className = 'due-alert-item-title';
    titleEl.textContent = item.title || '';
    row.appendChild(titleEl);

    const meta = document.createElement('div');
    meta.className = 'due-alert-item-meta';
    const badge = document.createElement('span');
    badge.className = `due-alert-badge ${item.status}`;
    badge.textContent = labelFor(item.status, item, todayIso());
    meta.appendChild(badge);
    row.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'due-alert-item-actions';

    const t = todayIso();
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'due-alert-date-input';
    dateInput.value = t;
    dateInput.min = t;
    actions.appendChild(dateInput);

    const extendBtn = document.createElement('button');
    extendBtn.type = 'button';
    extendBtn.className = 'due-alert-btn due-alert-extend';
    extendBtn.textContent = 'Extend to date';
    extendBtn.addEventListener('click', () => handleExtend(item.id, dateInput));
    actions.appendChild(extendBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'due-alert-btn due-alert-dismiss-one';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => handleDismiss(item.id));
    actions.appendChild(dismissBtn);

    row.appendChild(actions);
    return row;
  }

  function removeItem(id) {
    flagged = flagged.filter((it) => it.id !== id);
    const row = Array.prototype.find.call(listEl.children, (el) => el.dataset.id === String(id));
    if (row) row.remove();
    if (!listEl.children.length) closeDueAlerts();
  }

  function handleExtend(id, dateInput) {
    const newDate = dateInput.value;
    if (!newDate) return;
    if (typeof currentOpts.onExtend === 'function') currentOpts.onExtend(id, newDate);
    removeItem(id);
  }

  function handleDismiss(id) {
    if (typeof currentOpts.onDismiss === 'function') currentOpts.onDismiss(id);
    removeItem(id);
  }

  // ── Public API ──
  function checkDueAlerts(items, opts) {
    currentOpts = opts || {};
    const soonDays = typeof currentOpts.soonDays === 'number' ? currentOpts.soonDays : 3;
    const t = todayIso();

    flagged = (items || [])
      .map((item) => ({ ...item, status: classify(item, t, soonDays) }))
      .filter((item) => item.status);

    if (!flagged.length) return;

    ensureOverlay();
    listEl.innerHTML = '';
    flagged.forEach((item) => listEl.appendChild(buildRow(item)));
    overlay.classList.add('open');
  }

  function closeDueAlerts() {
    if (overlay) overlay.classList.remove('open');
  }

  global.checkDueAlerts = checkDueAlerts;
  global.closeDueAlerts = closeDueAlerts;
})(window);
