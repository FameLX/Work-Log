// ── Settings Draft/Dirty/Discard Guard ──────────────────────────────────────
// Generic pattern for "open a settings panel, edit freely, either Save or
// Discard" flows. Not tied to any specific fields — you supply a getter/setter
// pair for whatever state you're guarding and this tracks a snapshot + dirty
// flag around it. Plain vanilla JS, no dependencies, no DOM required at all
// (this is a behavior wrapper, not a visual widget).
//
// Usage:
//   const guard = createDraftGuard(
//     () => ({ theme: currentTheme, colors: {...typeColors} }),  // getState
//     (state) => { currentTheme = state.theme; typeColors = {...state.colors}; render(); } // applyState
//   );
//
//   function openSettings(){
//     guard.snapshot();          // remember "current" as the rollback point
//     panel.classList.add('open');
//   }
//
//   function closeSettings(){
//     guard.confirmDiscardIfDirty(() => panel.classList.remove('open'));
//     // if dirty and the user confirms discarding: applyState(snapshot) runs,
//     // then panel closes. If dirty and the user cancels: nothing happens,
//     // the panel stays open. If not dirty: panel closes immediately.
//   }
//
//   colorInput.addEventListener('input', () => { typeColors[t] = colorInput.value; guard.markDirty(); });
//
//   function saveSettings(){
//     persistToLocalStorage();
//     guard.snapshot();          // re-baseline: the just-saved state is the new "clean" state
//     panel.classList.remove('open');
//   }
//
// Public API (per instance, returned by createDraftGuard):
//   markDirty()                 -> flags the draft as changed (call this from every field's
//                                   change handler once it has mutated the live state)
//   isDirty()                   -> true if markDirty() has been called since the last snapshot/discard
//   snapshot()                  -> deep-clones getState() as the rollback point, clears the dirty flag;
//                                   call on open (baseline) and again after a successful save (re-baseline)
//   discard()                   -> applyState(lastSnapshot) + clears dirty, without any prompt
//   confirmDiscardIfDirty(onConfirmed)
//                                -> not dirty: calls onConfirmed() immediately.
//                                   dirty: shows the confirm prompt (default window.confirm, or
//                                   opts.confirmFn for a custom modal). If the user confirms, runs
//                                   discard() then onConfirmed(). If the user cancels, does nothing
//                                   (the caller's close/navigate never happens — "blocks close").
//
// opts (all optional):
//   opts.message    -> string shown by the default window.confirm prompt
//   opts.confirmFn  -> (message, respond) => void — your own UI hook instead of window.confirm.
//                       Call respond(true) to proceed with discarding, respond(false) or never
//                       call it at all to cancel/block. This lets a nicer custom "You have unsaved
//                       changes" modal (see suggested CSS notes below) drive the same flow — just
//                       wire its Discard button to respond(true) and its Cancel button (or the
//                       overlay's outside-click) to respond(false).
//
// Suggested styling for a custom confirm modal (no CSS shipped here — this
// component has no visual surface of its own):
//   - Reuse whatever modal-overlay pattern the app already has (fixed inset,
//     dim background, centered card) rather than inventing a new one.
//   - Two actions: a plain/secondary "Keep editing" (cancels) and a
//     danger-styled "Discard changes" (confirms) — never make Discard the
//     visually default/primary button, since it's the destructive path.

(function (global) {
  function deepClone(value) {
    if (value === null || typeof value !== 'object') return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (e) { /* fall through to JSON clone */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function createDraftGuard(getState, applyState, opts) {
    if (typeof getState !== 'function') throw new Error('createDraftGuard: getState must be a function');
    if (typeof applyState !== 'function') throw new Error('createDraftGuard: applyState must be a function');
    const options = opts || {};
    const message = options.message || 'You have unsaved changes. Discard them?';
    const confirmFn = typeof options.confirmFn === 'function'
      ? options.confirmFn
      : (msg, respond) => respond(global.confirm ? global.confirm(msg) : true);

    let lastSnapshot = null;
    let dirty = false;

    function markDirty() {
      dirty = true;
    }

    function isDirty() {
      return dirty;
    }

    function snapshot() {
      lastSnapshot = deepClone(getState());
      dirty = false;
      return lastSnapshot;
    }

    function discard() {
      if (lastSnapshot !== null) applyState(deepClone(lastSnapshot));
      dirty = false;
    }

    function confirmDiscardIfDirty(onConfirmed) {
      const done = typeof onConfirmed === 'function' ? onConfirmed : () => {};
      if (!dirty) {
        done();
        return;
      }
      confirmFn(message, (confirmed) => {
        if (!confirmed) return; // cancel: block close, leave state as-is
        discard();
        done();
      });
    }

    return { markDirty, isDirty, snapshot, discard, confirmDiscardIfDirty };
  }

  global.createDraftGuard = createDraftGuard;
})(window);
