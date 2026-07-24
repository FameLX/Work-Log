// ── Fuzzy Date/Time Search + Highlight ───────────────────────────────────────
// Builds a search "blob" of every common human phrasing of a date/time, so a
// plain substring search box can match "July 2", "02/07", "2/7/2026", or the
// raw "2026-07-02" all against the same record. Also provides a safe
// substring highlighter that wraps matches without double-wrapping.
// Generalised from `dateSearchBlob()`/`timeSearchBlob()` and `highlight()` in
// "Worklog UI test.html" (~lines 2378-2424).
//
// Usage:
//   dateSearchBlob('2026-07-02');
//   // -> "2026-07-02 02/7/2026 2/7/2026 July jul jul 2 July 2 2 jul 2 July 2026"
//   timeSearchBlob('13:30');
//   // -> "13:30 1:30pm 1:30 pm"
//
//   function matchesSearch(entry, query) {
//     if (!query) return true;
//     const q = query.toLowerCase().trim();
//     if (entry.name.toLowerCase().includes(q)) return true;
//     if (dateSearchBlob(entry.deadline).toLowerCase().includes(q)) return true;
//     if (timeSearchBlob(entry.time).toLowerCase().includes(q)) return true;
//     return false;
//   }
//
//   highlightMatches('Meeting on 2026-07-02', 'meeting');
//   // -> 'Meeting on 2026-07-02' with a <mark>...</mark> around the match (HTML-escaped elsewhere)
//   highlightMatches(text, query, { tag: 'strong', className: 'hl' });
//
// Public API:
//   dateSearchBlob(isoDateString) -> string, all phrasings of that date, space-joined
//   timeSearchBlob(hhmm)          -> string, 24h + 12h phrasings, space-joined
//   highlightMatches(text, query, opts) -> HTML string with matches wrapped;
//     opts.tag (default 'mark'), opts.className (optional extra class), text
//     is HTML-escaped first so this is always safe to inject with innerHTML.

(function (global) {
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Build a blob of every human-readable way this date could be written, so a
  // search for "July 2", "02/07", "2/7/2026", or the raw "2026-07-02" all match.
  function dateSearchBlob(dateStr) {
    if (!dateStr) return '';
    const [y, m, day] = dateStr.split('-');
    const mi = (+m) - 1;
    const dayNum = parseInt(day, 10);
    const mon = +m;
    return [
      dateStr,
      `${day}/${m}/${y}`, `${dayNum}/${mon}/${y}`,
      MONTH_NAMES[mi], MONTH_ABBR[mi],
      `${MONTH_ABBR[mi]} ${dayNum}`, `${MONTH_NAMES[mi]} ${dayNum}`,
      `${dayNum} ${MONTH_ABBR[mi]}`, `${dayNum} ${MONTH_NAMES[mi]}`,
      y
    ].join(' ');
  }

  function fmtTime12(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return (hr % 12 || 12) + ':' + m + (hr < 12 ? 'AM' : 'PM');
  }

  // Build a blob of both 24h ("13:30") and 12h ("1:30PM" / "1:30 PM") forms.
  function timeSearchBlob(timeStr) {
    if (!timeStr) return '';
    const t12 = fmtTime12(timeStr);
    return `${timeStr} ${t12} ${t12.replace(/(AM|PM)/, ' $1')}`.toLowerCase();
  }

  // Wraps the first-and-onward occurrences of `query` in `text` with a tag.
  // Recurses on the remainder after each match so it never re-wraps already
  // -wrapped output (the recursion only ever sees plain, unescaped remainder).
  function highlightMatches(text, query, opts) {
    const options = opts || {};
    const tag = options.tag || 'mark';
    const cls = options.className ? ` class="${esc(options.className)}"` : '';
    if (!query) return esc(text);
    const str = String(text == null ? '' : text);
    const lq = query.toLowerCase();
    const lt = str.toLowerCase();
    const idx = lt.indexOf(lq);
    if (idx === -1) return esc(str);
    return esc(str.slice(0, idx)) +
      `<${tag}${cls}>` + esc(str.slice(idx, idx + query.length)) + `</${tag}>` +
      highlightMatches(str.slice(idx + query.length), query, opts);
  }

  global.dateSearchBlob = dateSearchBlob;
  global.timeSearchBlob = timeSearchBlob;
  global.highlightMatches = highlightMatches;
})(window);
