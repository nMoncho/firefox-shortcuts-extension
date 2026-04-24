# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build         # bundle source → dist/, copy static assets
npm run build:watch   # same, but rebuilds JS automatically on save
npm test              # run unit tests (vitest)
npm run test:watch    # re-run tests on file save
```

## Loading the extension in Firefox

The extension must be built before loading. Firefox loads from `dist/`, not the project root.

1. Run `npm run build`
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `dist/manifest.json`
4. After editing source files, run `npm run build` again and click **Reload** on the extension card

`npm run build:watch` rebuilds JS automatically on save, but static asset changes (`manifest.json`, HTML, icons, `shortcuts.json`) still require a manual `npm run build`.

## Architecture

**Build pipeline (`build.js`):**  
esbuild bundles `content.js`, `popup.js`, and `options.js` into `dist/`. All imports are inlined; the `browser` global is left untouched (it is provided by Firefox at runtime). Static assets (`manifest.json`, `shortcuts.json`, HTML files, `icons/`) are copied to `dist/` verbatim on every build.

**Shared modules:**
- `utils.js` — pure functions with no browser API calls: `matchesUrl`, `matchesKeyEvent`, `keyLabel`, `escHtml`, `escAttr`. Imported by the entry points and directly by the test suite.
- `storage.js` — exports `loadShortcuts()`, which reads from `browser.storage.local` and falls back to `shortcuts.json` on first run (seeding storage so subsequent reads come from storage).

**Entry points:**
- `content.js` — injected into every page. Loads shortcuts, filters by URL, registers a capturing `keydown` listener. On `Meta` key alone, renders an overlay with badges positioned over each shortcut's target element; shortcuts without a visible target appear in a legend panel (bottom-right). Fires `runAction()` on a matching key combo.
- `popup.js` — toolbar popup. Queries the active tab URL, filters shortcuts by URL, renders the active list. "Manage shortcuts" opens the options page via `browser.runtime.openOptionsPage()`.
- `options.js` — full settings page. Renders shortcut cards as editable forms. Syncs in-memory state from the DOM before any add/remove re-render so unsaved edits are preserved. Export buttons (Download JSON, View JSON) call `collectAll()` against the current form state, not storage.

**Data flow:**  
`shortcuts.json` seeds `browser.storage.local` on first run. All subsequent reads (content script, popup, options page) come from storage. The options page writes back to storage on Save.

**URL pattern matching** (`matchesUrl` in `utils.js`) converts WebExtension glob patterns to regex: escapes special chars, then replaces `*` → `.*` and `?` → `.`. Returns `true` for missing patterns or `"<all_urls>"`.

**Key matching** (`matchesKeyEvent` in `utils.js`) compares `event.key` case-insensitively and checks all four modifier flags exactly — a modifier absent from `shortcut.modifiers` must also be absent from the event.

**Shortcuts are suppressed** when the focused element is `input`, `textarea`, `select`, or `contenteditable`.

**`meta` modifier** maps to `⌘` on macOS, the Windows key on Windows, and Super on Linux. It is effectively macOS-only in browser context since the OS captures it on other platforms.

## Unit tests

Tests live in `utils.test.js` and cover all five functions in `utils.js`. Only pure functions are unit-tested; browser-API-dependent code (`loadShortcuts`, DOM manipulation) is not.

## shortcuts.json schema

```json
{
  "id": "string (unique)",
  "description": "shown in popup and overlay",
  "url_pattern": "*://hostname/*",
  "key": "key value as per KeyboardEvent.key",
  "modifiers": ["ctrl", "alt", "shift", "meta"],
  "action": { "type": "click|focus|dispatch|navigate", ...fields }
}
```

Action fields by type:
- `click` / `focus` → `selector` (CSS selector)
- `dispatch` → `selector`, `event` (event name), `detail` (object); if `selector` is omitted the event fires on `document`
- `navigate` → `url`
