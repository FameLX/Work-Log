// ── Smart Help Tooltip (viewport-clamped) ─────────────────────────────────
// One shared position:fixed bubble instead of a per-icon CSS ::after — works
// inside scrolling/overflow panels where an in-flow tooltip gets clipped, and
// flips above/below the icon to stay fully on screen. Listeners are
// delegated so icons added to the DOM later are covered automatically.

(function (global) {
  let popEl = null;

  function ensurePop() {
    if (popEl) return popEl;
    popEl = document.createElement('div');
    popEl.id = 'st-pop';
    document.body.appendChild(popEl);
    return popEl;
  }

  function show(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    const pop = ensurePop();
    pop.textContent = text;
    pop.style.display = 'block';
    const r = el.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.top - h - 8;
    if (top < 8) top = r.bottom + 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function hide() {
    if (popEl) popEl.style.display = 'none';
  }

  function initSmartTooltips(selector) {
    selector = selector || '.st-icon';
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest && e.target.closest(selector);
      if (t) show(t);
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(selector)) hide();
    });
    window.addEventListener('scroll', hide, true);
  }

  global.initSmartTooltips = initSmartTooltips;
})(window);
