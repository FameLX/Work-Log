// ── Heatmap / Pixel-Grid "Waffle Chart" ──────────────────────────────────────
// DECORATIVE / VISUAL ONLY by origin (it started as a purely random decorative
// grid in ocean-trash.html), but generalized here to accept an explicit
// filledPercent, so it doubles as a lightweight waffle-chart-style data viz
// for "N% of M" style proportions — not a replacement for a real charting
// library, but fine for a stat card or hero panel.
//
// Builds an N x M grid of divs inside containerEl and colors a proportion of
// them as "filled" vs "empty". Two fill modes:
//   - deterministic (default): exactly round(rows*cols*filledPercent/100)
//     cells are filled, chosen at random positions — the on-screen percentage
//     always matches filledPercent exactly.
//   - randomize: true: each cell independently rolls against filledPercent
//     (Math.random()*100 < filledPercent) — the original decorative behavior,
//     approximate rather than exact, looks a little more "organic"/noisy.
//
// Builder pattern, one instance per grid — call createPixelGrid() once per
// container; each call is independent, so you can have several grids on one
// page. Plain vanilla JS, no dependencies. Pairs with pixel-grid.css.
//
// Sensible defaults: calling createPixelGrid(container) with no opts renders
// a reasonable 40x24 grid at ~35% fill — you don't need to tune anything to
// get something that looks good.
//
// Usage:
//   const grid = createPixelGrid(document.getElementById('coverage'), {
//     rows: 20, cols: 30, filledPercent: 62,
//     filledColor: '#c0392b', emptyColor: '#0a3d62',
//   });
//   // later, to show a new proportion (e.g. animated stat):
//   grid.update({ filledPercent: 80 });
//
// Public API:
//   createPixelGrid(containerEl, opts) -> builds the grid, appends it to containerEl, returns the grid element
//     opts.rows          (default 24)
//     opts.cols           (default 40)
//     opts.filledPercent  (default 35)   -> 0-100
//     opts.filledColor    (default '#c0392b')
//     opts.emptyColor     (default '#0a3d62')
//     opts.randomize      (default false) -> per-cell probabilistic fill instead of exact count
//   The returned element also carries an `.update(opts)` method (merges over
//   the options used to build it, re-renders in place) for convenience.

(function (global) {
  const DEFAULTS = {
    rows: 24,
    cols: 40,
    filledPercent: 35,
    filledColor: '#c0392b',
    emptyColor: '#0a3d62',
    randomize: false,
  };

  function shuffledIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderCells(gridEl, o) {
    const total = o.rows * o.cols;
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${o.cols}, 1fr)`;

    let filledSet = null;
    if (!o.randomize) {
      const filledCount = Math.round(total * (o.filledPercent / 100));
      filledSet = new Set(shuffledIndices(total).slice(0, filledCount));
    }

    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'pg-cell';
      const isFilled = o.randomize
        ? Math.random() * 100 < o.filledPercent
        : filledSet.has(i);
      cell.style.background = isFilled ? o.filledColor : o.emptyColor;
      gridEl.appendChild(cell);
    }
  }

  function createPixelGrid(containerEl, opts) {
    if (!containerEl) throw new Error('createPixelGrid: containerEl is required');
    let o = Object.assign({}, DEFAULTS, opts || {});

    const gridEl = document.createElement('div');
    gridEl.className = 'pg-grid';

    function update(newOpts) {
      o = Object.assign({}, o, newOpts || {});
      renderCells(gridEl, o);
    }

    renderCells(gridEl, o);
    gridEl.update = update;

    containerEl.appendChild(gridEl);
    return gridEl;
  }

  global.createPixelGrid = createPixelGrid;
})(window);
