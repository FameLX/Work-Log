// ── Custom Date + Time Picker ───────────────────────────────────────────────
// Drop-in replacement for <input type="datetime-local"> (or a paired
// date/time input). Depends on date-mask.js AND time-mask.js (load both
// first) — date-mask.js for the trigger's DD/MM/YYYY [HH:MM] typing mask,
// time-mask.js for the popup's merged HH:MM field.
//
// Same shape as date-picker.js's date-only picker, but namespaced dtp- /
// #dtp-pop instead of dp- / #dp-pop so both can be used on the same page
// (e.g. a "created date" date-only field alongside a "due date+time" field)
// without id or global-function collisions.
//
// The trigger is a real, typeable text input — clicking it still opens the
// calendar, but you can also type "DDMMYYYY" (+ "HHMM") directly; the date
// and time portions share one continuous digit stream, e.g. "150720260930"
// -> "15/07/2026 09:30". Ported from a hand-built version in
// CIRQ_XML_Builder.html, which added this independently.
//
// Usage:
//   createDateTimeTrigger('due-at', '2026-07-15T09:30:00Z');
//   container.appendChild(trigger);
//
//   // Fixed local reference (e.g. GMT+7) instead of editing raw UTC:
//   createDateTimeTrigger('due-at', iso, { offsetMinutes: 420 });
//
// Public API:
//   createDateTimeTrigger(id, initialIso, opts) -> builds a trigger input, returns its wrapper
//   openDateTimePicker(triggerId)  -> opens the shared popover anchored to a trigger
//   dtpRender()                    -> re-draws selects + day grid from state
//   dtpPickDay(day)                -> selects a day (does NOT close the panel)
//   dtpOnSelChange()               -> reads month/year selects, re-renders grid
//   dtpOnTriggerInput(input)       -> live DD/MM/YYYY [HH:MM] mask as the user types
//   dtpOnTriggerBlur(input)        -> commits (or reverts an incomplete) typed value
//   dtpOnTimeInput()                -> live HH:MM mask + recompose on every keystroke
//   dtpOnTimeBlur()                -> clamp/pad the time field, recompose
//   dtpCompose()                   -> builds the ISO UTC string, writes it to the trigger
//   dtpClose()                     -> hides the popover, tears down listeners
//   dtpClear()                     -> empties the active trigger, closes
//   utcIsoToLocalParts(iso, offsetMinutes)
//   localPartsToUtcIso(y, month, day, hh, mm, offsetMinutes)

