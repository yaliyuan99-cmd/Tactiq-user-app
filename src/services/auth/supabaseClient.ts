/**
 * Lazy Supabase client. `@supabase/supabase-js` is only downloaded and
 * `createClient` only called the first time an auth method runs, so Demo Mode
 * never loads or constructs a client, and the library sits in its own chunk.
 * One client is shared per page, as Supabase recommends.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { SupabaseAuthLike } from './SupabaseAuthService';

export type SupabaseClientLoader = () => Promise<SupabaseAuthLike>;

let clientPromise: Promise<SupabaseAuthLike> | null = null;

/** Imports the library and creates the shared client on first use. A failed load can be retried. */
export const loadSupabaseClient: SupabaseClientLoader = () => {
  if (!clientPromise) {
    const pending: Promise<SupabaseAuthLike> = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
    clientPromise = pending;
    pending.catch(() => {
      if (clientPromise === pending) clientPromise = null;
    });
  }
  return clientPromise;
};

/**
 * A SupabaseAuthLike whose every call waits for `load()` first. Subscriptions
 * made before the client exists are attached once it loads, and cancelling
 * early means they are never attached.
 */
export function createLazySupabaseAuthClient(load: SupabaseClientLoader = loadSupabaseClient): SupabaseAuthLike {
  return {
    auth: {
      getSession: () => load().then((c) => c.auth.getSession()),
      onAuthStateChange: (callback) => {
        let cancelled = false;
        let detach: (() => void) | null = null;
        load().then(
          (c) => {
            if (cancelled) return;
            const { data } = c.auth.onAuthStateChange(callback);
            detach = () => data.subscription.unsubscribe();
          },
          () => {},
        );
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                cancelled = true;
                detach?.();
              },
            },
          },
        };
      },
      signInWithPassword: (credentials) => load().then((c) => c.auth.signInWithPassword(credentials)),
      signUp: (credentials) => load().then((c) => c.auth.signUp(credentials)),
      signOut: (options) => load().then((c) => c.auth.signOut(options)),
      resetPasswordForEmail: (email, options) => load().then((c) => c.auth.resetPasswordForEmail(email, options)),
      updateUser: (attributes) => load().then((c) => c.auth.updateUser(attributes)),
    },
  };
}
