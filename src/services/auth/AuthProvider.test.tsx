import { useState } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { AuthProvider, useAuth, useIsSignedIn } from './AuthProvider';
import { DEMO_MESSAGES, LocalDemoAuthService } from './LocalDemoAuthService';
import { serverBackedAuth } from './testing/serverBackedAuth';
import { AuthError, type AuthService } from './types';
import { MESSAGES } from './validation';

function Probe() {
  const { user, loading, mode, signIn, signOut, continueAsGuest, updateProfile } = useAuth();
  const signedIn = useIsSignedIn();
  const [error, setError] = useState<string | null>(null);

  const attempt = (action: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof AuthError ? `${e.code}: ${e.message}` : 'not an AuthError');
    }
  };

  if (loading) return <p>Checking your profile</p>;
  return (
    <div>
      <p>Mode: {mode}</p>
      <p>{user ? `Signed in as ${user.displayName}` : 'Signed out'}</p>
      <p>{signedIn ? 'Signed-in flag on' : 'Signed-in flag off'}</p>
      <button type="button" onClick={attempt(() => signIn({ email: 'ada@example.com' }))}>
        Sign in as Ada
      </button>
      <button type="button" onClick={attempt(() => signIn({ email: 'nobody@example.com' }))}>
        Sign in as nobody
      </button>
      <button type="button" onClick={attempt(() => continueAsGuest())}>
        Continue as guest
      </button>
      <button type="button" onClick={attempt(() => updateProfile({ displayName: 'Countess Ada' }))}>
        Rename
      </button>
      <button type="button" onClick={attempt(() => signOut())}>
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

async function seededStorage(signedIn: boolean) {
  const storage = new MemoryStorageAdapter();
  const seed = new LocalDemoAuthService(storage);
  await seed.signUp({ email: 'ada@example.com', displayName: 'Ada' });
  if (!signedIn) await seed.signOut();
  return storage;
}

describe('AuthProvider', () => {
  it('has the stored profile on the first render, with no loading state', async () => {
    const storage = await seededStorage(true);
    render(
      <AuthProvider service={new LocalDemoAuthService(storage)}>
        <Probe />
      </AuthProvider>,
    );
    // Profiles are in this browser's storage, so there is nothing to wait for.
    // Anything rendered before the profile was known would be rendered for the
    // wrong person: the preferences, activity and calibration the app reads
    // all follow whoever is signed in.
    expect(screen.queryByText('Checking your profile')).not.toBeInTheDocument();
    expect(screen.getByText('Signed in as Ada')).toBeInTheDocument();
    expect(screen.getByText('Signed-in flag on')).toBeInTheDocument();
    expect(screen.getByText('Mode: demo')).toBeInTheDocument();
  });

  it('shows loading until a service that has to ask answers, then the user', async () => {
    const storage = await seededStorage(true);
    // Stands in for Supabase: the session is only knowable after a round trip,
    // so the loading state is still needed and still has to be accessible.
    const asking = serverBackedAuth(new LocalDemoAuthService(storage));
    render(
      <AuthProvider service={asking}>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText('Checking your profile')).toBeInTheDocument();
    asking.answer({
      id: 'u1',
      email: 'ada@example.com',
      displayName: 'Ada',
      createdAt: '2026-09-01T09:00:00.000Z',
      provider: 'supabase',
    });
    expect(await screen.findByText('Signed in as Ada')).toBeInTheDocument();
  });

  it('updates the displayed user after sign in, rename and sign out', async () => {
    const user = userEvent.setup();
    const storage = await seededStorage(false);
    render(
      <AuthProvider service={new LocalDemoAuthService(storage)}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(screen.getByText('Signed-in flag off')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in as Ada' }));
    expect(await screen.findByText('Signed in as Ada')).toBeInTheDocument();
    expect(screen.getByText('Signed-in flag on')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    expect(await screen.findByText('Signed in as Countess Ada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('rethrows AuthError for the UI to display', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider service={new LocalDemoAuthService(new MemoryStorageAdapter())}>
        <Probe />
      </AuthProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Sign in as nobody' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`not_found: ${DEMO_MESSAGES.notFound}`);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });

  it('turns an unexpected failure into an AuthError', async () => {
    const user = userEvent.setup();
    const service = new LocalDemoAuthService(new MemoryStorageAdapter());
    vi.spyOn(service, 'continueAsGuest').mockRejectedValue(new Error('disk on fire'));
    render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Continue as guest' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`unknown: ${MESSAGES.unexpected}`);
  });

  it('follows changes made by another tab or instance', async () => {
    const storage = await seededStorage(true);
    render(
      <AuthProvider service={new LocalDemoAuthService(storage)}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('Signed in as Ada')).toBeInTheDocument();
    await act(() => new LocalDemoAuthService(storage).signOut());
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('builds a Demo Mode service from the storage prop when no service is given', async () => {
    const storage = await seededStorage(true);
    render(
      <AuthProvider storage={storage}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('Signed in as Ada')).toBeInTheDocument();
    expect(screen.getByText('Mode: demo')).toBeInTheDocument();
  });

  it('finishes loading signed out when the session cannot be read', async () => {
    const service: AuthService = new LocalDemoAuthService(new MemoryStorageAdapter());
    vi.spyOn(service, 'getSession').mockRejectedValue(new Error('unreadable'));
    render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('unsubscribes from the service on unmount', async () => {
    const service = new LocalDemoAuthService(new MemoryStorageAdapter());
    const stop = vi.fn();
    vi.spyOn(service, 'onChange').mockReturnValue(stop);
    const { unmount } = render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('Signed out');
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('throws when useAuth is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
    expect(() => renderHook(() => useIsSignedIn())).toThrow();
  });

  it('exposes every contract method', async () => {
    const service = new LocalDemoAuthService(new MemoryStorageAdapter());
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider service={service}>{children}</AuthProvider>,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.service).toBe(service);

    const guest = await act(() => result.current.continueAsGuest());
    expect(result.current.user).toEqual(guest.user);
    expect(guest.created).toBe(true);

    const reset = await act(() => result.current.requestPasswordReset(guest.user.email));
    expect(reset.delivered).toBe(false);
    const resetError = await act(() => result.current.completePasswordReset('x').then(() => null, (e: unknown) => e));
    expect(resetError).toMatchObject({ code: 'unavailable' });

    await act(() => result.current.deleteAccount());
    expect(result.current.user).toBeNull();

    const grace = await act(() => result.current.signUp({ email: 'grace@example.com', displayName: 'Grace' }));
    expect(grace.displayName).toBe('Grace');
    expect(result.current.user).toEqual(grace);
  });
});
