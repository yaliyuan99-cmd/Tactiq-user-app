/**
 * Saving activity exports as files. Kept apart from the page so tests can
 * mock `downloadTextFile` and the browser plumbing is tested once.
 */

export const JSON_CONTENT_TYPE = 'application/json';
export const CSV_CONTENT_TYPE = 'text/csv;charset=utf-8';

export type ActivityExportFormat = 'json' | 'csv';

export const EXPORT_CONTENT_TYPES: Readonly<Record<ActivityExportFormat, string>> = {
  json: JSON_CONTENT_TYPE,
  csv: CSV_CONTENT_TYPE,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "tactiq-activity-2026-09-15.json", using the local calendar date. */
export function activityFilename(format: ActivityExportFormat, date: Date = new Date()): string {
  return `tactiq-activity-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${format}`;
}

/** Creates a Blob and asks the browser to save it under `filename`. */
export function downloadTextFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoke after the click has been handled, so the browser can still read the file.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
