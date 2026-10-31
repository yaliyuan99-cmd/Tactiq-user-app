/**
 * Practice data left under the unscoped keys by a build from before profiles
 * existed.
 *
 * Those keys ('history', 'calibration', 'training', 'commands') used to belong
 * to the browser, so a profile signing in now cannot know whose records they
 * are. Nothing adopts them on its own: `detectLegacyData` reports what is
 * there so Settings can ask, and the profile's own data is never overwritten.
 *
 * The person's half of the preferences is handled here too, even though it
 * lives inside the device-wide 'prefs' record rather than under a key of its
 * own. It used to be claimed automatically by the first profile to sign in,
 * which handed a stranger the previous owner's hand and a finished setup they
 * had never seen. The appearance half — theme, text size, contrast, reduced
 * motion — stays device-wide and is never moved: that one really does belong
 * to the screen in front of you.
 */
import { PROFILE_PREFERENCE_FIELDS, type ProfilePreferenceField } from '@/services/preferences/storedPreferences';
import { DEVICE_WIDE_KEYS, STORAGE_KEYS, type StorageAdapter } from './StorageAdapter';
import { rootStorage, scopedKey } from './scopedStorage';

/** The person-half fields a pre-profiles build left inside the device record. */
function legacyPreferenceFields(root: StorageAdapter): ProfilePreferenceField[] {
  const record = root.get<Record<string, unknown>>(STORAGE_KEYS.preferences);
  if (!record || typeof record !== 'object') return [];
  return PROFILE_PREFERENCE_FIELDS.filter((field) => record[field] !== undefined);
}

