import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocalStorageAdapter, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { createAuthService } from './createAuthService';
import type {
  AuthMode,
  AuthService,
  AuthUser,
  GuestResult,
  PasswordResetRequestResult,
  SignInInput,
  SignUpInput,
} from './types';
import { toAuthError } from './validation';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  /** True until the stored session has been checked. */
  readonly loading: boolean;
  readonly mode: AuthMode;
  readonly service: AuthService;
  readonly signIn: (input: SignInInput) => Promise<AuthUser>;
  readonly signUp: (input: SignUpInput) => Promise<AuthUser>;
  readonly signOut: () => Promise<void>;
  readonly continueAsGuest: () => Promise<GuestResult>;
  readonly requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  readonly completePasswordReset: (newPassword: string) => Promise<void>;
  readonly updateProfile: (patch: { displayName?: string }) => Promise<AuthUser>;
  readonly deleteAccount: () => Promise<void>;
}

export interface AuthProviderProps {
  /** Injected service (tests, or an app-level composition root). */
  readonly service?: AuthService;
  /** Used to build the default service when none is injected. Defaults to localStorage. */
  readonly storage?: StorageAdapter;
  readonly children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Awaits a service call and rethrows any failure as an AuthError the UI can display. */
async function run<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toAuthError(error);
  }
}

export function AuthProvider({ service: injected, storage, children }: AuthProviderProps) {
  const service = useMemo<AuthService>(
    () => injected ?? createAuthService(storage ?? new LocalStorageAdapter()),
    [injected, storage],
  );
  /**
   * A service holding the session somewhere synchronous answers before the
   * first render, so nothing is ever rendered for a profile that is not the
   * one signed in. A service that has to ask a server starts empty and
   * loading, and `getSession` below fills it in.
   */
  const [user, setUser] = useState<AuthUser | null>(() => service.peekSession?.() ?? null);
  const [loading, setLoading] = useState(() => service.peekSession === undefined);
  // Swapping the service is a different identity, so re-read it during the
  // render rather than in an effect, for the same reason.
  const [current, setCurrent] = useState(service);
  if (current !== service) {
    setCurrent(service);
    setUser(service.peekSession?.() ?? null);
    setLoading(service.peekSession === undefined);
  }

  useEffect(() => {
    let active = true;
    // A change event is newer than the initial read, so it wins if it arrives first.
    let changed = false;
    if (!service.peekSession) setLoading(true);
    const unsubscribe = service.onChange((next) => {
      if (!active) return;
      changed = true;
      setUser(next);
      setLoading(false);
    });
    service.getSession().then(
      (restored) => {
        if (!active) return;
        if (!changed) setUser(restored);
        setLoading(false);
      },
      () => {
        if (!active) return;
        if (!changed) setUser(null);
        setLoading(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  const signIn = useCallback(
    (input: SignInInput) =>
      run(async () => {
        const next = await service.signIn(input);
        setUser(next);
        return next;
      }),
    [service],
  );

  const signUp = useCallback(
    (input: SignUpInput) =>
      run(async () => {
        const next = await service.signUp(input);
        setUser(next);
        return next;
      }),
    [service],
  );

  const signOut = useCallback(
    () =>
      run(async () => {
        await service.signOut();
        setUser(null);
      }),
    [service],
  );

  const continueAsGuest = useCallback(
    () =>
      run(async () => {
        const result = await service.continueAsGuest();
        setUser(result.user);
        return result;
      }),
    [service],
  );

  const requestPasswordReset = useCallback(
    (email: string) => run(() => service.requestPasswordReset(email)),
    [service],
  );

  const completePasswordReset = useCallback(
    (newPassword: string) => run(() => service.completePasswordReset(newPassword)),
    [service],
  );

  const updateProfile = useCallback(
    (patch: { displayName?: string }) =>
      run(async () => {
        const next = await service.updateProfile(patch);
        setUser(next);
        return next;
      }),
    [service],
  );

  const deleteAccount = useCallback(
    () =>
      run(async () => {
        await service.deleteAccount();
        setUser(null);
      }),
    [service],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode: service.mode,
      service,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      requestPasswordReset,
      completePasswordReset,
      updateProfile,
      deleteAccount,
    }),
    [
      user,
      loading,
      service,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      requestPasswordReset,
      completePasswordReset,
      updateProfile,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** True when someone (including a Demo Mode guest) is signed in. False while the session is still loading. */
export function useIsSignedIn(): boolean {
  return useAuth().user !== null;
}
