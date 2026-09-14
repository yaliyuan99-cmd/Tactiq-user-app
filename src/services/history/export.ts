/**
 * History exports. Both formats say plainly that the records are simulated
 * practice, not hardware measurements.
 */
import type { GestureEvent } from '@/domain/models';

export const HISTORY_EXPORT_FORMAT = 'tactiq.history';
export const HISTORY_EXPORT_VERSION = 1;
export const HISTORY_EXPORT_NOTE = 'Simulated practice records from the Tactiq user app. Not hardware measurements.';

export const HISTORY_CSV_COLUMNS = [
  'id',
  'at',
  'source',
  'mode',
  'targetContact',
  'detectedContact',
  'token',
  'durationMs',
  'outcome',
  'evidence',
  'seeded',
  'lessonId',
] as const;

export interface HistoryExport {
  readonly format: typeof HISTORY_EXPORT_FORMAT;
  readonly version: typeof HISTORY_EXPORT_VERSION;
  readonly exportedAt: string;
  readonly note: string;
  readonly events: readonly GestureEvent[];
}

/** RFC 4180: quote a field containing a comma, double quote, CR or LF; double any quotes. */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One header line then one line per event, CRLF-separated, in the order given. */
export function eventsToCsv(events: readonly GestureEvent[]): string {
  const lines = [HISTORY_CSV_COLUMNS.join(',')];
  for (const event of events) {
    lines.push(HISTORY_CSV_COLUMNS.map((column) => csvField(event[column])).join(','));
  }
  return lines.join('\r\n');
}

export function eventsToJson(events: readonly GestureEvent[], exportedAt: string): string {
  const payload: HistoryExport = {
    format: HISTORY_EXPORT_FORMAT,
    version: HISTORY_EXPORT_VERSION,
    exportedAt,
    note: HISTORY_EXPORT_NOTE,
    events,
  };
  return JSON.stringify(payload, null, 2);
}
