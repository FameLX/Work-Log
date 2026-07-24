// ── Custom Date Picker ──────────────────────────────────────────────────────
// Drop-in replacement for <input type="date">. Depends on date-mask.js (load
// it first) for the DD/MM/YYYY typing mask. Single shared popover (#dp-pop)
// reused by every date field on the page.
//
// The trigger is a real, typeable text input (not just a button) — clicking
// it still opens the calendar, but you can also type the date directly.
// Ported from a hand-built version in CIRQ_XML_Builder.html, which added this
// independently; generalized here for the shared library.
//
// Usage:
//   const trigger = createDateTrigger('due-date', '2026-07-15'); // or '' for empty
//   someContainer.appendChild(trigger);
//
// Public API:
//   createDateTrigger(id, initialIso) -> builds + wires a trigger input, returns its wrapper
//   openDatePicker(triggerId)         -> opens the shared popover anchored to a trigger
//   dpRender()                        -> re-draws selects + day grid from state
//   dpPickDay(day)                    -> selects a day, writes ISO to trigger, closes
//   dpOnSelChange()                   -> reads month/year selects, re-renders grid
//   dpOnTriggerInput(input)           -> live DD/MM/YYYY mask as the user types
//   dpOnTriggerBlur(input)            -> commits (or reverts an incomplete) typed date
//   dpClose()                         -> hides the popover, tears down listeners
//   dpClear()                         -> empties the active trigger, closes

