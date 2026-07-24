// ── Bulk Multi-Select + Floating Action Bar ─────────────────────────────────
// Generic "select mode" for any list container: toggles a mode that reveals a
// checkbox on each item, tracks a Set of selected ids, and shows a floating
// action bar with a live count + caller-supplied action buttons whenever the
// selection is non-empty. Builder pattern — call once per list, keep the
// returned handle. Plain vanilla JS, no dependencies.
//
// Markup expectations for each item matched by `itemSelector`:
//   - carries a `data-id` attribute (string or number) uniquely identifying it
//   - the component injects a `.bulk-select-checkbox` as its first child while
//     select mode is active, and toggles a `.bulk-selected` class on it
//
// Usage:
//   const bulk = createBulkSelect(document.getElementById('list'), {
//     itemSelector: '.entry-card',
//     actions: [
//       { label: 'Archive selected', onClick: (ids) => archiveMany(ids) },
//       { label: 'Delete selected', onClick: (ids) => deleteMany(ids), danger: true },
//     ],
//     onSelectionChange: (ids) => console.log(ids.size, 'selected'),
//   });
//   toggleBtn.addEventListener('click', () => bulk.toggleMode());
//
// Public API (per instance, returned by createBulkSelect):
//   toggleMode(force?)   -> flips select mode on/off (or sets it to `force` if given)
//   isActive()           -> true while select mode is on
//   getSelected()         -> Set of currently-selected ids
//   clearSelection()      -> empties the selection, keeps select mode as-is
//   refresh()             -> re-applies checkboxes/state to current DOM items;
//                            call after the caller re-renders the list while
//                            select mode is active (checkboxes on new item
//                            elements aren't injected automatically)
//   destroy()             -> removes the bar, listeners, and injected checkboxes

(function (global) {
  function createBulkSelect(containerEl, opts) {
    if (!containerEl) throw new Error('createBulkSelect: containerEl is required');
    const options = opts || {};
    const itemSelector = options.itemSelector;
    if (!itemSelector) throw new Error('createBulkSelect: opts.itemSelector is required');
    const actions = Array.isArray(options.actions) ? options.actions : [];
    const onSelectionChange = typeof options.onSelectionChange === 'function' ? options.onSelectionChange : null;
    const onModeChange = typeof options.onModeChange === 'function' ? options.onModeChange : null;

    let active = false;
    const selected = new Set();

    // ── Floating bar ──
    const bar = document.createElement('div');
    bar.className = 'bulk-select-bar';

    const countEl = document.createElement('span');
    countEl.className = 'bulk-select-count';
    countEl.textContent = '0 selected';

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'bulk-select-actions';

    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bulk-select-action-btn' + (action.danger ? ' danger' : '');
      btn.textContent = action.label || '';
      btn.addEventListener('click', () => {
        if (typeof action.onClick === 'function') action.onClick(new Set(selected));
      });
      actionsWrap.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'bulk-select-action-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => toggleMode(false));
    actionsWrap.appendChild(cancelBtn);

    bar.appendChild(countEl);
    bar.appendChild(actionsWrap);
    (containerEl.parentNode || document.body).insertBefore(bar, containerEl.nextSibling);

    // ── Item id resolution ──
    function idOf(el) {
      const raw = el.getAttribute('data-id');
      return raw;
    }

    function itemEls() {
      return Array.from(containerEl.querySelectorAll(itemSelector));
    }

    function injectCheckbox(el) {
      if (el.querySelector(':scope > .bulk-select-checkbox')) return;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'bulk-select-checkbox';
      const id = idOf(el);
      cb.checked = selected.has(id);
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleItem(id, el);
      });
      el.insertBefore(cb, el.firstChild);
    }

    function removeCheckbox(el) {
      const cb = el.querySelector(':scope > .bulk-select-checkbox');
      if (cb) cb.remove();
      el.classList.remove('bulk-selected');
    }

    function toggleItem(id, el) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      const targetEl = el || itemEls().find((e) => idOf(e) === id);
      if (targetEl) {
        targetEl.classList.toggle('bulk-selected', selected.has(id));
        const cb = targetEl.querySelector(':scope > .bulk-select-checkbox');
        if (cb) cb.checked = selected.has(id);
      }
      updateBar();
    }

    function updateBar() {
      const count = selected.size;
      countEl.textContent = `${count} selected`;
      bar.classList.toggle('visible', active && count > 0);
      if (onSelectionChange) onSelectionChange(new Set(selected));
    }

    function applyMode() {
      containerEl.classList.toggle('bulk-select-mode', active);
      itemEls().forEach((el) => {
        if (active) injectCheckbox(el);
        else removeCheckbox(el);
      });
      if (!active) bar.classList.remove('visible');
      updateBar();
    }

    function toggleMode(force) {
      active = typeof force === 'boolean' ? force : !active;
      if (!active) selected.clear();
      applyMode();
      if (onModeChange) onModeChange(active);
    }

    function isActive() {
      return active;
    }

    function getSelected() {
      return new Set(selected);
    }

    function clearSelection() {
      selected.clear();
      itemEls().forEach((el) => {
        el.classList.remove('bulk-selected');
        const cb = el.querySelector(':scope > .bulk-select-checkbox');
        if (cb) cb.checked = false;
      });
      updateBar();
    }

    function refresh() {
      if (active) applyMode();
    }

    function destroy() {
      itemEls().forEach(removeCheckbox);
      containerEl.classList.remove('bulk-select-mode');
      bar.remove();
    }

    return { toggleMode, isActive, getSelected, clearSelection, refresh, destroy };
  }

  global.createBulkSelect = createBulkSelect;
})(window);
