import { escAttr } from './utils.js';
import { loadShortcuts } from './storage.js';

const list = document.getElementById('shortcuts-list');
const empty = document.getElementById('empty');
const status = document.getElementById('status');

document.getElementById('add-btn').addEventListener('click', () => {
  syncFromDOM();
  shortcuts.push(emptyShortcut());
  renderList();
});

document.getElementById('download-btn').addEventListener('click', downloadJson);
document.getElementById('view-json-btn').addEventListener('click', toggleJsonView);

document.getElementById('save-btn').addEventListener('click', async () => {
  const data = collectAll();
  try {
    await browser.storage.local.set({ shortcuts: data });
    showStatus('Saved.', false);
  } catch (err) {
    showStatus('Failed to save: ' + err.message, true);
  }
});

let shortcuts = [];
let jsonPanelEl = null;

/** Loads shortcuts from storage and performs the initial render. */
async function init() {
  shortcuts = await loadShortcuts();
  renderList();
}

/** Re-renders the full list of shortcut cards from the `shortcuts` array. */
function renderList() {
  list.innerHTML = '';
  empty.style.display = shortcuts.length === 0 ? 'block' : 'none';
  shortcuts.forEach(s => list.appendChild(buildCard(s)));
}

/**
 * Builds a form card DOM element for a single shortcut.
 * Wires up the Remove button and the action-type change listener.
 * @param {object} s - A shortcut entry from storage.
 * @returns {HTMLDivElement}
 */
function buildCard(s) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = s.id;

  const header = document.createElement('div');
  header.className = 'card-header';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '✕ Remove';
  removeBtn.addEventListener('click', () => {
    syncFromDOM();
    shortcuts = shortcuts.filter(x => x.id !== s.id);
    renderList();
  });
  header.appendChild(removeBtn);
  card.appendChild(header);

  card.appendChild(textRow('Description', 'description', s.description ?? ''));
  card.appendChild(textRow('URL Pattern', 'url_pattern', s.url_pattern ?? ''));
  card.appendChild(textRow('Key', 'key', s.key ?? ''));
  card.appendChild(modifiersRow(s.modifiers ?? []));
  card.appendChild(actionTypeRow(s.action?.type ?? 'click'));

  const actionFields = document.createElement('div');
  actionFields.className = 'action-fields';
  buildActionFields(actionFields, s.action?.type ?? 'click', s.action);
  card.appendChild(actionFields);

  card.querySelector('[data-field="action-type"]').addEventListener('change', e => {
    buildActionFields(actionFields, e.target.value, null);
  });

  return card;
}

/**
 * Creates a label + text input field row.
 * @param {string} labelText - Human-readable label shown to the left.
 * @param {string} fieldName - Value for the `data-field` attribute used by `collectAll`.
 * @param {string} value - Initial value for the input.
 * @returns {HTMLDivElement}
 */
function textRow(labelText, fieldName, value) {
  const row = document.createElement('div');
  row.className = 'field-row';
  row.innerHTML = `
    <label>${labelText}</label>
    <input type="text" data-field="${fieldName}" value="${escAttr(value)}">
  `;
  return row;
}

/**
 * Creates a label + checkbox group row for the four modifier keys.
 * @param {string[]} active - Modifiers that should be pre-checked (e.g. `["ctrl", "shift"]`).
 * @returns {HTMLDivElement}
 */
function modifiersRow(active) {
  const row = document.createElement('div');
  row.className = 'field-row';
  const label = document.createElement('label');
  label.textContent = 'Modifiers';

  const group = document.createElement('div');
  group.className = 'checkboxes';

  for (const mod of ['ctrl', 'alt', 'shift', 'meta']) {
    const lbl = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.mod = mod;
    cb.checked = active.includes(mod);
    lbl.appendChild(cb);
    lbl.append(mod);
    group.appendChild(lbl);
  }

  row.appendChild(label);
  row.appendChild(group);
  return row;
}

/**
 * Creates a label + dropdown row for selecting the action type.
 * @param {string} selected - The action type that should be pre-selected.
 * @returns {HTMLDivElement}
 */
function actionTypeRow(selected) {
  const row = document.createElement('div');
  row.className = 'field-row';
  row.innerHTML = `
    <label>Action</label>
    <select data-field="action-type">
      ${['click', 'focus', 'dispatch', 'navigate'].map(t =>
        `<option value="${t}"${t === selected ? ' selected' : ''}>${t}</option>`
      ).join('')}
    </select>
  `;
  return row;
}

/**
 * Populates `container` with the input fields specific to the given action type.
 * Clears any previously rendered fields first. Called on initial render and on
 * action-type dropdown change (in which case `action` is null).
 * @param {HTMLDivElement} container - The element to populate.
 * @param {string} type - Action type: `"click"`, `"focus"`, `"dispatch"`, or `"navigate"`.
 * @param {object|null} action - Existing action object to pre-fill values, or null for a new shortcut.
 */
