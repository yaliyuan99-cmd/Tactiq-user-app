import { DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import type { CalibrationProfile, CommandMapping, GestureEvent, TrainingProgress } from '@/domain/models';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { scopedStorage } from '@/services/storage/scopedStorage';
import { PUSH_CHUNK, SupabaseMirror, TABLES, type MirrorClient, type SyncMark } from './SupabaseMirror';

const USER = '11111111-2222-3333-4444-555555555555';

interface Call {
  readonly op: 'select' | 'upsert' | 'deleteFromOrdinal';
  readonly table: string;
  readonly rows?: number;
  readonly fromOrdinal?: number;
}

/** A client that records what it was asked to do and can be told to fail. */
function fakeClient(options: { rows?: Record<string, object[]>; failOn?: string } = {}) {
  const calls: Call[] = [];
  const rows = options.rows ?? {};
  const client: MirrorClient = {
    async selectAll<T>(table: string): Promise<T[]> {
      calls.push({ op: 'select', table });
      if (options.failOn === `select:${table}`) throw new Error('network down');
      return (rows[table] ?? []) as T[];
    },
    async upsert(table, written) {
      calls.push({ op: 'upsert', table, rows: written.length });
      if (options.failOn === `upsert:${table}`) throw new Error('row level security');
    },
    async deleteFromOrdinal(table, _userId, fromOrdinal) {
      calls.push({ op: 'deleteFromOrdinal', table, fromOrdinal });
      if (options.failOn === `delete:${table}`) throw new Error('delete refused');
    },
  };
  return { client, calls };
}

function event(id: string, at: string, seeded = false): GestureEvent {
  return {
    id,
    at,
    source: 'simulator',
    mode: 'guided',
    kind: 'command',
    targetContact: 'index_tip',
    detectedContact: 'index_tip',
    token: 'confirm',
    durationMs: 120,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded,
  };
}

function setup(options: Parameters<typeof fakeClient>[0] = {}) {
  const root = new MemoryStorageAdapter();
  const storage = scopedStorage(root, USER);
  const { client, calls } = fakeClient(options);
  return { root, storage, client, calls, mirror: new SupabaseMirror(client, storage, USER) };
}

describe('pushing activity', () => {
  it('never sends the Demo Mode samples, which were invented locally', async () => {
    const { storage, mirror, calls } = setup();
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [
      event('real', '2026-10-30T09:00:00.000Z'),
      event('sample', '2026-10-30T09:01:00.000Z', true),
    ]);

    const result = await mirror.push();

    // Uploading a fabricated record would put something in the account that
    // the person never did, and hand it to their other devices as if they had.
    expect(result.pushed).toBe(1);
    expect(calls.filter((call) => call.table === TABLES.events)).toEqual([
      { op: 'upsert', table: TABLES.events, rows: 1 },
    ]);
  });

  it('sends nothing at all when the only records are samples', async () => {
    const { storage, mirror, calls } = setup();
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('s1', '2026-10-30T09:00:00.000Z', true)]);

    await mirror.push();

    expect(calls.some((call) => call.table === TABLES.events)).toBe(false);
  });

  it('does not send the same records again on the next sync', async () => {
    const { storage, mirror, calls } = setup();
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('a', '2026-10-30T09:00:00.000Z')]);

    await mirror.push();
    const second = await mirror.push();

    // Re-sending the whole history every time grows without bound, and the
    // server already has it.
    expect(second.pushed).toBe(0);
    expect(calls.filter((call) => call.op === 'upsert' && call.table === TABLES.events)).toHaveLength(1);
  });

  it('sends a record that shares the newest timestamp but was not sent', async () => {
    // The trap a plain timestamp watermark falls into: two records recorded in
    // the same millisecond, one of them arriving after the first sync.
    const { storage, mirror } = setup();
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('a', '2026-10-30T09:00:00.000Z')]);
    await mirror.push();

    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [
      event('a', '2026-10-30T09:00:00.000Z'),
      event('b', '2026-10-30T09:00:00.000Z'),
    ]);
    const second = await mirror.push();

    expect(second.pushed).toBe(1);
    expect([...(storage.get<SyncMark>(STORAGE_KEYS.historySynced)?.ids ?? [])].sort()).toEqual(['a', 'b']);
  });

  it('sends records added since the last sync, and only those', async () => {
    const { storage, mirror, calls } = setup();
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('a', '2026-10-30T09:00:00.000Z')]);
    await mirror.push();

    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [
      event('a', '2026-10-30T09:00:00.000Z'),
      event('b', '2026-10-30T10:00:00.000Z'),
    ]);
    const second = await mirror.push();

    expect(second.pushed).toBe(1);
    expect(calls.filter((call) => call.op === 'upsert' && call.table === TABLES.events).at(-1)).toMatchObject({ rows: 1 });
  });

  it('breaks a large history into chunks rather than one enormous write', async () => {
    const { storage, mirror, calls } = setup();
    const many = Array.from({ length: PUSH_CHUNK + 20 }, (_, i) =>
      event(`e${i}`, new Date(Date.UTC(2026, 9, 30, 0, 0, i)).toISOString()),
    );
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, many);

    const result = await mirror.push();

    const writes = calls.filter((call) => call.op === 'upsert' && call.table === TABLES.events);
    expect(writes).toHaveLength(2);
    expect(writes[0]?.rows).toBe(PUSH_CHUNK);
    expect(writes[1]?.rows).toBe(20);
    expect(result.pushed).toBe(many.length);
  });

  it('keeps the records a failed chunk did not cover, so a retry sends them', async () => {
    const { storage, mirror } = setup({ failOn: `upsert:${TABLES.events}` });
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('a', '2026-10-30T09:00:00.000Z')]);

    const first = await mirror.push();
    expect(first.pushed).toBe(0);
    expect(first.failures.join(' ')).toContain('row level security');

    // The watermark must not have advanced over records that were never stored.
    const { storage: storage2, mirror: mirror2, calls: calls2 } = setup();
    storage2.set<GestureEvent[]>(STORAGE_KEYS.history, [event('a', '2026-10-30T09:00:00.000Z')]);
    const mark = storage.get(STORAGE_KEYS.historySynced);
    if (mark) storage2.set(STORAGE_KEYS.historySynced, mark);
    await mirror2.push();
    expect(calls2.some((call) => call.op === 'upsert' && call.table === TABLES.events)).toBe(true);
  });
});

