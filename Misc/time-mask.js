// ── Shared HH:MM input-mask helpers ─────────────────────────────────────────
// Used by time-picker.js and datetime-picker.js so both share ONE masking
// implementation instead of drifting into subtly different (buggier) copies.
//
// The rule: always recompute the mask from the raw digit count on every
// keystroke. Never conditionally insert a colon "only if missing" — that
// makes deleting the colon character re-insert it, trapping the user at 2
// digits. digitsOnly() always strips the colon back out first, so the mask
// is rebuilt fresh every time, in both typing and backspacing directions.

(function (global) {
  function digitsOnly(str) {
    return (str || '').replace(/\D/g, '').slice(0, 4);
  }

  function maskHHMM(digits) {
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ':' + digits.slice(2);
  }

  // digits -> { h, m } clamped to valid ranges, or null if digits is empty.
  // Missing minute digits default to 0 (partial hour-only entry, e.g. "9" -> 09:00).
  function clampHHMM(digits) {
    if (!digits) return null;
    let h = parseInt(digits.slice(0, 2), 10);
    let m = digits.length > 2 ? parseInt(digits.slice(2), 10) : 0;
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return { h, m };
  }

  function formatHHMM(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  global.TimeMask = { digitsOnly, maskHHMM, clampHHMM, formatHHMM };
})(window);
