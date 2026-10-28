import { MemoryStorageAdapter, STORAGE_KEYS } from './StorageAdapter';
import { scopedStorage } from './scopedStorage';
import { adoptLegacyData, detectLegacyData, discardLegacyData } from './legacyMigration';

/** A browser as a pre-profiles build left it: practice data under the unscoped keys. */
function legacyBrowser(): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  storage.set(STORAGE_KEYS.history, [{ id: 'evt_1' }, { id: 'evt_2' }, { id: 'evt_3' }]);
  storage.set(STORAGE_KEYS.historySeeded, { seededAt: '2026-09-01T09:00:00.000Z', count: 3 });
  storage.set(STORAGE_KEYS.calibration, { id: 'cal_1', status: 'in_progress' });
  storage.set(STORAGE_KEYS.training, { version: 1, lessons: { squeeze_to_activate: { status: 'complete' } } });
  storage.set(STORAGE_KEYS.commandMapping, { version: 1, shortcuts: { quick_action_1: 'announce_time' } });
  return storage;
}

describe('detectLegacyData', () => {
  it('reports nothing for a browser that never ran a pre-profiles build', () => {
    expect(detectLegacyData(new MemoryStorageAdapter())).toEqual({ hasData: false, keys: [], summary: [] });
  });

  it('reports nothing when the only data belongs to profiles', () => {
    const root = new MemoryStorageAdapter();
    scopedStorage(root, 'user_a').set(STORAGE_KEYS.history, [{ id: 'evt_1' }]);
    root.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    root.set(STORAGE_KEYS.device, { version: 1, mode: 'demo' });
    expect(detectLegacyData(root).hasData).toBe(false);
  });

  it('names every kind of data found, in plain sentences', () => {
    const report = detectLegacyData(legacyBrowser());
    expect(report.hasData).toBe(true);
    expect(report.keys).toEqual(['history', 'calibration', 'training', 'commands', 'history.seeded']);
    expect(report.summary).toEqual([
      '3 activity records',
      'One calibration record',
      '1 lesson with progress',
      'What Shortcut 1 and Shortcut 2 are set to',
    ]);
  });

  it('counts one record without pluralising, and says when a value could not be read', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.history, [{ id: 'evt_1' }]);
    storage.set(STORAGE_KEYS.training, { version: 1, lessons: {} });
    vi.spyOn(storage, 'get').mockImplementation((key: string) => (key === STORAGE_KEYS.training ? null : [{ id: 'evt_1' }]));
    expect(detectLegacyData(storage).summary).toEqual(['1 activity record', 'A record that could not be read']);
  });

  it('reads the unscoped keys through a profile’s own view too', () => {
    const root = legacyBrowser();
    expect(detectLegacyData(scopedStorage(root, 'user_a')).hasData).toBe(true);
  });

  it('does not ask about the samples flag on its own', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.historySeeded, { seededAt: '2026-09-01T09:00:00.000Z', count: 3 });
    const report = detectLegacyData(storage);
    expect(report.hasData).toBe(false);
    expect(report.keys).toEqual(['history.seeded']);
    expect(report.summary).toEqual([]);
  });
});

describe('adoptLegacyData', () => {
  it('moves the data into the profile and leaves nothing unscoped', () => {
    const root = legacyBrowser();
    const result = adoptLegacyData(root, 'user_a');

    expect(result).toEqual({
      adopted: ['history', 'calibration', 'training', 'commands', 'history.seeded'],
      skipped: [],
      persisted: true,
    });
    expect(detectLegacyData(root).hasData).toBe(false);
    const a = scopedStorage(root, 'user_a');
    expect(a.get<unknown[]>(STORAGE_KEYS.history)).toHaveLength(3);
    expect(a.get(STORAGE_KEYS.calibration)).toEqual({ id: 'cal_1', status: 'in_progress' });
    expect(a.get(STORAGE_KEYS.commandMapping)).toEqual({ version: 1, shortcuts: { quick_action_1: 'announce_time' } });
    // Nobody else inherits it.
    expect(scopedStorage(root, 'user_b').get(STORAGE_KEYS.history)).toBeNull();
  });

  it('never overwrites what the profile already has', () => {
    const root = legacyBrowser();
    const a = scopedStorage(root, 'user_a');
    a.set(STORAGE_KEYS.history, [{ id: 'own' }]);

    const result = adoptLegacyData(root, 'user_a');

    expect(result.skipped).toEqual(['history']);
    expect(result.adopted).toEqual(['calibration', 'training', 'commands', 'history.seeded']);
    expect(a.get(STORAGE_KEYS.history)).toEqual([{ id: 'own' }]);
    // The records that were not adopted are still there, so the choice can be made again.
    expect(root.get<unknown[]>(STORAGE_KEYS.history)).toHaveLength(3);
  });

  it('keeps the data where it is when the browser refuses the write', () => {
    const root = legacyBrowser();
    vi.spyOn(root, 'set').mockReturnValue(false);
    const result = adoptLegacyData(root, 'user_a');
    expect(result.persisted).toBe(false);
    expect(result.adopted).toEqual([]);
    expect(result.skipped).toEqual(['history', 'calibration', 'training', 'commands', 'history.seeded']);
    expect(detectLegacyData(root).hasData).toBe(true);
  });

  it('does nothing when there is nothing to adopt', () => {
    const root = new MemoryStorageAdapter();
    expect(adoptLegacyData(root, 'user_a')).toEqual({ adopted: [], skipped: [], persisted: true });
    expect(root.keys()).toEqual([]);
  });

  it('accepts a profile’s own view and still moves the unscoped keys', () => {
    const root = legacyBrowser();
    adoptLegacyData(scopedStorage(root, 'user_a'), 'user_a');
    expect(scopedStorage(root, 'user_a').get<unknown[]>(STORAGE_KEYS.history)).toHaveLength(3);
    expect(root.has(STORAGE_KEYS.history)).toBe(false);
  });
});

describe('discardLegacyData', () => {
  it('removes the unscoped practice data and nothing else', () => {
    const root = legacyBrowser();
    root.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    root.set(STORAGE_KEYS.authAccounts, [{ id: 'user_a' }]);
    const a = scopedStorage(root, 'user_a');
    a.set(STORAGE_KEYS.history, [{ id: 'own' }]);

    discardLegacyData(root);

    expect(detectLegacyData(root).keys).toEqual([]);
    expect(root.get(STORAGE_KEYS.preferences)).toEqual({ theme: 'dark' });
    expect(root.get(STORAGE_KEYS.authAccounts)).toEqual([{ id: 'user_a' }]);
    expect(a.get(STORAGE_KEYS.history)).toEqual([{ id: 'own' }]);
  });

  it('is safe to call when there is nothing to remove', () => {
    const root = new MemoryStorageAdapter();
    expect(() => discardLegacyData(root)).not.toThrow();
    expect(root.keys()).toEqual([]);
  });
});
