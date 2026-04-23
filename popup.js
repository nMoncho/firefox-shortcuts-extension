(async () => {
  const content = document.getElementById('content');

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab?.url ?? '';

  let shortcuts;
  try {
    shortcuts = await loadShortcuts();
  } catch {
    content.innerHTML = '<div class="empty">Failed to load shortcuts.</div>';
    return;
  }

  const active = shortcuts.filter(s => matchesUrl(s.url_pattern, pageUrl));

  if (active.length === 0) {
    content.innerHTML = '<div class="empty">No shortcuts defined for this page.</div>';
  } else {
    const urlNote = document.createElement('div');
    urlNote.className = 'url-note';
    urlNote.textContent = new URL(pageUrl).hostname;
    content.innerHTML = '';
    content.appendChild(urlNote);

    for (const s of active) {
      const parts = [...(s.modifiers ?? []), s.key];
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      row.innerHTML = `
        <span class="keys">${parts.map(k => `<kbd>${k.toUpperCase()}</kbd>`).join('')}</span>
        <span class="desc">${escHtml(s.description ?? s.id ?? s.action?.type ?? '')}</span>
      `;
      content.appendChild(row);
    }
  }

  document.getElementById('manage-btn').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  /**
   * Reads shortcuts from storage. Falls back to shortcuts.json on first run
   * and seeds storage so subsequent reads come from storage.
   * @returns {Promise<object[]>}
   */
  async function loadShortcuts() {
    const result = await browser.storage.local.get('shortcuts');
    if (result.shortcuts) return result.shortcuts;
    const res = await fetch(browser.runtime.getURL('shortcuts.json'));
    const defaults = await res.json();
    await browser.storage.local.set({ shortcuts: defaults });
    return defaults;
  }

  /**
   * Tests whether a URL matches a WebExtension match pattern (glob-style).
   * @param {string} pattern - WebExtension match pattern, e.g. `"*://github.com/*"`.
   * @param {string} url - The full URL to test against.
   * @returns {boolean}
   */
  function matchesUrl(pattern, url) {
    if (!pattern || pattern === '<all_urls>') return true;
    const reStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp('^' + reStr + '$').test(url);
  }

  /**
   * Escapes a string for safe insertion into HTML content.
   * @param {string} str
   * @returns {string}
   */
  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
