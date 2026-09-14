/**
 * Activity history kept on this device. Events live under one storage key as
 * a chronological array capped at HISTORY_CAP. Reads are cached in memory, so
 * the session keeps working even when the browser refuses to persist;
 * `lastWriteSucceeded()` tells screens whether records were actually saved.
 */
import type { ActivitySummary, GestureEvent } from '@/domain/models';
import { createId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { generateDemoEvents } from '@/services/demo/demoHistory';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, type Unsubscribe } from '@/services/useSubscription';
import { capHistory, isGestureEvent, sortChronologically } from './events';
import { eventsToCsv, eventsToJson } from './export';
import { filterEvents, summariseEvents } from './summarise';
import type { HistoryFilter, HistoryService, NewGestureEvent } from './types';

export { intendedToken } from './summarise';

/** What is stored under STORAGE_KEYS.historySeeded once sample records have been written. */
export interface HistorySeedFlag {
  readonly seededAt: string;
  readonly count: number;
}

export class LocalHistoryService implements HistoryService {
  private cache: GestureEvent[] | null = null;
  private lastWrite = true;
  private seededThisSession = false;
  private readonly notifier: ChangeNotifier;

  constructor(private readonly storage: StorageAdapter) {
    this.notifier = new ChangeNotifier(storage, [STORAGE_KEYS.history, STORAGE_KEYS.historySeeded], () => {
      this.cache = null;
      // Storage was cleared elsewhere (another tab, or "delete my data"): allow sample records again.
      if (storage.get<unknown>(STORAGE_KEYS.historySeeded) === null) this.seededThisSession = false;
    });
  }

  readonly subscribe = (listener: () => void): Unsubscribe => this.notifier.subscribe(listener);

  list(filter?: HistoryFilter): GestureEvent[] {
    return filterEvents(this.events(), filter, new Date()).reverse();
  }

  append(input: NewGestureEvent): GestureEvent {
    const event: GestureEvent = {
      id: input.id ?? createId('evt'),
      at: input.at ?? nowIso(),
      source: input.source,
      mode: input.mode,
      targetContact: input.targetContact,
      detectedContact: input.detectedContact,
      token: input.token,
      durationMs: input.durationMs,
      outcome: input.outcome,
      evidence: input.evidence,
      seeded: input.seeded ?? false,
      ...(input.lessonId ? { lessonId: input.lessonId } : {}),
    };
    if (!isGestureEvent(event)) throw new Error('This activity record is not valid, so it was not saved.');
    this.write(sortChronologically([...this.events(), event]));
    return event;
  }

  summarise(filter?: HistoryFilter): ActivitySummary {
    return summariseEvents(filterEvents(this.events(), filter, new Date()), filter?.range ?? 'all');
  }

  count(): number {
    return this.events().length;
  }

  clear(): void {
    this.notifier.quietly(() => this.storage.remove(STORAGE_KEYS.history));
    this.cache = [];
    this.lastWrite = true;
    this.notifier.emit();
  }

  /** Oldest first. */
  exportJson(): string {
    return eventsToJson(this.events(), nowIso());
  }

  /** Oldest first. */
  exportCsv(): string {
    return eventsToCsv(this.events());
  }

  seedDemo(now: Date = new Date()): void {
    if (this.hasSeededDemo()) return;
    const existing = this.events();
    const ids = new Set(existing.map((e) => e.id));
    const demo = generateDemoEvents(now).filter((e) => !ids.has(e.id));
    this.seededThisSession = true;
    const flag: HistorySeedFlag = { seededAt: now.toISOString(), count: demo.length };
    const flagSaved = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.historySeeded, flag));
    this.write(sortChronologically([...existing, ...demo]));
    this.lastWrite = this.lastWrite && flagSaved;
  }

  hasSeededDemo(): boolean {
    return this.seededThisSession || this.storage.get<unknown>(STORAGE_KEYS.historySeeded) !== null;
  }

  lastWriteSucceeded(): boolean {
    return this.lastWrite;
  }

  /** Stops listening to storage. Only needed when a service is discarded before the page unloads. */
  dispose(): void {
    this.notifier.dispose();
  }

  private events(): GestureEvent[] {
    if (this.cache) return this.cache;
    const raw = this.storage.get<unknown>(STORAGE_KEYS.history);
    const stored = Array.isArray(raw) ? raw.filter(isGestureEvent) : [];
    this.cache = capHistory(sortChronologically(stored));
    return this.cache;
  }

  private write(next: readonly GestureEvent[]): void {
    const capped = capHistory(next);
    this.lastWrite = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.history, capped));
    this.cache = capped;
    this.notifier.emit();
  }
}
