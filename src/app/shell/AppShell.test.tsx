import '@/app/testing/mockPages';
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';

function sidebar() {
  return within(screen.getByTestId('sidebar'));
}

function mainNavs() {
  return { sidebar: sidebar().getByRole('navigation', { name: 'Main' }), mobile: screen.getByTestId('mobile-nav') };
}

describe('AppShell navigation', () => {
  it('offers the five primary destinations in the bottom bar, with Help in the top bar', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const { mobile } = mainNavs();

    expect(mobile).toHaveAttribute('aria-label', 'Main');
    expect(within(mobile).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Practice',
      'Device',
      'Activity',
      'Settings',
    ]);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Help' })).toHaveAttribute('href', ROUTES.help);
  });

  it('groups the sidebar under the same five names, with every label visible', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const { sidebar: nav } = mainNavs();

    const practice = within(nav).getByRole('list', { name: 'Practice' });
    expect(within(practice).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Train',
      'Simulator',
      'Commands',
    ]);
    const device = within(nav).getByRole('list', { name: 'Device' });
    expect(within(device).getAllByRole('link').map((link) => link.textContent)).toEqual(['Connect', 'Calibrate']);

    for (const [label, href] of [
      ['Home', ROUTES.dashboard],
      ['Activity', ROUTES.history],
      ['Settings', ROUTES.settings],
      ['Help', ROUTES.help],
    ] as const) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('marks the open page, and its group, without relying on colour', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const { sidebar: nav, mobile } = mainNavs();
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('link', { name: 'Simulator' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Simulator' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.simulator);

    const current = within(nav).getByRole('link', { name: 'Simulator' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveClass('font-semibold');
    expect(within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(
      1,
    );
    expect(within(mobile).getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'true');
    expect(within(mobile).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('keeps Practice marked as the current section inside a lesson', async () => {
    renderRoutes({ route: '/dashboard/train/confirm_and_back' });
    await screen.findByRole('heading', { level: 1, name: 'Lesson' });
    expect(within(mainNavs().mobile).getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'true');
    expect(sidebar().getByRole('link', { name: 'Train' })).toHaveAttribute('aria-current', 'true');
  });

  it('marks nothing as current on an unknown page inside the shell', async () => {
    renderRoutes({ route: '/dashboard/nowhere' });
    await screen.findByRole('heading', { level: 1, name: 'Page not found' });
    expect(within(mainNavs().mobile).queryByRole('link', { current: true })).not.toBeInTheDocument();
  });

  it('moves focus to the new page heading and announces it after navigating', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(document.body).toHaveFocus();

    await user.click(sidebar().getByRole('link', { name: 'Calibrate' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Calibrate' });
    await waitFor(() => expect(heading).toHaveFocus());
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Calibrate'));
  });

  it('makes the skip link the first tab stop, targeting main content', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main-content');
    await user.keyboard('{Enter}');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveFocus();
  });

  it('keeps the wordmark as the route back to the public site', async () => {
    renderRoutes({ route: ROUTES.settings });
    await screen.findByRole('heading', { level: 1, name: 'Settings' });
    expect(screen.getByRole('link', { name: 'Tactiq home' })).toHaveAttribute('href', ROUTES.root);
  });

  it.each([
    ROUTES.dashboard,
    ROUTES.connect,
    ROUTES.calibrate,
    ROUTES.train,
    '/dashboard/train/confirm_and_back',
    ROUTES.simulator,
    ROUTES.commands,
    ROUTES.history,
    ROUTES.settings,
    ROUTES.help,
  ])('shows one main landmark, one h1 and the Help link on %s', async (route) => {
    renderRoutes({ route });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Help' })).toHaveAttribute('href', ROUTES.help);
  });
});
