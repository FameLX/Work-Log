// ── Recurrence Date Generator + Calendar Preview ────────────────────────────
// Two independent layers:
//
//   (a) generateRepeatDates(opts) — a PURE function, zero DOM/app coupling.
//       Give it a mode, a start date, and an end condition; get back an
//       array of ISO ("YYYY-MM-DD") date strings. Safe to unit-test, safe to
//       reuse in a Node script, a service worker, anywhere.
//
//   (b) createRecurrencePicker(opts) — a self-contained UI widget (mode
//       selector + live mini month-grid calendar preview + a check/uncheck
//       confirm step) built on top of (a). Multiple instances can live on
//       one page; each call returns its own element and owns its own state
//       (no shared/global singleton, unlike the date-picker's shared popover).
//
// Usage:
//   const dates = generateRepeatDates({
//     mode: 'weekly', start: '2026-07-01', weekdays: [1, 3, 5], endDate: '2026-07-31'
//   });
//   // -> ['2026-07-03', '2026-07-06', ...]
//
//   const picker = createRecurrencePicker({
//     start: '2026-07-16',                 // optional initial start date
//     onConfirm: (dateList) => dateList.forEach(d => addEntry(d)),
//     onCancel: () => panel.remove(),       // optional
//   });
//   container.appendChild(picker);
//   // To drive the start date from an existing field instead of the widget's
//   // own built-in <input type="date">, pass opts.startInput: <input> element
//   // (its value is read as ISO 'YYYY-MM-DD' and its 'input'/'change' events
//   // are listened to for live re-preview).
//
// Public API:
//   generateRepeatDates(opts) -> string[]   pure date-math, see modes below
//   createRecurrencePicker(opts) -> HTMLElement   self-contained widget
//
// generateRepeatDates(opts):
//   opts.mode        'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
//   opts.start        'YYYY-MM-DD' — required, the anchor/base date (never
//                      included in the result unless opts.includeStart)
//   opts.endDate       'YYYY-MM-DD' — end-condition A: generate up to and
//                      including this date
//   opts.count          number — end-condition B: generate this many
//                      occurrences (used only when opts.endDate is absent).
//                      Exactly one of endDate/count is required (modes other
//                      than 'custom').
//   opts.interval        number, 'daily' mode only — every N days (default 1)
//   opts.weekdays        number[] 0-6 (0=Sun), 'weekly' mode only — required
//   opts.monthlyMode      'dayOfMonth' (default) | 'nthWeekday', 'monthly' mode
//                        only. 'dayOfMonth' repeats the same day-of-month
//                        number (skips months that don't have that day, e.g.
//                        31st). 'nthWeekday' repeats the same "nth <weekday>
//                        of the month" pattern as opts.start (e.g. start on
//                        the 2nd Tuesday -> every 2nd Tuesday thereafter).
//   opts.customDates      string[] ISO dates, 'custom' mode only — the
//                        explicit picked date list; passed straight through
//                        (deduped + sorted, minus opts.start unless included)
//   opts.includeStart     boolean, default false — include opts.start itself
//                        in the returned list
//
// createRecurrencePicker(opts):
//   opts.start          'YYYY-MM-DD' initial start date (ignored if opts.startInput given)
//   opts.startInput      an existing <input> element to read/observe instead of
//                        building an internal one (its value must be, or the
//                        widget will treat it as, an ISO 'YYYY-MM-DD' string)
//   opts.mode            initial mode, default 'daily'
//   opts.onConfirm(dateList) -> called with the final string[] once the user
//                        clicks Confirm (after any individual dates were
//                        unchecked in the preview checklist)
//   opts.onCancel()       -> optional, called when Cancel is clicked

