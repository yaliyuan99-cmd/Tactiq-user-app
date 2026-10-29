/**
 * The database's CHECK constraints and the app's domain types have to agree.
 *
 * They are written in different languages, in different files, and nothing but
 * this test connects them. Drift is silent and asymmetric: a value the app
 * produces but the database rejects loses a record at sync time, and a value
 * the database accepts but the app does not recognise comes back as a record
 * no screen can render. Neither shows up until there is real data.
 *
 * So the constraint lists are parsed out of the migration and compared with
 * the constants themselves. Adding a contact point, a command or a lesson
 * fails here until the migration is updated too.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_KEYS } from '@/domain/contacts';
import { COMMAND_TOKENS, SHORTCUT_ACTION_IDS } from '@/domain/commands';
import { LESSON_IDS } from '@/domain/lessons';
import { GESTURE_EVENT_KINDS, HANDS, RECORD_EVIDENCE } from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';

const MIGRATION = join(process.cwd(), 'supabase/migrations/20261030000100_initial_schema.sql');
const sql = readFileSync(MIGRATION, 'utf8');

/**
 * The values a named column's `in (...)` constraint allows. Matches the column
 * definition rather than any `in (` in the file, so a policy or a comment
 * elsewhere cannot satisfy the match by accident.
 */
function allowedValues(column: string): string[] {
  const pattern = new RegExp(`^\\s*${column}\\s+[a-z]+[^,]*?\\bin \\(([^)]*)\\)`, 'm');
  const match = pattern.exec(sql);
  if (!match) throw new Error(`No "in (...)" constraint found for column "${column}" in ${MIGRATION}`);
  const values = match[1] ?? '';
  return [...values.matchAll(/'([^']*)'/g)].flatMap((m) => (m[1] === undefined ? [] : [m[1]])).sort();
}

const sorted = (values: readonly string[]) => [...values].sort();

describe('the migration and the domain model agree', () => {
  it('allows exactly the eight contact points, everywhere a contact is stored', () => {
    for (const column of ['target_contact', 'detected_contact', 'contact']) {
      expect(allowedValues(column), column).toEqual(sorted(CONTACT_KEYS));
    }
  });

  it('allows exactly the nine commands where a command is stored', () => {
    for (const column of ['target_token', 'token']) {
      expect(allowedValues(column), column).toEqual(sorted(COMMAND_TOKENS));
    }
  });

  it('allows exactly the five lessons', () => {
    for (const column of ['lesson_id']) {
      expect(allowedValues(column), column).toEqual(sorted(LESSON_IDS));
    }
  });

  it('allows exactly the two hands, the two evidence kinds and the two event kinds', () => {
    expect(allowedValues('hand')).toEqual(sorted(HANDS));
    expect(allowedValues('evidence')).toEqual(sorted(RECORD_EVIDENCE));
    expect(allowedValues('kind')).toEqual(sorted(GESTURE_EVENT_KINDS));
  });

  it('bounds the onboarding step by the number of steps there actually are', () => {
    const match = /onboarding_step\s+smallint[^,]*?between (\d+) and (\d+)/.exec(sql);
    expect(match, 'no range constraint on onboarding_step').not.toBeNull();
    expect(Number(match?.[1])).toBe(0);
    expect(Number(match?.[2])).toBe(ONBOARDING_LAST_STEP);
  });

  it('stores a shortcut as one of the phone actions, and nothing else', () => {
    // A shortcut slot holds the action the tap triggers, not a command token.
    // Storing a token would let a row say the pinky base is Emergency, which
    // is a mapping the client refuses and the product says is impossible.
    for (const column of ['shortcut_1', 'shortcut_2']) {
      const allowed = allowedValues(column);
      expect(allowed, column).toEqual(sorted(SHORTCUT_ACTION_IDS));
      for (const token of COMMAND_TOKENS) expect(allowed, column).not.toContain(token);
    }
  });
});

describe('every table is protected', () => {
  const TABLES = [
    'profiles',
    'preferences',
    'gesture_events',
    'calibration_profiles',
    'calibration_samples',
    'lesson_progress',
    'command_mappings',
  ];

  it('creates no table without enabling row level security on it', () => {
    const created = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort();
    expect(created).toEqual([...TABLES].sort());
    for (const table of created) {
      const enabled = new RegExp(`alter table public\\.${table}\\s+enable row level security;`).test(sql);
      expect(enabled, `${table} has row level security enabled`).toBe(true);
    }
  });

  it('gives every table all four operations, so none is left unstated', () => {
    for (const table of TABLES) {
      const policies = [...sql.matchAll(new RegExp(`create policy "[^"]*"\\s+on public\\.${table} for (\\w+)`, 'g'))].map((m) => m[1]);
      expect([...policies].sort(), table).toEqual(['delete', 'insert', 'select', 'update']);
    }
  });

  it('checks ownership on insert as well as read, so no row can be written under another account', () => {
    // `using` decides what is visible; only `with check` decides what may be
    // written. An insert policy without one is the classic RLS hole.
    const inserts = [...sql.matchAll(/create policy "[^"]*"\s+on public\.(\w+) for insert[^;]*;/g)];
    expect(inserts).toHaveLength(TABLES.length);
    for (const [statement, table] of inserts) {
      expect(statement, `${table} insert policy`).toMatch(/with check \(\(select auth\.uid\(\)\) = (user_)?id\)/);
    }
  });

  it('grants nothing to anonymous requests', () => {
    const policies = [...sql.matchAll(/create policy "[^"]*"\s+on public\.\w+ for \w+ to (\w+)/g)].map((m) => m[1]);
    expect(policies.length).toBeGreaterThan(0);
    expect([...new Set(policies)]).toEqual(['authenticated']);
  });

  it('pins search_path on every function, including the one that runs as definer', () => {
    const functions = [...sql.matchAll(/create or replace function public\.(\w+)[\s\S]*?\$\$;/g)];
    expect(functions.length).toBeGreaterThan(0);
    for (const [body, name] of functions) {
      expect(body, `${name} pins search_path`).toMatch(/set search_path = ''/);
    }
  });
});
