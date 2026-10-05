import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { DEMO_MESSAGES, GUEST_EMAIL, LocalDemoAuthService } from './LocalDemoAuthService';
import { AuthError, type AuthUser } from './types';
import { MESSAGES } from './validation';

async function expectAuthError(promise: Promise<unknown>, code: AuthError['code'], message?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AuthError);
  expect((error as AuthError).code).toBe(code);
  if (message) expect((error as AuthError).message).toBe(message);
}

describe('LocalDemoAuthService', () => {
  let storage: MemoryStorageAdapter;
  let service: LocalDemoAuthService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    service = new LocalDemoAuthService(storage);
  });

  it('reports demo mode and starts signed out', async () => {
    expect(service.mode).toBe('demo');
    expect(await service.getSession()).toBeNull();
  });

  it('signs up, normalises the email and starts a session', async () => {
    const user = await service.signUp({ email: '  Ada@Example.COM ', displayName: '  Ada  ' });
    expect(user).toMatchObject({ email: 'ada@example.com', displayName: 'Ada', provider: 'demo' });
    expect(user.id).toMatch(/^user_/);
    expect(await service.getSession()).toEqual(user);
    expect(storage.get(STORAGE_KEYS.authSession)).toMatchObject({ userId: user.id });
    expect(storage.get(STORAGE_KEYS.authAccounts)).toEqual([
      { id: user.id, email: 'ada@example.com', displayName: 'Ada', createdAt: user.createdAt },
    ]);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    await expectAuthError(
      service.signUp({ email: 'ADA@example.com', displayName: 'Another Ada' }),
      'email_taken',
      DEMO_MESSAGES.emailTaken,
    );
  });

  it('rejects an invalid email', async () => {
    await expectAuthError(service.signUp({ email: 'not-an-email', displayName: 'Ada' }), 'invalid_email', MESSAGES.invalidEmail);
    await expectAuthError(service.signUp({ email: '   ', displayName: 'Ada' }), 'invalid_email');
  });

  it('requires a display name of at most 60 characters', async () => {
    await expectAuthError(service.signUp({ email: 'ada@example.com', displayName: '   ' }), 'unknown', MESSAGES.nameRequired);
    await expectAuthError(
      service.signUp({ email: 'ada@example.com', displayName: 'a'.repeat(61) }),
      'unknown',
      MESSAGES.nameTooLong,
    );
    const user = await service.signUp({ email: 'ada@example.com', displayName: 'a'.repeat(60) });
    expect(user.displayName).toHaveLength(60);
  });

  it('signs in to an existing profile and rejects an unknown email', async () => {
    const created = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    await service.signOut();
    await expectAuthError(service.signIn({ email: 'nobody@example.com' }), 'not_found', DEMO_MESSAGES.notFound);
    const user = await service.signIn({ email: ' ADA@example.com' });
    expect(user).toEqual(created);
    expect(await service.getSession()).toEqual(created);
  });

  it('ignores passwords entirely: never stored, never checked', async () => {
    await service.signUp({ email: 'ada@example.com', displayName: 'Ada', password: 'correct-horse-battery' });
    const everything = storage.keys().map((key) => JSON.stringify(storage.get(key)));
    expect(everything.join('')).not.toContain('correct-horse-battery');
    await service.signOut();
    const user = await service.signIn({ email: 'ada@example.com', password: 'something else entirely' });
    expect(user.email).toBe('ada@example.com');
  });

  it('reuses one guest profile, and only reports the first one as new', async () => {
    const first = await service.continueAsGuest();
    expect(first.user).toMatchObject({ email: GUEST_EMAIL, displayName: 'Guest', provider: 'demo' });
    expect(first.created).toBe(true);
    await service.signOut();
    const second = await service.continueAsGuest();
    expect(second.user.id).toBe(first.user.id);
    expect(second.created).toBe(false);
    expect(storage.get<unknown[]>(STORAGE_KEYS.authAccounts)).toHaveLength(1);
  });

  it('signs out by clearing only the session', async () => {
    await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    await service.signOut();
    expect(await service.getSession()).toBeNull();
    expect(storage.get(STORAGE_KEYS.authSession)).toBeNull();
    expect(storage.get<unknown[]>(STORAGE_KEYS.authAccounts)).toHaveLength(1);
  });

  it('updates the display name of the signed-in profile', async () => {
    const created = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    const updated = await service.updateProfile({ displayName: ' Ada Lovelace ' });
    expect(updated).toEqual({ ...created, displayName: 'Ada Lovelace' });
    expect(await service.getSession()).toEqual(updated);
    expect(await service.updateProfile({})).toEqual(updated);
    await expectAuthError(service.updateProfile({ displayName: '' }), 'unknown', MESSAGES.nameRequired);
  });

  it('refuses to update a profile when signed out', async () => {
    await expectAuthError(service.updateProfile({ displayName: 'Ada' }), 'not_found', MESSAGES.signedOut);
  });

  it('deletes the signed-in profile and its session, leaving others', async () => {
    await service.signUp({ email: 'grace@example.com', displayName: 'Grace' });
    await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    await service.deleteAccount();
    expect(await service.getSession()).toBeNull();
    const accounts = storage.get<Array<{ email: string }>>(STORAGE_KEYS.authAccounts) ?? [];
    expect(accounts.map((a) => a.email)).toEqual(['grace@example.com']);
    await expectAuthError(service.signIn({ email: 'ada@example.com' }), 'not_found');
  });

  it('explains that Demo Mode has no password to reset', async () => {
    expect(await service.requestPasswordReset('ada@example.com')).toEqual({
      delivered: false,
      message: DEMO_MESSAGES.resetNothingToReset,
    });
    await expectAuthError(service.completePasswordReset('new-password'), 'unavailable', DEMO_MESSAGES.resetUnavailable);
  });

  it('persists across two instances sharing one storage', async () => {
    const created = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    const reopened = new LocalDemoAuthService(storage);
    expect(await reopened.getSession()).toEqual(created);
  });

  it('returns no session when the stored profile no longer exists', async () => {
    await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    storage.set(STORAGE_KEYS.authAccounts, []);
    expect(await service.getSession()).toBeNull();
  });

  it('ignores malformed stored data', async () => {
    storage.set(STORAGE_KEYS.authAccounts, [{ id: 1 }, 'junk', null]);
    storage.set(STORAGE_KEYS.authSession, { userId: 42 });
    expect(await service.getSession()).toBeNull();
    const user = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    expect(storage.get<unknown[]>(STORAGE_KEYS.authAccounts)).toEqual([expect.objectContaining({ id: user.id })]);
  });

  it('fires onChange once per mutation in this tab', async () => {
    const seen: Array<AuthUser | null> = [];
    const unsubscribe = service.onChange((user) => seen.push(user));
    const user = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    await service.updateProfile({ displayName: 'Ada L' });
    await service.signOut();
    expect(seen).toEqual([user, { ...user, displayName: 'Ada L' }, null]);
    unsubscribe();
    await service.continueAsGuest();
    expect(seen).toHaveLength(3);
  });

  it('fires onChange when another instance or tab changes the auth keys', async () => {
    const other = new LocalDemoAuthService(storage);
    const listener = vi.fn();
    service.onChange(listener);
    const user = await other.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    expect(listener).toHaveBeenLastCalledWith(user);
    listener.mockClear();
    storage.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    expect(listener).not.toHaveBeenCalled();
    storage.remove(STORAGE_KEYS.authSession);
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('keeps working in memory when the browser refuses to save', async () => {
    vi.spyOn(storage, 'set').mockReturnValue(false);
    const listener = vi.fn();
    service.onChange(listener);
    const user = await service.signUp({ email: 'ada@example.com', displayName: 'Ada' });
    expect(service.persisted).toBe(false);
    expect(await service.getSession()).toEqual(user);
    expect(listener).toHaveBeenLastCalledWith(user);
  });
});
