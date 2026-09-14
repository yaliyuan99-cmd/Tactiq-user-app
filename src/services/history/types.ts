import type { CommandToken } from '@/domain/commands';
import type { ActivitySummary, GestureEvent, GestureEventSource, HistoryRange } from '@/domain/models';

export interface HistoryFilter {
  readonly range: HistoryRange;
  readonly token?: CommandToken | 'all';
  readonly source?: GestureEventSource | 'all';
}

export type NewGestureEvent = Omit<GestureEvent, 'id' | 'at' | 'seeded'> & {
  readonly id?: string;
  readonly at?: string;
  readonly seeded?: boolean;
};

export interface HistoryService {
  /** Newest first. */
  list(filter?: HistoryFilter): GestureEvent[];
  append(event: NewGestureEvent): GestureEvent;
  summarise(filter?: HistoryFilter): ActivitySummary;
  count(): number;
  /** Removes every stored event, seeded or not. */
  clear(): void;
  /**
   * Removes only the Demo Mode sample records (`seeded: true`) in one write and
   * keeps everything the user did, unchanged and in order. Notifies subscribers
   * once when anything was removed. The "already seeded" flag stays set, so
   * sample records are not written again. Returns how many were removed.
   */
  removeSeeded(): number;
  exportJson(): string;
  exportCsv(): string;
  /** Writes labelled sample records once per browser (Demo Mode). */
  seedDemo(now?: Date): void;
  hasSeededDemo(): boolean;
  /** Whether the last write was persisted. */
  lastWriteSucceeded(): boolean;
  subscribe(listener: () => void): () => void;
}
