import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { scopedStorage } from '@/services/storage/scopedStorage';
import {
  USER_DATA_EXPORT_FORMAT,
  USER_DATA_EXPORT_NOTE,
  USER_DATA_SECTIONS,
  buildUserDataExport,
  userDataExportJson,
} from './dataExport';

const EXPORTED_AT = '2026-09-15T04:30:00.000Z';

/** One browser, two local profiles, each having practised. */
function twoProfiles() {
  const device = new MemoryStorageAdapter();
  const a = scopedStorage(device, 'user_a');
  const b = scopedStorage(device, 'user_b');
  device.set(STORAGE_KEYS.preferences, { version: 1, theme: 'dark', textSize: 'larger' });
  device.set(STORAGE_KEYS.authAccounts, [
    { id: 'user_a', email: 'alex@example.com', displayName: 'Alex' },
    { id: 'user_b', email: 'sam@example.com', displayName: 'Sam' },
  ]);
  device.set(STORAGE_KEYS.authSession, { userId: 'user_a', signedInAt: EXPORTED_AT });
  device.set(STORAGE_KEYS.device, { version: 1, mode: 'demo', remembered: { id: 'ring', name: 'Tactiq Ring' } });
  a.set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'left' });
  a.set(STORAGE_KEYS.history, [{ id: 'evt_a', seeded: false, evidence: 'simulated' }]);
  a.set(STORAGE_KEYS.training, { version: 1, lessons: { squeeze_to_activate: { status: 'complete' } } });
  a.set(STORAGE_KEYS.calibration, { id: 'cal_a' });
  a.set(STORAGE_KEYS.commandMapping, { version: 1, shortcuts: { quick_action_1: 'announce_time' } });
  b.set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'right' });
  b.set(STORAGE_KEYS.history, [{ id: 'evt_b', seeded: false, evidence: 'simulated' }]);
  b.set(STORAGE_KEYS.calibration, { id: 'cal_b' });
  return { device, a, b };
}

describe('buildUserDataExport', () => {
  it('holds the signed-in profile’s own records, each labelled, under a format header', () => {
    const { a } = twoProfiles();

    const exported = buildUserDataExport(a, { exportedAt: EXPORTED_AT, profileId: 'user_a' });

    expect(exported.format).toBe(USER_DATA_EXPORT_FORMAT);
    expect(exported.version).toBe(1);
    expect(exported.exportedAt).toBe(EXPORTED_AT);
    expect(exported.profileId).toBe('user_a');
    expect(exported.note).toBe(USER_DATA_EXPORT_NOTE);
    expect(Object.keys(exported.data)).toEqual([
      'appearancePreferences',
      'profilePreferences',
      'commandMapping',
      'trainingProgress',
      'calibrationProfile',
      'activityHistory',
    ]);
    expect(Object.keys(exported.includes)).toEqual(Object.keys(exported.data));
    expect(exported.includes.appearancePreferences).toMatch(/belong to this browser/);
    expect(exported.data.appearancePreferences).toEqual({ version: 1, theme: 'dark', textSize: 'larger' });
    expect(exported.data.profilePreferences).toEqual({ version: 1, hand: 'left' });
    expect(exported.data.calibrationProfile).toEqual({ id: 'cal_a' });
    expect(exported.data.activityHistory).toEqual([{ id: 'evt_a', seeded: false, evidence: 'simulated' }]);
    expect(exported.data.commandMapping).toEqual({ version: 1, shortcuts: { quick_action_1: 'announce_time' } });
  });

  it('contains nothing of another profile and no account record', () => {
    const { a } = twoProfiles();
    const json = userDataExportJson(a, { exportedAt: EXPORTED_AT, profileId: 'user_a' });
    const parsed = JSON.parse(json) as Record<string, unknown>;

    for (const key of Object.keys(parsed)) expect(key).not.toMatch(/auth/i);
    for (const key of Object.keys(parsed.data as Record<string, unknown>)) expect(key).not.toMatch(/auth/i);
    expect(json).not.toContain('evt_b');
    expect(json).not.toContain('cal_b');
    expect(json).not.toContain('sam@example.com');
    expect(json).not.toContain('alex@example.com');
    expect(json).not.toContain('signedInAt');
    expect(json).not.toContain('user_b');
  });

  it('says so when a profile has nothing stored, rather than leaving the part out', () => {
    const exported = buildUserDataExport(scopedStorage(new MemoryStorageAdapter(), 'user_new'), {
      exportedAt: EXPORTED_AT,
      profileId: 'user_new',
    });
    expect(exported.data).toEqual({
      appearancePreferences: null,
      profilePreferences: null,
      commandMapping: null,
      trainingProgress: null,
      calibrationProfile: null,
      activityHistory: null,
    });
  });

  it('leaves the ring record and the other profile’s keys in the browser untouched', () => {
    const { device, a, b } = twoProfiles();
    buildUserDataExport(a, { exportedAt: EXPORTED_AT, profileId: 'user_a' });
    expect(device.get(STORAGE_KEYS.device)).not.toBeNull();
    expect(b.get(STORAGE_KEYS.history)).toEqual([{ id: 'evt_b', seeded: false, evidence: 'simulated' }]);
  });

  it('names a file section for every key it reads, and reads only per-profile or appearance keys', () => {
    const allowed: readonly string[] = [
      STORAGE_KEYS.preferences,
      STORAGE_KEYS.profilePreferences,
      STORAGE_KEYS.commandMapping,
      STORAGE_KEYS.training,
      STORAGE_KEYS.calibration,
      STORAGE_KEYS.history,
    ];
    expect(USER_DATA_SECTIONS.map((section) => section.key)).toEqual(allowed);
    expect(USER_DATA_SECTIONS.every((section) => section.label.length > 0)).toBe(true);
  });

  it('serialises as indented JSON that parses back to the same export', () => {
    const { a } = twoProfiles();
    const options = { exportedAt: EXPORTED_AT, profileId: 'user_a' };
    const json = userDataExportJson(a, options);
    expect(json).toContain('\n  "format": "tactiq.my-data"');
    expect(JSON.parse(json)).toEqual(buildUserDataExport(a, options));
  });

  it('says what the file holds and does not hold, and how to read the labels', () => {
    expect(USER_DATA_EXPORT_NOTE).toMatch(/no sign-in details/);
    expect(USER_DATA_EXPORT_NOTE).toMatch(/nothing belonging to another profile/);
    expect(USER_DATA_EXPORT_NOTE).toMatch(/simulated records come from the app’s simulated ring, not a wearable ring/);
    expect(USER_DATA_EXPORT_NOTE).toMatch(/seeded: true are samples/);
  });
});
