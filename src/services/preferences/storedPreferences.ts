/**
 * Reading and writing the stored preferences, which are kept in two halves.
 *
 * Ownership. Appearance — theme, text size, contrast, reduced motion —
 * describes the browser you are looking at, so it stays device-wide under
 * `STORAGE_KEYS.preferences` ('tactiq.prefs'), the key public/theme-init.js
 * reads before React starts. Everything else — hand, feedback, timing and
 * setup progress — describes the person, so it is written under
 * `STORAGE_KEYS.profilePreferences`, which the signed-in profile's storage
 * view puts behind that profile's prefix. `usePreferences()` merges the two,
 * so no screen has to know which half a field came from.
 *
 * Validation. Preferences come out of the browser's own storage, which
 * anything can write to: an older build of this app, a half-finished write, a
 * hand-edited value. Spreading whatever is there over the defaults would put a
 * value of the wrong type straight into a renderer, where one bad field can
 * take a whole screen down. So every field is checked on its own and falls
 * back to its default, and what had to be replaced is reported so the user can
 * be told.
 *
 * Builds before profiles existed wrote all of it to the device-wide key. Those
 * fields are still read from there (`legacyProfileFields` says which), so
 * nobody's setup progress disappears on upgrade; the first signed-in profile
 * claims them, which rewrites the device record with appearance only.
 */
import {
  CONTRAST_PREFERENCES,
  DEFAULT_PREFERENCES,
  HANDS,
  TEXT_SIZES,
  THEME_PREFERENCES,
  type UserPreferences,
} from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';

/** Preferences that belong to this browser. */
export const DEVICE_PREFERENCE_FIELDS = ['theme', 'textSize', 'contrast', 'reducedMotion'] as const;

/** Preferences that belong to the person signed in. */
export const PROFILE_PREFERENCE_FIELDS = [
  'audioAnnouncements',
  'visualConfirmation',
  'hapticFeedback',
  'longerInteractionTime',
  'hand',
  'onboardingCompleted',
  'onboardingStep',
] as const;

export type DevicePreferenceField = (typeof DEVICE_PREFERENCE_FIELDS)[number];
export type ProfilePreferenceField = (typeof PROFILE_PREFERENCE_FIELDS)[number];

export type DevicePreferencesRecord = { readonly version: 1 } & Pick<UserPreferences, DevicePreferenceField>;
export type ProfilePreferencesRecord = { readonly version: 1 } & Pick<UserPreferences, ProfilePreferenceField>;

/** What had to be put right while reading the stored preferences. */
export interface PreferencesRecovery {
  /** Preferences whose stored value was unusable and was put back to the default. */
  readonly replacedFields: readonly (keyof UserPreferences)[];
  /**
   * True when something was stored under one of the preference keys but could
   * not be read at all, so the preferences it held fell back — including
   * `onboardingCompleted`, which sends a signed-in user back to setup.
   */
  readonly unreadable: boolean;
}

export interface StoredPreferences extends PreferencesRecovery {
  readonly preferences: UserPreferences;
  /**
   * The person's preferences that had to be read from the device-wide record,
   * because no profile record held them. Non-empty only for a browser last
   * used by a build from before profiles existed.
   */
  readonly legacyProfileFields: readonly ProfilePreferenceField[];
}

export const NO_RECOVERY: PreferencesRecovery = { replacedFields: [], unreadable: false };

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function isOnboardingStep(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= ONBOARDING_LAST_STEP;
}

/**
 * Validates one field. A field that was never stored is not a replacement —
 * that is simply a preference added after the user last saved.
 */
function reader(record: Record<string, unknown>, replaced: (keyof UserPreferences)[]) {
  return function pick<K extends keyof UserPreferences>(
    key: K,
    accepts: (value: unknown) => boolean,
  ): UserPreferences[K] {
    const value = record[key];
    if (value === undefined) return DEFAULT_PREFERENCES[key];
    if (accepts(value)) return value as UserPreferences[K];
    replaced.push(key);
    return DEFAULT_PREFERENCES[key];
  };
}

const isBoolean = (value: unknown): boolean => typeof value === 'boolean';

interface StoredRecord {
  /** The stored object, or null when nothing usable is there. */
  readonly record: Record<string, unknown> | null;
  /** True when something was stored under the key but is not an object. */
  readonly unreadable: boolean;
}

