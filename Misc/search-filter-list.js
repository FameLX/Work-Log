// ── Generic Search-Filter-Highlight List ─────────────────────────────────────
// Generic "type in a box, filter a list, highlight the hit" helper. Generalised
// from `setSearch`/`matchesSearch`/`highlight` in Misc/index.html
// (~lines 1278-1299). Field-name-agnostic: the caller lists which object keys
// to substring-match via `opts.fields`, and supplies `opts.render` to turn a
// surviving item into whatever the caller wants to inject into the DOM.
//
// Standalone by design — ships its own small highlight fallback so this file
// has zero dependencies. If fuzzy-date-search.js is already loaded on the
// page (which defines a fancier `highlightMatches` with tag/class options),
// this file reuses that instead of its own fallback; either way the same
// `highlight(text, query)` convenience is available on the returned handle.
//
// Usage:
//   const filter = createSearchFilter(entries, {
//     fields: ['name', 'remark'],
//     render: (item, query) => `<div class="row">${filter.highlight(item.name, query)}</div>`,
//   });
//   searchInput.addEventListener('input', (e) => {
//     filter.setQuery(e.target.value);
//     list.innerHTML = filter.getResults().join('');
//   });
//
// Public API: createSearchFilter(items, opts) -> { setQuery(str), getResults(), highlight(text, query) }
// opts.fields   (required) array of item keys to substring-match against
// opts.render(item, query) (required) -> whatever getResults() should collect for a surviving item

(function (global) {
  function localHighlight(text, query) {
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    if (!query) return esc(text);
    const str = String(text == null ? '' : text);
    const lq = query.toLowerCase();
    const lt = str.toLowerCase();
    const idx = lt.indexOf(lq);
    if (idx === -1) return esc(str);
    return esc(str.slice(0, idx)) + '<mark>' + esc(str.slice(idx, idx + query.length)) + '</mark>' +
      localHighlight(str.slice(idx + query.length), query);
  }

  function createSearchFilter(items, opts) {
    const options = opts || {};
    const list = Array.isArray(items) ? items : [];
    const fields = Array.isArray(options.fields) ? options.fields : [];
    if (!fields.length) throw new Error('createSearchFilter: opts.fields must list at least one field');
    const renderFn = typeof options.render === 'function' ? options.render : (item) => item;
    const highlight = typeof global.highlightMatches === 'function'
      ? (text, query) => global.highlightMatches(text, query)
      : localHighlight;

    let query = '';

    function matches(item) {
      if (!query) return true;
      const lq = query.toLowerCase().trim();
      return fields.some((f) => String(item[f] == null ? '' : item[f]).toLowerCase().includes(lq));
    }

    function setQuery(q) {
      query = q || '';
    }

    function getResults() {
      return list.filter(matches).map((item) => renderFn(item, query));
    }

    return { setQuery: setQuery, getResults: getResults, highlight: highlight };
  }

  global.createSearchFilter = createSearchFilter;
})(window);
