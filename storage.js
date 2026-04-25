/**
 * Reads shortcuts from storage. Falls back to shortcuts.json on first run
 * and seeds storage so subsequent reads come from storage.
 * @returns {Promise<object[]>}
 */
export async function loadShortcuts() {
  const result = await browser.storage.local.get('shortcuts');
  if (result.shortcuts) return result.shortcuts;

  // If no shortcuts are stored, then offer the default shortcuts
  const res = await fetch(browser.runtime.getURL('shortcuts.json'));
  const defaults = await res.json();

  await browser.storage.local.set({ shortcuts: defaults });
  return defaults;
}
