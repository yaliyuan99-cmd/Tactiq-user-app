import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { HISTORY_CAP } from './events';
import { LocalHistoryService, intendedToken } from './LocalHistoryService';
import { makeActivationEvent, makeCalibrationEvent, makeGestureEvent } from './testing';
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
    // A brief tap answering an Emergency prompt is an emergency record, not a
    // Shortcut 1 attempt — and not a tap attempt either, so the summary and
    // the per-command rows cannot disagree about it.
    const summary = reread.summarise();
    expect(summary.attempts).toBe(0);
    expect(summary.counts).toMatchObject({ total: 1, attempts: 0, commandAttempts: 0, emergency: 1 });
    expect(summary.emergency).toEqual({ attempts: 1, completed: 0, cancelled: 0, notHeld: 1, rate: 0 });
    expect(summary.perCommand.find((c) => c.token === 'emergency')?.attempts).toBe(0);
    expect(summary.perCommand.find((c) => c.token === 'quick_action_1')?.attempts).toBe(0);
    expect(summary.perCommand.reduce((sum, row) => sum + row.attempts, 0)).toBe(summary.attempts);
    reread.dispose();
  });

  it('stores the activation kind and reads it back, and never counts it as an attempt', () => {
    const event = history.append({
      kind: 'activation',
      source: 'training',
      mode: 'lesson',
      lessonId: 'squeeze_to_activate',
      targetContact: null,
      detectedContact: null,
      token: null,
      durationMs: null,
      outcome: 'recognised',
      evidence: 'simulated',
    });
    expect(event.kind).toBe('activation');
    expect(storage.get(STORAGE_KEYS.history)).toEqual([event]);
    const reread = new LocalHistoryService(storage);
    expect(reread.list()).toEqual([event]);
    const summary = reread.summarise();
    expect(summary.counts).toMatchObject({ total: 1, activations: 1, attempts: 0, untargeted: 0, emergency: 0 });
    expect(summary.accuracy).toEqual({ attempts: 0, successes: 0, rate: null });
    reread.dispose();
  });

  it('omits the kind on a command record, so new records match the ones already stored', () => {
    expect('kind' in history.append(tap())).toBe(false);
    expect('kind' in history.append(tap({ id: 'explicit', kind: 'command' }))).toBe(false);
  });

  it('counts the records a filter matches without listing them', () => {
    history.append(tap({ id: 'mine' }));
    history.append(makeCalibrationEvent({ id: 'calibration' }));
    history.seedDemo(NOW);
    expect(history.countMatching()).toBe(history.count());
    expect(history.countMatching({ range: 'all', samples: 'exclude' })).toBe(2);
    expect(history.countMatching({ range: 'all', samples: 'only' })).toBe(history.count() - 2);
    expect(history.countMatching({ range: 'all', source: 'calibration' })).toBe(1);
  });

  it('summarises activations, free practice and calibration consistently through the service', () => {
    history.append(makeActivationEvent({ id: 'squeeze', at: '2026-09-15T01:00:00.000Z' }));
    history.append(tap({ id: 'free', mode: 'free', targetContact: null, at: '2026-09-15T01:01:00.000Z' }));
    history.append(makeCalibrationEvent({ id: 'calibration', at: '2026-09-15T01:02:00.000Z' }));
    history.append(tap({ id: 'guided', at: '2026-09-15T01:03:00.000Z' }));
    const summary = history.summarise({ range: 'all' });
    expect(summary.counts).toMatchObject({ total: 4, activations: 1, untargeted: 1, attempts: 2, commandAttempts: 1, contactAttempts: 1 });
    expect(summary.accuracy).toEqual({ attempts: 2, successes: 2, rate: 1 });
    expect(summary.perCommand.find((c) => c.token === 'read')?.attempts).toBe(0);
    expect(summary.perCommand.find((c) => c.token === 'confirm')?.attempts).toBe(1);
  });

  it('reads records stored before kind and targetToken existed, and summarises them', () => {
    // Written exactly as an older build left them in localStorage.
    storage.set(STORAGE_KEYS.history, [
      {
        id: 'old-guided',
        at: '2026-09-15T01:00:00.000Z',
        source: 'simulator',
        mode: 'guided',
        targetContact: 'middle_base',
        detectedContact: 'middle_base',
        token: 'next',
        durationMs: 210,
        outcome: 'recognised',
        evidence: 'simulated',
        seeded: false,
      },
      {
        id: 'old-squeeze',
        at: '2026-09-15T01:01:00.000Z',
        source: 'training',
        mode: 'lesson',
        lessonId: 'squeeze_to_activate',
        targetContact: null,
        detectedContact: null,
        token: null,
        durationMs: null,
        outcome: 'recognised',
        evidence: 'simulated',
        seeded: false,
      },
      {
        id: 'old-free',
        at: '2026-09-15T01:02:00.000Z',
        source: 'simulator',
        mode: 'free',
        targetContact: null,
        detectedContact: 'index_tip',
        token: 'confirm',
        durationMs: 180,
        outcome: 'recognised',
        evidence: 'simulated',
        seeded: false,
      },
    ]);
    expect(history.list().map((e) => e.id)).toEqual(['old-free', 'old-squeeze', 'old-guided']);
    expect(history.list().every((e) => !('kind' in e))).toBe(true);
    const summary = history.summarise({ range: 'all' });
    // The old squeeze is read as an activation, the free tap as unscored practice.
    expect(summary.counts).toMatchObject({ total: 3, activations: 1, untargeted: 1, attempts: 1, commandAttempts: 1 });
    expect(summary.accuracy).toEqual({ attempts: 1, successes: 1, rate: 1 });
    expect(summary.perCommand.find((c) => c.token === 'next')?.attempts).toBe(1);
    expect(summary.perCommand.find((c) => c.token === 'confirm')?.attempts).toBe(0);
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
    expect(csvLines[0]?.endsWith(',lessonId,targetToken,kind')).toBe(true);
    expect(csvLines[1]?.startsWith('first,')).toBe(true);
    expect(csvLines[1]?.endsWith(',false,,,command')).toBe(true);
    expect(csvLines[2]?.endsWith(',false,,confirm,command')).toBe(true);
    const json = JSON.parse(history.exportJson()) as {
      format: string;
      version: number;
      exportedAt: string;
      note: string;
      filtersApplied: boolean;
      filter: unknown;
      scope: string;
      events: { id: string; targetToken?: string }[];
    };
    expect(json.format).toBe('tactiq.history');
    expect(json.version).toBe(2);
    expect(json.exportedAt).toBe(NOW.toISOString());
    expect(json.note).toBe('Simulated practice records from the Tactiq user app. Not hardware measurements.');
    expect(json.filtersApplied).toBe(false);
    expect(json.filter).toBeNull();
    expect(json.scope).toBe('All 2 records in this browser. No sample records.');
    expect(json.events.map((e) => e.id)).toEqual(['first', 'second']);
    expect(json.events.map((e) => e.targetToken)).toEqual([undefined, 'confirm']);
  });

  it('exports a filtered view and says so, in the file and in the scope', () => {
    history.append(tap({ id: 'old', at: new Date(NOW.getTime() - 9 * DAY).toISOString() }));
    history.append(tap({ id: 'recent' }));
    history.seedDemo(NOW);
    const total = history.count();

    const unfiltered = history.exportScope();
    expect(unfiltered).toMatchObject({ filtersApplied: false, filter: null });
    expect(unfiltered.counts.total).toBe(total);
    expect(unfiltered.text).toMatch(/^All \d+ records in this browser\. Includes \d+ Demo Mode sample records/);

    const filter = { range: 'all', samples: 'exclude' } as const;
    const scope = history.exportScope(filter);
    expect(scope.filtersApplied).toBe(true);
    expect(scope.filter).toEqual(filter);
    expect(scope.counts).toMatchObject({ total: 2, seeded: 0, own: 2 });
    expect(scope.text).toBe(`A filtered view: 2 of ${total} records in this browser. No sample records.`);

    const csvLines = history.exportCsv(filter).split('\r\n');
    expect(csvLines).toHaveLength(3);
    expect(csvLines.slice(1).map((line) => line.split(',')[0])).toEqual(['old', 'recent']);

    const json = JSON.parse(history.exportJson(filter)) as {
      filtersApplied: boolean;
      filter: unknown;
      scope: string;
      events: { id: string }[];
    };
    expect(json.filtersApplied).toBe(true);
    expect(json.filter).toEqual(filter);
    expect(json.scope).toBe(scope.text);
    expect(json.events.map((e) => e.id)).toEqual(['old', 'recent']);
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
      expect(summary.counts.total).toBe(count);
      expect(summary.counts.seeded).toBe(count);
      expect(summary.counts.own).toBe(0);
      expect(summary.counts.activations).toBe(0);
      // Guided taps are scored; the free-practice records are recorded and not scored.
      expect(summary.counts.untargeted).toBeGreaterThan(0);
      expect(summary.counts.attempts + summary.counts.untargeted).toBe(count);
      expect(summary.attempts).toBe(summary.counts.attempts);
      expect(summary.attempts).toBeLessThan(count);
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
