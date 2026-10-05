/**
 * Reading the stored preferences.
 *
 * Preferences come out of the browser's own storage, which anything can write
 * to: an older build of this app, a half-finished write, a hand-edited value.
 * Spreading whatever is there over the defaults would put a value of the wrong
 * type straight into a renderer, where one bad field can take a whole screen
 * down. So every field is checked on its own and falls back to its default,
 * and what had to be replaced is reported so the user can be told.
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

/** What had to be put right while reading the stored preferences. */
export interface PreferencesRecovery {
  /** Preferences whose stored value was unusable and was put back to the default. */
  readonly replacedFields: readonly (keyof UserPreferences)[];
  /**
   * True when something was stored under the preferences key but could not be
   * read at all, so every preference fell back — including `onboardingCompleted`,
   * which sends a signed-in user back to setup.
   */
  readonly unreadable: boolean;
}

export interface StoredPreferences extends PreferencesRecovery {
  readonly preferences: UserPreferences;
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

/**
 * The preferences in storage, with every unusable field replaced by its
 * default. `version` is always written as 1 and is never reported: it is a
 * migration marker, not something the user chose.
 */
export function readStoredPreferences(storage: StorageAdapter): StoredPreferences {
  const stored = storage.get<unknown>(STORAGE_KEYS.preferences);
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
    // Nothing stored is the ordinary first run; something stored that will not
    // parse, or is not an object, is data we had and could not use.
    return { preferences: DEFAULT_PREFERENCES, replacedFields: [], unreadable: storage.has(STORAGE_KEYS.preferences) };
  }

  const record = stored as Record<string, unknown>;
  const replacedFields: (keyof UserPreferences)[] = [];
  const pick = reader(record, replacedFields);

  const preferences: UserPreferences = {
    version: 1,
    theme: pick('theme', (value) => isOneOf(THEME_PREFERENCES, value)),
    textSize: pick('textSize', (value) => isOneOf(TEXT_SIZES, value)),
    contrast: pick('contrast', (value) => isOneOf(CONTRAST_PREFERENCES, value)),
    reducedMotion: pick('reducedMotion', isBoolean),
    audioAnnouncements: pick('audioAnnouncements', isBoolean),
    visualConfirmation: pick('visualConfirmation', isBoolean),
    hapticFeedback: pick('hapticFeedback', isBoolean),
    longerInteractionTime: pick('longerInteractionTime', isBoolean),
    hand: pick('hand', (value) => isOneOf(HANDS, value)),
    onboardingCompleted: pick('onboardingCompleted', isBoolean),
    onboardingStep: pick('onboardingStep', isOnboardingStep),
  };

  return { preferences, replacedFields, unreadable: false };
}
