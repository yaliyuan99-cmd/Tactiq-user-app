/**
 * A browser upgraded from a build that had no profiles keeps one person's
 * hand, feedback, timing and setup progress in the device-wide record. The
 * next person to sign in is not necessarily that person.
 */
import { DEFAULT_PREFERENCES } from '@/domain/models';
import { readStoredPreferences } from '@/services/preferences/storedPreferences';
import { adoptLegacyData, detectLegacyData, discardLegacyData } from './legacyMigration';
import { scopedStorage } from './scopedStorage';
import { MemoryStorageAdapter, STORAGE_KEYS } from './StorageAdapter';

const OWNER = 'user_previous_owner';

/** The single record a pre-profiles build wrote: appearance AND the person. */
function upgradedBrowser(): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  storage.set(STORAGE_KEYS.preferences, {
    version: 1,
    theme: 'dark',
    textSize: 'large',
    contrast: 'high',
    reducedMotion: true,
    hand: 'left',
    audioAnnouncements: true,
    longerInteractionTime: true,
    onboardingCompleted: true,
    onboardingStep: 3,
  });
  return storage;
}

describe('a new profile on an upgraded browser', () => {
  it('does not inherit the previous owner’s hand or finished setup', () => {
    const storage = upgradedBrowser();
    const { preferences } = readStoredPreferences(scopedStorage(storage, 'user_someone_else'));

    // The hand decides which way every contact map is drawn. Inheriting it
    // from a stranger is worse than asking again.
    expect(preferences.hand).toBe(DEFAULT_PREFERENCES.hand);
    expect(preferences.onboardingCompleted).toBe(false);
    expect(preferences.onboardingStep).toBe(0);
    expect(preferences.longerInteractionTime).toBe(DEFAULT_PREFERENCES.longerInteractionTime);
  });

  it('still takes the appearance settings, which belong to the screen', () => {
    const storage = upgradedBrowser();
    const { preferences } = readStoredPreferences(scopedStorage(storage, 'user_someone_else'));
    expect(preferences.theme).toBe('dark');
    expect(preferences.textSize).toBe('large');
    expect(preferences.contrast).toBe('high');
  });

  it('reports the orphaned settings so Settings can ask about them', () => {
    const storage = upgradedBrowser();
    const report = detectLegacyData(storage);
    expect(report.hasData).toBe(true);
    expect(report.summary.join(' ')).toMatch(/Settings from before profiles existed/);
    expect(report.summary.join(' ')).toMatch(/whether setup was finished/);
  });
});

describe('when the user says to keep them', () => {
  it('moves them into that profile and leaves the device record with appearance only', () => {
    const storage = upgradedBrowser();
    const result = adoptLegacyData(storage, OWNER);
    expect(result.adopted).toContain(STORAGE_KEYS.profilePreferences);

    const { preferences } = readStoredPreferences(scopedStorage(storage, OWNER));
    expect(preferences.hand).toBe('left');
    expect(preferences.onboardingCompleted).toBe(true);

    const device = storage.get<Record<string, unknown>>(STORAGE_KEYS.preferences) ?? {};
    expect(device.theme).toBe('dark');
    expect(device.hand).toBeUndefined();
    expect(device.onboardingCompleted).toBeUndefined();
  });

  it('leaves a second profile on the same browser with the defaults', () => {
    const storage = upgradedBrowser();
    adoptLegacyData(storage, OWNER);
    const { preferences } = readStoredPreferences(scopedStorage(storage, 'user_second'));
    expect(preferences.hand).toBe(DEFAULT_PREFERENCES.hand);
    expect(preferences.onboardingCompleted).toBe(false);
  });

  it('does not overwrite a profile that already has its own settings', () => {
    const storage = upgradedBrowser();
    scopedStorage(storage, OWNER).set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'right' });
    const result = adoptLegacyData(storage, OWNER);
    expect(result.skipped).toContain(STORAGE_KEYS.profilePreferences);
    expect(readStoredPreferences(scopedStorage(storage, OWNER)).preferences.hand).toBe('right');
  });
});

describe('when the user says to delete them', () => {
  it('takes the person out of the device record and keeps the appearance', () => {
    const storage = upgradedBrowser();
    discardLegacyData(storage);

    const device = storage.get<Record<string, unknown>>(STORAGE_KEYS.preferences) ?? {};
    expect(device.hand).toBeUndefined();
    expect(device.onboardingCompleted).toBeUndefined();
    expect(device.theme).toBe('dark');
    expect(detectLegacyData(storage).hasData).toBe(false);
  });
});
