// ── Configurable Badge Taxonomy ──────────────────────────────────────────────
// Lets an app define user-editable categorical tags (statuses, priorities,
// labels — anything key/label/color) and renders them as colored pills, with
// an editor UI for adding/removing entries. A fixed set of "builtin" entries
// is protected from deletion (self-heals back in if storage is tampered
// with); anything the user adds through the editor can be removed freely.
//
// Ported from taskmanager.html's cfgAddStatus/cfgAddPriority/cfgRemoveStatus/
// cfgRemovePriority/renderConfig (~line 742-830), generalized so the same
// editor works for statuses, priorities, or any other taxonomy an app needs.
//
// Design notes:
//   - The "key" field in the add-row is optional — leave it blank and one is
//     slugified from the label (spaces -> hyphens, lowercased). Source
//     required an explicit key for statuses but auto-generated one for
//     priorities; this merges both into one flow.
//   - Validation errors surface as an inline, auto-fading message instead of
//     a blocking window.alert(), to keep the widget embeddable anywhere.
//
// Usage:
//   const statusTax = createTaxonomyEditor({
//     storageKey: 'app_statuses',
//     builtins: [
//       { key: 'pending',   label: 'Pending',   bg: '#E6F1FB', text: '#185FA5' },
//       { key: 'completed', label: 'Completed', bg: '#DCFCE7', text: '#166534' },
//     ],
//   });
//   settingsPanel.appendChild(statusTax.el);
//   statusTax.getAll();            // -> [{key,label,bg,text}, ...]
//   statusTax.getByKey('pending'); // -> {key,label,bg,text} | null
//   someCard.appendChild(renderBadge(statusTax, task.status));
//
// Public API:
//   createTaxonomyEditor(opts) -> { el, getAll(), getByKey(key) }
//     opts.storageKey     (required) localStorage key items persist under
//     opts.builtins        [{key,label,bg,text}] seeded on first load, protected by default
//     opts.protectedKeys   [key,...] override which keys can't be removed (defaults to builtins' keys)
//     opts.onChange(items) called after any add/remove, with the full current list
//   renderBadge(taxonomy, key) -> pill <span> for `key`, looked up in `taxonomy`
//     (either the object createTaxonomyEditor() returns, or a plain [{key,...}] array);
//     falls back to a neutral "unknown key" pill if not found.

(function (global) {
  function slugify(s) {
    return (s || '').trim().replace(/\s+/g, '-').toLowerCase();
  }

  function createTaxonomyEditor(opts) {
    opts = opts || {};
    if (!opts.storageKey) throw new Error('createTaxonomyEditor: opts.storageKey is required');

    const storageKey = opts.storageKey;
    const builtins = opts.builtins || [];
    const protectedKeys = opts.protectedKeys || builtins.map((b) => b.key);

    let items = load();

    function load() {
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {
        stored = [];
      }
      // Self-heal: any builtin missing from storage (fresh install, or
      // tampered storage) gets re-added so builtins are never truly gone.
      builtins.forEach((b) => {
        if (!stored.find((it) => it.key === b.key)) stored.push({ ...b });
      });
      // Stable order: builtins first (in declared order), then custom
      // entries in the order they were added.
      const builtinKeys = builtins.map((b) => b.key);
      const byKey = {};
      stored.forEach((it) => { byKey[it.key] = it; });
      const ordered = builtinKeys.filter((k) => byKey[k]).map((k) => byKey[k]);
      stored.forEach((it) => { if (!builtinKeys.includes(it.key)) ordered.push(it); });
      return ordered;
    }

    function persist() {
      localStorage.setItem(storageKey, JSON.stringify(items));
      if (typeof opts.onChange === 'function') opts.onChange(getAll());
    }

    function getAll() {
      return items.map((it) => ({ ...it }));
    }

    function getByKey(key) {
      const it = items.find((i) => i.key === key);
      return it ? { ...it } : null;
    }

    // ── UI ──
    const el = document.createElement('div');
    el.className = 'bt-wrap';

    const list = document.createElement('div');
    list.className = 'bt-list';

    const error = document.createElement('div');
    error.className = 'bt-error';
    let errorTimer = null;

    const addRow = document.createElement('div');
    addRow.className = 'bt-add-row';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'bt-key-input';
    keyInput.placeholder = 'key (optional)';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'bt-label-input';
    labelInput.placeholder = 'Label';

    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.className = 'bt-color-input';
    bgInput.value = '#E6F1FB';
    bgInput.title = 'Background color';

    const textInput = document.createElement('input');
    textInput.type = 'color';
    textInput.className = 'bt-color-input';
    textInput.value = '#185FA5';
    textInput.title = 'Text color';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'bt-add-btn';
    addBtn.textContent = 'Add';

    addRow.appendChild(keyInput);
    addRow.appendChild(labelInput);
    addRow.appendChild(bgInput);
    addRow.appendChild(textInput);
    addRow.appendChild(addBtn);

    el.appendChild(list);
    el.appendChild(error);
    el.appendChild(addRow);

    function showError(msg) {
      error.textContent = msg;
      error.classList.add('show');
      if (errorTimer) clearTimeout(errorTimer);
      errorTimer = setTimeout(() => error.classList.remove('show'), 2600);
    }

    function addItem() {
      const label = labelInput.value.trim();
      if (!label) { showError('Please enter a label.'); return; }
      const key = slugify(keyInput.value) || slugify(label);
      if (!key) { showError('Please enter a label.'); return; }
      if (items.find((it) => it.key === key)) { showError(`Key "${key}" already exists.`); return; }
      items.push({ key, label, bg: bgInput.value, text: textInput.value });
      persist();
      keyInput.value = '';
      labelInput.value = '';
      render();
    }

    function removeItem(key) {
      if (protectedKeys.includes(key)) { showError('This entry is built-in and cannot be removed.'); return; }
      items = items.filter((it) => it.key !== key);
      persist();
      render();
    }

    addBtn.addEventListener('click', addItem);
    [keyInput, labelInput].forEach((inp) => {
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
    });

    function render() {
      list.innerHTML = '';
      items.forEach((it) => {
        const pill = document.createElement('span');
        pill.className = 'bt-pill';
        pill.style.background = it.bg;
        pill.style.color = it.text;
        pill.style.borderColor = it.bg;

        const swatch = document.createElement('span');
        swatch.className = 'bt-swatch';
        swatch.style.background = it.bg;

        const label = document.createElement('span');
        label.className = 'bt-pill-label';
        label.textContent = it.label;

        pill.appendChild(swatch);
        pill.appendChild(label);

        if (!protectedKeys.includes(it.key)) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'bt-pill-del';
          del.textContent = '×';
          del.title = `Remove "${it.label}"`;
          del.addEventListener('click', () => removeItem(it.key));
          pill.appendChild(del);
        }

        list.appendChild(pill);
      });
    }

    render();

    return { el, getAll, getByKey };
  }

  function renderBadge(taxonomy, key) {
    const item = taxonomy && typeof taxonomy.getByKey === 'function'
      ? taxonomy.getByKey(key)
      : (Array.isArray(taxonomy) ? (taxonomy.find((it) => it.key === key) || null) : null);

    const span = document.createElement('span');
    span.className = 'badge-pill';
    if (item) {
      span.textContent = item.label;
      span.style.background = item.bg;
      span.style.color = item.text;
      span.style.borderColor = item.bg;
    } else {
      span.classList.add('badge-pill-unknown');
      span.textContent = key;
    }
    return span;
  }

  global.createTaxonomyEditor = createTaxonomyEditor;
  global.renderBadge = renderBadge;
})(window);
