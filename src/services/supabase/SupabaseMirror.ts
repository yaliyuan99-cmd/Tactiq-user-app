/**
 * Keeping one account's records in step between this browser and the database.
 *
 * Every service in this app reads its data synchronously, straight out of a
 * `StorageAdapter`, because a screen that has to wait for a round trip before
 * it can draw is a screen that stutters for a user who is mid-gesture. That is
 * not a limitation to work around: it is the reason the app works offline, on
 * a bench, with no network at all.
 *
 * So the database is a *mirror*, not the source of truth. The browser stays
 * authoritative for what is on screen; this class pulls what the account has
 * elsewhere into it on sign-in, and pushes local changes back afterwards.
 * Nothing here is on the path between a gesture and the screen.
 *
 * ## What the merge does, and what it does not
 *
 * - **Activity is append-only and merges properly.** Records carry the id the
 *   client generated, so the union of two devices' records is just that — a
 *   union, with no duplicates and no lost attempts, whichever order they sync
 *   in.
 * - **Everything else is last-device-wins.** Preferences, calibration, lesson
 *   progress and the two shortcuts are single records. On sign-in the remote
 *   value fills anything this browser does not already have; after that this
 *   browser's value wins and is pushed up.
 *
 * That second rule is a real limitation, stated here rather than discovered
 * later: calibrate on a phone and then open a laptop that already has a
 * calibration, and the laptop's is the one that survives. Doing better needs
 * per-field versions and a conflict the user can see, which is a larger piece
 * of work than this, and not one to fake with timestamps that two devices'
 * clocks disagree about.
 *
 * ## Verification status
 *
 * The mapping and the merge are covered by tests against a fake client. **No
 * part of this has been run against a real Supabase project**, because none is
 * configured — there is no `.env`, so `IS_SUPABASE_CONFIGURED` is false and
 * nothing here is reached. Treat the row names, the error shapes and the RLS
 * behaviour as unverified against the live service until someone has run it.
 */
import { DEFAULT_SHORTCUT_MAPPING, type ShortcutMapping } from '@/domain/commands';
import { LESSON_IDS, type LessonId } from '@/domain/lessons';
import type { CalibrationProfile, CommandMapping, GestureEvent, LessonProgress, TrainingProgress } from '@/domain/models';
import { HISTORY_CAP } from '@/services/history/events';
import type { ProfilePreferencesRecord } from '@/services/preferences/storedPreferences';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import {
  readCalibrationProfile,
  readGestureEvent,
  readLessonProgress,
  readPreferences,
  readShortcuts,
  writeCalibration,
  writeGestureEvent,
  writeLessonProgress,
  writePreferences,
  writeShortcuts,
  type CalibrationProfileRow,
  type CalibrationSampleRow,
  type CommandMappingRow,
  type GestureEventRow,
  type LessonProgressRow,
  type PreferencesRow,
} from './rows';

export const TABLES = {
  preferences: 'preferences',
  events: 'gesture_events',
  calibrationProfiles: 'calibration_profiles',
  calibrationSamples: 'calibration_samples',
  lessonProgress: 'lesson_progress',
  commandMappings: 'command_mappings',
} as const;

/**
 * The narrow slice of a database client this needs. Narrow on purpose: it is
 * what makes the merge testable without a network, and what keeps the rest of
 * the app from depending on one vendor's query builder.
 */
export interface MirrorClient {
  selectAll<T>(table: string, userId: string): Promise<T[]>;
  /** Insert or replace by primary key. */
  upsert(table: string, rows: readonly object[]): Promise<void>;
  /** Removes every row this account owns in `table`. */
  deleteAll(table: string, userId: string): Promise<void>;
}

/** What a sync run did, so a caller can report it rather than guess. */
export interface MirrorResult {
  readonly pulled: number;
  readonly pushed: number;
  /** Non-empty when part of the run failed. The rest of the run still happened. */
  readonly failures: readonly string[];
}

/** Sorts newest first and keeps the cap the local store keeps, so a pull cannot grow past it. */
function newestFirst(events: readonly GestureEvent[]): GestureEvent[] {
  return [...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, HISTORY_CAP);
}

function lessonsOf(progress: TrainingProgress | null): LessonProgress[] {
  if (!progress?.lessons) return [];
  return LESSON_IDS.map((id) => progress.lessons[id]).filter((lesson): lesson is LessonProgress => Boolean(lesson));
}

export class SupabaseMirror {
  constructor(
    private readonly client: MirrorClient,
    /** This profile's view of the store — the same one the services read. */
    private readonly storage: StorageAdapter,
    private readonly userId: string,
  ) {}

