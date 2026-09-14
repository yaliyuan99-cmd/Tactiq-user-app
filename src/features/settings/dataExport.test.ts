import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import {
  LOCAL_DATA_CONTENT_TYPE,
  LOCAL_DATA_EXPORT_FORMAT,
  LOCAL_DATA_EXPORT_NOTE,
  buildLocalDataExport,
  downloadTextFile,
  localDataExportJson,
  localDataFilename,
} from './dataExport';

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

describe('localDataFilename', () => {
  it('uses the local date, zero-padded', () => {
    expect(localDataFilename(new Date(2026, 8, 5, 23, 59))).toBe('tactiq-data-2026-09-05.json');
  });
});

describe('downloadTextFile', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.useRealTimers();
  });

  it('clicks a temporary download link for a Blob, then revokes the URL', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:tactiq-data';
    });
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadTextFile('{}', 'tactiq-data-2026-09-15.json', LOCAL_DATA_CONTENT_TYPE);

    expect(blobs[0]?.type).toBe('application/json');
    expect(clicked[0]?.download).toBe('tactiq-data-2026-09-15.json');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tactiq-data');
  });
});
