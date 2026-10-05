import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { HISTORY_CAP } from './events';
import { LocalHistoryService, intendedToken } from './LocalHistoryService';
import { makeGestureEvent } from './testing';
import type { NewGestureEvent } from './types';

const NOW = new Date(2026, 8, 15, 14, 30, 0);
const DAY = 24 * 60 * 60 * 1000;

function tap(overrides: Partial<NewGestureEvent> = {}): NewGestureEvent {
  return {
    source: 'simulator',
    mode: 'guided',
    targetContact: 'index_tip',
    detectedContact: 'index_tip',
    token: 'confirm',
    durationMs: 210,
    outcome: 'recognised',
    evidence: 'simulated',
    ...overrides,
  };
}

describe('LocalHistoryService', () => {
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

  it('re-exports intendedToken', () => {
    expect(intendedToken(makeGestureEvent({ targetContact: 'ring_tip', token: 'previous', outcome: 'mismatch' }))).toBe('read');
  });

  it('appends with an id, the current time and seeded false, and persists', () => {
    const event = history.append(tap({ lessonId: 'confirm_and_back', source: 'training', mode: 'lesson' }));
    expect(event.id).toMatch(/^evt_/);
    expect(event.at).toBe(NOW.toISOString());
    expect(event.seeded).toBe(false);
    expect(event.lessonId).toBe('confirm_and_back');
    expect(history.count()).toBe(1);
    expect(storage.get(STORAGE_KEYS.history)).toEqual([event]);
    expect(history.lastWriteSucceeded()).toBe(true);
  });

  it('keeps supplied id, time and seeded flag, and omits an absent lessonId and targetToken', () => {
    const event = history.append(tap({ id: 'custom', at: '2026-09-14T00:00:00.000Z', seeded: true }));
    expect(event).toMatchObject({ id: 'custom', at: '2026-09-14T00:00:00.000Z', seeded: true });
    expect('lessonId' in event).toBe(false);
    expect('targetToken' in event).toBe(false);
  });

  it('stores the target command and reads it back from storage', () => {
    const event = history.append(
      tap({
        id: 'emergency-target-tap',
        mode: 'lesson',
        source: 'training',
        lessonId: 'emergency_hold',
        targetContact: 'pinky_tip',
        targetToken: 'emergency',
        detectedContact: 'pinky_tip',
        token: 'quick_action_1',
        outcome: 'mismatch',
      }),
    );
    expect(event.targetToken).toBe('emergency');
    expect(storage.get(STORAGE_KEYS.history)).toEqual([event]);
    const reread = new LocalHistoryService(storage);
    expect(reread.list()).toEqual([event]);
    expect(intendedToken(reread.list()[0]!)).toBe('emergency');
    expect(reread.summarise().perCommand.find((c) => c.token === 'emergency')).toEqual({
      token: 'emergency',
      attempts: 1,
      successes: 0,
      rate: 0,
    });
    expect(reread.summarise().perCommand.find((c) => c.token === 'quick_action_1')?.attempts).toBe(0);
    reread.dispose();
  });

  it('rejects an invalid record', () => {
    expect(() => history.append(tap({ at: 'not a date' }))).toThrow('This activity record is not valid');
    expect(() => history.append(tap({ targetToken: 'call_mum' as never }))).toThrow('This activity record is not valid');
    expect(history.count()).toBe(0);
  });

  it('lists newest first regardless of append order', () => {
    history.append(tap({ id: 'b', at: new Date(NOW.getTime() - 2000).toISOString() }));
    history.append(tap({ id: 'c', at: new Date(NOW.getTime() - 1000).toISOString() }));
    history.append(tap({ id: 'a', at: new Date(NOW.getTime() - 3000).toISOString() }));
    expect(history.list().map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('filters by range, token and source', () => {
    const midnight = new Date(2026, 8, 15).getTime();
    history.append(tap({ id: 'yesterday', at: new Date(midnight - 1).toISOString() }));
    history.append(tap({ id: 'today', at: new Date(midnight).toISOString(), source: 'training', mode: 'lesson' }));
    history.append(tap({ id: 'eight-days', at: new Date(NOW.getTime() - 8 * DAY).toISOString(), targetContact: 'middle_base', token: 'next' }));
    expect(history.list({ range: 'today' }).map((e) => e.id)).toEqual(['today']);
    expect(history.list({ range: '7d' }).map((e) => e.id)).toEqual(['today', 'yesterday']);
    expect(history.list({ range: 'all', token: 'next' }).map((e) => e.id)).toEqual(['eight-days']);
    expect(history.list({ range: 'all', source: 'training' }).map((e) => e.id)).toEqual(['today']);
  });

  it('summarises through the same filter', () => {
    history.append(tap());
    history.append(tap({ detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }));
    history.append(tap({ at: new Date(NOW.getTime() - 9 * DAY).toISOString() }));
    const week = history.summarise({ range: '7d' });
    expect(week).toMatchObject({ range: '7d', attempts: 2, successes: 1, misclassifications: 1 });
    expect(history.summarise().range).toBe('all');
    expect(history.summarise().attempts).toBe(3);
  });

  it('caps history at HISTORY_CAP by dropping the oldest', () => {
    const base = NOW.getTime() - HISTORY_CAP * 1000;
    const bulk = Array.from({ length: HISTORY_CAP }, (_, i) =>
      makeGestureEvent({ id: `bulk_${i}`, at: new Date(base + i * 1000).toISOString() }),
    );
    storage.set(STORAGE_KEYS.history, bulk);
    history.append(tap({ id: 'newest' }));
    expect(history.count()).toBe(HISTORY_CAP);
    const ids = history.list().map((e) => e.id);
    expect(ids[0]).toBe('newest');
    expect(ids).not.toContain('bulk_0');
    expect(ids).toContain('bulk_1');
  });

  it('ignores malformed stored records', () => {
    storage.set(STORAGE_KEYS.history, [
      makeGestureEvent({ id: 'ok', at: '2026-09-15T01:00:00.000Z' }),
      makeGestureEvent({ id: 'ok-with-target', at: '2026-09-15T02:00:00.000Z', targetToken: 'confirm' }),
      { ...makeGestureEvent({ id: 'bad-target' }), targetToken: 'call_mum' },
      { id: 'broken' },
      42,
      null,
    ]);
    expect(history.list().map((e) => e.id)).toEqual(['ok-with-target', 'ok']);
    expect(history.list()[0]?.targetToken).toBe('confirm');
    storage.set(STORAGE_KEYS.history, { not: 'an array' });
    expect(history.count()).toBe(0);
  });

  it('clears every event, seeded or not', () => {
    history.seedDemo(NOW);
    history.append(tap());
    history.clear();
    expect(history.count()).toBe(0);
    expect(storage.get(STORAGE_KEYS.history)).toBeNull();
    expect(history.hasSeededDemo()).toBe(true);
  });

  it('exports CSV and JSON oldest first', () => {
    history.append(tap({ id: 'second', at: '2026-09-15T02:00:00.000Z', targetToken: 'confirm' }));
    history.append(tap({ id: 'first', at: '2026-09-15T01:00:00.000Z' }));
    const csvLines = history.exportCsv().split('\r\n');
    expect(csvLines).toHaveLength(3);
    expect(csvLines[0]?.endsWith(',lessonId,targetToken')).toBe(true);
    expect(csvLines[1]?.startsWith('first,')).toBe(true);
    expect(csvLines[1]?.endsWith(',false,,')).toBe(true);
    expect(csvLines[2]?.endsWith(',false,,confirm')).toBe(true);
    const json = JSON.parse(history.exportJson()) as {
      format: string;
      version: number;
      exportedAt: string;
      note: string;
      events: { id: string; targetToken?: string }[];
    };
    expect(json.format).toBe('tactiq.history');
    expect(json.version).toBe(1);
    expect(json.exportedAt).toBe(NOW.toISOString());
    expect(json.note).toBe('Simulated practice records from the Tactiq user app. Not hardware measurements.');
    expect(json.events.map((e) => e.id)).toEqual(['first', 'second']);
    expect(json.events.map((e) => e.targetToken)).toEqual([undefined, 'confirm']);
  });

  it('does not call a JSON export free of hardware measurements once a bench record is in it', () => {
    history.append(tap({ id: 'simulated' }));
    history.append(tap({ id: 'bench', evidence: 'measured' }));
    const json = JSON.parse(history.exportJson()) as { note: string };
    expect(json.note).not.toMatch(/Not hardware measurements/);
    expect(json.note).toMatch(/evidence field/);
  });

  describe('removeSeeded', () => {
    it('removes only sample records in one write, keeps the rest in order and leaves the seeded flag set', () => {
      history.append(tap({ id: 'mine-early', at: new Date(NOW.getTime() - 6 * DAY).toISOString() }));
      history.seedDemo(NOW);
      history.append(tap({ id: 'mine-late', targetToken: 'confirm' }));
      const seededCount = history.list().filter((e) => e.seeded).length;
      expect(seededCount).toBeGreaterThan(0);
      const flag = storage.get(STORAGE_KEYS.historySeeded);

      const listener = vi.fn();
      history.subscribe(listener);
      const setSpy = vi.spyOn(storage, 'set');

      expect(history.removeSeeded()).toBe(seededCount);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(history.list().map((e) => e.id)).toEqual(['mine-late', 'mine-early']);
      expect(history.list()[0]?.targetToken).toBe('confirm');
      expect(storage.get<{ id: string }[]>(STORAGE_KEYS.history)?.map((e) => e.id)).toEqual(['mine-early', 'mine-late']);
      expect(history.lastWriteSucceeded()).toBe(true);
      expect(history.hasSeededDemo()).toBe(true);
      expect(storage.get(STORAGE_KEYS.historySeeded)).toEqual(flag);

      history.seedDemo(NOW);
      expect(history.count()).toBe(2);
    });

    it('returns 0 without writing or notifying when there are no sample records', () => {
      history.append(tap({ id: 'mine' }));
      const listener = vi.fn();
      history.subscribe(listener);
      const setSpy = vi.spyOn(storage, 'set');
      expect(history.removeSeeded()).toBe(0);
      expect(setSpy).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      expect(history.count()).toBe(1);
    });

    it('leaves an empty history when every record was a sample', () => {
      history.seedDemo(NOW);
      const count = history.count();
      expect(history.removeSeeded()).toBe(count);
      expect(history.count()).toBe(0);
      const reread = new LocalHistoryService(storage);
      expect(reread.count()).toBe(0);
      expect(reread.hasSeededDemo()).toBe(true);
      reread.dispose();
    });

    it('reports a failed write but removes the samples for this session', () => {
      history.seedDemo(NOW);
      history.append(tap({ id: 'mine' }));
      vi.spyOn(storage, 'set').mockReturnValue(false);
      expect(history.removeSeeded()).toBeGreaterThan(0);
      expect(history.lastWriteSucceeded()).toBe(false);
      expect(history.list().map((e) => e.id)).toEqual(['mine']);
    });
  });

  describe('seedDemo', () => {
    it('writes labelled sample records once and sets the flag', () => {
      expect(history.hasSeededDemo()).toBe(false);
      history.seedDemo(NOW);
      const count = history.count();
      expect(count).toBeGreaterThanOrEqual(48);
      expect(count).toBeLessThanOrEqual(60);
      expect(history.hasSeededDemo()).toBe(true);
      expect(storage.get(STORAGE_KEYS.historySeeded)).toEqual({ seededAt: NOW.toISOString(), count });
      history.seedDemo(NOW);
      expect(history.count()).toBe(count);
      const summary = history.summarise({ range: '7d' });
      expect(summary.includesSeeded).toBe(true);
      expect(summary.attempts).toBe(count);
      expect(summary.emergencies).toBe(0);
    });

    it('does not seed when another service instance already did', () => {
      history.seedDemo(NOW);
      const other = new LocalHistoryService(storage);
      other.seedDemo(NOW);
      expect(other.count()).toBe(history.count());
      other.dispose();
    });

    it('keeps events recorded before seeding', () => {
      history.append(tap({ id: 'mine' }));
      history.seedDemo(NOW);
      expect(history.list().some((e) => e.id === 'mine' && !e.seeded)).toBe(true);
    });

    it('uses the current time when no date is given', () => {
      history.seedDemo();
      expect(history.list().every((e) => Date.parse(e.at) <= NOW.getTime())).toBe(true);
    });
  });

  describe('persistence failures', () => {
    it('reports a failed write but keeps the event for this session', () => {
      vi.spyOn(storage, 'set').mockReturnValue(false);
      history.append(tap({ id: 'unsaved' }));
      expect(history.lastWriteSucceeded()).toBe(false);
      expect(history.list().map((e) => e.id)).toEqual(['unsaved']);
    });

    it('does not reseed in the same session when the flag could not be saved', () => {
      vi.spyOn(storage, 'set').mockReturnValue(false);
      vi.spyOn(storage, 'get').mockReturnValue(null);
      history.seedDemo(NOW);
      const count = history.count();
      history.seedDemo(NOW);
      expect(history.count()).toBe(count);
      expect(history.lastWriteSucceeded()).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('notifies once per append, clear and seed', () => {
      const listener = vi.fn();
      const unsubscribe = history.subscribe(listener);
      history.append(tap());
      expect(listener).toHaveBeenCalledTimes(1);
      history.clear();
      expect(listener).toHaveBeenCalledTimes(2);
      history.seedDemo(NOW);
      expect(listener).toHaveBeenCalledTimes(3);
      unsubscribe();
      history.append(tap());
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('notifies and re-reads when the history key changes elsewhere', () => {
      history.append(tap({ id: 'local' }));
      const listener = vi.fn();
      history.subscribe(listener);
      storage.set(STORAGE_KEYS.history, [makeGestureEvent({ id: 'from-another-tab' })]);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(history.list().map((e) => e.id)).toEqual(['from-another-tab']);
      storage.set(STORAGE_KEYS.training, { version: 1, lessons: {} });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('allows seeding again after storage is cleared elsewhere', () => {
      history.seedDemo(NOW);
      storage.clear();
      expect(history.hasSeededDemo()).toBe(false);
      expect(history.count()).toBe(0);
      history.seedDemo(NOW);
      expect(history.count()).toBeGreaterThanOrEqual(48);
    });
  });
});
