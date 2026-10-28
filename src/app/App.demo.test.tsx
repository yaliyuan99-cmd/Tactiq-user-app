/**
 * /demo — the guest demonstration. The same screens as the account, with no
 * account behind them, and never dressed up as a signed-in session.
 */
import '@/app/testing/mockPages';
import { screen, waitFor, within } from '@testing-library/react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { banner } from '@/app/testing/landmarks';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';
import { modeSentence } from '@/app/shell/modeNote';

/** A link out of the demonstration to a canonical account address, as every screen has. */
function AccountLinkProbe() {
  return <Link to={`${ROUTES.settings}?tab=privacy`}>Probe: account settings</Link>;
}

const guest = { signedIn: false } as const;

describe('/demo without an account', () => {
  it('renders the app without a session, at the demonstration address', async () => {
    renderRoutes({ route: ROUTES.demo, ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.demo);
    expect(screen.getAllByRole('navigation', { name: 'Main' }).length).toBeGreaterThan(0);
  });

  it('is labelled a demonstration, not an account, and says nothing is saved to one', async () => {
    renderRoutes({ route: ROUTES.demo, ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.getByText('Demonstration')).toBeInTheDocument();
    expect(screen.getByText(modeSentence('demo', 'demo'))).toBeInTheDocument();

    const panel = within(screen.getByTestId('sidebar')).getByRole('region', { name: 'Demonstration' });
    expect(within(panel).getByText('Nobody')).toBeInTheDocument();
    expect(within(panel).getByText(/not an account/)).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Create a profile' })).toHaveAttribute('href', ROUTES.signUp);
  });

  it('does not repeat the simulated-ring pill, which would only echo the badge', async () => {
    renderRoutes({ route: ROUTES.demo, ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByRole('link', { name: /^Device: Demo Mode/ })).not.toBeInTheDocument();
  });

  it('names the mode once a prototype is involved', async () => {
    renderRoutes({ route: ROUTES.demo, deviceMode: 'hardware', ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.getByRole('link', { name: /^Device: .+\. Open connection settings$/ })).toHaveAttribute(
      'href',
      '/demo/connect',
    );
  });

  it.each([
    ['/demo/train', 'Train'],
    ['/demo/simulator', 'Simulator'],
    ['/demo/commands', 'Commands'],
    ['/demo/connect', 'Connect'],
    ['/demo/calibrate', 'Calibrate'],
    ['/demo/history', 'History'],
    ['/demo/settings', 'Settings'],
    ['/demo/help', 'Help'],
    ['/demo/train/confirm_and_back', 'Lesson'],
  ])('shares %s with the account section', async (route, heading) => {
    renderRoutes({ route, ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(route));
  });

  it('keeps setup out of the way: the demonstration is never sent to onboarding', async () => {
    renderRoutes({ route: '/demo/train', preferences: { onboardingCompleted: false }, ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Train' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/demo/train');
  });

  it('shows Page not found inside the demonstration shell, offering the way back', async () => {
    renderRoutes({ route: '/demo/nowhere', ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the demonstration' })).toHaveAttribute('href', ROUTES.demo);
  });

  it('resolves the grouped vocabulary inside the demonstration', async () => {
    renderRoutes({ route: '/demo/device/calibrate', ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Calibrate' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe('/demo/calibrate'));
  });
});

describe('/demo navigation', () => {
  it('keeps every navigation link inside the demonstration', async () => {
    renderRoutes({ route: ROUTES.demo, ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const nav = within(screen.getByTestId('mobile-nav'));
    expect(nav.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/demo',
      '/demo/train',
      '/demo/connect',
      '/demo/history',
      '/demo/settings',
    ]);
    expect(within(banner()).getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/demo/help');
  });

  it('marks the current page and section inside the demonstration', async () => {
    renderRoutes({ route: '/demo/simulator', ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Simulator' });
    const nav = within(screen.getByTestId('mobile-nav'));
    expect(nav.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'true');
    expect(
      within(screen.getByTestId('sidebar')).getByRole('link', { name: 'Simulator' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the wordmark pointing back at the public site', async () => {
    renderRoutes({ route: ROUTES.demo, ...guest });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.getByRole('link', { name: 'Tactiq home' })).toHaveAttribute('href', ROUTES.root);
  });

  it('follows a screen link to an account address into the demonstration, not to sign-in', async () => {
    const { user } = renderRoutes({ route: ROUTES.demo, ...guest, children: <AccountLinkProbe /> });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('link', { name: 'Probe: account settings' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe('/demo/settings?tab=privacy'));
  });

  it('still asks a visitor who never opened the demonstration to sign in', async () => {
    renderRoutes({ route: ROUTES.settings, ...guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/sign-in?next=%2Fdashboard%2Fsettings');
  });
});
