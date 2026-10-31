import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { LocalStorageAdapter, MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { PROFILE_PREFERENCE_FIELDS, readStoredPreferences, writePreferences } from './storedPreferences';

/**
 * A store written by a build from before profiles existed: all of it, the
 * person's preferences included, under the device-wide key. Still the way the
 * unusable-value cases are seeded, because that is the store they come from.
 */
function withStored(value: unknown): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  storage.set(STORAGE_KEYS.preferences, value);
  return storage;
}

/** A store written the way the app writes it now: appearance device-wide, the rest with the person. */
function withSplitRecords(preferences: UserPreferences): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  writePreferences(storage, preferences);
  return storage;
}

describe('readStoredPreferences', () => {
  it('uses the defaults, with nothing to report, on a first run', () => {
    expect(readStoredPreferences(new MemoryStorageAdapter())).toEqual({
      preferences: DEFAULT_PREFERENCES,
      replacedFields: [],
      unreadable: false,
      legacyProfileFields: [],
    });
  });

  it('keeps every stored value that is valid', () => {
    const saved: UserPreferences = {
      version: 1,
      theme: 'dark',
      textSize: 'larger',
      contrast: 'high',
      reducedMotion: true,
      audioAnnouncements: true,
      visualConfirmation: false,
      hapticFeedback: false,
      longerInteractionTime: true,
      hand: 'left',
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_LAST_STEP,
    };
    expect(readStoredPreferences(withSplitRecords(saved))).toEqual({
      preferences: saved,
      replacedFields: [],
      unreadable: false,
      legacyProfileFields: [],
    });
  });

  it('reports the person’s preferences a pre-profiles build left device-wide, without taking them', () => {
    const stored: UserPreferences = { ...DEFAULT_PREFERENCES, theme: 'dark', hand: 'left', onboardingCompleted: true };
    const result = readStoredPreferences(withStored(stored));

    // Appearance belongs to the screen, so it is read.
    expect(result.preferences.theme).toBe('dark');
    // The person's half is NOT. A browser can be upgraded and then signed into
    // by somebody else; inheriting a stranger's hand, or their finished setup,
    // is worse than starting from the defaults. Settings offers it instead.
    expect(result.preferences.hand).toBe(DEFAULT_PREFERENCES.hand);
    expect(result.preferences.onboardingCompleted).toBe(false);
    expect(result.replacedFields).toEqual([]);
    expect([...result.legacyProfileFields].sort()).toEqual([...PROFILE_PREFERENCE_FIELDS].sort());
  });

  it('prefers the profile’s own record over the one a pre-profiles build left device-wide', () => {
    const storage = withStored({ ...DEFAULT_PREFERENCES, hand: 'left', onboardingCompleted: true });
    writePreferences(storage, { ...DEFAULT_PREFERENCES, hand: 'right', onboardingCompleted: false });
    const result = readStoredPreferences(storage);
    expect(result.preferences.hand).toBe('right');
    expect(result.preferences.onboardingCompleted).toBe(false);
    expect(result.legacyProfileFields).toEqual([]);
  });

  it('fills in a preference that was added after the user last saved, without calling it a replacement', () => {
    // 'hand' sits in the device record, so it is offered rather than taken;
    // the point here is that a field nobody saved is not called a replacement.
    const result = readStoredPreferences(withStored({ theme: 'dark', hand: 'left' }));
    expect(result.preferences).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark' });
    expect(result.replacedFields).toEqual([]);
  });

  it('replaces each unusable field with its default, keeps the good ones and names what it replaced', () => {
    // The stored shape from the browser repro: a hand of "middle" used to reach
    // the Settings renderer and take the whole page down.
    // Each half is seeded where it is actually read, so both halves'
    // validation is exercised: appearance in the device record, the person's
    // fields in the profile's own.
    const storage = withStored({ version: 'one', theme: 42, textSize: null, contrast: 'high', reducedMotion: true });
    storage.set(STORAGE_KEYS.profilePreferences, { version: 1, hand: 'middle', onboardingCompleted: 'yes' });
    const result = readStoredPreferences(storage);
    expect(result.preferences).toEqual({ ...DEFAULT_PREFERENCES, contrast: 'high', reducedMotion: true });
    expect(result.preferences.hand).toBe('right');
    expect(result.preferences.version).toBe(1);
    expect([...result.replacedFields].sort()).toEqual(['hand', 'onboardingCompleted', 'textSize', 'theme']);
    expect(result.replacedFields).not.toContain('version');
    expect(result.unreadable).toBe(false);
  });

  it('refuses an onboarding step that is not a whole step in range', () => {
    // The step is the person's, so it is validated where it is actually read.
    const withStep = (onboardingStep: unknown) => {
      const storage = new MemoryStorageAdapter();
      storage.set(STORAGE_KEYS.profilePreferences, { version: 1, onboardingStep });
      return storage;
    };
    for (const onboardingStep of [-1, 1.5, ONBOARDING_LAST_STEP + 1, '3', null, Number.NaN]) {
      const result = readStoredPreferences(withStep(onboardingStep));
      expect(result.preferences.onboardingStep).toBe(DEFAULT_PREFERENCES.onboardingStep);
      expect(result.replacedFields).toEqual(['onboardingStep']);
    }
    expect(readStoredPreferences(withStep(0)).replacedFields).toEqual([]);
    expect(readStoredPreferences(withStep(ONBOARDING_LAST_STEP)).replacedFields).toEqual([]);
  });

  it('drops keys that are not preferences', () => {
    const result = readStoredPreferences(withStored({ theme: 'dark', somethingElse: 'ignored' }));
    expect(result.preferences).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark' });
    expect('somethingElse' in result.preferences).toBe(false);
  });

  it('says the stored data was unreadable when it is not an object', () => {
    for (const value of ['garbage', 7, true, [1, 2]]) {
      const result = readStoredPreferences(withStored(value));
      expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
      expect(result.unreadable).toBe(true);
    }
  });

  it('says the stored data was unreadable when the JSON itself is broken', () => {
    window.localStorage.setItem('tactiq.prefs', '{"version":"one","theme":42,"hand":');
    const result = readStoredPreferences(new LocalStorageAdapter());
    expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(result.unreadable).toBe(true);
    expect(result.preferences.onboardingCompleted).toBe(false);
  });
});
