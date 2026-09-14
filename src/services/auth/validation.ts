/**
 * Input checks shared by both auth services, so Demo Mode and Supabase mode
 * reject the same things with the same plain-language messages.
 */
import { AuthError } from './types';

export const DISPLAY_NAME_MAX_LENGTH = 60;

/** Deliberately simple: something@something.something, no spaces. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MESSAGES = {
  invalidEmail: 'Enter an email address like name@example.com.',
  nameRequired: 'Enter a name so we know what to call you.',
  nameTooLong: `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
  signedOut: 'Sign in first to change your profile.',
  unexpected: 'Something went wrong. Try again in a moment.',
} as const;

/** Trims and lower-cases an email address. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** Returns the normalised email, or throws AuthError('invalid_email'). */
export function requireValidEmail(email: string): string {
  const normalised = normaliseEmail(email);
  if (!isValidEmail(normalised)) throw new AuthError('invalid_email', MESSAGES.invalidEmail);
  return normalised;
}

/** Returns the trimmed display name, or throws AuthError('unknown') with a message the UI can show. */
export function requireValidDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) throw new AuthError('unknown', MESSAGES.nameRequired);
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) throw new AuthError('unknown', MESSAGES.nameTooLong);
  return trimmed;
}

/** Guarantees every rejection the UI sees is an AuthError with a readable message. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  return new AuthError('unknown', MESSAGES.unexpected);
}
