// ── Soft-Delete with TTL (Trash Auto-Expiry) ─────────────────────────────────
// Purges soft-deleted items whose deletion timestamp is older than a TTL,
// permanently. Generalised from the `purgeOldTrash()` IIFE in
// "Worklog UI test.html" (~lines 1195-1201), which ran once on load with a
// hard-coded 5-day cutoff on a `deletedAt` field.
//
// `purgeExpiredTrash` is a pure function — it does not mutate `trashArray` or
// touch storage; the caller decides what to do with the filtered result (e.g.
// reassign a variable and call their own `save()`). `schedulePurge` wraps it
// for the common case of "run on load, then keep running periodically",
// wired to caller-provided getter/setter so this file stays storage-agnostic.
//
// Usage:
//   // one-off, e.g. on app load:
//   trash = purgeExpiredTrash(trash, { days: 5, dateField: 'deletedAt' });
//   save();
//
//   // recurring, e.g. app init:
//   const stop = schedulePurge(
//     () => trash,
//     (next) => { trash = next; save(); render(); },
//     { days: 5, dateField: 'deletedAt', intervalMs: 60 * 60 * 1000 } // hourly
//   );
//   // stop() to cancel the interval later, if needed.
//
// Public API:
//   purgeExpiredTrash(trashArray, opts) -> filtered array (opts.days default 5,
//                                          opts.dateField default 'deletedAt')
//   schedulePurge(getTrash, setTrash, opts) -> stop() function; opts also takes
//                                          opts.intervalMs (default: run once,
//                                          on load, only — no interval)

(function (global) {
  function purgeExpiredTrash(trashArray, opts) {
    const options = opts || {};
    const days = options.days == null ? 5 : options.days;
    const dateField = options.dateField || 'deletedAt';
    const cutoff = Date.now() - days * 86400000;
    const list = Array.isArray(trashArray) ? trashArray : [];
    return list.filter((item) => {
      const ts = new Date(item[dateField]).getTime();
      return !isNaN(ts) && ts > cutoff;
    });
  }

  function schedulePurge(getTrash, setTrash, opts) {
    const options = opts || {};
    function run() {
      const before = getTrash();
      const after = purgeExpiredTrash(before, options);
      if (after.length !== (before || []).length) setTrash(after);
    }
    run(); // always purge once immediately (matches source's run-on-load behaviour)
    if (!options.intervalMs) return function stop() {};
    const timer = setInterval(run, options.intervalMs);
    return function stop() { clearInterval(timer); };
  }

  global.purgeExpiredTrash = purgeExpiredTrash;
  global.schedulePurge = schedulePurge;
})(window);
