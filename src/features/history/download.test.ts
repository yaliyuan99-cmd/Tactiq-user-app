import { CSV_CONTENT_TYPE, EXPORT_CONTENT_TYPES, JSON_CONTENT_TYPE, activityFilename, downloadTextFile } from './download';

describe('activityFilename', () => {
  it('uses the local date, zero-padded', () => {
    expect(activityFilename('json', new Date(2026, 8, 5, 23, 59))).toBe('tactiq-activity-2026-09-05.json');
    expect(activityFilename('csv', new Date(2026, 11, 31, 0, 1))).toBe('tactiq-activity-2026-12-31.csv');
  });

  it('pairs each format with its content type', () => {
    expect(EXPORT_CONTENT_TYPES).toEqual({ json: 'application/json', csv: 'text/csv;charset=utf-8' });
  });
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('downloadTextFile', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('creates a Blob with the content type, clicks a download link, then cleans up', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:tactiq-test';
    });
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadTextFile('{"a":1}', 'tactiq-activity-2026-09-15.json', JSON_CONTENT_TYPE);

    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.type).toBe('application/json');
    const blob = blobs[0];
    expect(blob && (await readBlob(blob))).toBe('{"a":1}');
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('tactiq-activity-2026-09-15.json');
    expect(clicked[0]?.getAttribute('href')).toBe('blob:tactiq-test');
    expect(document.querySelector('a[download]')).toBeNull();

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tactiq-test');
  });

  it('keeps the CSV content type', () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:csv';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('id,at', 'tactiq-activity-2026-09-15.csv', CSV_CONTENT_TYPE);
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
  });
});