  /**
   * Brings down what the account has elsewhere. Activity is merged; a single
   * record is taken only where this browser has none, so opening the app on a
   * device that is already set up does not overwrite its setup.
   */
  async pull(): Promise<MirrorResult> {
    const failures: string[] = [];
    let pulled = 0;

    const eventRows = await this.read<GestureEventRow>(TABLES.events, failures);
    if (eventRows) {
      const remote = eventRows.map(readGestureEvent).filter((e): e is GestureEvent => e !== null);
      const local = this.storage.get<GestureEvent[]>(STORAGE_KEYS.history) ?? [];
      const byId = new Map(local.map((event) => [event.id, event]));
      let added = 0;
      for (const event of remote) {
        if (byId.has(event.id)) continue;
        byId.set(event.id, event);
        added += 1;
      }
      if (added > 0) this.storage.set(STORAGE_KEYS.history, newestFirst([...byId.values()]));
      pulled += added;
    }

    const prefsRows = await this.read<PreferencesRow>(TABLES.preferences, failures);
    if (prefsRows?.[0] && !this.storage.has(STORAGE_KEYS.profilePreferences)) {
      const record = readPreferences(prefsRows[0]);
      if (record) {
        this.storage.set(STORAGE_KEYS.profilePreferences, record);
        pulled += 1;
      }
    }

    if (!this.storage.has(STORAGE_KEYS.calibration)) {
      const profileRows = await this.read<CalibrationProfileRow>(TABLES.calibrationProfiles, failures);
      if (profileRows?.[0]) {
        const sampleRows = (await this.read<CalibrationSampleRow>(TABLES.calibrationSamples, failures)) ?? [];
        const profile = readCalibrationProfile(profileRows[0], sampleRows);
        if (profile) {
          this.storage.set(STORAGE_KEYS.calibration, profile);
          pulled += 1;
        }
      }
    }

    if (!this.storage.has(STORAGE_KEYS.training)) {
      const rows = await this.read<LessonProgressRow>(TABLES.lessonProgress, failures);
      const lessons = (rows ?? []).map(readLessonProgress).filter((l): l is LessonProgress => l !== null);
      if (lessons.length > 0) {
        const byLesson = Object.fromEntries(lessons.map((lesson) => [lesson.lessonId, lesson])) as Record<LessonId, LessonProgress>;
        this.storage.set<TrainingProgress>(STORAGE_KEYS.training, { version: 1, lessons: byLesson });
        pulled += lessons.length;
      }
    }

    if (!this.storage.has(STORAGE_KEYS.commandMapping)) {
      const rows = await this.read<CommandMappingRow>(TABLES.commandMappings, failures);
      const shortcuts = rows?.[0] ? readShortcuts(rows[0]) : null;
      if (shortcuts) {
        this.storage.set<CommandMapping>(STORAGE_KEYS.commandMapping, { version: 1, shortcuts, updatedAt: null });
        pulled += 1;
      }
    }

    return { pulled, pushed: 0, failures };
  }

  /**
   * Sends this browser's records up. Each table is attempted on its own, so a
   * table that rejects a write does not stop the others: losing one kind of
   * record is better than losing all of them because the first one failed.
   */
  async push(): Promise<MirrorResult> {
    const failures: string[] = [];
    let pushed = 0;

    const events = this.storage.get<GestureEvent[]>(STORAGE_KEYS.history) ?? [];
    if (events.length > 0) {
      const rows = events.map((event) => writeGestureEvent(this.userId, event));
      if (await this.write(TABLES.events, rows, failures)) pushed += rows.length;
    }

    const preferences = this.storage.get<ProfilePreferencesRecord>(STORAGE_KEYS.profilePreferences);
    if (preferences) {
      if (await this.write(TABLES.preferences, [writePreferences(this.userId, preferences)], failures)) pushed += 1;
    }

    const calibration = this.storage.get<CalibrationProfile>(STORAGE_KEYS.calibration);
    if (calibration) {
      const { profile, samples } = writeCalibration(this.userId, calibration);
      if (await this.write(TABLES.calibrationProfiles, [profile], failures)) {
        pushed += 1;
        // Samples are positional, so a shorter new set has to clear the old
        // one first: upserting alone would leave the tail of a longer previous
        // calibration attached to this one.
        try {
          await this.client.deleteAll(TABLES.calibrationSamples, this.userId);
          if (samples.length > 0 && (await this.write(TABLES.calibrationSamples, samples, failures))) pushed += samples.length;
        } catch (error) {
          failures.push(`${TABLES.calibrationSamples}: ${message(error)}`);
        }
      }
    }

    const lessons = lessonsOf(this.storage.get<TrainingProgress>(STORAGE_KEYS.training));
    if (lessons.length > 0) {
      const rows = lessons.map((lesson) => writeLessonProgress(this.userId, lesson));
      if (await this.write(TABLES.lessonProgress, rows, failures)) pushed += rows.length;
    }

    const mapping = this.storage.get<CommandMapping>(STORAGE_KEYS.commandMapping);
    const shortcuts: ShortcutMapping = mapping?.shortcuts ?? DEFAULT_SHORTCUT_MAPPING;
    if (mapping) {
      if (await this.write(TABLES.commandMappings, [writeShortcuts(this.userId, shortcuts)], failures)) pushed += 1;
    }

    return { pulled: 0, pushed, failures };
  }

  /** Pull, then push, reporting both halves together. */
  async sync(): Promise<MirrorResult> {
    const pulled = await this.pull();
    const pushed = await this.push();
    return { pulled: pulled.pulled, pushed: pushed.pushed, failures: [...pulled.failures, ...pushed.failures] };
  }

  private async read<T>(table: string, failures: string[]): Promise<T[] | null> {
    try {
      return await this.client.selectAll<T>(table, this.userId);
    } catch (error) {
      failures.push(`${table}: ${message(error)}`);
      return null;
    }
  }

  private async write(table: string, rows: readonly object[], failures: string[]): Promise<boolean> {
    try {
      await this.client.upsert(table, rows);
      return true;
    } catch (error) {
      failures.push(`${table}: ${message(error)}`);
      return false;
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
