import { renderApp, screen, userEvent, waitFor } from '@/test/renderApp';
import { DEMO_MESSAGES } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError } from '@/services/auth/types';
import { createFakeSupabaseAuth, renderWithAuthService } from './authTestUtils';
import { AuthTestRoutes } from './AuthTestRoutes';

const emailField = () => screen.getByRole('textbox', { name: /^Email/ });

describe('ForgotPasswordPage in Demo Mode', () => {
  it('explains there is nothing to reset and offers what works instead', async () => {
    renderApp(<AuthTestRoutes />, { route: '/forgot-password', signedIn: false });
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument();
    expect(document.title).toBe('Reset your password · Tactiq');
    expect(await screen.findByText(DEMO_MESSAGES.resetNothingToReset)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign in with your email' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Create a new profile' })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('heading', { level: 2, name: 'If you cannot remember your email' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('No password is stored or checked');
  });
});

describe('ForgotPasswordPage in Supabase mode', () => {
  it('sends a reset link and reports it in a status message', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    renderWithAuthService(service, '/forgot-password');

    await user.type(await screen.findByRole('textbox', { name: /^Email/ }), 'robin@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    const message = await screen.findByText(SUPABASE_MESSAGES.resetSent);
    expect(message.closest('[role="status"]')).not.toBeNull();
    expect(service.requestPasswordReset).toHaveBeenCalledWith('robin@example.com');
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('focuses the email field when it is malformed', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    renderWithAuthService(service, '/forgot-password');

    await user.type(await screen.findByRole('textbox', { name: /^Email/ }), 'robin{Enter}');

    await waitFor(() => expect(emailField()).toHaveFocus());
    expect(emailField()).toHaveAccessibleDescription('Enter an email address like name@example.com.');
    expect(service.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a service failure as an alert that receives focus', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth();
    service.requestPasswordReset.mockRejectedValueOnce(new AuthError('network', SUPABASE_MESSAGES.network));
    renderWithAuthService(service, '/forgot-password');

    await user.type(await screen.findByRole('textbox', { name: /^Email/ }), 'robin@example.com{Enter}');

    const message = await screen.findByText(SUPABASE_MESSAGES.network);
    await waitFor(() => expect(message.closest('[role="alert"]')).toHaveFocus());
    expect(screen.queryByText(SUPABASE_MESSAGES.resetSent)).toBeNull();
  });
});
