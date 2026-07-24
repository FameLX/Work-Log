// ── Quill Rich-Text + Hidden-Textarea Sync Helper ────────────────────────────
// Mounts a Quill editor into a container element and keeps a hidden
// <textarea>'s `.value` synced to the editor's HTML on every change, so any
// existing form-based save logic (that reads the textarea) keeps working
// unmodified. Generalised from `initNcQuill`/`initEditQuill` in
// email-template-library.html (~lines 577, 863, 882, 1308-1340).
//
// Requires Quill to already be loaded as a global (`window.Quill`) before
// calling attachQuillEditor — this file does not load Quill itself:
//   <link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
//   <script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
// If window.Quill isn't present, attachQuillEditor warns to the console and
// returns null instead of throwing.
//
// Usage:
//   <div id="body-editor"></div>
//   <textarea id="body" style="display:none"></textarea>
//   ...
//   const handle = attachQuillEditor(
//     document.getElementById('body-editor'),
//     document.getElementById('body'),
//     {
//       initialHTML: existingRecord.body,   // optional, seeds the editor + textarea
//       placeholder: 'Email body...',
//       toolbar: [['bold','italic'], [{ list: 'ordered' }, { list: 'bullet' }], ['link','clean']],
//     }
//   );
//   // existing save code just reads document.getElementById('body').value — unchanged.
//   handle.getHTML();       // -> current editor HTML (same as the textarea's value)
//   handle.setHTML(html);   // programmatically replace editor + textarea content
//   handle.destroy();       // tears down listeners (Quill itself has no official destroy)
//
// Public API: attachQuillEditor(mountEl, hiddenTextareaEl, opts) -> { quill, getHTML, setHTML, destroy } | null

(function (global) {
  const DEFAULT_TOOLBAR = [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean']
  ];

  function attachQuillEditor(mountEl, hiddenTextareaEl, opts) {
    const options = opts || {};
    if (!mountEl) throw new Error('attachQuillEditor: mountEl is required');
    if (!hiddenTextareaEl) throw new Error('attachQuillEditor: hiddenTextareaEl is required');

    if (typeof global.Quill === 'undefined') {
      console.warn('attachQuillEditor: Quill is not loaded (expected a global `Quill`, e.g. from ' +
        'https://cdn.quilljs.com/1.3.7/quill.min.js). Skipping editor setup — the plain textarea still works.');
      return null;
    }

    const quill = new global.Quill(mountEl, {
      theme: options.theme || 'snow',
      modules: { toolbar: options.toolbar || DEFAULT_TOOLBAR },
      placeholder: options.placeholder || ''
    });

    function sync() {
      hiddenTextareaEl.value = quill.root.innerHTML;
    }

    function setHTML(html) {
      // Plain text (no tags) gets wrapped into <p> lines, same fallback as
      // initEditQuill's handling of legacy plain-text template bodies.
      const isHtml = /<[a-z][\s\S]*>/i.test(html || '');
      quill.root.innerHTML = isHtml
        ? (html || '')
        : String(html || '').split('\n').map((line) =>
            line.trim() === '' ? '<p><br></p>' : `<p>${escHtml(line)}</p>`
          ).join('');
      sync();
    }

    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    quill.on('text-change', sync);

    if (options.initialHTML) setHTML(options.initialHTML);
    else sync(); // keep textarea in lockstep even when starting empty

    function destroy() {
      quill.off('text-change', sync);
    }

    return { quill: quill, getHTML: () => quill.root.innerHTML, setHTML: setHTML, destroy: destroy };
  }

  global.attachQuillEditor = attachQuillEditor;
})(window);
