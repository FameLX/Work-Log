// ── Drag-to-Reorder List Rows ────────────────────────────────────────────────
// Generic HTML5 drag-and-drop reordering for any list of rows. Wires drag
// handlers onto elements matching `itemSelector` inside a container, shows an
// insertion-line indicator as you drag over a row, and reorders the DOM nodes
// on drop — then reports the new id order back via `onReorder`. Builder
// pattern; call once per list (re-call after a full re-render since the old
// row elements are gone). Plain vanilla JS, no dependencies.
//
// Markup expectations for each item matched by `itemSelector`:
//   - carries a `data-id` attribute (string) uniquely identifying it
//   - the component sets `draggable="true"` on it for you
//
// Minimal CSS (no separate .css file — add this to your stylesheet, or a
// <style> block, adjusting the --accent / --border custom properties to taste):
//
//   .drag-reorder-dragging { opacity: 0.5; }
//   .drag-reorder-over-top    { border-top: 2px solid var(--accent) !important; }
//   .drag-reorder-over-bottom { border-bottom: 2px solid var(--accent) !important; }
//
// Usage:
//   const reorder = makeReorderable(document.getElementById('type-list'), {
//     itemSelector: '.type-row',
//     onReorder: (newIds) => saveNewOrder(newIds),
//   });
//   // ... after re-rendering the list with new row elements:
//   reorder.refresh();
//
// Public API (per instance, returned by makeReorderable):
//   refresh()   -> re-wires drag handlers on current DOM rows (call after re-render)
//   destroy()   -> removes drag handlers and indicator classes from current rows

(function (global) {
  function makeReorderable(containerEl, opts) {
    if (!containerEl) throw new Error('makeReorderable: containerEl is required');
    const options = opts || {};
    const itemSelector = options.itemSelector;
    if (!itemSelector) throw new Error('makeReorderable: opts.itemSelector is required');
    const onReorder = typeof options.onReorder === 'function' ? options.onReorder : null;

    let draggedEl = null;
    const wired = new WeakSet();

    function itemEls() {
      return Array.from(containerEl.querySelectorAll(itemSelector));
    }

    function clearIndicators() {
      itemEls().forEach((el) => {
        el.classList.remove('drag-reorder-over-top', 'drag-reorder-over-bottom');
      });
    }

    function currentIds() {
      return itemEls().map((el) => el.getAttribute('data-id'));
    }

    function onDragStart(e) {
      draggedEl = this;
      this.classList.add('drag-reorder-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', this.getAttribute('data-id') || ''); } catch (err) { /* no-op */ }
      }
    }

    function onDragOver(e) {
      if (e.preventDefault) e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (this === draggedEl) return false;
      clearIndicators();
      const rect = this.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      this.classList.add(before ? 'drag-reorder-over-top' : 'drag-reorder-over-bottom');
      return false;
    }

    function onDragLeave() {
      this.classList.remove('drag-reorder-over-top', 'drag-reorder-over-bottom');
    }

    function onDrop(e) {
      if (e.stopPropagation) e.stopPropagation();
      if (draggedEl && draggedEl !== this) {
        const rect = this.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        containerEl.insertBefore(draggedEl, before ? this : this.nextSibling);
        if (onReorder) onReorder(currentIds());
      }
      clearIndicators();
      return false;
    }

    function onDragEnd() {
      this.classList.remove('drag-reorder-dragging');
      clearIndicators();
      draggedEl = null;
    }

    function wire(el) {
      if (wired.has(el)) return;
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', onDragStart);
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('dragleave', onDragLeave);
      el.addEventListener('drop', onDrop);
      el.addEventListener('dragend', onDragEnd);
      wired.add(el);
    }

    function unwire(el) {
      if (!wired.has(el)) return;
      el.removeAttribute('draggable');
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragend', onDragEnd);
      wired.delete(el);
    }

    function refresh() {
      itemEls().forEach(wire);
    }

    function destroy() {
      itemEls().forEach(unwire);
      clearIndicators();
      draggedEl = null;
    }

    refresh();
    return { refresh, destroy };
  }

  global.makeReorderable = makeReorderable;
})(window);
