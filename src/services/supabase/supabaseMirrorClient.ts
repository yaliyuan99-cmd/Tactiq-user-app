/**
 * The `MirrorClient` implementation, over `@supabase/supabase-js`.
 *
 * Narrow on purpose: `SupabaseMirror` is written against three methods, and
 * this is the only file that knows they are PostgREST calls. That is what let
 * the merge be tested without a network, and what keeps one vendor's query
 * builder out of the rest of the app.
 *
 * Reads are paginated. PostgREST caps a response at its configured maximum —
 * 1000 rows by default — and returns the first page with no error and no
 * indication that anything was left behind. A person with more than a
 * thousand practice records would silently sync only the newest thousand, and
 * nothing would look wrong. So every read pages until a short page arrives.
 *
 * Writes go through `upsert`, keyed by each table's own primary key, so a
 * retry after a failed or half-finished sync converges instead of duplicating.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { MirrorClient } from './SupabaseMirror';

/** One page of rows. PostgREST's maximum is a server setting; this is ours. */
export const PAGE_SIZE = 500;

interface PostgrestError {
  readonly message: string;
  readonly code?: string;
  readonly details?: string;
}

interface PostgrestResponse<T> {
  readonly data: T[] | null;
  readonly error: PostgrestError | null;
}

/**
 * The slice of the PostgREST builder this uses. Structural, so a fake in a
 * test satisfies it without pulling in the library.
 */
export interface MirrorQuery<T> {
  select(columns: string): MirrorQuery<T>;
  eq(column: string, value: unknown): MirrorQuery<T>;
  gte(column: string, value: unknown): MirrorQuery<T>;
  order(column: string, options: { ascending: boolean }): MirrorQuery<T>;
  range(from: number, to: number): PromiseLike<PostgrestResponse<T>>;
  upsert(rows: readonly object[]): PromiseLike<PostgrestResponse<T>>;
  delete(): MirrorQuery<T>;
  then<R>(onfulfilled: (value: PostgrestResponse<T>) => R): PromiseLike<R>;
}

export interface SupabaseDataLike {
  from<T>(table: string): MirrorQuery<T>;
}

export type SupabaseDataLoader = () => Promise<SupabaseDataLike>;

let clientPromise: Promise<SupabaseDataLike> | null = null;

/**
 * Imports the library and creates the shared client on first use, exactly as
 * the auth client does, so Demo Mode never downloads or constructs one. A
 * failed load can be retried.
 */
export const loadSupabaseData: SupabaseDataLoader = () => {
  if (!clientPromise) {
    const pending = import('@supabase/supabase-js').then(
      ({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseDataLike,
    );
    clientPromise = pending;
    pending.catch(() => {
      if (clientPromise === pending) clientPromise = null;
    });
  }
  return clientPromise;
};

function fail(table: string, action: string, error: PostgrestError): never {
  // The code matters: PostgREST reports a row level security refusal as 42501,
  // which means the policy rejected the write, not that the network failed.
  // Saying which is the difference between "try again" and "this will never work".
  const code = error.code ? ` [${error.code}]` : '';
  throw new Error(`${action} ${table}${code}: ${error.message}`);
}

export function createSupabaseMirrorClient(load: SupabaseDataLoader = loadSupabaseData): MirrorClient {
  return {
    async selectAll<T>(table: string, userId: string): Promise<T[]> {
      const data = await load();
      const rows: T[] = [];
      for (let page = 0; ; page += 1) {
        const from = page * PAGE_SIZE;
        const result = await data
          .from<T>(table)
          .select('*')
          .eq('user_id', userId)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (result.error) fail(table, 'reading', result.error);
        const batch = result.data ?? [];
        rows.push(...batch);
        // A short page is the last page. A full one might not be, so ask again
        // rather than assuming the server's cap equals ours.
        if (batch.length < PAGE_SIZE) return rows;
      }
    },

    async upsert(table: string, rows: readonly object[]): Promise<void> {
      if (rows.length === 0) return;
      const data = await load();
      const result = await data.from(table).upsert(rows);
      if (result.error) fail(table, 'writing', result.error);
    },

    async deleteFromOrdinal(table: string, userId: string, fromOrdinal: number): Promise<void> {
      const data = await load();
      const result = await data.from(table).delete().eq('user_id', userId).gte('ordinal', fromOrdinal);
      if (result.error) fail(table, 'trimming', result.error);
    },
  };
}
