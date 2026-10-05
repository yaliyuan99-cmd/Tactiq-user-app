import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { renderApp, screen, TEST_USER, userEvent, waitFor } from '@/test/renderApp';
import { DEMO_MESSAGES, type LocalAccountRecord } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError } from '@/services/auth/types';
import { MESSAGES } from '@/services/auth/validation';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import type { UserPreferences } from '@/domain/models';
import { createFakeSupabaseAuth, renderWithAuthService } from './authTestUtils';
import { AuthTestRoutes } from './AuthTestRoutes';
import { FORM_MESSAGES } from './formValidation';

const nameField = () => screen.getByRole('textbox', { name: /^Name/ });
const emailField = () => screen.getByRole('textbox', { name: /^Email/ });

describe('SignUpPage in Demo Mode', () => {
  it('shows name and email only, with the Demo Mode note', async () => {
    renderApp(<AuthTestRoutes />, { route: '/sign-up', signedIn: false });
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your profile' })).toBeInTheDocument();
    expect(document.title).toBe('Create your profile · Tactiq');
    expect(nameField()).toHaveAttribute('autocomplete', 'name');
    expect(nameField()).toHaveAttribute('maxlength', '60');
    expect(emailField()).toHaveAttribute('autocomplete', 'email');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('Profiles are stored in this browser only.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('creates a profile and goes to onboarding', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    renderApp(<AuthTestRoutes />, { route: '/sign-up', signedIn: false, storage });

    await user.type(nameField(), 'Sam');
    await user.type(emailField(), 'sam@example.com');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(await screen.findByText('Landed at /onboarding')).toBeInTheDocument();
    const accounts = storage.get<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts) ?? [];
    expect(accounts).toEqual([expect.objectContaining({ email: 'sam@example.com', displayName: 'Sam' })]);
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Profile created.'));
  });

  it('starts setup again for a new profile, even after someone else finished it', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    // Preferences live once per browser, so the previous person's finished setup is what this profile would inherit.
    renderApp(<AuthTestRoutes />, {
      route: '/sign-up',
      signedIn: false,
      storage,
      preferences: { onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP },
    });

    await user.type(nameField(), 'Alex Morgan');
    await user.type(emailField(), 'alex.morgan@example.com');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(await screen.findByText('Landed at /onboarding')).toBeInTheDocument();
    expect(storage.get<UserPreferences>(STORAGE_KEYS.preferences)).toMatchObject({
      onboardingCompleted: false,
      onboardingStep: 0,
    });
  });

  it('focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderApp(<AuthTestRoutes />, { route: '/sign-up', signedIn: false });

    await user.type(emailField(), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    await waitFor(() => expect(nameField()).toHaveFocus());
    expect(nameField()).toHaveAccessibleDescription(`What the app calls you. Up to 60 characters. ${MESSAGES.nameRequired}`);
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains when the email already has a profile', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    storage.set<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts, [TEST_USER]);
    renderApp(<AuthTestRoutes />, { route: '/sign-up', signedIn: false, storage });

    await user.type(nameField(), 'Alex again');
    await user.type(emailField(), `${TEST_USER.email}{Enter}`);

    const message = await screen.findByText(DEMO_MESSAGES.emailTaken);
    await waitFor(() => expect(message.closest('[role="alert"]')).toHaveFocus());
  });
});

describe('SignUpPage in Supabase mode', () => {
  it('asks for a password and its confirmation', async () => {
    renderWithAuthService(createFakeSupabaseAuth(), '/sign-up');
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/^Confirm password/)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password confirmation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('catches a mismatched confirmation before sending anything', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    renderWithAuthService(service, '/sign-up');

    await user.type(nameField(), 'Robin');
    await user.type(emailField(), 'robin@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse');
    await user.type(screen.getByLabelText(/^Confirm password/), 'correct hose');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByLabelText(/^Confirm password/)).toHaveFocus());
    expect(screen.getByText(FORM_MESSAGES.passwordMismatch)).toBeInTheDocument();
    expect(service.signUp).not.toHaveBeenCalled();
  });

  it('shows the confirm-email message as good news, not an error', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    service.signUp.mockRejectedValueOnce(new AuthError('unknown', SUPABASE_MESSAGES.confirmEmail));
    renderWithAuthService(service, '/sign-up');

    await user.type(nameField(), 'Robin');
    await user.type(emailField(), 'robin@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse');
    await user.type(screen.getByLabelText(/^Confirm password/), 'correct horse{Enter}');

    const message = await screen.findByText(SUPABASE_MESSAGES.confirmEmail);
    const status = message.closest('[role="status"]');
    expect(status).not.toBeNull();
    expect(message.closest('[role="alert"]')).toBeNull();
    await waitFor(() => expect(status).toHaveFocus());
    expect(service.signUp).toHaveBeenCalledWith({
      email: 'robin@example.com',
      displayName: 'Robin',
      password: 'correct horse',
    });
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('goes to onboarding when the account is ready straight away', async () => {
    const user = userEvent.setup();
    renderWithAuthService(createFakeSupabaseAuth(), '/sign-up');

    await user.type(nameField(), 'Robin');
    await user.type(emailField(), 'robin@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse');
    await user.type(screen.getByLabelText(/^Confirm password/), 'correct horse{Enter}');

    expect(await screen.findByText('Landed at /onboarding')).toBeInTheDocument();
  });
});
