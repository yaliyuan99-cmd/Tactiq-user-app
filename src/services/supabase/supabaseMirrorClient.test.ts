import { createSupabaseMirrorClient, PAGE_SIZE, type MirrorQuery, type SupabaseDataLike } from './supabaseMirrorClient';

const USER = '11111111-2222-3333-4444-555555555555';

interface Recorded {
  readonly table: string;
  readonly op: string;
  readonly filters: Record<string, unknown>;
  readonly range?: [number, number];
  readonly rows?: number;
}

/**
 * A stand-in for the PostgREST builder. Records every call and serves rows a
 * page at a time, as the real server does.
 */
function fakeData(rows: Record<string, object[]>, error?: { message: string; code?: string }) {
  const calls: Recorded[] = [];
  const from = <T,>(table: string): MirrorQuery<T> => {
    const filters: Record<string, unknown> = {};
    let op = 'select';
    const builder: MirrorQuery<T> = {
      select: () => builder,
      eq: (column, value) => {
        filters[column] = value;
        return builder;
      },
      gte: (column, value) => {
        filters[`${column}>=`] = value;
        return builder;
      },
      order: () => builder,
      range: (start, end) => {
        calls.push({ table, op, filters, range: [start, end] });
        if (error) return Promise.resolve({ data: null, error });
        return Promise.resolve({ data: (rows[table] ?? []).slice(start, end + 1) as T[], error: null });
      },
      upsert: (written) => {
        calls.push({ table, op: 'upsert', filters, rows: written.length });
        return Promise.resolve({ data: null, error: error ?? null });
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      then: (onfulfilled) => {
        calls.push({ table, op, filters });
        return Promise.resolve(onfulfilled({ data: null, error: error ?? null }));
      },
    };
    return builder;
  };
  return { calls, data: { from } as SupabaseDataLike };
}

function manyRows(count: number): object[] {
  return Array.from({ length: count }, (_, i) => ({ user_id: USER, id: `row-${i}` }));
}

describe('reading', () => {
  it('returns every row when there are more than one page', async () => {
    // The bug this exists for: PostgREST caps a response and reports no error,
    // so a person with a long history would sync only the first page and
    // nothing would look wrong.
    const total = PAGE_SIZE * 2 + 7;
    const { data, calls } = fakeData({ gesture_events: manyRows(total) });
    const client = createSupabaseMirrorClient(async () => data);

    const rows = await client.selectAll('gesture_events', USER);

    expect(rows).toHaveLength(total);
    expect(calls.filter((call) => call.op === 'select')).toHaveLength(3);
    expect(calls[0]?.range).toEqual([0, PAGE_SIZE - 1]);
    expect(calls[1]?.range).toEqual([PAGE_SIZE, PAGE_SIZE * 2 - 1]);
  });

  it('stops after a short page rather than asking forever', async () => {
    const { data, calls } = fakeData({ gesture_events: manyRows(3) });
    const client = createSupabaseMirrorClient(async () => data);

    await client.selectAll('gesture_events', USER);

    expect(calls.filter((call) => call.op === 'select')).toHaveLength(1);
  });

  it('asks for one page more when a page comes back exactly full', async () => {
    // A full page might be the last one, or might not. Assuming it is the last
    // would lose everything after it.
    const { data, calls } = fakeData({ gesture_events: manyRows(PAGE_SIZE) });
    const client = createSupabaseMirrorClient(async () => data);

    const rows = await client.selectAll('gesture_events', USER);

    expect(rows).toHaveLength(PAGE_SIZE);
    expect(calls.filter((call) => call.op === 'select')).toHaveLength(2);
  });

  it('reads only this account’s rows', async () => {
    const { data, calls } = fakeData({ gesture_events: [] });
    const client = createSupabaseMirrorClient(async () => data);

    await client.selectAll('gesture_events', USER);

    expect(calls[0]?.filters).toEqual({ user_id: USER });
  });

  it('says which table failed and reports the code, so a refusal is not read as a network fault', async () => {
    const { data } = fakeData({}, { message: 'new row violates row-level security policy', code: '42501' });
    const client = createSupabaseMirrorClient(async () => data);

    await expect(client.selectAll('gesture_events', USER)).rejects.toThrow(/gesture_events \[42501\]/);
  });
});

describe('writing', () => {
  it('does not call the server with an empty list', async () => {
    const { data, calls } = fakeData({});
    const client = createSupabaseMirrorClient(async () => data);

    await client.upsert('gesture_events', []);

    expect(calls).toHaveLength(0);
  });

  it('upserts, so a retry converges instead of duplicating', async () => {
    const { data, calls } = fakeData({});
    const client = createSupabaseMirrorClient(async () => data);

    await client.upsert('gesture_events', [{ id: 'a' }, { id: 'b' }]);

    expect(calls).toEqual([{ table: 'gesture_events', op: 'upsert', filters: {}, rows: 2 }]);
  });

  it('turns a write refusal into an error naming the table', async () => {
    const { data } = fakeData({}, { message: 'permission denied', code: '42501' });
    const client = createSupabaseMirrorClient(async () => data);

    await expect(client.upsert('preferences', [{ id: 'a' }])).rejects.toThrow(/writing preferences \[42501\]/);
  });
});

describe('trimming calibration samples', () => {
  it('removes only the ordinals at or above the new length, for this account', async () => {
    const { data, calls } = fakeData({});
    const client = createSupabaseMirrorClient(async () => data);

    await client.deleteFromOrdinal('calibration_samples', USER, 24);

    expect(calls).toEqual([
      { table: 'calibration_samples', op: 'delete', filters: { user_id: USER, 'ordinal>=': 24 } },
    ]);
  });
});
