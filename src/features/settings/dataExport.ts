/**
 * "Download all my data": every value Tactiq keeps under its storage
 * namespace, wrapped in a header that says what the file is and how to read
 * the evidence labels and sample flags inside. Saving the file and naming it
 * with the date live in '@/lib/download'.
 */
import { STORAGE_NAMESPACE, type StorageAdapter } from '@/services/storage/StorageAdapter';

export const LOCAL_DATA_EXPORT_FORMAT = 'tactiq.local-data';
export const LOCAL_DATA_EXPORT_VERSION = 1;
export const LOCAL_DATA_EXPORT_NOTE =
  'Everything the Tactiq user app keeps in this browser. Each record keeps its evidence label: simulated records come from the app’s simulated ring, not a wearable ring. Records marked seeded: true are samples.';
export const LOCAL_DATA_CONTENT_TYPE = 'application/json';
/** The file is saved as "tactiq-data-YYYY-MM-DD.json" (see `datedFilename`). */
export const LOCAL_DATA_FILENAME_BASE = 'tactiq-data';

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
