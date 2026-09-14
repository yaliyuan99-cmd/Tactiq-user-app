import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError } from '@/services/auth/types';
import { MESSAGES } from '@/services/auth/validation';
import {
  confirmPasswordError,
  emailError,
  fieldForAuthError,
  firstInvalidField,
  FORM_MESSAGES,
  isConfirmEmailNotice,
  nameError,
  newPasswordError,
  SIGN_UP_FIELDS,
  validateNewPassword,
  validateSignIn,
  validateSignUp,
} from './formValidation';

describe('field checks', () => {
  it('accepts a normal email, ignoring case and surrounding spaces', () => {
    expect(emailError('  Alex@Example.com ')).toBeUndefined();
  });

  it('rejects empty and malformed email with the shared wording', () => {
    expect(FORM_MESSAGES.invalidEmail).toBe('Enter an email address like name@example.com.');
    for (const bad of ['', '   ', 'alex', 'alex@', 'alex@example', 'al ex@example.com']) {
      expect(emailError(bad)).toBe(FORM_MESSAGES.invalidEmail);
    }
  });

  it('requires a name of at most 60 characters', () => {
    expect(nameError('  ')).toBe(MESSAGES.nameRequired);
    expect(nameError('a'.repeat(61))).toBe(MESSAGES.nameTooLong);
    expect(nameError('a'.repeat(60))).toBeUndefined();
  });

  it('requires new passwords of at least eight characters', () => {
    expect(newPasswordError('')).toBe(SUPABASE_MESSAGES.newPasswordRequired);
    expect(newPasswordError('1234567')).toBe('Use at least 8 characters.');
    expect(newPasswordError('12345678')).toBeUndefined();
  });

  it('requires the confirmation to match', () => {
    expect(confirmPasswordError('correct horse', '')).toBe(FORM_MESSAGES.confirmRequired);
    expect(confirmPasswordError('correct horse', 'correct hose')).toBe(FORM_MESSAGES.passwordMismatch);
    expect(confirmPasswordError('correct horse', 'correct horse')).toBeUndefined();
  });
});

describe('form checks', () => {
  it('ignores passwords in Demo Mode', () => {
    expect(validateSignIn({ email: 'alex@example.com', password: '' }, 'demo')).toEqual({});
    expect(validateSignUp({ name: 'Alex', email: 'alex@example.com', password: '', confirm: '' }, 'demo')).toEqual({});
  });

  it('checks passwords in Supabase mode', () => {
    expect(validateSignIn({ email: 'alex@example.com', password: '' }, 'supabase')).toEqual({
      password: SUPABASE_MESSAGES.passwordRequired,
    });
    expect(validateSignUp({ name: '', email: 'x', password: 'short', confirm: 'other' }, 'supabase')).toEqual({
      name: MESSAGES.nameRequired,
      email: FORM_MESSAGES.invalidEmail,
      password: 'Use at least 8 characters.',
      confirm: FORM_MESSAGES.passwordMismatch,
    });
    expect(validateNewPassword({ password: 'long enough', confirm: 'long enough' })).toEqual({});
  });

  it('finds the first invalid field in on-screen order', () => {
    expect(firstInvalidField(SIGN_UP_FIELDS, { confirm: 'x', email: 'y' })).toBe('email');
    expect(firstInvalidField(SIGN_UP_FIELDS, {})).toBeUndefined();
  });
});

describe('service errors', () => {
  it('treats the confirm-email message as a next step, not a failure', () => {
    expect(isConfirmEmailNotice(new AuthError('unknown', SUPABASE_MESSAGES.confirmEmail))).toBe(true);
    expect(isConfirmEmailNotice(new AuthError('unknown', SUPABASE_MESSAGES.serviceError))).toBe(false);
    expect(isConfirmEmailNotice(new AuthError('network', 'Check your inbox'))).toBe(false);
  });

  it('routes field-specific errors to their field', () => {
    expect(fieldForAuthError(new AuthError('invalid_email', MESSAGES.invalidEmail))).toBe('email');
    expect(fieldForAuthError(new AuthError('weak_password', 'Choose a stronger password.'))).toBe('password');
    expect(fieldForAuthError(new AuthError('unknown', MESSAGES.nameTooLong))).toBe('name');
    expect(fieldForAuthError(new AuthError('email_taken', 'taken'))).toBeUndefined();
  });
});