(function (global) {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const YEAR_MIN = 1920;
  const YEAR_MAX = 2060;

  let pop = null;
  let monthSel, yearSel, gridEl, timeLabelEl, timeInput, clearBtn, doneBtn;
  let outsideClickHandler = null;
  let scrollHandler = null;

  const triggerOptions = {}; // inputId -> { offsetMinutes, emptyLabel }

  const state = {
    year: null,
    month: null,
    day: null,      // null until a day is picked
    hour: null,     // null until a time is picked/typed
    minute: null,
    activeTriggerId: null,
    offsetMinutes: 0,
    hasOffset: false,
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // ── Timezone conversion (plain ms arithmetic, no Intl / local machine tz) ──
  function utcIsoToLocalParts(iso, offsetMinutes) {
    const utcMs = Date.parse(iso);
    const localMs = utcMs + (offsetMinutes || 0) * 60000;
    const d = new Date(localMs);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
    };
  }

  function localPartsToUtcIso(year, month, day, hour, minute, offsetMinutes) {
    const localAsUtcMs = Date.UTC(year, month, day, hour, minute, 0);
    const utcMs = localAsUtcMs - (offsetMinutes || 0) * 60000;
    return new Date(utcMs).toISOString().slice(0, 19) + 'Z';
  }

  function formatOffsetLabel(offsetMinutes) {
    const sign = offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(offsetMinutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `GMT${sign}${h}${m ? ':' + pad2(m) : ''}`;
  }

  // ── Trigger creation ──
  function calendarIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'dtp-ico');
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

  function createDateTimeTrigger(id, initialIso, opts) {
    opts = opts || {};
    triggerOptions[id] = {
      offsetMinutes: opts.offsetMinutes,
      hasOffset: opts.offsetMinutes !== undefined,
      emptyLabel: opts.emptyLabel || 'Now (generation time)',
    };

    const wrap = document.createElement('div');
    wrap.className = 'dtp-wrap';

    wrap.appendChild(calendarIconSvg());

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dtp-trigger';
    input.id = id;
    input.dataset.iso = initialIso || '';
    input.placeholder = triggerOptions[id].emptyLabel;
    input.autocomplete = 'off';
    applyDisplay(input);
    wrap.appendChild(input);

    input.addEventListener('click', (e) => {
      e.stopPropagation();
      openDateTimePicker(id);
    });

    input.addEventListener('input', () => dtpOnTriggerInput(input));
    input.addEventListener('blur', () => dtpOnTriggerBlur(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });

    return wrap;
  }

  function applyDisplay(input) {
    const iso = input.dataset.iso;
    const opts = triggerOptions[input.id] || {};
    if (iso) {
      const parts = utcIsoToLocalParts(iso, opts.hasOffset ? opts.offsetMinutes : 0);
      input.value = `${pad2(parts.day)}/${pad2(parts.month + 1)}/${parts.year} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
    } else {
      input.value = '';
    }
  }

  function updateTriggerLabel(triggerEl) {
    applyDisplay(triggerEl);
  }

  // ── Direct typing on the trigger ──
  function dtpOnTriggerInput(input) {
    const digits = DateMask.digitsOnly(input.value, 12);
    input.value = DateMask.maskDateOrDateTime(digits, true);
  }

  function dtpOnTriggerBlur(input) {
    const digits = DateMask.digitsOnly(input.value, 12);

    if (!digits) {
      input.dataset.iso = '';
      applyDisplay(input);
      if (state.activeTriggerId === input.id) {
        state.day = null;
        state.hour = null;
        state.minute = null;
      }
      return;
    }

    const parsedDate = DateMask.clampDateDigits(digits.slice(0, 8));
    if (!parsedDate) {
      // Incomplete date (fewer than 8 digits) — revert to the last committed value.
      applyDisplay(input);
      return;
    }

    const opts = triggerOptions[input.id] || {};
    const offsetMinutes = opts.hasOffset ? opts.offsetMinutes : 0;
    const timeDigits = digits.slice(8, 12);

    let hour, minute;
    if (timeDigits.length) {
      const clamped = TimeMask.clampHHMM(timeDigits);
      hour = clamped.h;
      minute = clamped.m;
    } else {
      // No time typed this round — keep whatever was already set (default 00:00).
      const existing = input.dataset.iso ? utcIsoToLocalParts(input.dataset.iso, offsetMinutes) : null;
      hour = existing ? existing.hour : 0;
      minute = existing ? existing.minute : 0;
    }

    input.dataset.iso = localPartsToUtcIso(parsedDate.year, parsedDate.month, parsedDate.day, hour, minute, offsetMinutes);
    applyDisplay(input);

    if (state.activeTriggerId === input.id) {
      state.year = parsedDate.year;
      state.month = parsedDate.month;
      state.day = parsedDate.day;
      state.hour = hour;
      state.minute = minute;
      dtpRender();
    }
  }

  // ── Popover construction (once, lazily) ──
  function ensurePopover() {
    if (pop) return;

    pop = document.createElement('div');
    pop.id = 'dtp-pop';

    const selects = document.createElement('div');
    selects.className = 'dtp-selects';

    monthSel = document.createElement('select');
    monthSel.id = 'dtp-month';
    MONTH_NAMES.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = name;
      monthSel.appendChild(opt);
    });

    yearSel = document.createElement('select');
    yearSel.id = 'dtp-year';
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSel.appendChild(opt);
    }

    selects.appendChild(monthSel);
    selects.appendChild(yearSel);

    const weekdaysEl = document.createElement('div');
    weekdaysEl.id = 'dtp-weekdays';
    WEEKDAYS.forEach((w) => {
      const span = document.createElement('span');
      span.textContent = w;
      weekdaysEl.appendChild(span);
    });

    gridEl = document.createElement('div');
    gridEl.id = 'dtp-grid';

    const timeRow = document.createElement('div');
    timeRow.id = 'dtp-time-row';

    timeLabelEl = document.createElement('span');
    timeLabelEl.id = 'dtp-time-label';
    timeLabelEl.textContent = 'Time';

    const timeBox = document.createElement('div');
    timeBox.className = 'dtp-time-box';

    timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.id = 'dtp-time';
    timeInput.maxLength = 5;
    timeInput.inputMode = 'numeric';
    timeInput.placeholder = 'HH:MM';
    timeInput.autocomplete = 'off';

    timeBox.appendChild(timeInput);
    timeRow.appendChild(timeLabelEl);
    timeRow.appendChild(timeBox);

    const actions = document.createElement('div');
    actions.className = 'dtp-actions';

    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'dtp-clear';
    clearBtn.textContent = 'Clear';

    doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.id = 'dtp-done';
    doneBtn.textContent = 'Done';

    actions.appendChild(clearBtn);
    actions.appendChild(doneBtn);

    pop.appendChild(selects);
    pop.appendChild(weekdaysEl);
    pop.appendChild(gridEl);
    pop.appendChild(timeRow);
    pop.appendChild(actions);
    document.body.appendChild(pop);

    monthSel.addEventListener('change', dtpOnSelChange);
    yearSel.addEventListener('change', dtpOnSelChange);
    timeInput.addEventListener('input', dtpOnTimeInput);
    timeInput.addEventListener('blur', dtpOnTimeBlur);
    clearBtn.addEventListener('click', dtpClear);
    doneBtn.addEventListener('click', dtpClose);
    pop.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Rendering ──
  function dtpRender() {
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
      blank.className = 'dtp-day empty';
      blank.disabled = true;
      gridEl.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dtp-day';
      btn.textContent = String(d);
      if (isCurrentMonth && today.getDate() === d) btn.classList.add('today');
      if (state.day === d) btn.classList.add('sel');
      btn.addEventListener('click', () => dtpPickDay(d));
      gridEl.appendChild(btn);
    }

    timeLabelEl.textContent = state.hasOffset ? `Time (${formatOffsetLabel(state.offsetMinutes)})` : 'Time';
    timeInput.value = state.hour == null ? '' : TimeMask.formatHHMM(state.hour, state.minute);
  }

  function dtpPickDay(day) {
    state.day = day;
    if (state.hour == null) {
      state.hour = 0;
      state.minute = 0;
    }
    dtpRender();
    dtpCompose();
    // Deliberately does not close — the user still needs to confirm the time.
  }

  function dtpOnSelChange() {
    state.month = parseInt(monthSel.value, 10);
    state.year = parseInt(yearSel.value, 10);
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    if (state.day && state.day > daysInMonth) state.day = daysInMonth;
    dtpRender();
    if (state.day != null) dtpCompose();
  }

  function dtpOnTimeInput() {
    const digits = TimeMask.digitsOnly(timeInput.value);
    timeInput.value = TimeMask.maskHHMM(digits);
    const clamped = TimeMask.clampHHMM(digits);
    if (clamped) {
      state.hour = clamped.h;
      state.minute = clamped.m;
    }
    dtpCompose();
  }

  function dtpOnTimeBlur() {
    const digits = TimeMask.digitsOnly(timeInput.value);
    if (!digits) {
      if (state.day != null && state.hour == null) {
        state.hour = 0;
        state.minute = 0;
      }
    } else {
      const clamped = TimeMask.clampHHMM(digits);
      state.hour = clamped.h;
      state.minute = clamped.m;
    }
    if (state.hour != null) timeInput.value = TimeMask.formatHHMM(state.hour, state.minute);
    dtpCompose();
  }

  function dtpCompose() {
    if (state.day == null) return; // only fires once a day has been picked
    const hour = state.hour == null ? 0 : state.hour;
    const minute = state.minute == null ? 0 : state.minute;
    const iso = localPartsToUtcIso(state.year, state.month, state.day, hour, minute, state.offsetMinutes);
    const trigger = document.getElementById(state.activeTriggerId);
    if (trigger) {
      trigger.dataset.iso = iso;
      updateTriggerLabel(trigger);
    }
  }

  // ── Open / position / close ──
  function openDateTimePicker(triggerId) {
    const trigger = document.getElementById(triggerId);
    if (!trigger) throw new Error(`openDateTimePicker: no element with id "${triggerId}"`);

    ensurePopover();

    if (pop.classList.contains('open') && state.activeTriggerId === triggerId) {
      dtpClose();
      return;
    }

    const opts = triggerOptions[triggerId] || {};
    state.activeTriggerId = triggerId;
    state.hasOffset = !!opts.hasOffset;
    state.offsetMinutes = opts.hasOffset ? opts.offsetMinutes : 0;

    const iso = trigger.dataset.iso;
    if (iso) {
      const parts = utcIsoToLocalParts(iso, state.offsetMinutes);
      state.year = parts.year;
      state.month = parts.month;
      state.day = parts.day;
      state.hour = parts.hour;
      state.minute = parts.minute;
    } else {
      const today = new Date();
      state.year = today.getFullYear();
      state.month = today.getMonth();
      state.day = null;
      state.hour = null;
      state.minute = null;
    }

    dtpRender();
    positionPopover(trigger);
    pop.classList.add('open');
    trigger.classList.add('open');

    outsideClickHandler = (e) => {
      if (!pop.contains(e.target) && e.target !== trigger) dtpClose();
    };
    scrollHandler = () => dtpClose();

    document.addEventListener('click', outsideClickHandler, true);
    window.addEventListener('scroll', scrollHandler, true);
  }

  function positionPopover(trigger) {
    const rect = trigger.getBoundingClientRect();
    const popWidth = 268;
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

  function dtpClose() {
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

  function dtpClear() {
    const trigger = document.getElementById(state.activeTriggerId);
    if (trigger) {
      trigger.dataset.iso = '';
      updateTriggerLabel(trigger);
    }
    state.day = null;
    state.hour = null;
    state.minute = null;
    dtpClose();
  }

  global.createDateTimeTrigger = createDateTimeTrigger;
  global.openDateTimePicker = openDateTimePicker;
  global.dtpRender = dtpRender;
  global.dtpPickDay = dtpPickDay;
  global.dtpOnSelChange = dtpOnSelChange;
  global.dtpOnTriggerInput = dtpOnTriggerInput;
  global.dtpOnTriggerBlur = dtpOnTriggerBlur;
  global.dtpOnTimeInput = dtpOnTimeInput;
  global.dtpOnTimeBlur = dtpOnTimeBlur;
  global.dtpCompose = dtpCompose;
  global.dtpClose = dtpClose;
  global.dtpClear = dtpClear;
  global.utcIsoToLocalParts = utcIsoToLocalParts;
  global.localPartsToUtcIso = localPartsToUtcIso;
})(window);
