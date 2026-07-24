// ── Multi-Date Picker with Removable Pills ───────────────────────────────────
// Add arbitrary dates to a buffer (auto-sorted, deduped), rendered as
// removable pill chips with today/past styling. Useful for "pick multiple
// dates" scenarios: recurring events, work days, blackout dates.
//
// Ported from taskmanager.html's addWD/removeWD/renderWDPreview/wdPills
// (~line 859-950), generalized into a self-contained widget with its own
// buffer instead of a shared `wdBuf` global.
//
// Dependency choice: kept FULLY STANDALONE with a plain <input type="text">
// (YYYY-MM-DD) + regex/calendar validation, rather than depending on
// date-picker.js's calendar trigger. This keeps the component a single drop-in
// pair of files with no load-order requirement; if a calendar popup is
// preferred, swap the `input` this module builds for a
// `createDateTrigger(...)` from date-picker.js and call `addDate()`
// yourself from its Done handler.
//
// Usage:
//   const picker = createMultiDatePicker({ initialDates: ['2026-07-20'] });
//   container.appendChild(picker.el);
//   picker.onChange((dates) => console.log('dates now:', dates));
//   picker.getDates();          // -> ['2026-07-20', ...] sorted ISO strings
//   picker.setDates([...]);     // replace the buffer (does not fire onChange)
//
// Public API:
//   createMultiDatePicker(opts) -> { el, getDates(), setDates(arr), onChange(cb) }
//     opts.initialDates  [ISO date strings] to seed the buffer with
//     opts.placeholder   input placeholder (default 'YYYY-MM-DD')

(function (global) {
  const MONTH_ABBR = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function isValidIso(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  }

  function fmtDisplay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${pad2(d)} ${MONTH_ABBR[m - 1]} ${y}`;
  }

  function normalizeDates(arr) {
    const set = new Set((arr || []).filter(isValidIso));
    return Array.from(set).sort();
  }

  function createMultiDatePicker(opts) {
    opts = opts || {};
    let dates = normalizeDates(opts.initialDates);
    const changeCbs = [];

    const el = document.createElement('div');
    el.className = 'md-wrap';

    const row = document.createElement('div');
    row.className = 'md-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'md-input';
    input.placeholder = opts.placeholder || 'YYYY-MM-DD';
    input.autocomplete = 'off';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'md-add-btn';
    addBtn.textContent = 'Add';

    row.appendChild(input);
    row.appendChild(addBtn);

    const error = document.createElement('div');
    error.className = 'md-error';
    let errorTimer = null;

    const pills = document.createElement('div');
    pills.className = 'md-pills';

    el.appendChild(row);
    el.appendChild(error);
    el.appendChild(pills);

    function showError(msg) {
      error.textContent = msg;
      error.classList.add('show');
      if (errorTimer) clearTimeout(errorTimer);
      errorTimer = setTimeout(() => error.classList.remove('show'), 2600);
    }

    function fireChange() {
      const snapshot = getDates();
      changeCbs.forEach((cb) => cb(snapshot));
    }

    function addDate() {
      const v = input.value.trim();
      if (!v) return;
      if (!isValidIso(v)) { showError('Enter a valid date as YYYY-MM-DD.'); return; }
      if (!dates.includes(v)) {
        dates.push(v);
        dates.sort();
        render();
        fireChange();
      }
      input.value = '';
    }

    function removeDate(iso) {
      dates = dates.filter((d) => d !== iso);
      render();
      fireChange();
    }

    function render() {
      pills.innerHTML = '';
      const td = todayIso();
      if (!dates.length) {
        const empty = document.createElement('div');
        empty.className = 'md-empty';
        empty.textContent = 'No dates added yet.';
        pills.appendChild(empty);
        return;
      }
      dates.forEach((d) => {
        const pill = document.createElement('span');
        pill.className = 'md-pill' + (d === td ? ' md-pill-today' : d < td ? ' md-pill-past' : '');

        const label = document.createElement('span');
        label.className = 'md-pill-label';
        label.textContent = fmtDisplay(d) + (d === td ? ' ✦' : '');

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'md-pill-del';
        del.textContent = '×';
        del.title = `Remove ${fmtDisplay(d)}`;
        del.addEventListener('click', () => removeDate(d));

        pill.appendChild(label);
        pill.appendChild(del);
        pills.appendChild(pill);
      });
    }

    addBtn.addEventListener('click', addDate);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDate(); });

    render();

    function getDates() {
      return [...dates];
    }

    function setDates(arr) {
      dates = normalizeDates(arr);
      render();
      // Intentionally does NOT fire onChange — this is a programmatic seed,
      // not a user-driven edit.
    }

    function onChange(cb) {
      if (typeof cb === 'function') changeCbs.push(cb);
    }

    return { el, getDates, setDates, onChange };
  }

  global.createMultiDatePicker = createMultiDatePicker;
})(window);
