import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { SignedOutLocationState } from '@/app/routing/redirects';
import { useAuth } from '@/services/auth/AuthProvider';

export interface SignOutControl {
  readonly signOut: () => Promise<void>;
  readonly pending: boolean;
  /** Plain-language failure message, or null. */
  readonly error: string | null;
}

export const SIGN_OUT_FAILED = 'Sign out did not finish. Check your connection and try again.';

/**
 * Signs out, then opens sign-in (replacing the history entry, so Back does not
 * return to a protected page). The sign-in screen receives
 * `{ signedOut: true }` as router state if it wants to confirm the sign-out.
 */
export function useSignOut(): SignOutControl {
  const { signOut: authSignOut } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await authSignOut();
      const state: SignedOutLocationState = { signedOut: true };
      navigate(ROUTES.signIn, { replace: true, state });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error && cause.message ? cause.message : SIGN_OUT_FAILED);
    } finally {
      if (mounted.current) setPending(false);
    }
  }, [authSignOut, navigate]);

  return { signOut, pending, error };
}
