// ── Paginated Changelog Modal ────────────────────────────────────────────────
// Builds a hidden-until-opened modal that pages through a version history,
// one version per page, newest first. Plain vanilla JS, no dependencies.
// Multiple instances are supported — each call to createChangelogModal builds
// its own overlay and returns its own handle.
//
// Usage:
//   const changelog = createChangelogModal([
//     { version: 'v1.2.0', date: 'July 2026', tag: 'Latest', items: [
//       'Added dark mode',
//       'Fixed export bug',
//     ] },
//     { version: 'v1.1.0', date: 'June 2026', items: [
//       'Initial release',
//     ] },
//   ]);
//   document.body.appendChild(changelog.el);
//   versionLabelInTopbar.addEventListener('click', () => changelog.open());
//
// Entry shape: { version, date, tag?, items: string[] }
//   `tag` is shown as a pill next to the version/date; entries with no `tag`
//   get no pill unless they are the first (newest) entry, which is auto-
//   labelled "Latest" if `tag` is omitted.
//
// Public API (returned by createChangelogModal):
//   el          -> the overlay element; append it to the document yourself
//   open()      -> shows the modal at the newest (first) entry
//   close()     -> hides the modal
//   goTo(index) -> jumps to a specific entry index and re-renders
//   nav(delta)  -> moves +1 (older) / -1 (newer), clamped to range

(function (global) {
  function createChangelogModal(entries) {
    const list = Array.isArray(entries) ? entries : [];
    let page = 0;

    // ── Structure ──
    const overlay = document.createElement('div');
    overlay.className = 'cl-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cl-modal';

    const heading = document.createElement('h2');
    heading.className = 'cl-modal-heading';
    heading.textContent = 'Changelog';
    modal.appendChild(heading);

    const nav = document.createElement('div');
    nav.className = 'cl-modal-nav';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'cl-nav-btn';
    prevBtn.title = 'Older version';
    prevBtn.appendChild(chevronSvg('left'));
    prevBtn.addEventListener('click', () => nav_(1));

    const pageInfo = document.createElement('span');
    pageInfo.className = 'cl-page-info';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'cl-nav-btn';
    nextBtn.title = 'Newer version';
    nextBtn.appendChild(chevronSvg('right'));
    nextBtn.addEventListener('click', () => nav_(-1));

    nav.appendChild(prevBtn);
    nav.appendChild(pageInfo);
    nav.appendChild(nextBtn);
    modal.appendChild(nav);

    const content = document.createElement('div');
    content.className = 'cl-modal-content';
    modal.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'cl-modal-actions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cl-modal-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', close);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // ── Icon builder ──
    function chevronSvg(direction) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');

      const points = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      points.setAttribute('points', direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6');
      svg.appendChild(points);
      return svg;
    }

    // ── Rendering ──
    function render() {
      const total = list.length;
      const entry = list[page];

      pageInfo.textContent = total ? `${page + 1} / ${total}` : '0 / 0';
      prevBtn.disabled = page >= total - 1;
      nextBtn.disabled = page <= 0;

      content.innerHTML = '';
      if (!entry) return;

      const versionBlock = document.createElement('div');
      versionBlock.className = 'cl-version';

      const header = document.createElement('div');
      header.className = 'cl-version-header';

      const versionText = document.createElement('span');
      versionText.className = 'cl-version-text';
      versionText.textContent = `${entry.version || ''} — ${entry.date || ''}`;
      header.appendChild(versionText);

      const tagText = entry.tag || (page === 0 ? 'Latest' : '');
      if (tagText) {
        const tag = document.createElement('span');
        tag.className = `cl-version-tag${tagText === 'Latest' ? '' : ' old'}`;
        tag.textContent = tagText;
        header.appendChild(tag);
      }

      versionBlock.appendChild(header);

      const itemsList = document.createElement('ul');
      itemsList.className = 'cl-items';
      (entry.items || []).forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        itemsList.appendChild(li);
      });
      versionBlock.appendChild(itemsList);

      content.appendChild(versionBlock);
    }

    // ── Navigation ──
    function goTo(index) {
      if (!list.length) return;
      page = Math.max(0, Math.min(list.length - 1, index));
      render();
    }

    function nav_(delta) {
      goTo(page + delta);
    }

    function open() {
      goTo(0);
      overlay.classList.add('open');
    }

    function close() {
      overlay.classList.remove('open');
    }

    return {
      el: overlay,
      open,
      close,
      goTo,
      nav: nav_,
    };
  }

  global.createChangelogModal = createChangelogModal;
})(window);
