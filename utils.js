/**
 * Tests whether a URL matches a WebExtension match pattern (glob-style).
 * Converts `*` → `.*` and `?` → `.` after escaping all other regex metacharacters.
 * Returns true when pattern is omitted or `"<all_urls>"`.
 * @param {string} pattern - WebExtension match pattern, e.g. `"*://github.com/*"`.
 * @param {string} url - The full URL to test against.
 * @returns {boolean}
 */
export function matchesUrl(pattern, url) {
  if (!pattern || pattern === '<all_urls>') return true;
  const reStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + reStr + '$').test(url);
}

/**
 * Returns true when a KeyboardEvent matches a shortcut's key and all four modifier flags.
 * All modifiers absent from `shortcut.modifiers` must also be absent from the event.
 * @param {object} shortcut - A shortcut entry from shortcuts.json.
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function matchesKeyEvent(shortcut, event) {
  const mods = shortcut.modifiers || [];
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    event.ctrlKey  === mods.includes('ctrl')  &&
    event.altKey   === mods.includes('alt')   &&
    event.shiftKey === mods.includes('shift') &&
    event.metaKey  === mods.includes('meta')
  );
}

/**
 * Builds a human-readable key label for a shortcut using Unicode modifier symbols.
 * Single-character keys are uppercased; named keys (e.g. "Enter") are kept as-is.
 * @param {object} shortcut - A shortcut entry from shortcuts.json.
 * @returns {string} e.g. "⌘K", "⌃⇧D", "/"
 */
export function keyLabel(shortcut) {
  const SYMBOLS = { ctrl: '⌃', meta: '⌘', alt: '⌥', shift: '⇧' };
  const mods = (shortcut.modifiers ?? []).map(m => SYMBOLS[m] ?? m.toUpperCase());
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  return [...mods, key].join('');
}

/**
 * Escapes a string for safe insertion into HTML content.
 * @param {string} str
 * @returns {string}
 */
export function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Escapes a string for safe use as an HTML attribute value.
 * @param {string} str
 * @returns {string}
 */
export function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
