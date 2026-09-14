import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';

export interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  readonly update: (patch: Partial<UserPreferences>) => void;
  readonly reset: () => void;
  /** The theme in effect after resolving "system". */
  readonly resolvedTheme: 'light' | 'dark';
  /** OS preference OR the app-level reduced-motion setting. */
  readonly prefersReducedMotion: boolean;
  /** False when the browser refused to persist (e.g. private mode). */
  readonly persisted: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function loadPreferences(storage: StorageAdapter): UserPreferences {
  const stored = storage.get<Partial<UserPreferences>>(STORAGE_KEYS.preferences);
  if (!stored || typeof stored !== 'object') return DEFAULT_PREFERENCES;
  return { ...DEFAULT_PREFERENCES, ...stored, version: 1 };
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

export function PreferencesProvider({ storage, children }: { storage: StorageAdapter; children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences(storage));
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

  // Cross-tab and cross-service changes.
  useEffect(
    () =>
      storage.subscribe((key) => {
        if (key === STORAGE_KEYS.preferences) setPreferences(loadPreferences(storage));
      }),
    [storage],
  );

  useEffect(() => {
    applyPreferencesToDocument(preferences, systemDark);
  }, [preferences, systemDark]);

  const update = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next: UserPreferences = { ...prev, ...patch, version: 1 };
        setPersisted(storage.set(STORAGE_KEYS.preferences, next));
        return next;
      });
    },
    [storage],
  );

  const reset = useCallback(() => {
    setPersisted(storage.set(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES));
    setPreferences(DEFAULT_PREFERENCES);
  }, [storage]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      update,
      reset,
      resolvedTheme: preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme,
      prefersReducedMotion: preferences.reducedMotion || systemReduced,
      persisted,
    }),
    [preferences, update, reset, systemDark, systemReduced, persisted],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