function readRecord(storage: StorageAdapter, key: string): StoredRecord {
  const stored = storage.get<unknown>(key);
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
    // Nothing stored is the ordinary first run; something stored that will not
    // parse, or is not an object, is data we had and could not use.
    return { record: null, unreadable: storage.has(key) };
  }
  return { record: stored as Record<string, unknown>, unreadable: false };
}

/** The appearance half of `preferences`, as stored device-wide. */
export function devicePreferences(preferences: UserPreferences): DevicePreferencesRecord {
  return {
    version: 1,
    theme: preferences.theme,
    textSize: preferences.textSize,
    contrast: preferences.contrast,
    reducedMotion: preferences.reducedMotion,
  };
}

/** The person's half of `preferences`, as stored for one profile. */
export function profilePreferences(preferences: UserPreferences): ProfilePreferencesRecord {
  return {
    version: 1,
    audioAnnouncements: preferences.audioAnnouncements,
    visualConfirmation: preferences.visualConfirmation,
    hapticFeedback: preferences.hapticFeedback,
    longerInteractionTime: preferences.longerInteractionTime,
    hand: preferences.hand,
    onboardingCompleted: preferences.onboardingCompleted,
    onboardingStep: preferences.onboardingStep,
  };
}

/**
 * Saves both halves. The profile's half goes first, so a subscriber woken by
 * the device-wide write never reads a store where the person's preferences
 * have been removed from one record and not yet written to the other. Writing
 * the device record with appearance only is also what claims the person's
 * preferences left there by a pre-profiles build.
 *
 * Returns false when either write was refused (private mode, full quota).
 */
export function writePreferences(storage: StorageAdapter, preferences: UserPreferences): boolean {
  const profileSaved = storage.set(STORAGE_KEYS.profilePreferences, profilePreferences(preferences));
  const deviceSaved = storage.set(STORAGE_KEYS.preferences, devicePreferences(preferences));
  return profileSaved && deviceSaved;
}

/**
 * The preferences in storage, with every unusable field replaced by its
 * default. `version` is always written as 1 and is never reported: it is a
 * migration marker, not something the user chose.
 */
export function readStoredPreferences(storage: StorageAdapter): StoredPreferences {
  const device = readRecord(storage, STORAGE_KEYS.preferences);
  const profile = readRecord(storage, STORAGE_KEYS.profilePreferences);
  const replacedFields: (keyof UserPreferences)[] = [];
  const legacyProfileFields: ProfilePreferenceField[] = [];

  const deviceRecord = device.record ?? {};
  const profileRecord: Record<string, unknown> = {};
  for (const field of PROFILE_PREFERENCE_FIELDS) {
    const own = profile.record?.[field];
    if (own !== undefined) {
      profileRecord[field] = own;
      continue;
    }
    const legacy = deviceRecord[field];
    if (legacy !== undefined) {
      profileRecord[field] = legacy;
      legacyProfileFields.push(field);
    }
  }

  const pickDevice = reader(deviceRecord, replacedFields);
  const pickProfile = reader(profileRecord, replacedFields);

  const preferences: UserPreferences = {
    version: 1,
    theme: pickDevice('theme', (value) => isOneOf(THEME_PREFERENCES, value)),
    textSize: pickDevice('textSize', (value) => isOneOf(TEXT_SIZES, value)),
    contrast: pickDevice('contrast', (value) => isOneOf(CONTRAST_PREFERENCES, value)),
    reducedMotion: pickDevice('reducedMotion', isBoolean),
    audioAnnouncements: pickProfile('audioAnnouncements', isBoolean),
    visualConfirmation: pickProfile('visualConfirmation', isBoolean),
    hapticFeedback: pickProfile('hapticFeedback', isBoolean),
    longerInteractionTime: pickProfile('longerInteractionTime', isBoolean),
    hand: pickProfile('hand', (value) => isOneOf(HANDS, value)),
    onboardingCompleted: pickProfile('onboardingCompleted', isBoolean),
    onboardingStep: pickProfile('onboardingStep', isOnboardingStep),
  };

  return { preferences, replacedFields, unreadable: device.unreadable || profile.unreadable, legacyProfileFields };
}
