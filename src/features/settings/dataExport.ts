/**
 * "Download all my data": every value Tactiq keeps under its storage
 * namespace, wrapped in a header that says what the file is and how to read
 * the evidence labels and sample flags inside.
 */
import { STORAGE_NAMESPACE, type StorageAdapter } from '@/services/storage/StorageAdapter';

export const LOCAL_DATA_EXPORT_FORMAT = 'tactiq.local-data';
export const LOCAL_DATA_EXPORT_VERSION = 1;
export const LOCAL_DATA_EXPORT_NOTE =
  'Everything the Tactiq user app keeps in this browser. Each record keeps its evidence label: simulated records come from the app’s simulated ring, not a wearable ring. Records marked seeded: true are samples.';
export const LOCAL_DATA_CONTENT_TYPE = 'application/json';

export interface LocalDataExport {
  readonly format: typeof LOCAL_DATA_EXPORT_FORMAT;
  readonly version: typeof LOCAL_DATA_EXPORT_VERSION;
  readonly exportedAt: string;
  readonly note: string;
  /** Full storage key (for example "tactiq.prefs") → stored value, sorted by key. */
  readonly data: Readonly<Record<string, unknown>>;
}

export function buildLocalDataExport(storage: StorageAdapter, exportedAt: string): LocalDataExport {
  const data: Record<string, unknown> = {};
  for (const key of [...storage.keys()].sort()) {
    data[`${STORAGE_NAMESPACE}${key}`] = storage.get<unknown>(key);
  }
  return {
    format: LOCAL_DATA_EXPORT_FORMAT,
    version: LOCAL_DATA_EXPORT_VERSION,
    exportedAt,
    note: LOCAL_DATA_EXPORT_NOTE,
    data,
  };
}

export function localDataExportJson(storage: StorageAdapter, exportedAt: string): string {
  return JSON.stringify(buildLocalDataExport(storage, exportedAt), null, 2);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "tactiq-data-2026-09-15.json", using the local calendar date. */
export function localDataFilename(date: Date = new Date()): string {
  return `tactiq-data-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
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
    // Revoke once the click has been handled, so the browser can still read the file.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
