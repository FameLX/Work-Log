// ── Condition Evaluator ──────────────────────────────────────────────────────
// Generic "pick the right content variant based on yes/no facts". Given a list
// of items each carrying a `conds` object (condition-key -> required boolean),
// renders a yes/no toggle row for every unique condition key found across all
// items, plus a simple list of the items themselves (highlighted live as
// answers come in). An item is a MATCH once every one of its own condition
// keys has been answered AND every answer equals the item's required value;
// items with no conds are left 'unknown' (nothing to evaluate).
// Generalised from the `.ceval`/`.crow`/`.ynt` + `setYN()` pattern in
// email-template-library.html (~lines 788-932). Fully decoupled from
// "templates" — works on any `items` array. If you already render your own
// item list elsewhere, ignore the built-in `.ceval-items` block and use the
// `onMatchChange(matches, items)` callback to drive your own highlighting.
//
// Usage:
//   const evalr = createConditionEvaluator(
//     [
//       { id: 'T008', label: 'PNR Cutover — Go Live', conds: { rollbackConfirmed: true, credsActive: true } },
//       { id: 'T009', label: 'ALP Dev Checklist', conds: {} },
//     ],
//     {
//       mountEl: document.getElementById('cond-eval'),
//       onMatchChange: (matches, allItems) => console.log(matches.map(m => m.id)),
//     }
//   );
//   evalr.reset();          // clears all given answers
//   evalr.getAnswers();     // -> { rollbackConfirmed: true, ... }
//   evalr.getMatches();     // -> items[] whose conds are fully satisfied so far
//   evalr.destroy();        // removes DOM + listeners
//
// Public API: createConditionEvaluator(items, opts) -> { reset, getAnswers, getMatches, destroy }
// opts.mountEl        (required) element the rows + result get rendered into
// opts.keyLabel(key)  optional formatter for a condition key's display label
// opts.itemLabel(item) optional formatter for an item's display label (default item.label)
// opts.onMatchChange(matches, items) optional callback fired after every answer

(function (global) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function createConditionEvaluator(items, opts) {
    const options = opts || {};
    const mountEl = options.mountEl;
    if (!mountEl) throw new Error('createConditionEvaluator: opts.mountEl is required');
    const list = Array.isArray(items) ? items : [];
    const keyLabel = typeof options.keyLabel === 'function' ? options.keyLabel : (k) => k;
    const itemLabel = typeof options.itemLabel === 'function' ? options.itemLabel : (it) => it.label;
    const onMatchChange = typeof options.onMatchChange === 'function' ? options.onMatchChange : null;

    // Unique condition keys across every item, in first-seen order.
    const keys = [];
    list.forEach((it) => {
      Object.keys(it.conds || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
    });

    let answers = {};

    const rowsEl = document.createElement('div');
    rowsEl.className = 'ceval';
    const resultEl = document.createElement('div');
    resultEl.className = 'ceval-result';
    const itemsEl = document.createElement('div');
    itemsEl.className = 'ceval-items';

    function rowHTML(key, idx) {
      return `<div class="crow" data-key="${esc(key)}">
        <label class="crow-label">${esc(keyLabel(key))}</label>
        <div class="ynt">
          <button type="button" class="ynb yes" data-idx="${idx}" data-val="yes">Yes</button>
          <button type="button" class="ynb no" data-idx="${idx}" data-val="no">No</button>
        </div>
      </div>`;
    }

    function render() {
      rowsEl.innerHTML = keys.map(rowHTML).join('');
      rowsEl.querySelectorAll('.ynb').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = keys[+btn.getAttribute('data-idx')];
          setAnswer(key, btn.getAttribute('data-val') === 'yes');
        });
      });
      syncButtons();
    }

    function syncButtons() {
      rowsEl.querySelectorAll('.crow').forEach((row) => {
        const key = row.getAttribute('data-key');
        const val = answers[key];
        row.querySelector('.ynb.yes').classList.toggle('on', val === true);
        row.querySelector('.ynb.no').classList.toggle('on', val === false);
      });
    }

    function matchStateOf(item) {
      const condKeys = Object.keys(item.conds || {});
      if (!condKeys.length) return 'unknown'; // no conditions declared — nothing to evaluate
      if (!condKeys.every((k) => answers[k] !== undefined)) return 'pending';
      return condKeys.every((k) => answers[k] === item.conds[k]) ? 'match' : 'nomatch';
    }

    function getMatches() {
      return list.filter((it) => matchStateOf(it) === 'match');
    }

    function renderItems() {
      itemsEl.innerHTML = list.map((it) => {
        const state = matchStateOf(it); // 'unknown' | 'pending' | 'match' | 'nomatch'
        return `<div class="ceval-item ceval-item-${state}" data-id="${esc(String(it.id))}">${esc(itemLabel(it))}</div>`;
      }).join('');
    }

    function renderResult() {
      const matches = getMatches();
      const anyAnswered = Object.keys(answers).length > 0;
      renderItems();
      if (!anyAnswered) {
        resultEl.innerHTML = '';
      } else if (matches.length) {
        resultEl.innerHTML = `<div class="rbox match">Matches: ${matches.map((m) => esc(itemLabel(m))).join(', ')}</div>`;
      } else {
        resultEl.innerHTML = `<div class="rbox nomatch">No item matches these answers yet.</div>`;
      }
      if (onMatchChange) onMatchChange(matches, list);
    }

    function setAnswer(key, val) {
      answers[key] = val;
      syncButtons();
      renderResult();
    }

    function reset() {
      answers = {};
      syncButtons();
      renderResult();
    }

    function getAnswers() {
      return Object.assign({}, answers);
    }

    function destroy() {
      mountEl.innerHTML = '';
    }

    mountEl.innerHTML = '';
    mountEl.appendChild(rowsEl);
    mountEl.appendChild(resultEl);
    mountEl.appendChild(itemsEl);
    render();
    renderResult();

    return { reset, getAnswers, getMatches, destroy };
  }

  global.createConditionEvaluator = createConditionEvaluator;
})(window);