interface LegacyKind {
  readonly key: string;
  /** One plain sentence naming what is stored, given the stored value. */
  readonly describe: (value: unknown) => string;
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function lessonsWithProgress(value: unknown): number {
  if (typeof value !== 'object' || value === null) return 0;
  const lessons = (value as { lessons?: unknown }).lessons;
  if (typeof lessons !== 'object' || lessons === null) return 0;
  return Object.keys(lessons).length;
}

/** The unscoped keys that used to hold one browser's practice data, in reading order. */
const LEGACY_KINDS: readonly LegacyKind[] = [
  {
    key: STORAGE_KEYS.history,
    describe: (value) => plural(count(value), 'activity record', 'activity records'),
  },
  { key: STORAGE_KEYS.calibration, describe: () => 'One calibration record' },
  {
    key: STORAGE_KEYS.training,
    describe: (value) => plural(lessonsWithProgress(value), 'lesson with progress', 'lessons with progress'),
  },
  { key: STORAGE_KEYS.commandMapping, describe: () => 'What Shortcut 1 and Shortcut 2 are set to' },
];

/** Carried with the data when it is adopted, but never a reason on its own to ask. */
const LEGACY_FLAG_KEYS: readonly string[] = [STORAGE_KEYS.historySeeded];

export interface LegacyDataReport {
  /** True when there is practice data to decide about. */
  readonly hasData: boolean;
  /** The unscoped keys found, including the "samples already written" flag. */
  readonly keys: readonly string[];
  /** One plain sentence per kind of data found, for the question Settings asks. */
  readonly summary: readonly string[];
}

export interface LegacyAdoptionResult {
  /** Keys copied into the profile and then removed from the unscoped keys. */
  readonly adopted: readonly string[];
  /**
   * Keys left exactly where they are, because the profile already has its own
   * record under that key, the value could not be read, or the browser refused
   * the write. Nothing is thrown away to make room.
   */
  readonly skipped: readonly string[];
  /** False when the browser refused a write, so the move did not finish. */
  readonly persisted: boolean;
}

/**
 * What a pre-profiles build left in this browser. `storage` may be a profile's
 * scoped view or the store underneath it; the unscoped keys are read from the
 * store either way.
 */
export function detectLegacyData(storage: StorageAdapter): LegacyDataReport {
  const root = rootStorage(storage);
  const keys: string[] = [];
  const summary: string[] = [];
  for (const kind of LEGACY_KINDS) {
    if (!root.has(kind.key)) continue;
    keys.push(kind.key);
    const value = root.get<unknown>(kind.key);
    summary.push(value === null ? 'A record that could not be read' : kind.describe(value));
  }
  const preferenceFields = legacyPreferenceFields(root);
  if (preferenceFields.length > 0) {
    summary.push(
      preferenceFields.includes('onboardingCompleted')
        ? 'Settings from before profiles existed, including which hand and whether setup was finished'
        : 'Settings from before profiles existed, such as which hand and the feedback choices',
    );
  }
  const hasData = keys.length > 0 || preferenceFields.length > 0;
  for (const key of LEGACY_FLAG_KEYS) {
    if (root.has(key)) keys.push(key);
  }
  return { hasData, keys, summary };
}

/**
 * Moves the unscoped data into `scopeId`'s own keys, one key at a time. A key
 * the profile already has is left alone, and a key whose copy was refused is
 * left where it is, so nothing is lost either way.
 */
export function adoptLegacyData(storage: StorageAdapter, scopeId: string): LegacyAdoptionResult {
  const root = rootStorage(storage);
  const adopted: string[] = [];
  const skipped: string[] = [];
  let persisted = true;

  for (const key of [...LEGACY_KINDS.map((kind) => kind.key), ...LEGACY_FLAG_KEYS]) {
    if (!root.has(key) || DEVICE_WIDE_KEYS.has(key)) continue;
    const target = scopedKey(scopeId, key);
    const value = root.get<unknown>(key);
    if (value === null || root.has(target)) {
      skipped.push(key);
      continue;
    }
    if (!root.set(target, value)) {
      persisted = false;
      skipped.push(key);
      continue;
    }
    root.remove(key);
    adopted.push(key);
  }

  // The person-half of the preferences moves by field, not by key: it sits
  // inside the device-wide record, which itself stays where it is.
  const preferenceFields = legacyPreferenceFields(root);
  if (preferenceFields.length > 0) {
    const device = root.get<Record<string, unknown>>(STORAGE_KEYS.preferences) ?? {};
    const target = scopedKey(scopeId, STORAGE_KEYS.profilePreferences);
    if (root.has(target)) {
      skipped.push(STORAGE_KEYS.profilePreferences);
    } else {
      const claimed: Record<string, unknown> = { version: 1 };
      for (const field of preferenceFields) claimed[field] = device[field];
      if (root.set(target, claimed)) {
        const appearanceOnly = Object.fromEntries(
          Object.entries(device).filter(([key]) => !(PROFILE_PREFERENCE_FIELDS as readonly string[]).includes(key)),
        );
        root.set(STORAGE_KEYS.preferences, appearanceOnly);
        adopted.push(STORAGE_KEYS.profilePreferences);
      } else {
        persisted = false;
        skipped.push(STORAGE_KEYS.profilePreferences);
      }
    }
  }

  return { adopted, skipped, persisted };
}

/** Removes the unscoped data. Only ever called after the user has said so. */
export function discardLegacyData(storage: StorageAdapter): void {
  const root = rootStorage(storage);
  for (const key of [...LEGACY_KINDS.map((kind) => kind.key), ...LEGACY_FLAG_KEYS]) {
    if (DEVICE_WIDE_KEYS.has(key)) continue;
    root.remove(key);
  }
  // The device record itself stays — it still holds the appearance half, which
  // belongs to the browser. Only the previous person's fields go.
  const device = root.get<Record<string, unknown>>(STORAGE_KEYS.preferences);
  if (device && typeof device === 'object') {
    const appearanceOnly = Object.fromEntries(
      Object.entries(device).filter(([key]) => !(PROFILE_PREFERENCE_FIELDS as readonly string[]).includes(key)),
    );
    root.set(STORAGE_KEYS.preferences, appearanceOnly);
  }
}
