/**
 * Field checks for the sign-in, sign-up and password screens. They mirror the
 * services' own checks (same email rule, same name limits, same wording) so a
 * mistake is caught beside the field before anything is sent.
 */
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import type { AuthError, AuthMode } from '@/services/auth/types';
import { DISPLAY_NAME_MAX_LENGTH, isValidEmail, MESSAGES, normaliseEmail } from '@/services/auth/validation';

export const PASSWORD_MIN_LENGTH = 8;

export const FORM_MESSAGES = {
  invalidEmail: MESSAGES.invalidEmail,
  nameRequired: MESSAGES.nameRequired,
  nameTooLong: MESSAGES.nameTooLong,
  passwordRequired: SUPABASE_MESSAGES.passwordRequired,
  newPasswordRequired: SUPABASE_MESSAGES.newPasswordRequired,
  passwordTooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  confirmRequired: 'Enter the same password again to confirm it.',
  passwordMismatch: 'The passwords do not match. Enter the same password in both fields.',
} as const;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function emailError(email: string): string | undefined {
  return isValidEmail(normaliseEmail(email)) ? undefined : FORM_MESSAGES.invalidEmail;
}

export function nameError(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return FORM_MESSAGES.nameRequired;
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) return FORM_MESSAGES.nameTooLong;
  return undefined;
}

/** Signing in only needs a password to be present; the service decides whether it is right. */
export function currentPasswordError(password: string): string | undefined {
  return password ? undefined : FORM_MESSAGES.passwordRequired;
}

export function newPasswordError(password: string): string | undefined {
  if (!password) return FORM_MESSAGES.newPasswordRequired;
  if (password.length < PASSWORD_MIN_LENGTH) return FORM_MESSAGES.passwordTooShort;
  return undefined;
}

export function confirmPasswordError(password: string, confirm: string): string | undefined {
  if (!confirm) return FORM_MESSAGES.confirmRequired;
  return confirm === password ? undefined : FORM_MESSAGES.passwordMismatch;
}

function compact<K extends string>(entries: ReadonlyArray<readonly [K, string | undefined]>): FieldErrors<K> {
  const errors: FieldErrors<K> = {};
  for (const [key, message] of entries) {
    if (message) errors[key] = message;
  }
  return errors;
}

export type SignInField = 'email' | 'password';
export const SIGN_IN_FIELDS: readonly SignInField[] = ['email', 'password'];

/** Passwords are only checked in Supabase mode; Demo Mode has none. */
export function validateSignIn(values: { email: string; password: string }, mode: AuthMode): FieldErrors<SignInField> {
  return compact<SignInField>([
    ['email', emailError(values.email)],
    ['password', mode === 'supabase' ? currentPasswordError(values.password) : undefined],
  ]);
}

export type SignUpField = 'name' | 'email' | 'password' | 'confirm';
export const SIGN_UP_FIELDS: readonly SignUpField[] = ['name', 'email', 'password', 'confirm'];

export function validateSignUp(
  values: { name: string; email: string; password: string; confirm: string },
  mode: AuthMode,
): FieldErrors<SignUpField> {
  const supabase = mode === 'supabase';
  return compact<SignUpField>([
    ['name', nameError(values.name)],
    ['email', emailError(values.email)],
    ['password', supabase ? newPasswordError(values.password) : undefined],
    ['confirm', supabase ? confirmPasswordError(values.password, values.confirm) : undefined],
  ]);
}

export type NewPasswordField = 'password' | 'confirm';
export const NEW_PASSWORD_FIELDS: readonly NewPasswordField[] = ['password', 'confirm'];

export function validateNewPassword(values: { password: string; confirm: string }): FieldErrors<NewPasswordField> {
  return compact<NewPasswordField>([
    ['password', newPasswordError(values.password)],
    ['confirm', confirmPasswordError(values.password, values.confirm)],
  ]);
}

/** The first field, in on-screen order, that has an error. */
export function firstInvalidField<K extends string>(order: readonly K[], errors: FieldErrors<K>): K | undefined {
  return order.find((field) => Boolean(errors[field]));
}

/**
 * Supabase answers a sign-up that still needs email confirmation with an
 * AuthError pointing to the inbox. That is a next step, not a failure.
 */
export function isConfirmEmailNotice(error: AuthError): boolean {
  return error.code === 'unknown' && /inbox/i.test(error.message);
}

/** The form field a service error belongs to, when it belongs to one. */
export function fieldForAuthError(error: AuthError): 'name' | 'email' | 'password' | undefined {
  if (error.code === 'invalid_email') return 'email';
  if (error.code === 'weak_password') return 'password';
  if (error.message === MESSAGES.nameRequired || error.message === MESSAGES.nameTooLong) return 'name';
  return undefined;
}