(function (global) {
  // ── Shared date helpers (used by both layers) ──
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const SAFETY_MAX_DATES = 3660; // ~10 years of daily dates; backstop against runaway params
  const SAFETY_MAX_ITER = SAFETY_MAX_DATES * 3;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function parseIsoDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  function isoOfDate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayIso() {
    return isoOfDate(new Date());
  }

  // ── (a) Pure date generator ──
  function generateRepeatDates(opts) {
    opts = opts || {};
    const mode = opts.mode || 'daily';
    const start = parseIsoDate(opts.start);
    if (!start) throw new Error('generateRepeatDates: opts.start must be an ISO date string (YYYY-MM-DD)');
    const startIso = isoOfDate(start);

    if (mode === 'custom') {
      const cleaned = (Array.isArray(opts.customDates) ? opts.customDates : [])
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      const result = opts.includeStart ? cleaned : cleaned.filter((d) => d !== startIso);
      return Array.from(new Set(result)).sort();
    }

    const hasEndDate = !!opts.endDate;
    const end = hasEndDate ? parseIsoDate(opts.endDate) : null;
    if (hasEndDate && !end) throw new Error('generateRepeatDates: opts.endDate must be an ISO date string (YYYY-MM-DD)');
    const hasCount = Number.isFinite(opts.count) && opts.count > 0;
    if (!hasEndDate && !hasCount) {
      throw new Error('generateRepeatDates: provide opts.endDate or opts.count to bound the series');
    }
    if (hasEndDate && end <= start) return [];

    const dates = [];
    const wantMore = () => (!hasCount || dates.length < opts.count) && dates.length < SAFETY_MAX_DATES;
    // Never let the start date itself consume a slot of the count quota — it can
    // legitimately recur as a "candidate" (e.g. monthly dayOfMonth/nthWeekday
    // iteration begins in the start's own month), but the base entry already
    // covers it, so it must not count toward "generate N occurrences".
    const addIfInRange = (d) => {
      if (end && d > end) return;
      const iso = isoOfDate(d);
      if (iso === startIso) return;
      dates.push(iso);
    };

    if (mode === 'daily') {
      const n = Math.max(1, parseInt(opts.interval, 10) || 1);
      const cur = new Date(start);
      cur.setDate(cur.getDate() + n);
      while (wantMore() && (!end || cur <= end)) {
        addIfInRange(cur);
        cur.setDate(cur.getDate() + n);
      }

    } else if (mode === 'weekly') {
      const activeDays = Array.isArray(opts.weekdays) ? opts.weekdays.filter((n) => n >= 0 && n <= 6) : [];
      if (!activeDays.length) throw new Error('generateRepeatDates: weekly mode requires opts.weekdays (array of 0-6, 0=Sun)');
      const cur = new Date(start);
      cur.setDate(cur.getDate() + 1);
      while (wantMore() && (!end || cur <= end)) {
        if (activeDays.includes(cur.getDay())) addIfInRange(cur);
        cur.setDate(cur.getDate() + 1);
      }

    } else if (mode === 'monthly') {
      const useNthWeekday = opts.monthlyMode === 'nthWeekday';
      const dayOfMonth = start.getDate();
      const targetWeekday = start.getDay();
      const nthWeek = Math.ceil(dayOfMonth / 7);
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      let iter = 0;
      while (wantMore() && (!end || cur <= end) && iter < SAFETY_MAX_ITER) {
        iter++;
        if (useNthWeekday) {
          const d = new Date(cur.getFullYear(), cur.getMonth(), 1);
          let count = 0;
          while (d.getMonth() === cur.getMonth()) {
            if (d.getDay() === targetWeekday) {
              count++;
              if (count === nthWeek) { addIfInRange(d); break; }
            }
            d.setDate(d.getDate() + 1);
          }
        } else {
          const candidate = new Date(cur.getFullYear(), cur.getMonth(), dayOfMonth);
          if (candidate.getMonth() === cur.getMonth()) addIfInRange(candidate);
        }
        cur.setMonth(cur.getMonth() + 1);
      }

    } else if (mode === 'yearly') {
      const cur = new Date(start);
      cur.setFullYear(cur.getFullYear() + 1);
      let iter = 0;
      while (wantMore() && (!end || cur <= end) && iter < SAFETY_MAX_ITER) {
        iter++;
        addIfInRange(new Date(cur.getFullYear(), start.getMonth(), start.getDate()));
        cur.setFullYear(cur.getFullYear() + 1);
      }

    } else {
      throw new Error(`generateRepeatDates: unknown mode "${mode}"`);
    }

    let result = dates; // addIfInRange already excludes the start date
    if (opts.includeStart) result = [startIso, ...result];
    return Array.from(new Set(result)).sort();
  }

  // ── (b) UI widget ──
  function createRecurrencePicker(opts) {
    const options = opts || {};
    const onConfirm = typeof options.onConfirm === 'function' ? options.onConfirm : () => {};
    const onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;

    const state = {
      mode: options.mode || 'daily',
      interval: 1,
      weekdays: new Set(),
      monthlyMode: 'dayOfMonth',
      endMode: 'date', // 'date' | 'count'
      endDate: '',
      count: 5,
      customDates: new Set(),
      calYear: 0,
      calMonth: 0,
      excluded: new Set(), // dates unchecked by the user in the confirm checklist
    };

    let generated = []; // last computed list from generateRepeatDates

    // ── Root ──
    const wrap = document.createElement('div');
    wrap.className = 'rcp-wrap';

    // ── Start date ──
    let startInput;
    if (options.startInput instanceof HTMLElement) {
      startInput = options.startInput;
    } else {
      const startField = document.createElement('div');
      startField.className = 'rcp-field';
      const startLabel = document.createElement('label');
      startLabel.className = 'rcp-label';
      startLabel.textContent = 'Start date';
      startInput = document.createElement('input');
      startInput.type = 'date';
      startInput.className = 'rcp-date-input';
      startInput.value = options.start || todayIso();
      startField.appendChild(startLabel);
      startField.appendChild(startInput);
      wrap.appendChild(startField);
    }
    startInput.addEventListener('input', refresh);
    startInput.addEventListener('change', refresh);

    function getStartIso() {
      return startInput.value || options.start || todayIso();
    }

    // ── Mode selector ──
    const modeRow = document.createElement('div');
    modeRow.className = 'rcp-mode-row';
    const modes = [
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
      { id: 'yearly', label: 'Yearly' },
      { id: 'custom', label: 'Custom' },
    ];
    const modeButtons = {};
    modes.forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rcp-mode-btn';
      btn.textContent = m.label;
      btn.addEventListener('click', () => setMode(m.id));
      modeButtons[m.id] = btn;
      modeRow.appendChild(btn);
    });
    wrap.appendChild(modeRow);

    // ── Mode-specific options panel ──
    const optionsPanel = document.createElement('div');
    optionsPanel.className = 'rcp-options';
    wrap.appendChild(optionsPanel);

    // Daily
    const dailyOpts = document.createElement('div');
    dailyOpts.className = 'rcp-mode-panel';
    const dailyLabel = document.createElement('label');
    dailyLabel.className = 'rcp-label';
    dailyLabel.textContent = 'Every';
    const dailyRow = document.createElement('div');
    dailyRow.className = 'rcp-inline-row';
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.min = '1';
    intervalInput.max = '365';
    intervalInput.value = '1';
    intervalInput.className = 'rcp-number-input';
    intervalInput.addEventListener('input', () => {
      state.interval = Math.max(1, parseInt(intervalInput.value, 10) || 1);
      refresh();
    });
    const dailyUnit = document.createElement('span');
    dailyUnit.className = 'rcp-inline-unit';
    dailyUnit.textContent = 'day(s)';
    dailyRow.appendChild(intervalInput);
    dailyRow.appendChild(dailyUnit);
    dailyOpts.appendChild(dailyLabel);
    dailyOpts.appendChild(dailyRow);

    // Weekly
    const weeklyOpts = document.createElement('div');
    weeklyOpts.className = 'rcp-mode-panel';
    const weeklyLabel = document.createElement('label');
    weeklyLabel.className = 'rcp-label';
    weeklyLabel.textContent = 'On these days';
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'rcp-weekday-row';
    WEEKDAY_LABELS.forEach((label, dayIdx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rcp-weekday-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (state.weekdays.has(dayIdx)) state.weekdays.delete(dayIdx);
        else state.weekdays.add(dayIdx);
        btn.classList.toggle('active', state.weekdays.has(dayIdx));
        refresh();
      });
      weekdayRow.appendChild(btn);
    });
    weeklyOpts.appendChild(weeklyLabel);
    weeklyOpts.appendChild(weekdayRow);

    // Monthly
    const monthlyOpts = document.createElement('div');
    monthlyOpts.className = 'rcp-mode-panel';
    const monthlyLabel = document.createElement('label');
    monthlyLabel.className = 'rcp-label';
    monthlyLabel.textContent = 'Monthly pattern';
    const monthlyChoices = document.createElement('div');
    monthlyChoices.className = 'rcp-radio-col';
    const dayRadioLabel = document.createElement('label');
    dayRadioLabel.className = 'rcp-radio-label';
    const dayRadio = document.createElement('input');
    dayRadio.type = 'radio';
    dayRadio.name = 'rcp-monthly-' + Math.random().toString(36).slice(2);
    dayRadio.checked = true;
    const weekdayRadioLabel = document.createElement('label');
    weekdayRadioLabel.className = 'rcp-radio-label';
    const weekdayRadio = document.createElement('input');
    weekdayRadio.type = 'radio';
    weekdayRadio.name = dayRadio.name;
    dayRadioLabel.appendChild(dayRadio);
    dayRadioLabel.appendChild(document.createTextNode(' Same day of month'));
    weekdayRadioLabel.appendChild(weekdayRadio);
    weekdayRadioLabel.appendChild(document.createTextNode(' Same weekday of month'));
    const monthlyHint = document.createElement('span');
    monthlyHint.className = 'rcp-hint';
    dayRadio.addEventListener('change', () => { if (dayRadio.checked) { state.monthlyMode = 'dayOfMonth'; refresh(); } });
    weekdayRadio.addEventListener('change', () => { if (weekdayRadio.checked) { state.monthlyMode = 'nthWeekday'; refresh(); } });
    monthlyChoices.appendChild(dayRadioLabel);
    monthlyChoices.appendChild(weekdayRadioLabel);
    monthlyChoices.appendChild(monthlyHint);
    monthlyOpts.appendChild(monthlyLabel);
    monthlyOpts.appendChild(monthlyChoices);

    // Yearly (no extra options)
    const yearlyOpts = document.createElement('div');
    yearlyOpts.className = 'rcp-mode-panel';
    const yearlyHint = document.createElement('p');
    yearlyHint.className = 'rcp-hint';
    yearlyHint.textContent = 'Repeats on the same month and day each year.';
    yearlyOpts.appendChild(yearlyHint);

    // Custom (no extra options — interaction happens on the calendar)
    const customOpts = document.createElement('div');
    customOpts.className = 'rcp-mode-panel';
    const customHint = document.createElement('p');
    customHint.className = 'rcp-hint';
    customHint.textContent = 'Click dates on the calendar below to toggle them.';
    customOpts.appendChild(customHint);

    optionsPanel.appendChild(dailyOpts);
    optionsPanel.appendChild(weeklyOpts);
    optionsPanel.appendChild(monthlyOpts);
    optionsPanel.appendChild(yearlyOpts);
    optionsPanel.appendChild(customOpts);
    const panelsByMode = { daily: dailyOpts, weekly: weeklyOpts, monthly: monthlyOpts, yearly: yearlyOpts, custom: customOpts };

    // ── End condition ──
    const endField = document.createElement('div');
    endField.className = 'rcp-field rcp-end-field';
    const endLabel = document.createElement('label');
    endLabel.className = 'rcp-label';
    endLabel.textContent = 'Ends';
    const endModeRow = document.createElement('div');
    endModeRow.className = 'rcp-inline-row';
    const endDateRadioLabel = document.createElement('label');
    endDateRadioLabel.className = 'rcp-radio-label';
    const endDateRadio = document.createElement('input');
    endDateRadio.type = 'radio';
    endDateRadio.name = 'rcp-end-' + Math.random().toString(36).slice(2);
    endDateRadio.checked = true;
    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.className = 'rcp-date-input rcp-end-date-input';
    endDateRadioLabel.appendChild(endDateRadio);
    endDateRadioLabel.appendChild(document.createTextNode(' On date'));
    const endCountRadioLabel = document.createElement('label');
    endCountRadioLabel.className = 'rcp-radio-label';
    const endCountRadio = document.createElement('input');
    endCountRadio.type = 'radio';
    endCountRadio.name = endDateRadio.name;
    const endCountInput = document.createElement('input');
    endCountInput.type = 'number';
    endCountInput.min = '1';
    endCountInput.max = '999';
    endCountInput.value = '5';
    endCountInput.className = 'rcp-number-input';
    endCountRadioLabel.appendChild(endCountRadio);
    endCountRadioLabel.appendChild(document.createTextNode(' After'));
    const endCountUnit = document.createElement('span');
    endCountUnit.className = 'rcp-inline-unit';
    endCountUnit.textContent = 'occurrence(s)';

    endDateRadio.addEventListener('change', () => { if (endDateRadio.checked) { state.endMode = 'date'; refresh(); } });
    endCountRadio.addEventListener('change', () => { if (endCountRadio.checked) { state.endMode = 'count'; refresh(); } });
    endDateInput.addEventListener('input', () => { state.endDate = endDateInput.value; refresh(); });
    endCountInput.addEventListener('input', () => { state.count = Math.max(1, parseInt(endCountInput.value, 10) || 1); refresh(); });

    endModeRow.appendChild(endDateRadioLabel);
    endModeRow.appendChild(endDateInput);
    endModeRow.appendChild(endCountRadioLabel);
    endModeRow.appendChild(endCountInput);
    endModeRow.appendChild(endCountUnit);
    endField.appendChild(endLabel);
    endField.appendChild(endModeRow);
    wrap.appendChild(endField);

    // ── Calendar preview ──
    const calWrap = document.createElement('div');
    calWrap.className = 'rcp-cal-wrap';
    const calNav = document.createElement('div');
    calNav.className = 'rcp-cal-nav';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'rcp-cal-nav-btn';
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', () => navigateMonth(-1));
    const calTitle = document.createElement('span');
    calTitle.className = 'rcp-cal-title';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'rcp-cal-nav-btn';
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', () => navigateMonth(1));
    calNav.appendChild(prevBtn);
    calNav.appendChild(calTitle);
    calNav.appendChild(nextBtn);

    const calHdr = document.createElement('div');
    calHdr.className = 'rcp-cal-hdr-row';
    WEEKDAY_LABELS.forEach((label) => {
      const cell = document.createElement('span');
      cell.className = 'rcp-cal-hdr';
      cell.textContent = label;
      calHdr.appendChild(cell);
    });

    const calGrid = document.createElement('div');
    calGrid.className = 'rcp-cal-grid';

    const calCount = document.createElement('div');
    calCount.className = 'rcp-cal-count';

    calWrap.appendChild(calNav);
    calWrap.appendChild(calHdr);
    calWrap.appendChild(calGrid);
    calWrap.appendChild(calCount);
    wrap.appendChild(calWrap);

    // ── Confirm checklist ──
    const checklistWrap = document.createElement('div');
    checklistWrap.className = 'rcp-checklist-wrap';
    const checklistLabel = document.createElement('div');
    checklistLabel.className = 'rcp-label';
    checklistLabel.textContent = 'Dates to create';
    const checklist = document.createElement('div');
    checklist.className = 'rcp-checklist';
    checklistWrap.appendChild(checklistLabel);
    checklistWrap.appendChild(checklist);
    wrap.appendChild(checklistWrap);

    // ── Actions ──
    const actions = document.createElement('div');
    actions.className = 'rcp-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'rcp-btn rcp-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { if (onCancel) onCancel(); });
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'rcp-btn rcp-btn-primary';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.addEventListener('click', () => {
      const finalList = generated.filter((d) => !state.excluded.has(d));
      onConfirm(finalList);
    });
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    wrap.appendChild(actions);

    // ── Behavior ──
    function setMode(mode) {
      state.mode = mode;
      state.customDates.clear();
      state.excluded.clear();
      Object.keys(modeButtons).forEach((id) => modeButtons[id].classList.toggle('active', id === mode));
      Object.keys(panelsByMode).forEach((id) => panelsByMode[id].classList.toggle('visible', id === mode));
      refresh();
    }

    function navigateMonth(delta) {
      state.calMonth += delta;
      if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
      if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
      renderCalendar();
    }

    function currentGenerateOpts() {
      const startIso = getStartIso();
      const base = { mode: state.mode, start: startIso };
      if (state.mode === 'daily') base.interval = state.interval;
      if (state.mode === 'weekly') base.weekdays = Array.from(state.weekdays);
      if (state.mode === 'monthly') base.monthlyMode = state.monthlyMode;
      if (state.mode === 'custom') base.customDates = Array.from(state.customDates);
      if (state.mode !== 'custom') {
        if (state.endMode === 'count') base.count = state.count;
        else base.endDate = state.endDate;
      }
      return base;
    }

    function updateMonthlyHint() {
      const startIso = getStartIso();
      const d = parseIsoDate(startIso);
      if (!d) { monthlyHint.textContent = ''; return; }
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const nth = ['', '1st', '2nd', '3rd', '4th', '5th'][Math.ceil(d.getDate() / 7)];
      monthlyHint.textContent = `Day ${d.getDate()} of month  ·  ${nth} ${weekdays[d.getDay()]} of month`;
    }

    function safeGenerate() {
      try {
        if (state.mode === 'weekly' && !state.weekdays.size) return [];
        if (state.mode !== 'custom' && state.endMode === 'date' && !state.endDate) return [];
        return generateRepeatDates(currentGenerateOpts());
      } catch (e) {
        return [];
      }
    }

    function renderCalendar() {
      const startIso = getStartIso();
      const startD = parseIsoDate(startIso);
      if (state.calYear === 0 && startD) {
        state.calYear = startD.getFullYear();
        state.calMonth = startD.getMonth();
      }
      const year = state.calYear || (startD ? startD.getFullYear() : new Date().getFullYear());
      const month = state.calMonth;

      calTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

      const generatedSet = new Set(generated);
      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      calGrid.innerHTML = '';
      for (let i = 0; i < firstWeekday; i++) {
        const blank = document.createElement('div');
        calGrid.appendChild(blank);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
        const cell = document.createElement('div');
        cell.className = 'rcp-cal-day';
        cell.textContent = String(d);
        const isStart = dateStr === startIso;
        const isCustom = state.mode === 'custom';
        const isSelected = isCustom ? state.customDates.has(dateStr) : generatedSet.has(dateStr);
        if (isStart) cell.classList.add('start');
        if (isSelected && !isStart) cell.classList.add('selected');
        if (isCustom && !isStart) {
          cell.classList.add('toggleable');
          cell.addEventListener('click', () => {
            if (state.customDates.has(dateStr)) state.customDates.delete(dateStr);
            else state.customDates.add(dateStr);
            refresh();
          });
        }
        calGrid.appendChild(cell);
      }

      const total = generated.length;
      calCount.textContent = total ? `${total} date${total === 1 ? '' : 's'} generated` : 'No dates yet';
    }

    function renderChecklist() {
      checklist.innerHTML = '';
      if (!generated.length) {
        const empty = document.createElement('div');
        empty.className = 'rcp-checklist-empty';
        empty.textContent = 'Set the options above to preview dates.';
        checklist.appendChild(empty);
        confirmBtn.disabled = true;
        return;
      }
      generated.forEach((iso) => {
        const label = document.createElement('label');
        label.className = 'rcp-checklist-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !state.excluded.has(iso);
        cb.addEventListener('change', () => {
          if (cb.checked) state.excluded.delete(iso);
          else state.excluded.add(iso);
          confirmBtn.disabled = generated.every((d) => state.excluded.has(d));
        });
        const span = document.createElement('span');
        span.textContent = formatIsoForDisplay(iso);
        label.appendChild(cb);
        label.appendChild(span);
        checklist.appendChild(label);
      });
      confirmBtn.disabled = generated.every((d) => state.excluded.has(d));
    }

    function formatIsoForDisplay(iso) {
      const d = parseIsoDate(iso);
      if (!d) return iso;
      return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    function refresh() {
      if (state.mode === 'monthly') updateMonthlyHint();
      generated = safeGenerate();
      renderCalendar();
      renderChecklist();
    }

    // ── Init ──
    setMode(state.mode);

    return wrap;
  }

  global.generateRepeatDates = generateRepeatDates;
  global.createRecurrencePicker = createRecurrencePicker;
})(window);
