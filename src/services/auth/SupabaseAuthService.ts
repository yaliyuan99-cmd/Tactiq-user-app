import {
  AuthError,
  type AuthMode,
  type AuthService,
  type AuthUser,
  type GuestResult,
  type PasswordResetRequestResult,
  type SignInInput,
  type SignUpInput,
} from './types';
import { mapSupabaseError, SUPABASE_MESSAGES, type SupabaseErrorLike } from './supabaseErrors';
import { MESSAGES, requireValidDisplayName, requireValidEmail } from './validation';

/** The fields of a Supabase user this app reads. */
export interface SupabaseUserLike {
  readonly id: string;
  readonly email?: string | undefined;
  readonly created_at: string;
  readonly user_metadata?: { readonly [key: string]: unknown } | undefined;
  readonly identities?: readonly unknown[] | undefined;
}

export interface SupabaseSessionLike {
  readonly user: SupabaseUserLike;
}

type Result<T> = Promise<{ data: T; error: SupabaseErrorLike | null }>;

/**
 * The slice of `SupabaseClient` this service uses. A real client from
 * `createClient()` satisfies it structurally; tests pass a fake.
 */
export interface SupabaseAuthLike {
  readonly auth: {
    getSession(): Result<{ session: SupabaseSessionLike | null }>;
    onAuthStateChange(callback: (event: string, session: SupabaseSessionLike | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
    signInWithPassword(credentials: { email: string; password: string }): Result<{
      user: SupabaseUserLike | null;
      session: SupabaseSessionLike | null;
    }>;
    signUp(credentials: {
      email: string;
      password: string;
      options?: { data?: object; emailRedirectTo?: string };
    }): Result<{ user: SupabaseUserLike | null; session: SupabaseSessionLike | null }>;
    signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: SupabaseErrorLike | null }>;
    resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Result<unknown>;
    updateUser(attributes: { password?: string; data?: object }): Result<{ user: SupabaseUserLike | null }>;
  };
}

export const RESET_PASSWORD_PATH = '/reset-password';

function revealsAccountExistence(error: SupabaseErrorLike): boolean {
  return error.code === 'user_not_found' || /user not found|no user/i.test(error.message);
}

/** Maps a Supabase user to the app's AuthUser. */
export function mapSupabaseUser(user: SupabaseUserLike): AuthUser {
  const email = user.email ?? '';
  const fullName = user.user_metadata?.full_name;
  return {
    id: user.id,
    email,
    displayName: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : email,
    createdAt: user.created_at,
    provider: 'supabase',
  };
}

/**
 * Real email + password accounts, used only when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are configured. Every failure, returned or thrown,
 * is rethrown as an AuthError with a plain-language message.
 */
export class SupabaseAuthService implements AuthService {
  readonly mode: AuthMode = 'supabase';

  constructor(private readonly client: SupabaseAuthLike) {}

  /** Resolves null when there is no session or it could not be restored (the user signs in again). */
  async getSession(): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error || !data.session) return null;
      return mapSupabaseUser(data.session.user);
    } catch {
      return null;
    }
  }

  onChange(listener: (user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? mapSupabaseUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(input: SignInInput): Promise<AuthUser> {
    const email = requireValidEmail(input.email);
    const password = input.password ?? '';
    if (!password) throw new AuthError('invalid_credentials', SUPABASE_MESSAGES.passwordRequired);
    const { data, error } = await this.call(() => this.client.auth.signInWithPassword({ email, password }));
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw new AuthError('unknown', SUPABASE_MESSAGES.serviceError);
    return mapSupabaseUser(data.user);
  }

  /**
   * When the project requires email confirmation Supabase returns no session.
   * That rejects with SUPABASE_MESSAGES.confirmEmail (code 'unknown') so the
   * UI never shows a signed-in state that does not exist. The same message is
   * used when Supabase hides an existing address, so it reveals nothing.
   */
  async signUp(input: SignUpInput): Promise<AuthUser> {
    const email = requireValidEmail(input.email);
    const displayName = requireValidDisplayName(input.displayName);
    const password = input.password ?? '';
    if (!password) throw new AuthError('weak_password', SUPABASE_MESSAGES.newPasswordRequired);
    const { data, error } = await this.call(() =>
      this.client.auth.signUp({ email, password, options: { data: { full_name: displayName } } }),
    );
    if (error) throw mapSupabaseError(error);
    if (!data.user || !data.session) throw new AuthError('unknown', SUPABASE_MESSAGES.confirmEmail);
    return mapSupabaseUser(data.user);
  }

  /** Signs out everywhere; if that cannot reach the server, still signs out on this device. */
  async signOut(): Promise<void> {
    const global = await this.call(() => this.client.auth.signOut());
    if (!global.error) return;
    const local = await this.call(() => this.client.auth.signOut({ scope: 'local' }));
    if (local.error) throw mapSupabaseError(local.error);
  }

  async continueAsGuest(): Promise<GuestResult> {
    throw new AuthError('unavailable', SUPABASE_MESSAGES.guestUnavailable);
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalised = requireValidEmail(email);
    const redirectTo = `${window.location.origin}${RESET_PASSWORD_PATH}`;
    const { error } = await this.call(() => this.client.auth.resetPasswordForEmail(normalised, { redirectTo }));
    // A failure that would reveal whether the address has an account is answered like a success.
    if (error && !revealsAccountExistence(error)) throw mapSupabaseError(error);
    return { delivered: true, message: SUPABASE_MESSAGES.resetSent };
  }

  async completePasswordReset(newPassword: string): Promise<void> {
    if (!newPassword) throw new AuthError('weak_password', SUPABASE_MESSAGES.newPasswordRequired);
    const { error } = await this.call(() => this.client.auth.updateUser({ password: newPassword }));
    if (error) throw mapSupabaseError(error);
  }

  async updateProfile(patch: { displayName?: string }): Promise<AuthUser> {
    if (patch.displayName === undefined) {
      const current = await this.getSession();
      if (!current) throw new AuthError('not_found', MESSAGES.signedOut);
      return current;
    }
    const fullName = requireValidDisplayName(patch.displayName);
    const { data, error } = await this.call(() => this.client.auth.updateUser({ data: { full_name: fullName } }));
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw new AuthError('not_found', MESSAGES.signedOut);
    return mapSupabaseUser(data.user);
  }

  async deleteAccount(): Promise<void> {
    throw new AuthError('unavailable', SUPABASE_MESSAGES.deleteUnavailable);
  }

  /** Runs a client call, turning a thrown failure (offline, blocked script) into an AuthError. */
  private async call<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }
}
