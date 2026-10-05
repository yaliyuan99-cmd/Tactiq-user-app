import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { LocalStorageAdapter, MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { readStoredPreferences } from './storedPreferences';

function withStored(value: unknown): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  storage.set(STORAGE_KEYS.preferences, value);
  return storage;
}

describe('readStoredPreferences', () => {
  it('uses the defaults, with nothing to report, on a first run', () => {
    expect(readStoredPreferences(new MemoryStorageAdapter())).toEqual({
      preferences: DEFAULT_PREFERENCES,
      replacedFields: [],
      unreadable: false,
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
    expect(readStoredPreferences(withStored(saved))).toEqual({
      preferences: saved,
      replacedFields: [],
      unreadable: false,
    });
  });

  it('fills in a preference that was added after the user last saved, without calling it a replacement', () => {
    const result = readStoredPreferences(withStored({ theme: 'dark', hand: 'left' }));
    expect(result.preferences).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark', hand: 'left' });
    expect(result.replacedFields).toEqual([]);
  });

  it('replaces each unusable field with its default, keeps the good ones and names what it replaced', () => {
    // The stored shape from the browser repro: a hand of "middle" used to reach
    // the Settings renderer and take the whole page down.
    const result = readStoredPreferences(
      withStored({
        version: 'one',
        theme: 42,
        textSize: null,
        hand: 'middle',
        onboardingCompleted: 'yes',
        contrast: 'high',
        reducedMotion: true,
      }),
    );
    expect(result.preferences).toEqual({ ...DEFAULT_PREFERENCES, contrast: 'high', reducedMotion: true });
    expect(result.preferences.hand).toBe('right');
    expect(result.preferences.version).toBe(1);
    expect([...result.replacedFields].sort()).toEqual(['hand', 'onboardingCompleted', 'textSize', 'theme']);
    expect(result.replacedFields).not.toContain('version');
    expect(result.unreadable).toBe(false);
  });

  it('refuses an onboarding step that is not a whole step in range', () => {
    for (const onboardingStep of [-1, 1.5, ONBOARDING_LAST_STEP + 1, '3', null, Number.NaN]) {
      const result = readStoredPreferences(withStored({ onboardingStep }));
      expect(result.preferences.onboardingStep).toBe(DEFAULT_PREFERENCES.onboardingStep);
      expect(result.replacedFields).toEqual(['onboardingStep']);
    }
    expect(readStoredPreferences(withStored({ onboardingStep: 0 })).replacedFields).toEqual([]);
    expect(readStoredPreferences(withStored({ onboardingStep: ONBOARDING_LAST_STEP })).replacedFields).toEqual([]);
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
