/**
 * "Download my data": the records Tactiq holds for the profile you are signed
 * in to, read through that profile's own storage view.
 *
 * The file is built from a fixed list of keys, not from whatever is in the
 * browser's storage. That is deliberate: a dump of the whole namespace would
 * hand one person the other local profiles' practice records and the account
 * records that say who they are. Saving the file and naming it with the date
 * live in '@/lib/download'.
 */
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';

export const USER_DATA_EXPORT_FORMAT = 'tactiq.my-data';
export const USER_DATA_EXPORT_VERSION = 1;
export const USER_DATA_EXPORT_NOTE =
  'Everything Tactiq keeps for the profile you were signed in to when this file was made, plus this browser’s appearance settings. It holds no sign-in details, no password and nothing belonging to another profile on this browser. Each record keeps its evidence label: simulated records come from the app’s simulated ring, not a wearable ring. Records marked seeded: true are samples.';
export const USER_DATA_CONTENT_TYPE = 'application/json';
/** The file is saved as "tactiq-my-data-YYYY-MM-DD.json" (see `datedFilename`). */
export const USER_DATA_FILENAME_BASE = 'tactiq-my-data';

/**
 * Exactly what the file may contain, in reading order: the appearance half of
 * the preferences (device-wide), the person's half, and the four kinds of
 * record that belong to the profile. Nothing else is read, so the account
 * records ('auth.accounts', 'auth.session') and every other profile's keys
 * cannot reach the file.
 */
export const USER_DATA_SECTIONS = [
  {
    name: 'appearancePreferences',
    key: STORAGE_KEYS.preferences,
    label: 'Appearance: theme, text size, contrast and motion. These belong to this browser, not to you.',
  },
  {
    name: 'profilePreferences',
    key: STORAGE_KEYS.profilePreferences,
    label: 'Your preferences: hand, feedback, interaction timing and setup progress.',
  },
  { name: 'commandMapping', key: STORAGE_KEYS.commandMapping, label: 'What Shortcut 1 and Shortcut 2 are set to.' },
  { name: 'trainingProgress', key: STORAGE_KEYS.training, label: 'Your progress and scores for each lesson.' },
  { name: 'calibrationProfile', key: STORAGE_KEYS.calibration, label: 'Your most recent calibration run.' },
  {
    name: 'activityHistory',
    key: STORAGE_KEYS.history,
    label: 'Your activity records, including any samples, each with its evidence label.',
  },
] as const;

export type UserDataSectionName = (typeof USER_DATA_SECTIONS)[number]['name'];

export interface UserDataExport {
  readonly format: typeof USER_DATA_EXPORT_FORMAT;
  readonly version: typeof USER_DATA_EXPORT_VERSION;
  readonly exportedAt: string;
  /** The profile this data belongs to, by id. No email, no password, no session. */
  readonly profileId: string | null;
  readonly note: string;
  /** What each part of `data` is, in plain words. */
  readonly includes: Readonly<Record<UserDataSectionName, string>>;
  /** Section name → stored value, or null when nothing is stored for it. */
  readonly data: Readonly<Record<UserDataSectionName, unknown>>;
}

export interface UserDataExportOptions {
  readonly exportedAt: string;
  /** The signed-in account's id, or null when the file is built without one. */
  readonly profileId: string | null;
}

/**
 * @param storage The signed-in profile's storage view, so the per-profile keys
 * resolve to that profile and nobody else's.
 */
export function buildUserDataExport(storage: StorageAdapter, options: UserDataExportOptions): UserDataExport {
  const data: Partial<Record<UserDataSectionName, unknown>> = {};
  const includes: Partial<Record<UserDataSectionName, string>> = {};
  for (const section of USER_DATA_SECTIONS) {
    data[section.name] = storage.get<unknown>(section.key);
    includes[section.name] = section.label;
  }
  return {
    format: USER_DATA_EXPORT_FORMAT,
    version: USER_DATA_EXPORT_VERSION,
    exportedAt: options.exportedAt,
    profileId: options.profileId,
    note: USER_DATA_EXPORT_NOTE,
    includes: includes as Record<UserDataSectionName, string>,
    data: data as Record<UserDataSectionName, unknown>,
  };
}

export function userDataExportJson(storage: StorageAdapter, options: UserDataExportOptions): string {
  return JSON.stringify(buildUserDataExport(storage, options), null, 2);
}