describe('pushing calibration', () => {
  const calibration: CalibrationProfile = {
    id: 'cal_1',
    hand: 'right',
    status: 'complete',
    startedAt: '2026-10-30T09:00:00.000Z',
    completedAt: '2026-10-30T09:05:00.000Z',
    samplesRequiredPerContact: 3,
    evidence: 'simulated',
    deviceId: null,
    samples: [
      { contact: 'index_tip', recordedAt: '2026-10-30T09:01:00.000Z', durationMs: 110, detectedContact: 'index_tip', accepted: true },
      { contact: 'index_tip', recordedAt: '2026-10-30T09:02:00.000Z', durationMs: 115, detectedContact: 'index_tip', accepted: true },
    ],
  };

  it('writes the new samples before trimming the old ones', async () => {
    const { storage, mirror, calls } = setup();
    storage.set<CalibrationProfile>(STORAGE_KEYS.calibration, calibration);

    await mirror.push();

    const sampleCalls = calls.filter((call) => call.table === TABLES.calibrationSamples);
    expect(sampleCalls.map((call) => call.op)).toEqual(['upsert', 'deleteFromOrdinal']);
    // Trimming from the new length removes only the tail of a longer previous
    // calibration; it never clears the set.
    expect(sampleCalls[1]?.fromOrdinal).toBe(calibration.samples.length);
  });

  it('leaves the stored samples alone when the write fails', async () => {
    const { storage, mirror, calls } = setup({ failOn: `upsert:${TABLES.calibrationSamples}` });
    storage.set<CalibrationProfile>(STORAGE_KEYS.calibration, calibration);

    const result = await mirror.push();

    // Clearing first and failing second would leave the account with no
    // calibration at all. Nothing is deleted unless the replacement is stored.
    expect(calls.some((call) => call.op === 'deleteFromOrdinal')).toBe(false);
    expect(result.failures.join(' ')).toContain('row level security');
  });
});

