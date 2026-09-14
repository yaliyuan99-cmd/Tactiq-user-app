import { mapSupabaseUser, SupabaseAuthService, type SupabaseAuthLike, type SupabaseUserLike } from './SupabaseAuthService';
import { SUPABASE_MESSAGES } from './supabaseErrors';
import { AuthError } from './types';
import { MESSAGES } from './validation';

const USER: SupabaseUserLike = {
  id: 'uuid-1',
  email: 'ada@example.com',
  created_at: '2026-01-02T03:04:05.000Z',
  user_metadata: { full_name: 'Ada Lovelace' },
};
const SESSION = { user: USER };

function fakeClient() {
  const unsubscribe = vi.fn();
  let authCallback: ((event: string, session: { user: SupabaseUserLike } | null) => void) | null = null;
  const auth = {
    getSession: vi.fn<SupabaseAuthLike['auth']['getSession']>(async () => ({ data: { session: SESSION }, error: null })),
    onAuthStateChange: vi.fn<SupabaseAuthLike['auth']['onAuthStateChange']>((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    signInWithPassword: vi.fn<SupabaseAuthLike['auth']['signInWithPassword']>(async () => ({
      data: { user: USER, session: SESSION },
      error: null,
    })),
    signUp: vi.fn<SupabaseAuthLike['auth']['signUp']>(async () => ({ data: { user: USER, session: SESSION }, error: null })),
    signOut: vi.fn<SupabaseAuthLike['auth']['signOut']>(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn<SupabaseAuthLike['auth']['resetPasswordForEmail']>(async () => ({ data: {}, error: null })),
    updateUser: vi.fn<SupabaseAuthLike['auth']['updateUser']>(async () => ({ data: { user: USER }, error: null })),
  };
  const client: SupabaseAuthLike = { auth };
  return { client, auth, unsubscribe, emit: (session: { user: SupabaseUserLike } | null) => authCallback?.('SIGNED_IN', session) };
}

async function caught(promise: Promise<unknown>): Promise<AuthError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AuthError);
  return error as AuthError;
}

const failure = (message: string, extra: Record<string, unknown> = {}) => ({
  data: { user: null, session: null },
  error: { message, name: 'AuthApiError', status: 400, ...extra },
});

describe('SupabaseAuthService', () => {
  it('maps a Supabase user to an AuthUser', () => {
    expect(mapSupabaseUser(USER)).toEqual({
      id: 'uuid-1',
      email: 'ada@example.com',
      displayName: 'Ada Lovelace',
      createdAt: '2026-01-02T03:04:05.000Z',
      provider: 'supabase',
    });
    expect(mapSupabaseUser({ id: 'u2', email: 'x@example.com', created_at: 'c', user_metadata: {} }).displayName).toBe(
      'x@example.com',
    );
    expect(mapSupabaseUser({ id: 'u3', created_at: 'c' })).toMatchObject({ email: '', displayName: '' });
  });

  it('restores the session and treats a restore failure as signed out', async () => {
    const { client, auth } = fakeClient();
    const service = new SupabaseAuthService(client);
    expect(service.mode).toBe('supabase');
    expect(await service.getSession()).toMatchObject({ id: 'uuid-1', displayName: 'Ada Lovelace' });
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid Refresh Token' } });
    expect(await service.getSession()).toBeNull();
    auth.getSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.getSession()).toBeNull();
  });

  it('relays auth state changes and unsubscribes', () => {
    const { client, unsubscribe, emit } = fakeClient();
    const listener = vi.fn();
    const stop = new SupabaseAuthService(client).onChange(listener);
    emit(SESSION);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'uuid-1' }));
    emit(null);
    expect(listener).toHaveBeenLastCalledWith(null);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signs in with email and password', async () => {
    const { client, auth } = fakeClient();
    const user = await new SupabaseAuthService(client).signIn({ email: ' Ada@Example.com ', password: 'pw-123456' });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'pw-123456' });
    expect(user.provider).toBe('supabase');
  });

  it('requires a password to sign in', async () => {
    const { client, auth } = fakeClient();
    const error = await caught(new SupabaseAuthService(client).signIn({ email: 'ada@example.com' }));
    expect(error.code).toBe('invalid_credentials');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['Invalid login credentials', {}, 'invalid_credentials', SUPABASE_MESSAGES.invalidCredentials],
    ['User already registered', {}, 'email_taken', SUPABASE_MESSAGES.emailTaken],
    ['Password should be at least 6 characters.', {}, 'weak_password', undefined],
    ['Unable to validate email address: invalid format', {}, 'invalid_email', MESSAGES.invalidEmail],
    ['Email not confirmed', {}, 'unknown', SUPABASE_MESSAGES.emailNotConfirmed],
    ['Something odd happened', {}, 'unknown', SUPABASE_MESSAGES.serviceError],
    ['Failed to fetch', { name: 'AuthRetryableFetchError', status: 0 }, 'network', SUPABASE_MESSAGES.network],
  ] as const)('maps "%s" to %s', async (message, extra, code, expected) => {
    const { client, auth } = fakeClient();
    auth.signInWithPassword.mockResolvedValueOnce(failure(message, extra));
    const error = await caught(new SupabaseAuthService(client).signIn({ email: 'ada@example.com', password: 'pw' }));
    expect(error.code).toBe(code);
    if (expected) expect(error.message).toBe(expected);
    else expect(error.message).toBe(`${SUPABASE_MESSAGES.weakPasswordPrefix} ${message}`);
  });

  it('maps a thrown fetch failure to a network error', async () => {
    const { client, auth } = fakeClient();
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await caught(new SupabaseAuthService(client).signIn({ email: 'ada@example.com', password: 'pw' }));
    expect(error).toMatchObject({ code: 'network', message: SUPABASE_MESSAGES.network });
  });

  it('signs up with the display name as full_name', async () => {
    const { client, auth } = fakeClient();
    const user = await new SupabaseAuthService(client).signUp({
      email: 'ada@example.com',
      displayName: ' Ada Lovelace ',
      password: 'pw-123456',
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'pw-123456',
      options: { data: { full_name: 'Ada Lovelace' } },
    });
    expect(user.displayName).toBe('Ada Lovelace');
  });

  it('maps sign-up errors and asks for confirmation when no session is returned', async () => {
    const { client, auth } = fakeClient();
    const service = new SupabaseAuthService(client);
    auth.signUp.mockResolvedValueOnce(failure('User already registered'));
    expect((await caught(service.signUp({ email: 'a@b.co', displayName: 'A', password: 'pw' }))).code).toBe('email_taken');
    auth.signUp.mockResolvedValueOnce(failure('Password should be at least 6 characters.'));
    expect((await caught(service.signUp({ email: 'a@b.co', displayName: 'A', password: 'pw' }))).code).toBe('weak_password');
    auth.signUp.mockResolvedValueOnce({ data: { user: USER, session: null }, error: null });
    const pending = await caught(service.signUp({ email: 'a@b.co', displayName: 'A', password: 'pw-123456' }));
    expect(pending).toMatchObject({ code: 'unknown', message: SUPABASE_MESSAGES.confirmEmail });
    expect((await caught(service.signUp({ email: 'a@b.co', displayName: 'A' }))).code).toBe('weak_password');
  });

  it('requests a reset with redirectTo /reset-password and never reveals whether the email exists', async () => {
    const { client, auth } = fakeClient();
    const service = new SupabaseAuthService(client);
    const expected = { delivered: true, message: SUPABASE_MESSAGES.resetSent };
    expect(await service.requestPasswordReset('Ada@example.com')).toEqual(expected);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'User not found', status: 404 } });
    expect(await service.requestPasswordReset('nobody@example.com')).toEqual(expected);
    auth.resetPasswordForEmail.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect((await caught(service.requestPasswordReset('ada@example.com'))).code).toBe('network');
  });

  it('completes a reset and updates the profile through updateUser', async () => {
    const { client, auth } = fakeClient();
    const service = new SupabaseAuthService(client);
    await service.completePasswordReset('new-password-1');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-1' });
    auth.updateUser.mockResolvedValueOnce({
      data: { user: { ...USER, user_metadata: { full_name: 'Ada L' } } },
      error: null,
    });
    const updated = await service.updateProfile({ displayName: 'Ada L' });
    expect(auth.updateUser).toHaveBeenLastCalledWith({ data: { full_name: 'Ada L' } });
    expect(updated.displayName).toBe('Ada L');
    auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Password should be at least 6 characters.' } });
    expect((await caught(service.completePasswordReset('x'))).code).toBe('weak_password');
  });

  it('signs out, falling back to this device when the server cannot be reached', async () => {
    const { client, auth } = fakeClient();
    const service = new SupabaseAuthService(client);
    await service.signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    auth.signOut.mockResolvedValueOnce({ error: { message: 'Failed to fetch', name: 'AuthRetryableFetchError' } });
    await service.signOut();
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('refuses guest profiles and account deletion', async () => {
    const service = new SupabaseAuthService(fakeClient().client);
    expect(await caught(service.continueAsGuest())).toMatchObject({ code: 'unavailable' });
    expect(await caught(service.deleteAccount())).toMatchObject({
      code: 'unavailable',
      message: 'Deleting an account needs a server-side function, which this deployment does not have yet.',
    });
  });
});
