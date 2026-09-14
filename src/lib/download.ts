/**
 * Saving text as a file in the browser, and naming it with today's date.
 * Shared by the activity export and "Download all my data". Screens and their
 * tests can mock `downloadTextFile`; the browser plumbing is tested here once.
 */

/** What `downloadTextFile` needs from the browser. Injectable for tests. */
export interface DownloadEnvironment {
  readonly document: Pick<Document, 'createElement' | 'body'>;
  readonly url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
}

/**
 * Creates a Blob of `content` with `contentType`, points a temporary hidden
 * link at an object URL for it and clicks the link, so the browser saves it as
 * `filename`. The link is removed straight away; the object URL is revoked on
 * the next task, once the browser has taken the file.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  contentType: string,
  environment: Partial<DownloadEnvironment> = {},
): void {
  // The globals are only read when nothing was injected.
  const doc = environment.document ?? document;
  const urls = environment.url ?? URL;

  const blob = new Blob([content], { type: contentType });
  const href = urls.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.hidden = true;
  doc.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoke after the click has been handled, so the browser can still read the file.
    setTimeout(() => urls.revokeObjectURL(href), 0);
  }
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/**
 * "base-YYYY-MM-DD.ext" using the local calendar date, for example
 * `datedFilename('tactiq-activity', 'csv')` → "tactiq-activity-2026-09-15.csv".
 * A leading dot on `extension` is ignored.
 */
export function datedFilename(base: string, extension: string, date: Date = new Date()): string {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${base}-${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${ext}`;
}
