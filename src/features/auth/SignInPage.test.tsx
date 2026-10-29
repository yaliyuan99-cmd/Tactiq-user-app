import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { preferencesFor, renderApp, screen, seedFinishedSetup, signedInPreferences, TEST_USER, userEvent, waitFor } from '@/test/renderApp';
import { DEMO_MESSAGES, GUEST_EMAIL, type LocalAccountRecord } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError, type AuthUser } from '@/services/auth/types';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import {
  createFakeSupabaseAuth,
  currentLocationPath,
  currentLocationState,
  renderAuthRoutesAt,
  renderWithAuthService,
  SUPABASE_TEST_USER,
} from './authTestUtils';
import { AuthTestRoutes } from './AuthTestRoutes';
import { DATA_DELETED_MESSAGE, SIGNED_OUT_MESSAGE } from './SignInPage';

function storageWithProfile() {
  const storage = new MemoryStorageAdapter();
  storage.set<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts, [TEST_USER]);
  return storage;
}

const emailField = () => screen.getByRole('textbox', { name: /^Email/ });

describe('SignInPage in Demo Mode', () => {
  it('shows an email-only form with the guest option, links and the Demo Mode note', async () => {
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(document.title).toBe('Sign in · Tactiq');
    expect(emailField()).toHaveAttribute('type', 'email');
    expect(emailField()).toHaveAttribute('autocomplete', 'email');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button', { name: 'Continue as a guest' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create a profile' })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('link', { name: 'About passwords in Demo Mode' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('Demo Mode');
    expect(screen.getByRole('note')).toHaveTextContent('No password is stored or checked');
  });

  it('flags an empty or malformed email beside the field and focuses it', async () => {
    const user = userEvent.setup();
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(emailField()).toHaveFocus());
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
    expect(emailField()).toHaveAccessibleDescription('Enter an email address like name@example.com.');

    await user.type(emailField(), 'alex@example');
    expect(emailField()).not.toHaveAttribute('aria-invalid');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Enter an email address like name@example.com.')).toBeInTheDocument();
  });

  it('shows the not-found message in an alert that receives focus', async () => {
    const user = userEvent.setup();
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false, storage: storageWithProfile() });

    await user.type(emailField(), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const message = await screen.findByText(DEMO_MESSAGES.notFound);
    const alert = message.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.queryByText(/^Landed at/)).toBeNull();
  });

  it('signs in with a known email, announces it and follows a safe next path', async () => {
    const user = userEvent.setup();
    const storage = storageWithProfile();
    renderApp(<AuthTestRoutes />, { route: '/sign-in?next=%2Fdashboard%2Fhistory', signedIn: false, storage });

    await user.type(emailField(), ' Alex@Example.com{Enter}');

    expect(await screen.findByText('Landed at /dashboard/history')).toBeInTheDocument();
    expect(storage.get(STORAGE_KEYS.authSession)).toMatchObject({ userId: TEST_USER.id });
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Signed in as Alex.'));
  });

  it('ignores a next path that points at another site', async () => {
    const user = userEvent.setup();
    renderApp(<AuthTestRoutes />, { route: '/sign-in?next=//evil.example', signedIn: false, storage: storageWithProfile() });

    await user.type(emailField(), `${TEST_USER.email}{Enter}`);

    expect(await screen.findByText('Landed at /dashboard')).toBeInTheDocument();
  });

  it('continues as a guest', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false, storage });

    await user.click(screen.getByRole('button', { name: 'Continue as a guest' }));

    expect(await screen.findByText('Landed at /dashboard')).toBeInTheDocument();
    const accounts = storage.get<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts) ?? [];
    expect(accounts.map((account) => account.email)).toEqual([GUEST_EMAIL]);
    expect(storage.get(STORAGE_KEYS.authSession)).not.toBeNull();
  });

  it('starts setup over for a guest profile created after someone else finished it', async () => {
    const user = userEvent.setup();
    // Another profile has finished setup in this browser. Setup progress
    // belongs to the person, not the browser, so a brand-new guest starts at
    // step 0 and the other profile's own progress is left alone.
    const storage = storageWithProfile();
    seedFinishedSetup(storage, TEST_USER);
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false, storage });

    await user.click(screen.getByRole('button', { name: 'Continue as a guest' }));
    await screen.findByText('Landed at /dashboard');

    await waitFor(() => {
      expect(signedInPreferences(storage)).toMatchObject({ onboardingCompleted: false, onboardingStep: 0 });
    });
    expect(preferencesFor(storage, TEST_USER)).toMatchObject({
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_LAST_STEP,
    });
  });

  it('keeps a returning guest’s own setup progress', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    // The guest profile already exists, so this is the same person coming
    // back, and continuing as a guest must not reset what they had done.
    const guest: LocalAccountRecord = {
      id: 'user_guest',
      email: GUEST_EMAIL,
      displayName: 'Guest',
      createdAt: '2026-09-01T09:00:00.000Z',
    };
    storage.set<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts, [guest]);
    seedFinishedSetup(storage, guest);
    renderApp(<AuthTestRoutes />, { route: '/sign-in', signedIn: false, storage });

    await user.click(screen.getByRole('button', { name: 'Continue as a guest' }));
    await screen.findByText('Landed at /dashboard');

    expect(signedInPreferences(storage)).toMatchObject({
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_LAST_STEP,
    });
  });

  it('tells someone already signed in where to go', async () => {
    renderApp(<AuthTestRoutes />, { route: '/sign-in' });
    expect(await screen.findByText(/You are already signed in as Alex/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/dashboard');
  });
});

