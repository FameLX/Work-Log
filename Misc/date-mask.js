// ── Shared DD/MM/YYYY [HH:MM] input-mask helpers ────────────────────────────
// Used by date-picker.js and datetime-picker.js so both share ONE masking
// implementation for direct typing into the date trigger, instead of two
// drifting copies. Same principle as time-mask.js: always recompute the mask
// from the raw digit count on every keystroke, never conditionally insert a
// separator "only if missing" — that traps the user, unable to backspace past
// a boundary once a "/" or ":" exists.
//
// Ported from a hand-built version in CIRQ_XML_Builder.html (Project/APP Test
// Case Testing/), which added trigger-level typing to its own date picker
// independently — this file generalizes that same approach for reuse here.

(function (global) {
  function digitsOnly(str, maxLen) {
    return (str || '').replace(/\D/g, '').slice(0, maxLen);
  }

  // "DDMMYYYY" (+ optional "HHMM" when withTime) -> "DD/MM/YYYY" (+ " HH:MM")
  function maskDateOrDateTime(digits, withTime) {
    const d = digits.slice(0, 8);
    let out = d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
    if (withTime) {
      const t = digits.slice(8, 12);
      if (t.length) out += ' ' + (t.length <= 2 ? t : `${t.slice(0, 2)}:${t.slice(2)}`);
    }
    return out;
  }

  function clampNum(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // First 8 digits -> { day, month (0-based), year }, clamped to a real
  // calendar date (day clamped against that month's actual length), or null
  // if fewer than 8 digits were typed (an incomplete date — caller should
  // leave the field alone rather than commit garbage).
  function clampDateDigits(digits) {
    if (digits.length < 8) return null;
    let day = clampNum(parseInt(digits.slice(0, 2), 10) || 1, 1, 31);
    const month = clampNum(parseInt(digits.slice(2, 4), 10) || 1, 1, 12);
    const year = parseInt(digits.slice(4, 8), 10) || new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) day = daysInMonth;
    return { day, month: month - 1, year };
  }

  global.DateMask = { digitsOnly, maskDateOrDateTime, clampNum, clampDateDigits };
})(window);
