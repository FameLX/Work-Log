// ── Scroll-Reveal Progress Bars ──────────────────────────────────────────────
// DECORATIVE / VISUAL ONLY — not data-critical UI (though it happens to be
// driven by real percentages, so it's fine as a lightweight stat display too).
// Animates a set of "bar-fill" elements from width 0 to a target width once
// each scrolls into view, using IntersectionObserver. Extracted and
// generalized from ocean-trash.html's scroll-triggered stat bars.
//
// Markup expectations (default selector), pairs with scroll-reveal-bars.css:
//   <div class="bar-group">
//     <div class="bar-label"><span>Label</span><span>90%</span></div>
//     <div class="bar-track"><div class="bar-fill" data-w="90%"></div></div>
//   </div>
// Only the element matched by the selector (default `.bar-fill[data-w]`)
// matters to the JS — `.bar-group`/`.bar-label`/`.bar-track` are just the
// suggested surrounding markup the bundled CSS styles.
//
// Builder pattern, call once per container — safe to call again after adding
// new bars to the DOM (it only wires up elements it hasn't seen before).
// Plain vanilla JS, no dependencies.
//
// Respects prefers-reduced-motion: when the user has that OS/browser setting
// on, bars skip the animation and jump straight to their final width instead
// of transitioning.
//
// Usage:
//   initScrollRevealBars(document.getElementById('stats'));
//   // or with a custom selector / threshold:
//   initScrollRevealBars(el, { selector: '.my-bar[data-w]', threshold: 0.3 });
//
// Public API:
//   initScrollRevealBars(containerEl, opts) -> wires up matching bars, returns { refresh(), destroy() }
//     opts.selector  (default '.bar-fill[data-w]') -> which elements to animate
//     opts.attr      (default 'data-w')             -> attribute holding the target width (e.g. '72%')
//     opts.threshold (default 0.5)                  -> IntersectionObserver threshold

(function (global) {
  const DEFAULTS = {
    selector: '.bar-fill[data-w]',
    attr: 'data-w',
    threshold: 0.5,
  };

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initScrollRevealBars(containerEl, opts) {
    if (!containerEl) throw new Error('initScrollRevealBars: containerEl is required');
    const o = Object.assign({}, DEFAULTS, opts || {});
    const seen = new WeakSet();
    let io = null;

    function reveal(el) {
      const target = el.getAttribute(o.attr);
      if (target == null) return;
      el.style.width = target;
    }

    function wire(el) {
      if (seen.has(el)) return;
      seen.add(el);

      if (prefersReducedMotion()) {
        reveal(el);
        return;
      }

      if (!io) {
        io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              reveal(entry.target);
              io.unobserve(entry.target);
            }
          });
        }, { threshold: o.threshold });
      }
      io.observe(el);
    }

    function refresh() {
      containerEl.querySelectorAll(o.selector).forEach(wire);
    }

    function destroy() {
      if (io) {
        io.disconnect();
        io = null;
      }
    }

    refresh();
    return { refresh, destroy };
  }

  global.initScrollRevealBars = initScrollRevealBars;
})(window);
