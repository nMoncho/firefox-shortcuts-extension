/**
 * @typedef {object} StorageAdapter
 * @property {(key: string) => Promise<object>} storageGet
 * @property {(data: object) => Promise<void>} storageSet
 * @property {(path: string) => string} getUrl
 * @property {(url: string) => Promise<Response>} fetch
 */

/**
 * Production adapter that delegates to the real browser extension APIs.
 * @type {StorageAdapter}
 */
export const browserAdapter = {
  storageGet: key  => browser.storage.local.get(key),
  storageSet: data => browser.storage.local.set(data),
  getUrl:     path => browser.runtime.getURL(path),
  fetch:      url  => fetch(url),
};

/**
 * Reads shortcuts from storage. Falls back to shortcuts.json on first run
 * and seeds storage so subsequent reads come from storage.
 * @param {StorageAdapter} adapter
 * @returns {Promise<object[]>}
 */
export async function loadShortcuts(adapter = browserAdapter) {
  const result = await adapter.storageGet('shortcuts');
  if (result.shortcuts) return result.shortcuts;

  const res = await adapter.fetch(adapter.getUrl('shortcuts.json'));
  const defaults = await res.json();

  await adapter.storageSet({ shortcuts: defaults });
  return defaults;
}
