/** Fixed activity for the Activity page tests. Not used by the running app. */
import type { GestureEvent } from '@/domain/models';
import { makeGestureEvent } from '@/services/history/testing';
import { profileStorage } from '@/test/renderApp';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';

/** Tuesday 15 September 2026, 14:30 local time. */
export const TEST_NOW = new Date(2026, 8, 15, 14, 30, 0);

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export function minutesAgo(minutes: number): string {
  return new Date(TEST_NOW.getTime() - minutes * MINUTE_MS).toISOString();
}

export function daysAgo(days: number): string {
  return new Date(TEST_NOW.getTime() - days * DAY_MS).toISOString();
}

/**
 * Today (simulator + one lesson): Next ×3 recognised, Next detected as Previous,
 * Next too long, Next after the window closed, one completed and one cancelled emergency hold.
 * Three days ago (lessons): Confirm recognised, Back detected as Confirm.
 * Ten days ago (calibration): Read / Repeat recognised ×2.
 *
 * Last 7 days → 8 attempts, 4 recognised, 2 misclassified, 2 rejected, Next most practised (6).
 */
export function standardEvents(): GestureEvent[] {
  const next = { targetContact: 'middle_base', detectedContact: 'middle_base', token: 'next' } as const;
  const hold = { source: 'training', mode: 'lesson', lessonId: 'emergency_hold', targetContact: 'pinky_tip', detectedContact: 'pinky_tip' } as const;
  return [
    makeGestureEvent({ id: 'calib-1', at: daysAgo(10), source: 'calibration', mode: 'calibration', targetContact: 'ring_tip', detectedContact: 'ring_tip', token: 'read' }),
    makeGestureEvent({ id: 'calib-2', at: daysAgo(10), source: 'calibration', mode: 'calibration', targetContact: 'ring_tip', detectedContact: 'ring_tip', token: 'read' }),
    makeGestureEvent({ id: 'lesson-confirm', at: daysAgo(3), source: 'training', mode: 'lesson', lessonId: 'confirm_and_back' }),
    makeGestureEvent({
      id: 'lesson-back-mismatch',
      at: daysAgo(3),
      source: 'training',
      mode: 'lesson',
      lessonId: 'confirm_and_back',
      targetContact: 'index_base',
      detectedContact: 'index_tip',
      token: 'confirm',
      outcome: 'mismatch',
    }),
    makeGestureEvent({ id: 'hold-cancelled', at: minutesAgo(80), ...hold, token: null, durationMs: 2600, outcome: 'emergency_cancelled' }),
    makeGestureEvent({ id: 'hold-complete', at: minutesAgo(70), ...hold, token: 'emergency', durationMs: 5000, outcome: 'emergency' }),
    makeGestureEvent({ id: 'next-window', at: minutesAgo(60), ...next, outcome: 'window_closed' }),
    makeGestureEvent({ id: 'next-long', at: minutesAgo(50), ...next, token: null, durationMs: 1400, outcome: 'rejected_duration' }),
    makeGestureEvent({ id: 'next-mismatch', at: minutesAgo(40), ...next, detectedContact: 'ring_base', token: 'previous', outcome: 'mismatch' }),
    makeGestureEvent({ id: 'next-3', at: minutesAgo(30), ...next }),
    makeGestureEvent({ id: 'next-2', at: minutesAgo(20), ...next }),
    makeGestureEvent({ id: 'next-1', at: minutesAgo(10), ...next }),
  ];
}

/** `count` recognised Confirm taps, one a minute, newest `id` last. */
export function manyEvents(count: number, overrides: Partial<GestureEvent> = {}): GestureEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeGestureEvent({ id: `many-${i}`, at: minutesAgo(count - i), ...overrides }),
  );
}

/**
 * A memory storage holding `events` as saved history (stored oldest first).
 *
 * Activity belongs to a profile, so it is seeded through that profile's view of
 * storage — the bare key is a legacy address the app no longer reads.
 */
export function storageWith(events: readonly GestureEvent[]): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  profileStorage(storage).set(STORAGE_KEYS.history, sorted);
  return storage;
}

/** The saved activity of the profile a test renders as, or null when none is stored. */
export function storedEvents(storage: StorageAdapter): GestureEvent[] | null {
  return profileStorage(storage).get<GestureEvent[]>(STORAGE_KEYS.history);
}
