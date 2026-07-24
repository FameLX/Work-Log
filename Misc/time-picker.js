// ── Custom Time Picker ──────────────────────────────────────────────────────
// Drop-in replacement for <input type="time">. Depends on time-mask.js
// (load it first) for the HH:MM typing mask.
//
// Usage:
//   <input type="text" id="f-time">
//   <script>
//     const wrapper = createTimePicker('f-time');
//     document.getElementById('f-time').replaceWith(wrapper); // if not already done internally
//   </script>
//
// Public API:
//   createTimePicker(inputId)          -> builds UI, returns wrapper element
//   updatePickerInput(inputId)         -> reads selected hour/min buttons, writes "HH:MM"
//   clearTimePicker(inputId)           -> resets input value + selection state
//   syncPickerToValue(inputId, "HH:MM")-> re-selects buttons to match an external value

(function (global) {
  const REGISTRY = {}; // inputId -> { wrapper, trigger, modal, hcol, mcol, original }
  let openPickerId = null;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function closeAllPickers(exceptId) {
    for (const id in REGISTRY) {
      if (id === exceptId) continue;
      const p = REGISTRY[id];
      p.modal.classList.remove('open');
    }
    if (exceptId == null) openPickerId = null;
  }

  function scrollSelectedIntoView(colEl) {
    const sel = colEl.querySelector('.tp-btn.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function selectButton(colEl, value) {
    const btns = colEl.querySelectorAll('.tp-btn');
    btns.forEach((b) => {
      b.classList.toggle('selected', b.dataset.value === value);
    });
  }

  function getSelectedValue(colEl) {
    const sel = colEl.querySelector('.tp-btn.selected');
    return sel ? sel.dataset.value : null;
  }

  function updatePickerInput(inputId) {
    const p = REGISTRY[inputId];
    if (!p) return;
    const h = getSelectedValue(p.hcol);
    const m = getSelectedValue(p.mcol);
    if (h == null || m == null) return;
    const value = `${h}:${m}`;
    p.trigger.value = value;
    p.original.value = value;
    p.original.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearTimePicker(inputId) {
    const p = REGISTRY[inputId];
    if (!p) return;
    p.hcol.querySelectorAll('.tp-btn.selected').forEach((b) => b.classList.remove('selected'));
    p.mcol.querySelectorAll('.tp-btn.selected').forEach((b) => b.classList.remove('selected'));
    p.trigger.value = '';
    p.original.value = '';
    p.original.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncPickerToValue(inputId, value) {
    const p = REGISTRY[inputId];
    if (!p) return;
    if (!value) {
      clearTimePicker(inputId);
      return;
    }
    const parsed = parseTimeString(value);
    if (!parsed) return;
    const { h, m } = parsed;
    selectButton(p.hcol, pad2(h));
    selectButton(p.mcol, pad2(m));
    p.trigger.value = `${pad2(h)}:${pad2(m)}`;
    p.original.value = p.trigger.value;
  }

  function parseTimeString(raw) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
    if (!match) return null;
    let h = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    if (isNaN(h) || isNaN(m)) return null;
    h = Math.min(23, Math.max(0, h));
    m = Math.round(m / 5) * 5;
    if (m >= 60) m = 55;
    return { h, m };
  }

  function buildColumn(id, colId, count, step, label) {
    const wrap = document.createElement('div');
    const labelEl = document.createElement('div');
    labelEl.className = 'tp-label';
    labelEl.textContent = label;
    const col = document.createElement('div');
    col.className = 'tp-col';
    col.id = colId;
    for (let i = 0; i < count; i++) {
      const value = i * step;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tp-btn';
      btn.dataset.value = pad2(value);
      btn.textContent = pad2(value);
      col.appendChild(btn);
    }
    wrap.appendChild(labelEl);
    wrap.appendChild(col);
    return { wrap, col };
  }

  function createTimePicker(inputId) {
    const original = document.getElementById(inputId);
    if (!original) throw new Error(`createTimePicker: no element with id "${inputId}"`);

    const wrapper = document.createElement('div');
    wrapper.className = 'time-picker-wrapper';

    const trigger = document.createElement('input');
    trigger.type = 'text';
    trigger.className = 'time-picker-trigger';
    trigger.placeholder = 'HH:MM';
    trigger.value = original.value || '';
    trigger.readOnly = false;
    trigger.autocomplete = 'off';

    const modal = document.createElement('div');
    modal.className = 'time-picker-modal';

    const content = document.createElement('div');
    content.className = 'time-picker-content';

    const { wrap: hWrap, col: hcol } = buildColumn(inputId, `${inputId}-hcol`, 24, 1, 'Hour');
    const sep = document.createElement('div');
    sep.className = 'time-picker-sep';
    sep.textContent = ':';
    const { wrap: mWrap, col: mcol } = buildColumn(inputId, `${inputId}-mcol`, 12, 5, 'Min');

    content.appendChild(hWrap);
    content.appendChild(sep);
    content.appendChild(mWrap);
    modal.appendChild(content);

    wrapper.appendChild(trigger);
    wrapper.appendChild(modal);

    original.style.display = 'none';

    // Insert the wrapper at the original's live position BEFORE moving the
    // original inside it — the original element is consumed as a child, so
    // callers must not also try to replaceWith() it themselves afterward.
    const parent = original.parentNode;
    if (parent) parent.insertBefore(wrapper, original);
    wrapper.appendChild(original);

    REGISTRY[inputId] = { wrapper, trigger, modal, hcol, mcol, original };

    // Initialize selection from any existing value.
    if (original.value) syncPickerToValue(inputId, original.value);

    // ── Events ──
    hcol.addEventListener('click', (e) => {
      const btn = e.target.closest('.tp-btn');
      if (!btn) return;
      selectButton(hcol, btn.dataset.value);
      updatePickerInput(inputId);
    });

    mcol.addEventListener('click', (e) => {
      const btn = e.target.closest('.tp-btn');
      if (!btn) return;
      selectButton(mcol, btn.dataset.value);
      updatePickerInput(inputId);
    });

    trigger.addEventListener('click', () => {
      const isOpen = modal.classList.contains('open');
      closeAllPickers(inputId);
      if (!isOpen) {
        modal.classList.add('open');
        openPickerId = inputId;
        scrollSelectedIntoView(hcol);
        scrollSelectedIntoView(mcol);
      } else {
        modal.classList.remove('open');
        openPickerId = null;
      }
    });

    trigger.addEventListener('input', () => {
      const digits = TimeMask.digitsOnly(trigger.value);
      trigger.value = TimeMask.maskHHMM(digits);
    });

    trigger.addEventListener('blur', () => {
      const digits = TimeMask.digitsOnly(trigger.value);
      if (!digits) {
        clearTimePicker(inputId);
        return;
      }
      let { h, m } = TimeMask.clampHHMM(digits);
      // This picker's columns only offer 5-minute steps, so free-typed
      // minutes round to the nearest one on blur.
      m = Math.round(m / 5) * 5;
      if (m >= 60) m = 55;
      syncPickerToValue(inputId, TimeMask.formatHHMM(h, m));
    });

    return wrapper;
  }

  document.addEventListener('click', (e) => {
    if (openPickerId == null) return;
    const p = REGISTRY[openPickerId];
    if (!p) return;
    if (!p.wrapper.contains(e.target)) {
      closeAllPickers(null);
    }
  });

  global.createTimePicker = createTimePicker;
  global.updatePickerInput = updatePickerInput;
  global.clearTimePicker = clearTimePicker;
  global.syncPickerToValue = syncPickerToValue;
})(window);
