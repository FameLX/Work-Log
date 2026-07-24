// ── Sample Data Autofill ───────────────────────────────────────────────────
// Cycles through canned realistic records into any form on click — for
// "see what good data looks like" onboarding/test buttons. Field-name-
// agnostic: caller supplies the sample records and a key -> selector map.

(function (global) {
  function createSampleDataFiller(samples, fieldMap) {
    let idx = 0;

    function fill() {
      const data = samples[idx % samples.length];
      idx++;
      Object.keys(fieldMap).forEach((key) => {
        if (!(key in data)) return;
        const target = fieldMap[key];
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        el.value = data[key];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      return data;
    }

    return {
      fill,
      get index() { return idx; },
    };
  }

  global.createSampleDataFiller = createSampleDataFiller;
})(window);
