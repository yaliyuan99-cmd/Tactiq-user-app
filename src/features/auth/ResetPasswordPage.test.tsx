import { renderApp, screen, userEvent, waitFor } from '@/test/renderApp';
import { DEMO_MESSAGES } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { AuthError } from '@/services/auth/types';
import { createFakeSupabaseAuth, renderWithAuthService, SUPABASE_TEST_USER } from './authTestUtils';
import { FORM_MESSAGES } from './formValidation';
import { RESET_SAVED_MESSAGE } from './ResetPasswordPage';
import { AuthTestRoutes } from './AuthTestRoutes';

describe('ResetPasswordPage in Demo Mode', () => {
  it('explains there are no passwords and links to sign in', async () => {
    renderApp(<AuthTestRoutes />, { route: '/reset-password', signedIn: false });
    expect(await screen.findByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument();
    expect(document.title).toBe('Choose a new password · Tactiq');
    expect(screen.getByText(DEMO_MESSAGES.resetNothingToReset)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('Demo Mode');
  });
});

describe('ResetPasswordPage in Supabase mode', () => {
  it('explains an expired link when there is no recovery session', async () => {
    renderWithAuthService(createFakeSupabaseAuth(null), '/reset-password');
    expect(await screen.findByText('This link may have expired')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ask for a new reset link' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByLabelText(/New password/)).toBeNull();
  });

  it('checks the new password, saves it and offers the dashboard', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth(SUPABASE_TEST_USER);
    renderWithAuthService(service, '/reset-password');

    const newPassword = await screen.findByLabelText(/^New password/);
    expect(newPassword).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText(`Choose a new password for ${SUPABASE_TEST_USER.email}.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password confirmation' })).toBeInTheDocument();

    await user.type(newPassword, 'short');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(newPassword).toHaveFocus());
    expect(newPassword).toHaveAccessibleDescription(`At least 8 characters. ${FORM_MESSAGES.passwordTooShort}`);
    expect(service.completePasswordReset).not.toHaveBeenCalled();

    await user.clear(newPassword);
    await user.type(newPassword, 'a much longer passphrase');
    await user.type(screen.getByLabelText(/^Confirm new password/), 'a much longer passphrase{Enter}');

    const message = await screen.findByText(RESET_SAVED_MESSAGE);
    const status = message.closest('[role="status"]');
    expect(status).not.toBeNull();
    await waitFor(() => expect(status).toHaveFocus());
    expect(service.completePasswordReset).toHaveBeenCalledWith('a much longer passphrase');
    expect(screen.getByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('puts a rejected password back on the field', async () => {
    const user = userEvent.setup();
    const service = createFakeSupabaseAuth(SUPABASE_TEST_USER);
    service.completePasswordReset.mockRejectedValueOnce(new AuthError('weak_password', SUPABASE_MESSAGES.samePassword));
    renderWithAuthService(service, '/reset-password');

    const newPassword = await screen.findByLabelText(/^New password/);
    await user.type(newPassword, 'my old password');
    await user.type(screen.getByLabelText(/^Confirm new password/), 'my old password{Enter}');

    await waitFor(() => expect(newPassword).toHaveAccessibleDescription(`At least 8 characters. ${SUPABASE_MESSAGES.samePassword}`));
    await waitFor(() => expect(newPassword).toHaveFocus());
  });
});
