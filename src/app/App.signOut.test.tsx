/**
 * Signing out from the shell reaches the real sign-in page with its
 * confirmation (App.test.tsx stubs every page, so it cannot see it).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';
import { SIGNED_OUT_MESSAGE } from '@/features/auth/SignInPage';

vi.mock('@/features/dashboard/DashboardPage', async () => (await import('./testing/pageStubs')).stubPage('Home'));
vi.mock('@/features/settings/SettingsPage', async () => (await import('./testing/pageStubs')).stubPage('Settings'));

describe('AppRoutes: signing out', () => {
  it('opens sign-in with a success status saying the user has signed out', async () => {
    const { user } = renderRoutes({ route: ROUTES.settings });
    await screen.findByRole('heading', { level: 1, name: 'Settings' });

    await user.click(within(screen.getByTestId('sidebar')).getByRole('button', { name: 'Sign out' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    const message = await screen.findByText(SIGNED_OUT_MESSAGE);
    expect(message.closest('[role="status"]')).not.toBeNull();
    await waitFor(() => expect(currentLocation()).toBe(ROUTES.signIn));

    // The route change announces the page title and focuses the h1; the status is not announced twice.
    await waitFor(() => expect(heading).toHaveFocus());
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Sign in'));
    expect(screen.getByTestId('live-region-polite')).not.toHaveTextContent(SIGNED_OUT_MESSAGE);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('shows no sign-out confirmation to a visitor who simply opens sign-in', async () => {
    renderRoutes({ route: ROUTES.signIn, signedIn: false });
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.queryByText(SIGNED_OUT_MESSAGE)).not.toBeInTheDocument();
  });
});
