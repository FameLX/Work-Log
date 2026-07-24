// ── Canvas Particle Background ───────────────────────────────────────────────
// DECORATIVE / VISUAL ONLY — not data-critical UI. An ambient animated canvas
// backdrop: a gradient fill, a few drifting sine-wave "current" lines, and a
// field of wobbling particles rendered as circles or rects. Extracted from the
// ocean-trash.html hero canvas and generalized (particle count, colors, shape,
// speed, gradient stops all become options instead of hardcoded values).
//
// Builder pattern, one instance per canvas — call createParticleBg() once per
// <canvas> you want animated; each call gets its own independent state, so you
// can run several on one page. Plain vanilla JS, no dependencies.
//
// Auto-resizes to match the canvas element's own rendered size (ResizeObserver
// on the canvas itself, plus a window 'resize' fallback) — same pattern
// output-layout.js uses for its scroll pane.
//
// Sensible defaults: calling createParticleBg(canvas) with no opts renders a
// reasonable dark-ocean-style ambient background out of the box — you don't
// need to understand every option to get something that looks good.
//
// IMPORTANT — animation lifecycle: this starts its own requestAnimationFrame
// loop. Always call .stop() or .destroy() when the canvas is removed or the
// view navigates away, or the rAF loop keeps running forever in the
// background. .destroy() is safe to call any time (idempotent) and also
// detaches the resize listeners.
//
// Usage:
//   const bg = createParticleBg(document.getElementById('myCanvas'), {
//     count: 200,
//     colors: ['#5dd4f0', '#ff6b35'],
//     shape: 'circle',
//     speed: 1,
//     bg: ['#020d1a', '#031e36', '#020d1a'],
//   });
//   // ... later, e.g. on route change / unmount:
//   bg.destroy();
//
// Public API (per instance, returned by createParticleBg):
//   start()   -> (re)starts the rAF animation loop; no-op if already running
//   stop()    -> cancels the rAF loop; canvas freezes on its last frame
//   destroy() -> stop() + removes resize listeners/observer; instance is dead after this

(function (global) {
  const DEFAULTS = {
    count: 150,               // number of particles
    colors: ['rgba(93,212,240,0.6)', '#c0392b', '#e67e22'], // particle fill colors, picked at random per particle
    shape: 'circle',          // 'circle' | 'rect'
    speed: 1,                 // multiplier on drift velocity + wobble rate
    minRadius: 1,
    maxRadius: 4,
    bg: ['#020d1a', '#031e36', '#020d1a'], // gradient stops, top-to-bottom; falsy/empty = transparent (canvas cleared each frame, no fill)
    currents: true,           // draw animated sine-wave "current" lines
    currentLines: 6,
    currentColor: '13,128,170', // "r,g,b" triplet used with a computed alpha for the current lines
    autoStart: true,          // start the animation loop immediately
  };

  function pickColor(colors) {
    return colors[(Math.random() * colors.length) | 0];
  }

  function createParticleBg(canvasEl, opts) {
    if (!canvasEl || typeof canvasEl.getContext !== 'function') {
      throw new Error('createParticleBg: canvasEl must be a <canvas> element');
    }
    const o = Object.assign({}, DEFAULTS, opts || {});
    const ctx = canvasEl.getContext('2d');

    let W = 0, H = 0;
    let particles = [];
    let rafId = null;
    let running = false;
    let ro = null;

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * (o.maxRadius - o.minRadius) + o.minRadius,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.2,
        color: pickColor(o.colors),
        alpha: Math.random() * 0.5 + 0.1,
        wobble: Math.random() * Math.PI * 2,
      };
    }

    function seedParticles() {
      particles = Array.from({ length: o.count }, mkParticle);
    }

    function resize() {
      const w = canvasEl.clientWidth || canvasEl.offsetWidth || 0;
      const h = canvasEl.clientHeight || canvasEl.offsetHeight || 0;
      if (!w || !h) return;
      W = canvasEl.width = w;
      H = canvasEl.height = h;
      if (!particles.length) seedParticles();
    }

    function paintBackground() {
      if (o.bg && o.bg.length) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        const stops = o.bg.length === 1 ? [o.bg[0], o.bg[0]] : o.bg;
        stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }

    function paintCurrents() {
      if (!o.currents) return;
      const t = Date.now() / 3000;
      for (let i = 0; i < o.currentLines; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${o.currentColor},${0.05 + i * 0.01})`;
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 4) {
          const y = H * (0.25 + i * 0.12) + Math.sin(x / 120 + t + i) * 15 + Math.sin(x / 60 - t * 1.5) * 8;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function paintParticles() {
      particles.forEach((p) => {
        p.wobble += 0.02 * o.speed;
        p.x += (p.dx + Math.sin(p.wobble) * 0.2) * o.speed;
        p.y += p.dy * o.speed;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (o.shape === 'rect') {
          ctx.fillRect(p.x - p.r, p.y - p.r / 2, p.r * 2, p.r);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    }

    function draw() {
      if (W && H) {
        paintBackground();
        paintCurrents();
        paintParticles();
      }
      rafId = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      if (!W || !H) resize();
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function destroy() {
      stop();
      window.removeEventListener('resize', resize);
      if (ro) {
        ro.disconnect();
        ro = null;
      }
    }

    resize();
    window.addEventListener('resize', resize);
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(canvasEl);
    }

    if (o.autoStart) start();

    return { start, stop, destroy };
  }

  global.createParticleBg = createParticleBg;
})(window);
