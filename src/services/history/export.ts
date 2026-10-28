/**
 * History exports. Two rules: the note names the evidence that is actually in
 * the file — practice from the simulated ring is called simulated, and a file
 * holding records from a connected bench prototype never claims otherwise —
 * and the file says whether it is everything or a filtered view.
 */
import type { ActivitySummary, GestureEvent } from '@/domain/models';
import { eventKind } from './classify';
import type { ExportScope, HistoryFilter } from './types';

export const HISTORY_EXPORT_FORMAT = 'tactiq.history';
/** 2 added the `kind` column, the activation kind and the scope fields. */
export const HISTORY_EXPORT_VERSION = 2;

/** Note for a file whose records all came from this app's simulated ring. */
export const HISTORY_EXPORT_NOTE_SIMULATED = 'Simulated practice records from the Tactiq user app. Not hardware measurements.';

/** Note for a file holding at least one record recorded from a connected bench prototype. */
export const HISTORY_EXPORT_NOTE_WITH_MEASURED =
  'Practice records from the Tactiq user app. Each record’s evidence field says whether it was simulated by this app or measured on a Tactiq bench prototype, which has not been validated.';

/** The note that matches the records being exported. */
export function historyExportNote(events: readonly GestureEvent[]): string {
  return events.some((event) => event.evidence === 'measured')
    ? HISTORY_EXPORT_NOTE_WITH_MEASURED
    : HISTORY_EXPORT_NOTE_SIMULATED;
}

/**
 * CSV column order. New columns are appended at the end so existing
 * spreadsheets and scripts keep reading the same positions.
 * - `targetToken`: the command the exercise asked for. Blank for free
 *   practice, for calibration and for records saved before the field existed.
 * - `kind`: "command" or "activation". Always written, even for records saved
 *   before the field existed, so the column is never blank.
 */
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
  'targetToken',
  'kind',
] as const;

export type HistoryCsvColumn = (typeof HISTORY_CSV_COLUMNS)[number];

export interface HistoryExport {
  readonly format: typeof HISTORY_EXPORT_FORMAT;
  readonly version: typeof HISTORY_EXPORT_VERSION;
  readonly exportedAt: string;
  readonly note: string;
  /** False when the file holds every record in the browser. */
  readonly filtersApplied: boolean;
  /** The filter the file was taken through, or null for everything. */
  readonly filter: HistoryFilter | null;
  /** One sentence naming what the file holds. */
  readonly scope: string;
  readonly events: readonly GestureEvent[];
}

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export interface ExportScopeInput {
  /** Records in this browser, whatever the filters. */
  readonly total: number;
  readonly filtersApplied: boolean;
  /** The summary of the records being exported. */
  readonly summary: ActivitySummary;
}

/**
 * What the file holds, in one sentence: how many records of how many, how many
 * are Demo Mode samples, and whether any were measured on a bench prototype.
 */
export function describeExportScope({ total, filtersApplied, summary }: ExportScopeInput): string {
  const { counts } = summary;
  const parts = [
    filtersApplied
      ? `A filtered view: ${counts.total} of ${plural(total, 'record')} in this browser.`
      : `All ${plural(counts.total, 'record')} in this browser.`,
  ];
  parts.push(
    counts.seeded === 0
      ? 'No sample records.'
      : `Includes ${plural(counts.seeded, 'Demo Mode sample record')}, marked seeded: true.`,
  );
  const measured = summary.byEvidence.measured.records;
  if (measured > 0) {
    parts.push(
      `${plural(measured, 'record')} ${measured === 1 ? 'was' : 'were'} measured on a bench prototype, which has not been validated.`,
    );
  }
  return parts.join(' ');
}

/** The scope of an unfiltered export, for callers that have no filter to describe. */
export function wholeHistoryScope(summary: ActivitySummary): ExportScope {
  return {
    filtersApplied: false,
    filter: null,
    text: describeExportScope({ total: summary.counts.total, filtersApplied: false, summary }),
    counts: summary.counts,
  };
}

/** RFC 4180: quote a field containing a comma, double quote, CR or LF; double any quotes. */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvValue(event: GestureEvent, column: HistoryCsvColumn): string | number | boolean | null | undefined {
  return column === 'kind' ? eventKind(event) : event[column];
}

/**
 * One header line then one line per event, CRLF-separated, in the order given.
 * The table carries no preamble: line 1 is the header, because the column
 * positions are the contract other tools read. What the file covers travels
 * beside it, in `ExportScope`, and inside the JSON export.
 */
export function eventsToCsv(events: readonly GestureEvent[]): string {
  const lines = [HISTORY_CSV_COLUMNS.join(',')];
  for (const event of events) {
    lines.push(HISTORY_CSV_COLUMNS.map((column) => csvField(csvValue(event, column))).join(','));
  }
  return lines.join('\r\n');
}

export function eventsToJson(events: readonly GestureEvent[], exportedAt: string, scope?: ExportScope): string {
  const payload: HistoryExport = {
    format: HISTORY_EXPORT_FORMAT,
    version: HISTORY_EXPORT_VERSION,
    exportedAt,
    note: historyExportNote(events),
    filtersApplied: scope?.filtersApplied ?? false,
    filter: scope?.filter ?? null,
    scope: scope?.text ?? `All ${plural(events.length, 'record')} in this browser.`,
    events,
  };
  return JSON.stringify(payload, null, 2);
}
