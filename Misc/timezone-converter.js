// ── Timezone-Aware DateTime Converter ──────────────────────────────────────
// A user always types wall-clock time in ONE fixed "home" zone (wherever the
// team sits); this converts that instant to any other IANA zone through a
// real UTC instant rather than a fixed hour offset — so daylight saving is
// handled correctly (a summer flight to London reads GMT+1, a winter one
// GMT+0) and a day-boundary crossing gets flagged instead of silently eaten.

(function (global) {
  function tzParts(utcMs, zone) {
    const p = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).forEach((x) => { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  }

  // Offset of `zone` from UTC, in minutes, at a given instant (DST-aware).
  function tzOffsetMinutes(zone, utcMs) {
    const p = tzParts(utcMs, zone);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - utcMs) / 60000);
  }

  // Wall-clock time in `zone` -> the UTC instant it refers to. Two passes so a
  // time near a DST boundary settles on the correct offset.
  function wallToUtc(y, mo, d, h, mi, zone) {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const utc = guess - tzOffsetMinutes(zone, guess) * 60000;
    return guess - tzOffsetMinutes(zone, utc) * 60000;
  }

  // "YYYY-MM-DD" + "HH:MM" wall-clock in `fromZone` -> the same instant in
  // `toZone`. Returns the input untouched if anything is missing, so a
  // half-filled form still works.
  function convertLocalToZone(dateStr, timeStr, fromZone, toZone) {
    if (!dateStr || !timeStr || !toZone) return { date: dateStr, time: timeStr };
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    if (!y || !mo || !d || isNaN(h) || isNaN(mi)) return { date: dateStr, time: timeStr };
    const p = tzParts(wallToUtc(y, mo, d, h, mi, fromZone), toZone);
    const pad = (n) => String(n).padStart(2, '0');
    return { date: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` };
  }

  // "GMT+7", "GMT+5:30", "GMT-4" for `zone` on a given reference date.
  function gmtOffsetLabel(zone, refDateStr) {
    if (!zone) return '';
    const [y, mo, d] = (refDateStr || '').split('-').map(Number);
    const utc = (y && mo && d) ? Date.UTC(y, mo - 1, d, 12) : Date.now();
    const off = tzOffsetMinutes(zone, utc);
    const a = Math.abs(off), hh = Math.floor(a / 60), mm = a % 60;
    return 'GMT' + (off < 0 ? '-' : '+') + hh + (mm ? ':' + String(mm).padStart(2, '0') : '');
  }

  // Full read-only preview: converted date+time plus a (+1d)/(-1d) marker
  // when the conversion crosses midnight.
  function convertPreview(dateStr, timeStr, fromZone, toZone) {
    if (!dateStr || !timeStr || !toZone) return { text: '—', shiftDays: 0 };
    const r = convertLocalToZone(dateStr, timeStr, fromZone, toZone);
    if (!r.date || !r.time) return { text: '—', shiftDays: 0 };
    const [sy, sm, sd] = dateStr.split('-').map(Number);
    const [ry, rm, rd] = r.date.split('-').map(Number);
    const shiftDays = Math.round((Date.UTC(ry, rm - 1, rd) - Date.UTC(sy, sm - 1, sd)) / 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const mark = shiftDays > 0 ? ` (+${shiftDays}d)` : shiftDays < 0 ? ` (${shiftDays}d)` : '';
    return { text: `${pad(rd)}/${pad(rm)}/${ry}  ${r.time}${mark}`, shiftDays };
  }

  global.tzOffsetMinutes = tzOffsetMinutes;
  global.convertLocalToZone = convertLocalToZone;
  global.gmtOffsetLabel = gmtOffsetLabel;
  global.convertPreview = convertPreview;
})(window);