describe('SignInPage after signing out', () => {
  it('confirms the sign-out in a success status above the form', async () => {
    renderAuthRoutesAt({ pathname: '/sign-in', state: { signedOut: true } });
    const message = await screen.findByText(SIGNED_OUT_MESSAGE);
    const status = message.closest('[role="status"]');
    expect(status).not.toBeNull();
    expect(status).not.toHaveAttribute('data-testid', 'live-region-polite');
    expect(message.closest('[data-kind]')).toHaveAttribute('data-kind', 'success');
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form') as HTMLFormElement;
    expect(status?.compareDocumentPosition(form) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // The status region is enough: the message is not also sent to the app live region.
    expect(screen.getByTestId('live-region-polite')).not.toHaveTextContent(SIGNED_OUT_MESSAGE);
  });

  it('clears the router state so a refresh does not repeat the confirmation, keeping ?next=', async () => {
    const first = renderAuthRoutesAt({ pathname: '/sign-in', search: '?next=%2Fdashboard%2Fhistory', state: { signedOut: true } });
    expect(await screen.findByText(SIGNED_OUT_MESSAGE)).toBeInTheDocument();
    await waitFor(() => expect(currentLocationState()).toBe('null'));
    expect(currentLocationPath()).toBe('/sign-in?next=%2Fdashboard%2Fhistory');
    // Still shown after the state is cleared…
    expect(screen.getByText(SIGNED_OUT_MESSAGE)).toBeInTheDocument();
    first.unmount();

    // …but a reload of that history entry (now without state) shows no confirmation.
    renderAuthRoutesAt({ pathname: '/sign-in', search: '?next=%2Fdashboard%2Fhistory', state: null });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(SIGNED_OUT_MESSAGE)).toBeNull();
  });

  it('confirms the deletion, not only the sign-out, after Delete all local data', async () => {
    renderAuthRoutesAt({ pathname: '/sign-in', state: { signedOut: true, dataDeleted: true } });
    const message = await screen.findByText(DATA_DELETED_MESSAGE);
    expect(message.closest('[role="status"]')).not.toBeNull();
    expect(message.closest('[data-kind]')).toHaveAttribute('data-kind', 'success');
    // The ordinary sign-out wording is not shown on its own.
    expect(screen.queryByText(SIGNED_OUT_MESSAGE)).toBeNull();
    // The marker is cleared, as it is for a plain sign-out.
    await waitFor(() => expect(currentLocationState()).toBe('null'));
  });

  it('shows the plain confirmation when only the sign-out marker is set', async () => {
    renderAuthRoutesAt({ pathname: '/sign-in', state: { signedOut: true } });
    expect(await screen.findByText(SIGNED_OUT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/deleted/i)).toBeNull();
  });

  it('shows no confirmation without the sign-out marker', async () => {
    renderAuthRoutesAt({ pathname: '/sign-in', state: { signedOut: 'yes' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(SIGNED_OUT_MESSAGE)).toBeNull();
    expect(currentLocationState()).toBe('{"signedOut":"yes"}');
  });

  it('removes the confirmation once the user tries to sign in again', async () => {
    const user = userEvent.setup();
    renderAuthRoutesAt({ pathname: '/sign-in', state: { signedOut: true } });
    expect(await screen.findByText(SIGNED_OUT_MESSAGE)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(emailField()).toHaveFocus());
    expect(screen.queryByText(SIGNED_OUT_MESSAGE)).toBeNull();
  });
});

describe('SignInPage in Supabase mode', () => {
  it('asks for a password, offers a reveal toggle and a reset link, and no guest option', async () => {
    renderWithAuthService(createFakeSupabaseAuth(), '/sign-in');
    const password = await screen.findByLabelText(/^Password/);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/sign-up');
    expect(screen.queryByRole('button', { name: 'Continue as a guest' })).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('focuses the password field when it is empty', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    renderWithAuthService(service, '/sign-in');

    await user.type(emailField(), 'robin@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const password = screen.getByLabelText(/^Password/);
    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveAccessibleDescription(SUPABASE_MESSAGES.passwordRequired);
    expect(service.signIn).not.toHaveBeenCalled();
  });

  it('stays focusable and busy while signing in, then navigates', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    let resolve: (value: AuthUser) => void = () => {};
    service.signIn.mockImplementationOnce(() => new Promise<AuthUser>((done) => (resolve = done)));
    renderWithAuthService(service, '/sign-in');

    await user.type(emailField(), 'robin@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse');
    const submit = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submit);

    await waitFor(() => expect(submit).toHaveAttribute('aria-busy', 'true'));
    expect(submit).not.toBeDisabled();
    await user.click(submit);
    expect(service.signIn).toHaveBeenCalledTimes(1);
    expect(service.signIn).toHaveBeenCalledWith({ email: 'robin@example.com', password: 'correct horse' });

    resolve(SUPABASE_TEST_USER);
    expect(await screen.findByText('Landed at /dashboard')).toBeInTheDocument();
  });

  it('shows a wrong password as an alert', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    service.signIn.mockRejectedValueOnce(new AuthError('invalid_credentials', SUPABASE_MESSAGES.invalidCredentials));
    renderWithAuthService(service, '/sign-in');

    await user.type(emailField(), 'robin@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'wrong{Enter}');

    const message = await screen.findByText(SUPABASE_MESSAGES.invalidCredentials);
    await waitFor(() => expect(message.closest('[role="alert"]')).toHaveFocus());
  });
});
