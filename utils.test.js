import { describe, it, expect } from 'vitest';
import { matchesUrl, matchesKeyEvent, keyLabel, escHtml, escAttr } from './utils.js';

// ---------------------------------------------------------------------------
// matchesUrl
// ---------------------------------------------------------------------------

describe('matchesUrl', () => {
  it('returns true for <all_urls>', () => {
    expect(matchesUrl('<all_urls>', 'https://example.com/page')).toBe(true);
  });

  it('returns true when pattern is undefined', () => {
    expect(matchesUrl(undefined, 'https://example.com')).toBe(true);
  });

  it('returns true when pattern is an empty string', () => {
    expect(matchesUrl('', 'https://example.com')).toBe(true);
  });

  it('matches a wildcard scheme and path', () => {
    expect(matchesUrl('*://github.com/*', 'https://github.com/foo/bar')).toBe(true);
    expect(matchesUrl('*://github.com/*', 'http://github.com/foo')).toBe(true);
  });

  it('matches an explicit scheme', () => {
    expect(matchesUrl('https://github.com/*', 'https://github.com/foo')).toBe(true);
  });

  it('rejects a mismatched scheme', () => {
    expect(matchesUrl('https://example.com/*', 'http://example.com/foo')).toBe(false);
  });

  it('rejects a mismatched domain', () => {
    expect(matchesUrl('*://github.com/*', 'https://gitlab.com/foo')).toBe(false);
  });

  it('matches a pattern with a wildcard path segment', () => {
    expect(matchesUrl('*://github.com/*/issues', 'https://github.com/myrepo/issues')).toBe(true);
    expect(matchesUrl('*://github.com/*/issues', 'https://github.com/myrepo/pulls')).toBe(false);
  });

  it('does not match a longer path when no trailing wildcard', () => {
    expect(matchesUrl('*://example.com/page', 'https://example.com/page/sub')).toBe(false);
  });

  it('treats dots in domains as literals', () => {
    expect(matchesUrl('*://example.com/*', 'https://exampleXcom/foo')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesKeyEvent
// ---------------------------------------------------------------------------

describe('matchesKeyEvent', () => {
  function event(key, overrides = {}) {
    return { key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...overrides };
  }

  it('matches a plain key with no modifiers', () => {
    expect(matchesKeyEvent({ key: 'n', modifiers: [] }, event('n'))).toBe(true);
  });

  it('is case-insensitive for the key value', () => {
    expect(matchesKeyEvent({ key: 'N', modifiers: [] }, event('n'))).toBe(true);
    expect(matchesKeyEvent({ key: 'n', modifiers: [] }, event('N'))).toBe(true);
  });

  it('returns false for a wrong key', () => {
    expect(matchesKeyEvent({ key: 'n', modifiers: [] }, event('m'))).toBe(false);
  });

  it('returns false when a required modifier is missing', () => {
    expect(matchesKeyEvent({ key: 'k', modifiers: ['ctrl'] }, event('k'))).toBe(false);
  });

  it('returns true when a required modifier is present', () => {
    expect(matchesKeyEvent({ key: 'k', modifiers: ['ctrl'] }, event('k', { ctrlKey: true }))).toBe(true);
  });

  it('returns false when an unrequired modifier is held', () => {
    expect(matchesKeyEvent({ key: 'k', modifiers: [] }, event('k', { ctrlKey: true }))).toBe(false);
  });

  it('requires all listed modifiers simultaneously', () => {
    const shortcut = { key: 'd', modifiers: ['ctrl', 'shift'] };
    expect(matchesKeyEvent(shortcut, event('d', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchesKeyEvent(shortcut, event('d', { ctrlKey: true }))).toBe(false);
    expect(matchesKeyEvent(shortcut, event('d', { shiftKey: true }))).toBe(false);
  });

  it('handles the meta modifier', () => {
    expect(matchesKeyEvent({ key: 's', modifiers: ['meta'] }, event('s', { metaKey: true }))).toBe(true);
    expect(matchesKeyEvent({ key: 's', modifiers: ['meta'] }, event('s'))).toBe(false);
  });

  it('matches named keys such as Enter and F2', () => {
    expect(matchesKeyEvent({ key: 'Enter', modifiers: [] }, event('Enter'))).toBe(true);
    expect(matchesKeyEvent({ key: 'F2', modifiers: [] }, event('F2'))).toBe(true);
  });

  it('handles a missing modifiers array', () => {
    expect(matchesKeyEvent({ key: 'x', modifiers: undefined }, event('x'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// keyLabel
// ---------------------------------------------------------------------------

describe('keyLabel', () => {
  it('uppercases single-character keys', () => {
    expect(keyLabel({ key: 'n', modifiers: [] })).toBe('N');
  });

  it('preserves named keys as-is', () => {
    expect(keyLabel({ key: 'Enter', modifiers: [] })).toBe('Enter');
    expect(keyLabel({ key: 'F2', modifiers: [] })).toBe('F2');
  });

  it('preserves punctuation keys unchanged', () => {
    expect(keyLabel({ key: '/', modifiers: [] })).toBe('/');
  });

  it('renders ctrl as ⌃', () => {
    expect(keyLabel({ key: 'k', modifiers: ['ctrl'] })).toBe('⌃K');
  });

  it('renders meta as ⌘', () => {
    expect(keyLabel({ key: 'k', modifiers: ['meta'] })).toBe('⌘K');
  });

  it('renders alt as ⌥', () => {
    expect(keyLabel({ key: 'k', modifiers: ['alt'] })).toBe('⌥K');
  });

  it('renders shift as ⇧', () => {
    expect(keyLabel({ key: 'k', modifiers: ['shift'] })).toBe('⇧K');
  });

  it('renders multiple modifiers in declaration order', () => {
    expect(keyLabel({ key: 'd', modifiers: ['ctrl', 'shift'] })).toBe('⌃⇧D');
    expect(keyLabel({ key: 's', modifiers: ['meta', 'shift'] })).toBe('⌘⇧S');
  });

  it('handles a missing modifiers array', () => {
    expect(keyLabel({ key: 'x', modifiers: undefined })).toBe('X');
  });
});

// ---------------------------------------------------------------------------
// escHtml
// ---------------------------------------------------------------------------

describe('escHtml', () => {
  it('escapes ampersands', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes < and >', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes all three characters in one string', () => {
    expect(escHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
  });

  it('leaves plain strings unchanged', () => {
    expect(escHtml('hello world')).toBe('hello world');
  });

  it('handles an empty string', () => {
    expect(escHtml('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// escAttr
// ---------------------------------------------------------------------------

describe('escAttr', () => {
  it('escapes double quotes', () => {
    expect(escAttr('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes < and >', () => {
    expect(escAttr('<value>')).toBe('&lt;value&gt;');
  });

  it('coerces numbers to string before escaping', () => {
    expect(escAttr(42)).toBe('42');
  });

  it('coerces null to string', () => {
    expect(escAttr(null)).toBe('null');
  });

  it('handles an empty string', () => {
    expect(escAttr('')).toBe('');
  });
});
