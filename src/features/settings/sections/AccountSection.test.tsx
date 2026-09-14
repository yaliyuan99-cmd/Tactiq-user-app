import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { ROUTES } from '@/app/routes';
import { DEFAULT_PREFERENCES } from '@/domain/models';
import type { LocalAccountRecord } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError, type AuthService, type AuthUser } from '@/services/auth/types';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { TEST_USER, act, render, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { SIGN_IN_STUB, politeRegion, renderSettings, signInState } from '../testing/renderSettings';
import { AccountSection } from './AccountSection';

function storedAccounts(storage: StorageAdapter): LocalAccountRecord[] {
  return storage.get<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts) ?? [];
}

describe('AccountSection in Demo Mode', () => {
  it('shows the profile and saves a new display name', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({}, <AccountSection />);
    const region = screen.getByRole('region', { name: 'Account' });
    expect(within(region).getByText('alex@example.com')).toBeInTheDocument();
    expect(within(region).getByText(/local Demo Mode profile/)).toBeInTheDocument();

    const field = within(region).getByRole('textbox', { name: 'Display name' });
    expect(field).toHaveValue(TEST_USER.displayName);
    await user.clear(field);
    await user.type(field, '  Alex Chen ');
    await user.click(within(region).getByRole('button', { name: 'Save name' }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Name saved as Alex Chen.'));
    expect(field).toHaveValue('Alex Chen');
    expect(storedAccounts(storage)[0]?.displayName).toBe('Alex Chen');
    expect(within(region).getByText('Alex Chen', { selector: 'dd' })).toBeInTheDocument();
  });

  it('shows the service’s message when the name is empty', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({}, <AccountSection />);
    const field = screen.getByRole('textbox', { name: 'Display name' });
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Enter a name so we know what to call you.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(storedAccounts(storage)[0]?.displayName).toBe(TEST_USER.displayName);
  });

  it('signs out and opens sign-in', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({}, <AccountSection />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { level: 1, name: SIGN_IN_STUB })).toBeInTheDocument();
    expect(storage.get(STORAGE_KEYS.authSession)).toBeNull();
    expect(storedAccounts(storage)).toHaveLength(1);
  });

  it('deletes the profile after confirmation and opens sign-in', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({}, <AccountSection />);
    await user.click(screen.getByRole('button', { name: 'Delete this profile' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this profile?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Delete profile' }));

    expect(await screen.findByRole('heading', { level: 1, name: SIGN_IN_STUB })).toBeInTheDocument();
    expect(storedAccounts(storage)).toHaveLength(0);
    expect(storage.get(STORAGE_KEYS.preferences)).not.toBeNull();
    // The rest of the local data stays, so sign-in is not told that data was deleted.
    expect(signInState()).toEqual({ signedOut: true });
  });
});

const SUPABASE_USER: AuthUser = {
  id: 'sb-user',
  email: 'sam@example.com',
  displayName: 'Sam',
  createdAt: '2026-09-01T09:00:00.000Z',
  provider: 'supabase',
};

class FakeAccountService implements AuthService {
  readonly mode = 'supabase' as const;
  user: AuthUser | null = SUPABASE_USER;
  deleteCalls = 0;
  async getSession() {
    return this.user;
  }
  onChange() {
    return () => {};
  }
  async signIn(): Promise<AuthUser> {
    throw new AuthError('unknown', 'Not used in this test.');
  }
  async signUp(): Promise<AuthUser> {
    throw new AuthError('unknown', 'Not used in this test.');
  }
  async signOut() {
    this.user = null;
  }
  async continueAsGuest(): Promise<AuthUser> {
    throw new AuthError('unavailable', SUPABASE_MESSAGES.guestUnavailable);
  }
  async requestPasswordReset() {
    return { delivered: true, message: SUPABASE_MESSAGES.resetSent };
  }
  async completePasswordReset() {}
  async updateProfile(patch: { displayName?: string }) {
    this.user = { ...SUPABASE_USER, displayName: patch.displayName?.trim() ?? SUPABASE_USER.displayName };
    return this.user;
  }
  async deleteAccount() {
    this.deleteCalls += 1;
    throw new AuthError('unavailable', SUPABASE_MESSAGES.deleteUnavailable);
  }
}

describe('AccountSection with an account backend', () => {
  it('edits the name and signs out, and explains that deletion must be requested', async () => {
    const user = userEvent.setup();
    const service = new FakeAccountService();
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, onboardingCompleted: true });
    render(
      <MemoryRouter initialEntries={[ROUTES.settings]}>
        <AppProviders storage={storage} authService={service}>
          <Routes>
            <Route path={ROUTES.settings} element={<AccountSection />} />
            <Route path={ROUTES.signIn} element={<h1>{SIGN_IN_STUB}</h1>} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );
    await act(async () => {});

    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByText('You are signed in with an account.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete this profile' })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(SUPABASE_MESSAGES.deleteUnavailable))).toBeInTheDocument();
    expect(service.deleteCalls).toBe(0);

    const field = screen.getByRole('textbox', { name: 'Display name' });
    await user.clear(field);
    await user.type(field, 'Samira');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Name saved as Samira.'));

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { level: 1, name: SIGN_IN_STUB })).toBeInTheDocument();
    expect(service.user).toBeNull();
  });
});
