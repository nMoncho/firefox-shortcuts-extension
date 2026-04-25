# Page Shortcuts

A Firefox extension that injects configurable keyboard shortcuts into any webpage. Define shortcuts in a JSON file or through the built-in settings UI, and trigger clicks, focus events, custom DOM events, or navigations without touching the mouse.

## Features

- **Per-site shortcuts** — each shortcut targets a specific URL pattern, so keys only fire on the pages you intend
- **Four action types** — `click`, `focus`, `dispatch` (custom DOM events), `navigate`
- **Settings UI** — add, edit, and remove shortcuts through an options page without touching JSON
- **Export** — download your shortcuts as `shortcuts.json` or copy the raw JSON from the settings page
- **Shortcut overlay** — hold `⌘` (Meta) on any page to see badges over every shortcut target element

## Installation

> The extension must be built before loading. Node.js 18+ is required.

```bash
npm install
npm run build
```

Then in Firefox:

1. Go to `about:debugging` → **This Firefox** → **Load Temporary Add-on**
2. Select `dist/manifest.json`

For permanent installation, submit the output of `npm run package` to [addons.mozilla.org](https://addons.mozilla.org).

## Development

```bash
npm run build         # one-off build
npm run build:watch   # rebuild JS automatically on save
npm run start         # launch Firefox with the extension pre-loaded
npm run lint          # validate manifest and check for API issues (web-ext)
npm run package       # create a distributable .zip in web-ext-artifacts/
npm test              # run unit tests
npm run test:watch    # re-run tests on file save
```

After any source change, run `npm run build` and click **Reload** on the extension card in `about:debugging`. `build:watch` handles JS changes automatically but still requires a manual reload of the extension in the browser.

## Defining shortcuts

Shortcuts are configured through the **Manage shortcuts** settings page (click the toolbar button → *Manage shortcuts…*), or by editing `shortcuts.json` directly and running `npm run build`.

### Schema

```json
{
  "id": "unique-id",
  "description": "Label shown in the popup and overlay",
  "url_pattern": "*://example.com/*",
  "key": "k",
  "modifiers": ["ctrl"],
  "action": { "type": "click", "selector": "#my-button" }
}
```

| Field | Description |
|---|---|
| `id` | Unique string identifier |
| `description` | Human-readable label shown in the toolbar popup and ⌘ overlay |
| `url_pattern` | [WebExtension match pattern](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns) — use `"<all_urls>"` to match everywhere |
| `key` | Key value as per [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values) |
| `modifiers` | Any combination of `"ctrl"`, `"alt"`, `"shift"`, `"meta"` |

### Action types

| Type | Required fields | Effect |
|---|---|---|
| `click` | `selector` | Clicks the first matching element |
| `focus` | `selector` | Focuses the first matching element |
| `dispatch` | `selector`, `event`, `detail` | Fires a `CustomEvent` on the element (`document` if `selector` is omitted) |
| `navigate` | `url` | Changes `window.location.href` |

### Modifiers on macOS

`"meta"` maps to `⌘` (Command). On Windows and Linux it maps to the OS/Super key, which browsers rarely receive, so `"meta"` is effectively macOS-only. Use `"ctrl"` for cross-platform shortcuts.

### Example

```json
[
  {
    "id": "focus-search",
    "description": "Focus the search input",
    "url_pattern": "*://github.com/*",
    "key": "/",
    "modifiers": [],
    "action": {
      "type": "focus",
      "selector": "input[name=q], input[type=search]"
    }
  },
  {
    "id": "new-issue",
    "description": "Open new issue form",
    "url_pattern": "*://github.com/*/issues",
    "key": "n",
    "modifiers": [],
    "action": {
      "type": "click",
      "selector": "a[href$='/issues/new/choose']"
    }
  }
]
```

## Shortcut overlay

Hold `⌘` (Meta) alone on any page to reveal the overlay. Yellow badges appear over each shortcut's target element. Shortcuts whose target isn't visible on the current scroll position (or has no DOM element, e.g. `navigate` actions) appear in a panel in the bottom-right corner. Release `⌘` or press any other key to dismiss.

## Project structure

```
├── content.js        # Content script — key listener, overlay
├── popup.js          # Toolbar popup
├── options.js        # Settings page
├── utils.js          # Pure shared functions (also used by tests)
├── storage.js        # loadShortcuts() — storage read with shortcuts.json fallback
├── build.js          # esbuild bundler + static asset copy
├── shortcuts.json    # Default shortcuts (seeds storage on first run)
├── utils.test.js     # Unit tests (vitest)
└── dist/             # Built extension — load this folder in Firefox
```