function buildActionFields(container, type, action) {
  container.innerHTML = '';
  if (type === 'click' || type === 'focus') {
    container.appendChild(textRow('Selector', 'selector', action?.selector ?? ''));
  } else if (type === 'dispatch') {
    container.appendChild(textRow('Selector', 'selector', action?.selector ?? ''));
    container.appendChild(textRow('Event name', 'event', action?.event ?? ''));
    const detail = action?.detail ? JSON.stringify(action.detail) : '{}';
    container.appendChild(textRow('Detail (JSON)', 'detail', detail));
  } else if (type === 'navigate') {
    container.appendChild(textRow('URL', 'url', action?.url ?? ''));
  }
}

/**
 * Reads all shortcut cards from the DOM and returns them as a structured array.
 * Used both for saving and for syncing in-memory state before add/remove operations.
 * @returns {object[]}
 */
function collectAll() {
  return Array.from(list.querySelectorAll('.card')).map(card => {
    const val = f => card.querySelector(`[data-field="${f}"]`)?.value.trim() ?? '';
    const checked = m => card.querySelector(`[data-mod="${m}"]`)?.checked ?? false;
    const type = val('action-type');

    const action = { type };
    if (type === 'click' || type === 'focus') {
      action.selector = val('selector');
    } else if (type === 'dispatch') {
      action.selector = val('selector');
      action.event = val('event');
      try { action.detail = JSON.parse(val('detail') || '{}'); }
      catch { action.detail = {}; }
    } else if (type === 'navigate') {
      action.url = val('url');
    }

    return {
      id: card.dataset.id,
      description: val('description'),
      url_pattern: val('url_pattern'),
      key: val('key'),
      modifiers: ['ctrl', 'alt', 'shift', 'meta'].filter(checked),
      action,
    };
  });
}

/**
 * Syncs the in-memory `shortcuts` array from the current DOM state.
 * Must be called before any operation that triggers a re-render (add, remove)
 * so that unsaved edits in existing cards are not lost.
 */
function syncFromDOM() {
  shortcuts = collectAll();
}

/**
 * Returns a blank shortcut object with a fresh UUID, used when the user adds a new entry.
 * @returns {object}
 */
function emptyShortcut() {
  return {
    id: crypto.randomUUID(),
    description: '',
    url_pattern: '*://*/*',
    key: '',
    modifiers: [],
    action: { type: 'click', selector: '' },
  };
}

/**
 * Serializes the current form state to JSON and triggers a browser file download.
 * Reflects unsaved edits, not the last saved state in storage.
 */
function downloadJson() {
  const json = JSON.stringify(collectAll(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shortcuts.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Toggles an inline panel with an editable textarea showing the current form state as JSON.
 * Copy reflects the current textarea content (including any edits).
 * Apply parses the textarea content and rebuilds the shortcut cards.
 * Reflects unsaved edits, not the last saved state in storage.
 */
function toggleJsonView() {
  const btn = document.getElementById('view-json-btn');

  if (jsonPanelEl) {
    jsonPanelEl.remove();
    jsonPanelEl = null;
    btn.textContent = '{ } View JSON';
    return;
  }

  jsonPanelEl = document.createElement('div');
  jsonPanelEl.id = 'json-panel';

  const header = document.createElement('div');
  header.className = 'json-panel-header';

  const filename = document.createElement('span');
  filename.textContent = 'shortcuts.json';

  const actions = document.createElement('div');
  actions.className = 'json-panel-actions';

  const textarea = document.createElement('textarea');
  textarea.value = JSON.stringify(collectAll(), null, 2);
  textarea.spellcheck = false;

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(textarea.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', () => applyJsonEdit(textarea));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.addEventListener('click', toggleJsonView);

  actions.append(copyBtn, applyBtn, closeBtn);
  header.append(filename, actions);

  jsonPanelEl.append(header, textarea);
  status.after(jsonPanelEl);

  btn.textContent = '✕ Hide JSON';
}

/**
 * Parses the JSON from the edit textarea, validates it is an array,
 * then replaces the shortcut cards with the parsed content.
 * Errors are surfaced via the status bar without closing the panel.
 * @param {HTMLTextAreaElement} textarea
 */
function applyJsonEdit(textarea) {
  let parsed;
  try {
    parsed = JSON.parse(textarea.value);
  } catch (err) {
    showStatus(`Invalid JSON — ${err.message}`, true);
    return;
  }
  if (!Array.isArray(parsed)) {
    showStatus('JSON must be an array of shortcut objects.', true);
    return;
  }
  shortcuts = parsed;
  renderList();
  showStatus('Applied — click Save to persist.', false);
}

/**
 * Displays a status message below the page header and clears it after 3 seconds.
 * @param {string} msg - The message to display.
 * @param {boolean} isError - When true, applies the error style.
 */
function showStatus(msg, isError) {
  status.textContent = msg;
  status.className = isError ? 'error' : '';
  setTimeout(() => { status.textContent = ''; }, 3000);
}

init();
