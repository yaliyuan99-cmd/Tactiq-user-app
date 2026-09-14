import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { PreferencesProvider, applyPreferencesToDocument, loadPreferences, usePreferences } from './PreferencesProvider';

function resetDocument(): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'force-reduced-motion');
  root.removeAttribute('data-text-size');
  root.removeAttribute('data-contrast');
}

function setup(storage = new MemoryStorageAdapter()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PreferencesProvider storage={storage}>{children}</PreferencesProvider>
  );
  return { storage, ...renderHook(() => usePreferences(), { wrapper }) };
}

describe('PreferencesProvider', () => {
  beforeEach(resetDocument);
  afterEach(resetDocument);

  it('loads the defaults when nothing is stored', () => {
    const { result } = setup();
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.persisted).toBe(true);
    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.hasAttribute('data-text-size')).toBe(false);
    expect(root.hasAttribute('data-contrast')).toBe(false);
  });

  it('merges stored preferences over the defaults', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { theme: 'dark', hand: 'left' });
    expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark', hand: 'left' });
    storage.set(STORAGE_KEYS.preferences, 'garbage');
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists updates and applies them to the document', () => {
    const { result, storage } = setup();
    act(() => {
      result.current.update({ theme: 'dark', textSize: 'larger', contrast: 'high', reducedMotion: true });
    });
    const expected: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      textSize: 'larger',
      contrast: 'high',
      reducedMotion: true,
    };
    expect(result.current.preferences).toEqual(expected);
    expect(storage.get(STORAGE_KEYS.preferences)).toEqual(expected);
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.prefersReducedMotion).toBe(true);
    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.getAttribute('data-text-size')).toBe('larger');
    expect(root.getAttribute('data-contrast')).toBe('high');
    expect(root.classList.contains('force-reduced-motion')).toBe(true);
  });

  it('resets to the defaults and clears the document attributes', () => {
    const { result, storage } = setup();
    act(() => {
      result.current.update({ theme: 'dark', textSize: 'large', contrast: 'high', reducedMotion: true });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(storage.get(STORAGE_KEYS.preferences)).toEqual(DEFAULT_PREFERENCES);
    expect(result.current.persisted).toBe(true);
    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.hasAttribute('data-text-size')).toBe(false);
    expect(root.hasAttribute('data-contrast')).toBe(false);
    expect(root.classList.contains('force-reduced-motion')).toBe(false);
  });

  it('keeps onboarding progress when resetting, so a finished user is not sent back to setup', () => {
    const storage = new MemoryStorageAdapter();
    const customised: UserPreferences = {
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
      onboardingStep: 6,
    };
    storage.set(STORAGE_KEYS.preferences, customised);
    const { result } = setup(storage);
    expect(result.current.preferences).toEqual(customised);

    act(() => {
      result.current.reset();
    });

    const expected: UserPreferences = { ...DEFAULT_PREFERENCES, onboardingCompleted: true, onboardingStep: 6 };
    expect(result.current.preferences).toEqual(expected);
    expect(storage.get(STORAGE_KEYS.preferences)).toEqual(expected);
    expect(loadPreferences(storage)).toEqual(expected);
  });

  it('keeps an unfinished onboarding step when resetting', () => {
    const { result, storage } = setup();
    act(() => {
      result.current.update({ onboardingStep: 2, hand: 'left', hapticFeedback: false });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, onboardingStep: 2 });
    expect(storage.get(STORAGE_KEYS.preferences)).toEqual({ ...DEFAULT_PREFERENCES, onboardingStep: 2 });
  });

  it('uses the latest onboarding progress when an update and a reset happen in the same batch', () => {
    const { result } = setup();
    act(() => {
      result.current.update({ onboardingCompleted: true, onboardingStep: 6, theme: 'dark' });
      result.current.reset();
    });
    expect(result.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, onboardingCompleted: true, onboardingStep: 6 });
  });

  it('reports when a reset could not be saved', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, theme: 'dark', onboardingCompleted: true });
    vi.spyOn(storage, 'set').mockReturnValue(false);
    const { result } = setup(storage);
    act(() => {
      result.current.reset();
    });
    expect(result.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, onboardingCompleted: true });
    expect(result.current.persisted).toBe(false);
  });

  it('reports when preferences could not be saved', () => {
    const storage = new MemoryStorageAdapter();
    vi.spyOn(storage, 'set').mockReturnValue(false);
    const { result } = setup(storage);
    act(() => {
      result.current.update({ audioAnnouncements: true });
    });
    expect(result.current.preferences.audioAnnouncements).toBe(true);
    expect(result.current.persisted).toBe(false);
  });

  it('picks up changes written to storage elsewhere', () => {
    const { result, storage } = setup();
    act(() => {
      storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, hand: 'left' });
    });
    expect(result.current.preferences.hand).toBe('left');
  });

  it('follows the system theme when set to system', () => {
    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, theme: 'system' }, true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyPreferencesToDocument({ ...DEFAULT_PREFERENCES, theme: 'light' }, true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('explains the problem when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePreferences())).toThrow('usePreferences must be used inside <PreferencesProvider>');
  });
});
