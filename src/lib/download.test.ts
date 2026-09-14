import { datedFilename, downloadTextFile, type DownloadEnvironment } from './download';

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('datedFilename', () => {
  it('uses the local calendar date, zero-padded', () => {
    expect(datedFilename('tactiq-activity', 'json', new Date(2026, 8, 5, 23, 59))).toBe('tactiq-activity-2026-09-05.json');
    expect(datedFilename('tactiq-activity', 'csv', new Date(2026, 11, 31, 0, 1))).toBe('tactiq-activity-2026-12-31.csv');
    expect(datedFilename('tactiq-data', 'json', new Date(2027, 0, 1, 0, 0))).toBe('tactiq-data-2027-01-01.json');
  });

  it('uses local midnight boundaries, not UTC', () => {
    const justBeforeMidnight = new Date(2026, 8, 15, 23, 59, 59, 999);
    const midnight = new Date(2026, 8, 16, 0, 0, 0, 0);
    expect(datedFilename('x', 'txt', justBeforeMidnight)).toBe('x-2026-09-15.txt');
    expect(datedFilename('x', 'txt', midnight)).toBe('x-2026-09-16.txt');
  });

  it('ignores a leading dot on the extension', () => {
    expect(datedFilename('tactiq-data', '.json', new Date(2026, 8, 15))).toBe('tactiq-data-2026-09-15.json');
  });

  it('defaults to today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 8, 15, 14, 30));
      expect(datedFilename('tactiq-activity', 'csv')).toBe('tactiq-activity-2026-09-15.csv');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('downloadTextFile', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function fakeUrl(href = 'blob:tactiq-test') {
    const blobs: Blob[] = [];
    const url: DownloadEnvironment['url'] = {
      createObjectURL: vi.fn((blob: Blob | MediaSource) => {
        blobs.push(blob as Blob);
        return href;
      }),
      revokeObjectURL: vi.fn(),
    };
    return { url, blobs };
  }

  it('creates a Blob with the content type, clicks a hidden download link, removes it, then revokes the URL', async () => {
    const { url, blobs } = fakeUrl();
    const clicked: { download: string; href: string | null; rel: string; hidden: boolean; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({
        download: this.download,
        href: this.getAttribute('href'),
        rel: this.rel,
        hidden: this.hidden,
        attached: document.body.contains(this),
      });
    });

    downloadTextFile('{"a":1}', 'tactiq-activity-2026-09-15.json', 'application/json', { url });

    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.type).toBe('application/json');
    const blob = blobs[0];
    expect(blob && (await readBlob(blob))).toBe('{"a":1}');
    expect(clicked).toEqual([
      { download: 'tactiq-activity-2026-09-15.json', href: 'blob:tactiq-test', rel: 'noopener', hidden: true, attached: true },
    ]);
    expect(document.querySelector('a[download]')).toBeNull();

    expect(url.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(url.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:tactiq-test');
  });

  it('keeps a CSV content type with its charset', () => {
    const { url, blobs } = fakeUrl('blob:csv');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadTextFile('id,at', 'tactiq-activity-2026-09-15.csv', 'text/csv;charset=utf-8', { url });
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
  });

  it('uses an injected document', () => {
    const { url } = fakeUrl('blob:injected');
    const otherDocument = document.implementation.createHTMLDocument('download test');
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.ownerDocument === otherDocument ? 'injected' : 'global');
      expect(otherDocument.body.contains(this)).toBe(true);
    });

    downloadTextFile('hello', 'hello.txt', 'text/plain', { document: otherDocument, url });

    expect(clicks).toEqual(['injected']);
    expect(otherDocument.querySelector('a')).toBeNull();
    vi.runAllTimers();
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:injected');
  });

  it('falls back to the global URL and document when nothing is injected', () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:global');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      downloadTextFile('x', 'x.txt', 'text/plain');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      vi.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:global');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('still removes the link and revokes the URL when the click throws', () => {
    const { url } = fakeUrl('blob:throws');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => downloadTextFile('x', 'x.txt', 'text/plain', { url })).toThrow('blocked');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:throws');
  });
});
