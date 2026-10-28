/**
 * The preferences in force, merged from their two owners.
 *
 * Appearance (theme, text size, contrast, reduced motion) belongs to this
 * browser and is shared by every profile signed in here; the rest (hand,
 * feedback, timing, setup progress) belongs to the person and is stored under
 * the signed-in profile's own key. `usePreferences()` hands back one merged
 * `UserPreferences`, so no screen has to know which half a field came from.
 * See './storedPreferences' for how the two records are read and written.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import {
  NO_RECOVERY,
  readStoredPreferences,
  writePreferences,
  type PreferencesRecovery,
  type StoredPreferences,
} from './storedPreferences';

export type { PreferencesRecovery } from './storedPreferences';

/** Shown on Settings when some stored preferences had to be replaced by their defaults. */
export const PREFERENCES_REPLACED_NOTE =
  'Some saved settings could not be read and were set back to the defaults. Check the options below.';

/** Shown when nothing stored could be read, so the defaults are in force and setup looks unfinished. */
export const PREFERENCES_UNREADABLE_NOTE =
  'Your saved settings could not be read, so Tactiq is using the defaults. Setup choices you had made are not being used.';

/** Said in Settings, because one half of these follows the browser and the other half the person. */
export const PREFERENCES_OWNERSHIP_NOTE =
  'Appearance applies to this browser; the rest follows your profile.';

export interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  readonly update: (patch: Partial<UserPreferences>) => void;
  /**
   * Puts every preference back to DEFAULT_PREFERENCES except onboarding
   * progress: `onboardingCompleted` and `onboardingStep` are kept, so a user who
   * finished setup is not sent back through onboarding.
   */
  readonly reset: () => void;
  /** The theme in effect after resolving "system". */
  readonly resolvedTheme: 'light' | 'dark';
  /** OS preference OR the app-level reduced-motion setting. */
  readonly prefersReducedMotion: boolean;
  /** False when the browser refused to persist (e.g. private mode). */
  readonly persisted: boolean;
  /**
   * What had to be put right when the stored preferences were read. Settings
   * shows `PREFERENCES_REPLACED_NOTE` while `replacedFields` is not empty, and
   * onboarding shows `PREFERENCES_UNREADABLE_NOTE` when `unreadable` is why
   * setup looks unfinished. Both clear as soon as preferences are saved again.
   */
  readonly recovery: PreferencesRecovery;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/**
 * The stored preferences, validated field by field. Keeps a stored value only
 * when it passes its own type or enum check, so one bad field can neither
 * discard the rest nor reach a renderer. Use `readStoredPreferences` when you
 * also need to know what was replaced.
 */
export function loadPreferences(storage: StorageAdapter): UserPreferences {
  return readStoredPreferences(storage).preferences;
}

/** The defaults, keeping onboarding progress from `current`. What `reset()` stores. */
function resetPreferences(current: UserPreferences): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: current.onboardingCompleted,
    onboardingStep: current.onboardingStep,
  };
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Mirrors public/theme-init.js so React and the pre-paint script agree. */
export function applyPreferencesToDocument(prefs: UserPreferences, systemDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark);
  root.classList.toggle('dark', dark);
  if (prefs.textSize === 'default') root.removeAttribute('data-text-size');
  else root.setAttribute('data-text-size', prefs.textSize);
  if (prefs.contrast === 'high') root.setAttribute('data-contrast', 'high');
  else root.removeAttribute('data-contrast');
  root.classList.toggle('force-reduced-motion', prefs.reducedMotion);
}

/** The state after a save: what is stored is what is on screen, so nothing is left to report. */
function saved(preferences: UserPreferences): StoredPreferences {
  return { preferences, ...NO_RECOVERY, legacyProfileFields: [] };
}

export interface PreferencesProviderProps {
  /**
   * The signed-in profile's storage view, so the person's half of the
   * preferences is read and written under that profile.
   */
  readonly storage: StorageAdapter;
  /**
   * The signed-in account id. Given one, the person's preferences left in the
   * device-wide record by a build from before profiles existed are claimed
   * once, into this profile. Omitted (or null while nobody is signed in), the
   * record is left exactly as it is for the profile that signs in next.
   */
  readonly scopeId?: string | null;
  readonly children: ReactNode;
}

export function PreferencesProvider({ storage, scopeId, children }: PreferencesProviderProps) {
  const [stored, setStored] = useState(() => readStoredPreferences(storage));
  const preferences = stored.preferences;
  /**
   * The preferences a change should be applied to. Kept beside the state so a
   * patch can be built without a state updater: `storage.set` tells every
   * other service, synchronously, and React runs updaters during render, where
   * a subscriber's re-render would be a state update during someone else's
   * render.
   */
  const latest = useRef(preferences);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);
  const [systemReduced, setSystemReduced] = useState<boolean>(systemPrefersReducedMotion);
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onDark = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    const onReduced = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    dark.addEventListener?.('change', onDark);
    reduced.addEventListener?.('change', onReduced);
    return () => {
      dark.removeEventListener?.('change', onDark);
      reduced.removeEventListener?.('change', onReduced);
    };
  }, []);

  /**
   * A different profile signed in, so the person's half of the preferences is
   * theirs and has to be read again. The first run is skipped: the initial
   * state already holds that read.
   */
  const identity = useRef({ storage, scopeId });
  useEffect(() => {
    if (identity.current.storage === storage && identity.current.scopeId === scopeId) return;
    identity.current = { storage, scopeId };
    const next = readStoredPreferences(storage);
    latest.current = next.preferences;
    setStored(next);
  }, [storage, scopeId]);

  // Cross-tab and cross-service changes, to either half.
  useEffect(
    () =>
      storage.subscribe((key) => {
        if (key !== STORAGE_KEYS.preferences && key !== STORAGE_KEYS.profilePreferences) return;
        const next = readStoredPreferences(storage);
        latest.current = next.preferences;
        setStored(next);
      }),
    [storage],
  );

  useEffect(() => {
    applyPreferencesToDocument(preferences, systemDark);
  }, [preferences, systemDark]);

  const apply = useCallback(
    (next: UserPreferences) => {
      latest.current = next;
      setStored(saved(next));
      setPersisted(writePreferences(storage, next));
    },
    [storage],
  );

  /**
   * One-time claim: a browser last used before profiles existed keeps the
   * person's preferences in the device-wide record, where the next profile to
   * sign in would read them as its own. The first signed-in profile takes them
   * over — saving writes the device record with appearance only — so nobody
   * else inherits somebody's hand, feedback or setup progress. Practice data
   * is never adopted this way; Settings asks about that (see
   * '@/services/storage/legacyMigration').
   */
  useEffect(() => {
    if (!scopeId || stored.legacyProfileFields.length === 0) return;
    apply(latest.current);
  }, [scopeId, stored, apply]);

  const update = useCallback(
    (patch: Partial<UserPreferences>) => {
      apply({ ...latest.current, ...patch, version: 1 });
    },
    [apply],
  );

  const reset = useCallback(() => {
    apply(resetPreferences(latest.current));
  }, [apply]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      update,
      reset,
      resolvedTheme: preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme,
      prefersReducedMotion: preferences.reducedMotion || systemReduced,
      persisted,
      recovery: { replacedFields: stored.replacedFields, unreadable: stored.unreadable },
    }),
    [preferences, stored, update, reset, systemDark, systemReduced, persisted],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
