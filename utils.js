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
 * @typedef {{ ctrl: string, meta: string, alt: string, shift: string, sep: string }} ModifierSymbols
 */

/**
 * Returns a platform-appropriate modifier symbols map.
 * On macOS, Unicode glyphs are used and joined without a separator (e.g. "⌘K").
 * On all other platforms, text labels are used joined with "+" (e.g. "Ctrl+K").
 * @param {string} os - OS identifier from `browser.runtime.getPlatformInfo()` e.g. "mac", "win", "linux".
 * @returns {ModifierSymbols}
 */
export function buildSymbols(os) {
  if (os === 'mac') {
    return { ctrl: '⌃', meta: '⌘', alt: '⌥', shift: '⇧', sep: '' };
  } else if (os === 'win') {
    return { ctrl: 'Ctrl', meta: '⊞ Win', alt: 'Alt', shift: 'Shift', sep: '+' };
  }

  return { ctrl: 'Ctrl', meta: 'Meta', alt: 'Alt', shift: 'Shift', sep: '+' };
}

/**
 * Builds a human-readable key label for a shortcut using the provided modifier symbols.
 * Single-character keys are uppercased; named keys (e.g. "Enter") are kept as-is.
 * @param {object} shortcut - A shortcut entry from shortcuts.json.
 * @param {ModifierSymbols} symbols - Platform-specific symbols from `buildSymbols()`.
 * @returns {string} e.g. "⌘K" on macOS, "Ctrl+K" on Windows/Linux.
 */
export function keyLabel(shortcut, symbols) {
  const mods = (shortcut.modifiers ?? []).map(m => symbols[m] ?? m.toUpperCase());
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;

  return [...mods, key].join(symbols.sep);
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