describe('pushing the rest', () => {
  it('sends the shortcuts only when this browser has a mapping of its own', async () => {
    const { storage, mirror, calls } = setup();
    await mirror.push();
    expect(calls.some((call) => call.table === TABLES.commandMappings)).toBe(false);

    storage.set<CommandMapping>(STORAGE_KEYS.commandMapping, {
      version: 1,
      shortcuts: DEFAULT_SHORTCUT_MAPPING,
      updatedAt: null,
    });
    await mirror.push();
    expect(calls.some((call) => call.op === 'upsert' && call.table === TABLES.commandMappings)).toBe(true);
  });

  it('carries on with the other tables when one of them fails', async () => {
    const { storage, mirror, calls } = setup({ failOn: `upsert:${TABLES.preferences}` });
    storage.set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'right' });
    storage.set<TrainingProgress>(STORAGE_KEYS.training, {
      version: 1,
      lessons: {
        confirm_and_back: {
          lessonId: 'confirm_and_back',
          status: 'complete',
          attempts: 4,
          correct: 4,
          bestAccuracy: 1,
          lastAccuracy: 1,
          lastAttemptAt: '2026-10-30T09:00:00.000Z',
          completedAt: '2026-10-30T09:01:00.000Z',
          runs: 1,
        },
      } as TrainingProgress['lessons'],
    });

    const result = await mirror.push();

    // Losing one kind of record is better than losing all of them because the
    // first one failed.
    expect(result.failures).toHaveLength(1);
    expect(calls.some((call) => call.op === 'upsert' && call.table === TABLES.lessonProgress)).toBe(true);
  });
});

describe('pulling', () => {
  it('merges the account’s records in without losing this browser’s', async () => {
    const remote = [
      { user_id: USER, id: 'remote', at: '2026-10-29T09:00:00.000Z', source: 'simulator', mode: 'guided', kind: 'command', outcome: 'recognised', evidence: 'simulated', seeded: false },
    ];
    const { storage, mirror } = setup({ rows: { [TABLES.events]: remote } });
    storage.set<GestureEvent[]>(STORAGE_KEYS.history, [event('local', '2026-10-30T09:00:00.000Z')]);

    const result = await mirror.pull();

    const merged = storage.get<GestureEvent[]>(STORAGE_KEYS.history) ?? [];
    expect(merged.map((e) => e.id).sort()).toEqual(['local', 'remote']);
    expect(result.pulled).toBe(1);
  });

  it('does not take a record twice when it is pulled again', async () => {
    const remote = [
      { user_id: USER, id: 'remote', at: '2026-10-29T09:00:00.000Z', source: 'simulator', mode: 'guided', kind: 'command', outcome: 'recognised', evidence: 'simulated', seeded: false },
    ];
    const { storage, mirror } = setup({ rows: { [TABLES.events]: remote } });

    await mirror.pull();
    const second = await mirror.pull();

    expect(second.pulled).toBe(0);
    expect(storage.get<GestureEvent[]>(STORAGE_KEYS.history)).toHaveLength(1);
  });

  it('does not overwrite setup this browser has already done', async () => {
    const remote = [{ user_id: USER, hand: 'left', onboarding_completed: true, onboarding_step: 3 }];
    const { storage, mirror } = setup({ rows: { [TABLES.preferences]: remote } });
    storage.set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'right', onboardingCompleted: false, onboardingStep: 1 });

    await mirror.pull();

    expect(storage.get<{ hand: string }>(STORAGE_KEYS.profilePreferences)?.hand).toBe('right');
  });

  it('reports a failure instead of throwing, and still tries the other tables', async () => {
    const { mirror } = setup({ failOn: `select:${TABLES.events}` });
    const result = await mirror.pull();
    expect(result.failures.join(' ')).toContain('network down');
  });
});
