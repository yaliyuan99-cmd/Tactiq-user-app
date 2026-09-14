/**
 * Turns whatever the Supabase client returns or throws into an AuthError
 * with a plain-language message. Supabase's own wording is only passed
 * through where it is already user-facing (password rules).
 */
import { AuthError } from './types';
import { MESSAGES } from './validation';

/** The fields of a Supabase AuthError this app reads. */
export interface SupabaseErrorLike {
  readonly message: string;
  readonly name?: string;
  readonly status?: number | undefined;
  readonly code?: string | undefined;
}

export const SUPABASE_MESSAGES = {
  invalidCredentials: 'That email and password do not match.',
  passwordRequired: 'Enter your password.',
  newPasswordRequired: 'Choose a password.',
  emailTaken: 'An account already uses that email. Sign in instead.',
  weakPasswordPrefix: 'Choose a stronger password.',
  samePassword: 'Choose a password you have not used for this account before.',
  network: 'Could not reach the sign-in service. Check your connection and try again.',
  emailNotConfirmed: 'Confirm your email address using the link we sent, then sign in.',
  rateLimited: 'Too many attempts in a short time. Wait a minute, then try again.',
  confirmEmail: 'Check your inbox for a link to confirm your email address, then sign in.',
  resetSent: 'If that email has an account, a reset link is on its way.',
  guestUnavailable: 'Guest profiles are only available in Demo Mode. Create an account or sign in.',
  deleteUnavailable: 'Deleting an account needs a server-side function, which this deployment does not have yet.',
  serviceError: 'Something went wrong with the sign-in service. Try again in a moment.',
} as const;

function readError(error: unknown): SupabaseErrorLike | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as Record<string, unknown>;
  if (typeof record.message !== 'string') return null;
  return {
    message: record.message,
    name: typeof record.name === 'string' ? record.name : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
  };
}

const NETWORK_PATTERN = /failed to fetch|fetch failed|networkerror|network request failed|load failed|dynamically imported module/i;

export function isNetworkFailure(error: SupabaseErrorLike): boolean {
  return error.name === 'AuthRetryableFetchError' || NETWORK_PATTERN.test(error.message);
}

export function mapSupabaseError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const e = readError(error);
  if (!e) return new AuthError('unknown', MESSAGES.unexpected);
  const { message, code } = e;

  if (isNetworkFailure(e)) return new AuthError('network', SUPABASE_MESSAGES.network);
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return new AuthError('invalid_credentials', SUPABASE_MESSAGES.invalidCredentials);
  }
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(message)) {
    return new AuthError('email_taken', SUPABASE_MESSAGES.emailTaken);
  }
  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return new AuthError('weak_password', SUPABASE_MESSAGES.samePassword);
  }
  if (code === 'weak_password' || /Password should (be|contain)/.test(message)) {
    return new AuthError('weak_password', `${SUPABASE_MESSAGES.weakPasswordPrefix} ${message}`.trim());
  }
  if (code === 'email_address_invalid' || /invalid format|email address .*is invalid/i.test(message)) {
    return new AuthError('invalid_email', MESSAGES.invalidEmail);
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return new AuthError('unknown', SUPABASE_MESSAGES.emailNotConfirmed);
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit/i.test(message)) {
    return new AuthError('unknown', SUPABASE_MESSAGES.rateLimited);
  }
  return new AuthError('unknown', SUPABASE_MESSAGES.serviceError);
}
