import { matchesUrl, escHtml } from './utils.js';
import { loadShortcuts } from './storage.js';

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
})();
