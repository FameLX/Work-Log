// ── Responsive Paginated Output Layout ──────────────────────────────────────
// Shows a list of generated items (messages / documents / results), paging
// 2-up side-by-side when the OUTPUT PANE is wide enough, 1-up otherwise. The
// switch is live (window resize / pane resize) and keeps the first visible
// item on screen across the reflow instead of jumping back to page 1.
//
// Singleton by design — one output pane per page, matching the #output-toolbar
// / #scroll / #items id-based structure. Plain vanilla JS, no dependencies.
//
// Usage:
//   const wrap = createOutputLayout('Results', (item) => `<pre>${item.body}</pre>`);
//   container.appendChild(wrap);
//   setItems([{ title: 'Item 1', subtitle: 'sub', body: '...' }, ...]);
//
// Public API:
//   createOutputLayout(label, renderBody) -> builds toolbar+scroll+items, returns wrapper
//   setItems(newItems)                    -> replaces the item list, re-measures, shows page 1
//   showPage(pageIndex)                   -> renders a given page for the current column count
//   currentCols()                         -> 1 or 2, from the pane's own width
//   onResize()                            -> re-flows on a column-count change, keeps position
//   copyItem(index, btn)                  -> copies items[index].body, flips the button label

(function (global) {
  const COLUMN_GAP = 16; // matches #items.two-up column-gap
  const DIVIDER_WIDTH = 1;
  const SAFETY_MARGIN = 24;
  const DEFAULT_THRESHOLD = 640;

  let items = [];
  let curPage = 0;
  let renderedCols = 1;
  let threshold = DEFAULT_THRESHOLD;
  let renderBody = (item) => String(item.body || '');

  let toolbarEl, pagerEl, prevBtn, nextBtn, pageIndEl, scrollEl, itemsEl;

  // ── Clipboard helper (shared by every per-item Copy button) ──
  function fallbackCopy(text, onDone) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op: clipboard unavailable */ }
    document.body.removeChild(ta);
    onDone();
  }

  function doCopy(text, btn) {
    const original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    const onDone = () => {
      btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone));
    } else {
      fallbackCopy(text, onDone);
    }
  }

  function copyItem(index, btn) {
    const item = items[index];
    if (!item) return;
    doCopy(item.body, btn);
  }

  // ── Item rendering ──
  function buildItemEl(item, index) {
    const el = document.createElement('div');
    el.className = 'item';

    const header = document.createElement('div');
    header.className = 'item-header';

    const titles = document.createElement('div');
    titles.className = 'item-titles';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.title || '';

    const subtitle = document.createElement('div');
    subtitle.className = 'item-subtitle';
    subtitle.textContent = item.subtitle || '';

    titles.appendChild(title);
    if (item.subtitle) titles.appendChild(subtitle);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'item-copy';
    copyBtn.textContent = 'Copy';
    copyBtn.dataset.label = 'Copy';
    copyBtn.addEventListener('click', () => copyItem(index, copyBtn));

    header.appendChild(titles);
    header.appendChild(copyBtn);

    const body = document.createElement('div');
    body.className = 'body';
    const rendered = renderBody(item);
    if (rendered instanceof Node) {
      body.appendChild(rendered);
    } else {
      body.innerHTML = rendered;
    }

    el.appendChild(header);
    el.appendChild(body);
    return el;
  }

  // ── Width calibration: measure the widest item's rendered width, not a guess ──
  function measureWidestContent() {
    if (!items.length) return 0;
    const probe = document.createElement('div');
    probe.className = 'item';
    probe.style.cssText = 'position:absolute; visibility:hidden; top:-9999px; left:-9999px; width:max-content; max-width:none;';
    document.body.appendChild(probe);

    let widest = 0;
    items.forEach((item, i) => {
      probe.innerHTML = '';
      probe.appendChild(buildItemEl(item, i));
      widest = Math.max(widest, probe.scrollWidth);
    });

    document.body.removeChild(probe);
    return widest;
  }

  function computeThreshold() {
    const widest = measureWidestContent();
    if (!widest) return DEFAULT_THRESHOLD;
    const cs = getComputedStyle(scrollEl);
    const scrollPadding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return widest * 2 + COLUMN_GAP * 2 + DIVIDER_WIDTH + scrollPadding + SAFETY_MARGIN;
  }

  // ── Column count from the PANE's own width, not window.innerWidth ──
  function currentCols() {
    if (items.length < 2) return 1;
    return scrollEl.clientWidth >= threshold ? 2 : 1;
  }

  function showPage(pageIndex) {
    const cols = currentCols();
    const pageCount = Math.max(1, Math.ceil(items.length / cols));
    pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
    curPage = pageIndex;
    renderedCols = cols;

    const start = pageIndex * cols;
    const pageItems = items.slice(start, start + cols);

    itemsEl.innerHTML = '';
    itemsEl.classList.toggle('two-up', cols === 2);

    if (cols === 2) {
      itemsEl.appendChild(pageItems[0] ? buildItemEl(pageItems[0], start) : document.createElement('div'));
      const divider = document.createElement('div');
      divider.className = 'divider';
      itemsEl.appendChild(divider);
      if (pageItems[1]) itemsEl.appendChild(buildItemEl(pageItems[1], start + 1));
    } else if (pageItems[0]) {
      itemsEl.appendChild(buildItemEl(pageItems[0], start));
    }

    pagerEl.style.display = pageCount > 1 ? '' : 'none';
    pageIndEl.textContent = `${pageIndex + 1} / ${pageCount}`;
    prevBtn.disabled = pageIndex === 0;
    nextBtn.disabled = pageIndex === pageCount - 1;

    scrollEl.scrollTop = 0;
  }

  function pageMsg(delta) {
    showPage(curPage + delta);
  }

  function onResize() {
    if (!items.length) return;
    const newCols = currentCols();
    if (newCols === renderedCols) return;
    const anchorItem = curPage * renderedCols; // first item currently visible
    showPage(Math.floor(anchorItem / newCols));
  }

  function setItems(newItems) {
    items = newItems || [];
    threshold = computeThreshold();
    showPage(0);
  }

  // ── Construction ──
  function createOutputLayout(label, bodyRenderer) {
    if (typeof bodyRenderer === 'function') renderBody = bodyRenderer;

    const wrap = document.createElement('div');
    wrap.className = 'ol-wrap';

    toolbarEl = document.createElement('div');
    toolbarEl.id = 'output-toolbar';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label || '';

    pagerEl = document.createElement('div');
    pagerEl.className = 'pager';

    prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.id = 'prev';
    prevBtn.textContent = '◀ Prev';
    prevBtn.addEventListener('click', () => pageMsg(-1));

    pageIndEl = document.createElement('span');
    pageIndEl.id = 'page-ind';
    pageIndEl.textContent = '1 / 1';

    nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.id = 'next';
    nextBtn.textContent = 'Next ▶';
    nextBtn.addEventListener('click', () => pageMsg(1));

    pagerEl.appendChild(prevBtn);
    pagerEl.appendChild(pageIndEl);
    pagerEl.appendChild(nextBtn);

    toolbarEl.appendChild(labelEl);
    toolbarEl.appendChild(pagerEl);

    scrollEl = document.createElement('div');
    scrollEl.id = 'scroll';

    itemsEl = document.createElement('div');
    itemsEl.id = 'items';
    scrollEl.appendChild(itemsEl);

    wrap.appendChild(toolbarEl);
    wrap.appendChild(scrollEl);

    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(onResize).observe(scrollEl);
    }

    return wrap;
  }

  global.createOutputLayout = createOutputLayout;
  global.setItems = setItems;
  global.showPage = showPage;
  global.currentCols = currentCols;
  global.onResize = onResize;
  global.copyItem = copyItem;
})(window);
