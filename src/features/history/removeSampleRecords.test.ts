import { LocalHistoryService } from '@/services/history/LocalHistoryService';
import { makeGestureEvent as ev } from '@/services/history/testing';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { countSampleRecords, removeSampleRecords } from './removeSampleRecords';

const NOW = new Date(2026, 8, 15, 14, 30, 0);

function iso(minutesAgo: number): string {
  return new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
}

describe('removeSampleRecords', () => {
  let storage: MemoryStorageAdapter;
  let history: LocalHistoryService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    storage = new MemoryStorageAdapter();
    history = new LocalHistoryService(storage);
  });

  afterEach(() => {
    history.dispose();
    vi.useRealTimers();
  });

  it('removes only seeded records and keeps the rest in chronological order with their fields', () => {
    const sameTimeA = ev({ id: 'tie-a', at: iso(5), seeded: false });
    const sameTimeB = ev({ id: 'tie-b', at: iso(5), seeded: false, source: 'training', mode: 'lesson', lessonId: 'confirm_and_back' });
    const events = [
      ev({ id: 'sample-old', at: iso(600), seeded: true }),
      ev({ id: 'mine-old', at: iso(500), seeded: false, outcome: 'mismatch', detectedContact: 'index_base', token: 'back' }),
      ev({ id: 'sample-mid', at: iso(60), seeded: true }),
      sameTimeA,
      sameTimeB,
      ev({ id: 'sample-new', at: iso(1), seeded: true }),
    ];
    storage.set(STORAGE_KEYS.history, events);

    expect(countSampleRecords(history)).toBe(3);
    const result = removeSampleRecords(history);

    expect(result).toEqual({ removed: 3, kept: 3 });
    expect(countSampleRecords(history)).toBe(0);
    const stored = storage.get<typeof events>(STORAGE_KEYS.history);
    expect(stored?.map((e) => e.id)).toEqual(['mine-old', 'tie-a', 'tie-b']);
    expect(stored?.[0]).toEqual(events[1]);
    expect(stored?.[2]).toEqual(sameTimeB);
  });

  it('does nothing when there are no sample records', () => {
    storage.set(STORAGE_KEYS.history, [ev({ id: 'mine', at: iso(3) })]);
    const clear = vi.spyOn(history, 'clear');
    expect(removeSampleRecords(history)).toEqual({ removed: 0, kept: 1 });
    expect(clear).not.toHaveBeenCalled();
  });

  it('leaves an empty history when every record was a sample, without re-seeding', () => {
    history.seedDemo(NOW);
    expect(history.count()).toBeGreaterThan(0);
    const total = history.count();

    expect(removeSampleRecords(history)).toEqual({ removed: total, kept: 0 });
    expect(history.count()).toBe(0);
    history.seedDemo(NOW);
    expect(history.count()).toBe(0);
  });
});
