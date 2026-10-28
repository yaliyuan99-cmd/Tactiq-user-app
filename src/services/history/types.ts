import type { CommandToken } from '@/domain/commands';
import type {
  ActivityCounts,
  ActivitySummary,
  GestureEvent,
  GestureEventSource,
  HistoryRange,
  RecordEvidence,
} from '@/domain/models';

/** Which Demo Mode sample records a query includes. Sample records are always separable. */
export type SampleScope = 'include' | 'exclude' | 'only';

export interface HistoryFilter {
  readonly range: HistoryRange;
  /** By the command the exercise asked for (see intendedToken). Calibration records match no command. */
  readonly token?: CommandToken | 'all';
  readonly source?: GestureEventSource | 'all';
  /** Simulated practice or records measured on a bench prototype. Defaults to 'all'. */
  readonly evidence?: RecordEvidence | 'all';
  /** Defaults to 'include'. */
  readonly samples?: SampleScope;
}

export type NewGestureEvent = Omit<GestureEvent, 'id' | 'at' | 'seeded'> & {
  readonly id?: string;
  readonly at?: string;
  readonly seeded?: boolean;
};

/** What an export covers, so a file or a screen never implies it holds everything. */
export interface ExportScope {
  /** True when the filter left records out. */
  readonly filtersApplied: boolean;
  /** One sentence: "All 52 records, including 48 sample records." */
  readonly text: string;
  /** The filter the export was taken through, or null for everything. */
  readonly filter: HistoryFilter | null;
  readonly counts: ActivityCounts;
}

export interface HistoryService {
  /** Newest first. */
  list(filter?: HistoryFilter): GestureEvent[];
  append(event: NewGestureEvent): GestureEvent;
  summarise(filter?: HistoryFilter): ActivitySummary;
  /** Every record, whatever the filters. */
  count(): number;
  /** Records matching a filter, without building the list twice. */
  countMatching(filter?: HistoryFilter): number;
  /** Removes every stored event, seeded or not. */
  clear(): void;
  /**
   * Removes only the Demo Mode sample records (`seeded: true`) in one write and
   * keeps everything the user did, unchanged and in order. Notifies subscribers
   * once when anything was removed. The "already seeded" flag stays set, so
   * sample records are not written again. Returns how many were removed.
   */
  removeSeeded(): number;
  /** Oldest first. Without a filter, every record. */
  exportJson(filter?: HistoryFilter): string;
  /** Oldest first. Without a filter, every record. */
  exportCsv(filter?: HistoryFilter): string;
  /** What `exportJson`/`exportCsv` would cover with the same argument, for the screen to show. */
  exportScope(filter?: HistoryFilter): ExportScope;
  /** Writes labelled sample records once per browser (Demo Mode). */
  seedDemo(now?: Date): void;
  hasSeededDemo(): boolean;
  /** Whether the last write was persisted. */
  lastWriteSucceeded(): boolean;
  subscribe(listener: () => void): () => void;
}