(function (global) {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const YEAR_MIN = 1920;
  const YEAR_MAX = 2060;

  let pop = null; // #dp-pop element
  let monthSel, yearSel, weekdaysEl, gridEl, clearBtn, doneBtn;
  let outsideClickHandler = null;
  let scrollHandler = null;

  const state = {
    year: null,
    month: null, // 0-11
    day: null,   // 1-31 or null
    activeTriggerId: null,
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isoOf(y, m, d) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }

  function parseIso(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!match) return null;
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
    };
  }

  function formatDisplay(iso) {
    const parsed = parseIso(iso);
    if (!parsed) return null;
    return `${pad2(parsed.day)}/${pad2(parsed.month + 1)}/${parsed.year}`;
  }

  // ── Trigger creation ──
  function calendarIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'dp-ico');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '3');
    rect.setAttribute('y', '4.5');
    rect.setAttribute('width', '18');
    rect.setAttribute('height', '16');
    rect.setAttribute('rx', '2');

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '3');
    line1.setAttribute('y1', '9');
    line1.setAttribute('x2', '21');
    line1.setAttribute('y2', '9');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '8');
    line2.setAttribute('y1', '2.5');
    line2.setAttribute('x2', '8');
    line2.setAttribute('y2', '6.5');

    const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line3.setAttribute('x1', '16');
    line3.setAttribute('y1', '2.5');
    line3.setAttribute('x2', '16');
    line3.setAttribute('y2', '6.5');

    svg.appendChild(rect);
    svg.appendChild(line1);
    svg.appendChild(line2);
    svg.appendChild(line3);
    return svg;
  }

  function createDateTrigger(id, initialIso) {
    const wrap = document.createElement('div');
    wrap.className = 'dp-wrap';

    wrap.appendChild(calendarIconSvg());

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dp-trigger';
    input.id = id;
    input.dataset.iso = initialIso || '';
    input.placeholder = 'dd/mm/yyyy';
    input.autocomplete = 'off';
    applyDisplay(input);
    wrap.appendChild(input);

    input.addEventListener('click', (e) => {
      e.stopPropagation();
      openDatePicker(id);
    });

    input.addEventListener('input', () => dpOnTriggerInput(input));
    input.addEventListener('blur', () => dpOnTriggerBlur(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });

    return wrap;
  }

  function applyDisplay(input) {
    input.value = formatDisplay(input.dataset.iso) || '';
  }

  function updateTriggerLabel(triggerEl) {
    applyDisplay(triggerEl);
  }

  // ── Direct typing on the trigger ──
  function dpOnTriggerInput(input) {
    const digits = DateMask.digitsOnly(input.value, 8);
    input.value = DateMask.maskDateOrDateTime(digits, false);
  }

  function dpOnTriggerBlur(input) {
    const digits = DateMask.digitsOnly(input.value, 8);

    if (!digits) {
      input.dataset.iso = '';
      applyDisplay(input);
      if (state.activeTriggerId === input.id) state.day = null;
      return;
    }

    const parsed = DateMask.clampDateDigits(digits);
    if (!parsed) {
      // Incomplete date (fewer than 8 digits) — revert to the last committed value.
      applyDisplay(input);
      return;
    }

    input.dataset.iso = isoOf(parsed.year, parsed.month, parsed.day);
    applyDisplay(input);

    // If this trigger's popup happens to be open, keep it in sync.
    if (state.activeTriggerId === input.id) {
      state.year = parsed.year;
      state.month = parsed.month;
      state.day = parsed.day;
      dpRender();
    }
  }

  // ── Popover construction (once, lazily) ──
  function ensurePopover() {
    if (pop) return;

    pop = document.createElement('div');
    pop.id = 'dp-pop';

    const selects = document.createElement('div');
    selects.className = 'dp-selects';

    monthSel = document.createElement('select');
    monthSel.id = 'dp-month';
    MONTH_NAMES.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = name;
      monthSel.appendChild(opt);
    });

    yearSel = document.createElement('select');
    yearSel.id = 'dp-year';
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSel.appendChild(opt);
    }

    selects.appendChild(monthSel);
    selects.appendChild(yearSel);

    weekdaysEl = document.createElement('div');
    weekdaysEl.id = 'dp-weekdays';
    WEEKDAYS.forEach((w) => {
      const span = document.createElement('span');
      span.textContent = w;
      weekdaysEl.appendChild(span);
    });

    gridEl = document.createElement('div');
    gridEl.id = 'dp-grid';

    const actions = document.createElement('div');
    actions.className = 'dp-actions';

    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'dp-clear';
    clearBtn.textContent = 'Clear';

    doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.id = 'dp-done';
    doneBtn.textContent = 'Done';

    actions.appendChild(clearBtn);
    actions.appendChild(doneBtn);

    pop.appendChild(selects);
    pop.appendChild(weekdaysEl);
    pop.appendChild(gridEl);
    pop.appendChild(actions);
    document.body.appendChild(pop);

    monthSel.addEventListener('change', dpOnSelChange);
    yearSel.addEventListener('change', dpOnSelChange);
    clearBtn.addEventListener('click', dpClear);
    doneBtn.addEventListener('click', dpClose);
    pop.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Rendering ──
  function dpRender() {
    monthSel.value = String(state.month);
    yearSel.value = String(state.year);

    gridEl.innerHTML = '';

    const firstWeekday = new Date(state.year, state.month, 1).getDay();
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;

    for (let i = 0; i < firstWeekday; i++) {
      const blank = document.createElement('button');
      blank.type = 'button';
      blank.className = 'dp-day empty';
      blank.disabled = true;
      gridEl.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dp-day';
      btn.textContent = String(d);
      if (isCurrentMonth && today.getDate() === d) btn.classList.add('today');
      if (state.day === d) btn.classList.add('sel');
      btn.addEventListener('click', () => dpPickDay(d));
      gridEl.appendChild(btn);
    }
  }

  function dpPickDay(day) {
    state.day = day;
    const trigger = document.getElementById(state.activeTriggerId);
    if (trigger) {
      trigger.dataset.iso = isoOf(state.year, state.month, day);
      updateTriggerLabel(trigger);
    }
    dpClose();
  }

  function dpOnSelChange() {
    state.month = parseInt(monthSel.value, 10);
    state.year = parseInt(yearSel.value, 10);
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    if (state.day && state.day > daysInMonth) state.day = daysInMonth;
    dpRender();
  }

  // ── Open / position / close ──
  function openDatePicker(triggerId) {
    const trigger = document.getElementById(triggerId);
    if (!trigger) throw new Error(`openDatePicker: no element with id "${triggerId}"`);

    ensurePopover();

    if (pop.classList.contains('open') && state.activeTriggerId === triggerId) {
      dpClose();
      return;
    }

    state.activeTriggerId = triggerId;

    const parsed = parseIso(trigger.dataset.iso);
    const today = new Date();
    state.year = parsed ? parsed.year : today.getFullYear();
    state.month = parsed ? parsed.month : today.getMonth();
    state.day = parsed ? parsed.day : null;

    dpRender();
    positionPopover(trigger);
    pop.classList.add('open');
    trigger.classList.add('open');

    outsideClickHandler = (e) => {
      if (!pop.contains(e.target) && e.target !== trigger) dpClose();
    };
    scrollHandler = () => dpClose();

    document.addEventListener('click', outsideClickHandler, true);
    window.addEventListener('scroll', scrollHandler, true);
  }

  function positionPopover(trigger) {
    const rect = trigger.getBoundingClientRect();
    const popWidth = 268;
    // Measure height after render by temporarily showing off-screen if needed.
    pop.style.left = '-9999px';
    pop.style.top = '-9999px';
    pop.classList.add('open');
    const popHeight = pop.offsetHeight;
    pop.classList.remove('open');

    let left = rect.left;
    let top = rect.bottom + 4;

    if (left + popWidth > window.innerWidth) {
      left = window.innerWidth - popWidth - 8;
    }
    if (left < 8) left = 8;

    if (top + popHeight > window.innerHeight) {
      top = rect.top - popHeight - 4;
    }
    if (top < 8) top = 8;

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function dpClose() {
    if (!pop) return;
    pop.classList.remove('open');
    if (state.activeTriggerId) {
      const trigger = document.getElementById(state.activeTriggerId);
      if (trigger) trigger.classList.remove('open');
    }
    state.activeTriggerId = null;
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler, true);
      outsideClickHandler = null;
    }
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      scrollHandler = null;
    }
  }

  function dpClear() {
    const trigger = document.getElementById(state.activeTriggerId);
    if (trigger) {
      trigger.dataset.iso = '';
      updateTriggerLabel(trigger);
    }
    dpClose();
  }

  global.createDateTrigger = createDateTrigger;
  global.openDatePicker = openDatePicker;
  global.dpRender = dpRender;
  global.dpPickDay = dpPickDay;
  global.dpOnSelChange = dpOnSelChange;
  global.dpClose = dpClose;
  global.dpClear = dpClear;
})(window);
