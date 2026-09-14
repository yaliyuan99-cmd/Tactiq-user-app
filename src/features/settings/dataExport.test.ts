import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { LOCAL_DATA_EXPORT_FORMAT, LOCAL_DATA_EXPORT_NOTE, buildLocalDataExport, localDataExportJson } from './dataExport';

const EXPORTED_AT = '2026-09-15T04:30:00.000Z';

describe('buildLocalDataExport', () => {
  it('includes every key in the namespace, prefixed and sorted, under a format header', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.training, { version: 1, lessons: {} });
    storage.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    storage.set(STORAGE_KEYS.history, [{ id: 'e1', seeded: true, evidence: 'simulated' }]);

    const exported = buildLocalDataExport(storage, EXPORTED_AT);

    expect(exported.format).toBe(LOCAL_DATA_EXPORT_FORMAT);
    expect(exported.version).toBe(1);
    expect(exported.exportedAt).toBe(EXPORTED_AT);
    expect(exported.note).toBe(LOCAL_DATA_EXPORT_NOTE);
    expect(exported.note).toMatch(/simulated records come from the app’s simulated ring, not a wearable ring/);
    expect(exported.note).toMatch(/seeded: true are samples/);
    expect(Object.keys(exported.data)).toEqual(['tactiq.history', 'tactiq.prefs', 'tactiq.training']);
    expect(exported.data['tactiq.prefs']).toEqual({ theme: 'dark' });
    expect(exported.data['tactiq.history']).toEqual([{ id: 'e1', seeded: true, evidence: 'simulated' }]);
  });

  it('exports an empty data object when nothing is stored', () => {
    expect(buildLocalDataExport(new MemoryStorageAdapter(), EXPORTED_AT).data).toEqual({});
  });

  it('serialises as indented JSON that parses back to the same export', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.calibration, { id: 'cal_1' });
    const json = localDataExportJson(storage, EXPORTED_AT);
    expect(json).toContain('\n  "format": "tactiq.local-data"');
    expect(JSON.parse(json)).toEqual(buildLocalDataExport(storage, EXPORTED_AT));
  });
});
