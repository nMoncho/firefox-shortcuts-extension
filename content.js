import { matchesUrl, matchesKeyEvent, keyLabel } from './utils.js';
import { loadShortcuts } from './storage.js';

(async () => {
  let shortcuts;

  console.log('Initializing shortcuts js');

  try {
    shortcuts = await loadShortcuts();
  } catch (err) {
    console.error('[Page Shortcuts] Failed to load shortcuts:', err);
    return;
  }

  // Search shortcuts for this page, and return if non were defined
  const active = shortcuts.filter(s => matchesUrl(s.url_pattern, location.href));

  if (active.length === 0) return;

  let overlayEl = null;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Meta' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      showOverlay();
      return;
    }

    // Any other key while overlay is up means it's a combo, not a solo Meta press
    if (overlayEl) hideOverlay();

    if (isEditableTarget(event.target)) return;

    for (const shortcut of active) {
      if (matchesKeyEvent(shortcut, event)) {
        event.preventDefault();
        event.stopPropagation();
        runAction(shortcut.action);
        return;
      }
    }
  }, true);

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Meta') hideOverlay();
  }, true);

  /**
   * Renders the shortcut overlay on the page.
   * Badges are positioned over each shortcut's target element when visible;
   * shortcuts without a resolvable element fall back to the legend panel.
   */
  function showOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    Object.assign(overlayEl.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });

    const unplacedShortcuts = [];

    for (const shortcut of active) {
      const selector = shortcut.action?.selector;
      const el = selector ? document.querySelector(selector) : null;

      if (el) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 || rect.height > 0;

        if (isVisible) {
          const badge = makeBadge(keyLabel(shortcut));
          Object.assign(badge.style, {
            position: 'fixed',
            left: `${Math.round(rect.left + rect.width / 2)}px`,
            top: `${Math.round(rect.top + rect.height / 2)}px`,
            transform: 'translate(-50%, -50%)',
          });
          overlayEl.appendChild(badge);
          continue;
        }
      }

      unplacedShortcuts.push(shortcut);
    }

    if (unplacedShortcuts.length > 0) {
      overlayEl.appendChild(makeLegendPanel(unplacedShortcuts));
    }

    document.documentElement.appendChild(overlayEl);
  }

  /** Removes the overlay from the DOM and resets the reference. */
  function hideOverlay() {
    overlayEl?.remove();
    overlayEl = null;
  }

  /**
   * Creates a styled badge element displaying the given key label.
   * The caller is responsible for setting `position` and coordinates on the returned element.
   * @param {string} label - The key label to display (e.g. "⌘K").
   * @returns {HTMLDivElement}
   */
  function makeBadge(label) {
    const el = document.createElement('div');

    Object.assign(el.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px 7px',
      background: '#f5c542',
      color: '#1a1a1a',
      borderRadius: '5px',
      fontSize: '12px',
      fontWeight: '700',
      fontFamily: 'ui-monospace, monospace',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
      whiteSpace: 'nowrap',
      lineHeight: '1.5',
      letterSpacing: '0.03em',
    });
    el.textContent = label;

    return el;
  }

  /**
   * Creates a fixed legend panel (bottom-right) listing shortcuts that couldn't be
   * anchored to a visible element — e.g. navigate actions or off-screen targets.
   * @param {object[]} list - Subset of active shortcuts to display.
   * @returns {HTMLDivElement}
   */
  function makeLegendPanel(list) {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      background: 'rgba(30, 30, 46, 0.96)',
      color: '#cdd6f4',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '7px',
      maxWidth: '320px',
    });

    for (const s of list) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      });

      const badge = makeBadge(keyLabel(s));
      const desc = document.createElement('span');
      desc.textContent = s.description ?? s.id ?? '';
      Object.assign(desc.style, { color: '#bac2de', fontSize: '12px' });

      row.appendChild(badge);
      row.appendChild(desc);
      panel.appendChild(row);
    }

    return panel;
  }

  /**
   * Returns true when the element should suppress shortcut handling —
   * i.e. the user is actively typing into an input, textarea, select, or contenteditable.
   * @param {Element|null} el
   * @returns {boolean}
   */
  function isEditableTarget(el) {
    const tag = el?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable;
  }

  /**
   * Executes a shortcut action against the live DOM.
   * Supported types: `"click"`, `"focus"`, `"dispatch"`, `"navigate"`.
   * Unknown types are logged as warnings and ignored.
   * @param {{ type: string, selector?: string, event?: string, detail?: object, url?: string }} action
   */
  function runAction(action) {
    switch (action.type) {
      case 'click': {
        const el = document.querySelector(action.selector);
        el?.click();
        break;
      }

      case 'focus': {
        const el = document.querySelector(action.selector);
        el?.focus();
        break;
      }

      case 'dispatch': {
        const target = action.selector
          ? document.querySelector(action.selector)
          : document;
        target?.dispatchEvent(new CustomEvent(action.event, {
          bubbles: true,
          cancelable: true,
          detail: action.detail ?? {}
        }));
        break;
      }

      case 'navigate': {
        window.location.href = action.url;
        break;
      }

      default:
        console.warn('[Page Shortcuts] Unknown action type:', action.type);
    }
  }
})();
