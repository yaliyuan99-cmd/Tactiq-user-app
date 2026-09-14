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
  exportJson(): string;
  exportCsv(): string;
  /** Writes labelled sample records once per browser (Demo Mode). */
  seedDemo(now?: Date): void;
  hasSeededDemo(): boolean;
  /** Whether the last write was persisted. */
  lastWriteSucceeded(): boolean;
  subscribe(listener: () => void): () => void;
}
