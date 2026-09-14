import { renderApp, screen, TEST_USER, userEvent, waitFor } from '@/test/renderApp';
import { DEMO_MESSAGES, GUEST_EMAIL, type LocalAccountRecord } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError, type AuthUser } from '@/services/auth/types';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { createFakeSupabaseAuth, renderWithAuthService, SUPABASE_TEST_USER } from './authTestUtils';
import { AuthTestRoutes } from './AuthTestRoutes';

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

  it('tells someone already signed in where to go', async () => {
    renderApp(<AuthTestRoutes />, { route: '/sign-in' });
    expect(await screen.findByText(/You are already signed in as Alex/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/dashboard');
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
