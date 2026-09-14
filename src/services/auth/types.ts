/**
 * Authentication contract.
 *
 * Demo Mode (no backend configured): accounts are local profiles stored in
 * this browser. No password is stored or checked, and the UI says so.
 * Supabase mode (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set): real
 * email + password sign-in, sign-up and reset.
 */

export type AuthMode = 'demo' | 'supabase';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: string;
  readonly provider: AuthMode;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'not_found'
  | 'weak_password'
  | 'invalid_email'
  | 'unavailable'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface SignInInput {
  readonly email: string;
  /** Required in Supabase mode; ignored in Demo Mode. */
  readonly password?: string;
}

export interface SignUpInput {
  readonly email: string;
  readonly displayName: string;
  /** Required in Supabase mode; ignored in Demo Mode. */
  readonly password?: string;
}

export interface PasswordResetRequestResult {
  /** True when an email was actually sent (Supabase). False in Demo Mode. */
  readonly delivered: boolean;
  /** Plain-language explanation to show the user. */
  readonly message: string;
}

export interface AuthService {
  readonly mode: AuthMode;
  /** Current session, restored from storage on load. */
  getSession(): Promise<AuthUser | null>;
  /** Fires on every sign-in / sign-out, including from other tabs where supported. */
  onChange(listener: (user: AuthUser | null) => void): () => void;
  signIn(input: SignInInput): Promise<AuthUser>;
  signUp(input: SignUpInput): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Demo Mode only: creates a local guest profile without a form. Supabase mode throws 'unavailable'. */
  continueAsGuest(): Promise<AuthUser>;
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  /** Supabase mode: completes the recovery flow opened from the email link. Demo Mode throws 'unavailable'. */
  completePasswordReset(newPassword: string): Promise<void>;
  updateProfile(patch: { displayName?: string }): Promise<AuthUser>;
  /** Signs out and removes the account (Demo Mode: the local profile). */
  deleteAccount(): Promise<void>;
}
