import { describe, it, expect, vi } from 'vitest';
import { loadShortcuts } from './storage.js';

const FAKE_URL = 'extension://fake-id/shortcuts.json';

const sampleShortcuts = [
  { id: 'focus-search', key: '/', modifiers: [], url_pattern: '*://github.com/*', action: { type: 'focus', selector: 'input[name=q]' } },
];

/**
 * Builds a mock StorageAdapter.
 * @param {{ stored?: object[]|null, defaults?: object[] }} options
 *   stored   — value returned by storageGet (null simulates empty storage)
 *   defaults — array returned by fetching shortcuts.json
 */
function makeAdapter({ stored = null, defaults = sampleShortcuts } = {}) {
  return {
    storageGet: vi.fn().mockResolvedValue(stored ? { shortcuts: stored } : {}),
    storageSet: vi.fn().mockResolvedValue(undefined),
    getUrl:     vi.fn().mockReturnValue(FAKE_URL),
    fetch:      vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue(defaults) }),
  };
}

// ---------------------------------------------------------------------------

describe('loadShortcuts', () => {
  it('returns shortcuts directly from storage when they exist', async () => {
    const adapter = makeAdapter({ stored: sampleShortcuts });

    const result = await loadShortcuts(adapter);

    expect(result).toBe(sampleShortcuts);
  });

  it('calls storageGet with the "shortcuts" key', async () => {
    const adapter = makeAdapter({ stored: sampleShortcuts });

    await loadShortcuts(adapter);

    expect(adapter.storageGet).toHaveBeenCalledWith('shortcuts');
  });

  it('does not fetch shortcuts.json when storage already has data', async () => {
    const adapter = makeAdapter({ stored: sampleShortcuts });

    await loadShortcuts(adapter);

    expect(adapter.fetch).not.toHaveBeenCalled();
  });

  it('does not write to storage when shortcuts already exist', async () => {
    const adapter = makeAdapter({ stored: sampleShortcuts });

    await loadShortcuts(adapter);

    expect(adapter.storageSet).not.toHaveBeenCalled();
  });

  it('falls back to shortcuts.json when storage is empty', async () => {
    const adapter = makeAdapter();

    const result = await loadShortcuts(adapter);

    expect(result).toEqual(sampleShortcuts);
  });

  it('resolves the shortcuts.json path via getUrl', async () => {
    const adapter = makeAdapter();

    await loadShortcuts(adapter);

    expect(adapter.getUrl).toHaveBeenCalledWith('shortcuts.json');
    expect(adapter.fetch).toHaveBeenCalledWith(FAKE_URL);
  });

  it('seeds storage with the fetched defaults on first run', async () => {
    const adapter = makeAdapter();

    await loadShortcuts(adapter);

    expect(adapter.storageSet).toHaveBeenCalledWith({ shortcuts: sampleShortcuts });
  });

  it('returns the fetched defaults after seeding storage', async () => {
    const defaults = [{ id: 'new-shortcut' }];
    const adapter = makeAdapter({ defaults });

    const result = await loadShortcuts(adapter);

    expect(result).toEqual(defaults);
  });
});
