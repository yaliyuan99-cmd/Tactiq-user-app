/**
 * Wraps a working auth service so it behaves like a server-backed one: the
 * session is only knowable after a round trip.
 *
 * Demo Mode answers `peekSession` straight out of browser storage, which is
 * why the app shows no loading state for a local profile. Supabase cannot, so
 * the loading state still exists and still has to be correct — and a test for
 * it cannot use a local service, because a local one never waits. This is
 * delegation rather than a subclass on purpose: `peekSession` has to be
 * absent, and a subclass can only override it, not remove it.
 */
import type { AuthService, AuthUser } from '../types';

export interface ServerBackedAuth extends AuthService {
  /** Settles the pending `getSession()`. Until it is called, the session is unknown. */
  readonly answer: (user: AuthUser | null) => void;
}

export function serverBackedAuth(service: AuthService, mode: AuthService['mode'] = 'supabase'): ServerBackedAuth {
  let settle: ((user: AuthUser | null) => void) | null = null;
  const pending = new Promise<AuthUser | null>((resolve) => {
    settle = resolve;
  });
  return {
    mode,
    getSession: () => pending,
    answer: (user) => settle?.(user),
    onChange: (listener) => service.onChange(listener),
    signIn: (input) => service.signIn(input),
    signUp: (input) => service.signUp(input),
    signOut: () => service.signOut(),
    continueAsGuest: () => service.continueAsGuest(),
    requestPasswordReset: (email) => service.requestPasswordReset(email),
    completePasswordReset: (password) => service.completePasswordReset(password),
    updateProfile: (patch) => service.updateProfile(patch),
    deleteAccount: () => service.deleteAccount(),
  };
}
