import '@/app/testing/mockPages';
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';
import { LocalDemoAuthService } from '@/services/auth/LocalDemoAuthService';
import { AuthError } from '@/services/auth/types';
import { createServices } from '@/services/ServicesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { DEMO_MODE_NOTICE } from './DemoModeNotice';

function mainNavs() {
  const sidebar = within(screen.getByTestId('sidebar')).getByRole('navigation', { name: 'Main' });
  const mobile = screen.getByTestId('mobile-nav');
  return { sidebar, mobile };
}

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('AppShell navigation', () => {
  it('shows the five mobile destinations and the sidebar with its secondary group', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const { sidebar, mobile } = mainNavs();

    expect(mobile).toHaveAttribute('aria-label', 'Main');
    expect(within(mobile).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Train',
      'Simulator',
      'Commands',
      'Settings',
    ]);

    const secondary = within(sidebar).getByRole('list', { name: 'More' });
    expect(within(secondary).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Connect',
      'Calibrate',
      'History',
      'Help',
    ]);
    expect(within(sidebar).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates with Train and moves aria-current', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const { sidebar, mobile } = mainNavs();

    await user.click(within(mobile).getByRole('link', { name: 'Train' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Train' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.train);
    expect(within(mobile).getByRole('link', { name: 'Train' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByRole('link', { name: 'Train' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByRole('link', { name: 'Train' })).toHaveClass('font-semibold');
    expect(within(mobile).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('moves focus to the new page heading and announces it after navigating', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(document.body).toHaveFocus();

    await user.click(within(mainNavs().sidebar).getByRole('link', { name: 'Calibrate' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Calibrate' });
    await waitFor(() => expect(heading).toHaveFocus());
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Calibrate'));
  });

  it('marks Train as the current section inside a lesson', async () => {
    renderRoutes({ route: '/dashboard/train/confirm_and_back' });
    await screen.findByRole('heading', { level: 1, name: 'Lesson' });
    expect(within(mainNavs().mobile).getByRole('link', { name: 'Train' })).toHaveAttribute('aria-current', 'true');
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
  ])('shows the Help link in the top bar on %s', async (route) => {
    renderRoutes({ route });
    await screen.findByRole('heading', { level: 1 });
    const banner = screen.getByRole('link', { name: 'Tactiq home' }).closest('header');
    expect(banner).not.toBeNull();
    expect(within(banner as HTMLElement).getByRole('link', { name: 'Help' })).toHaveAttribute('href', ROUTES.help);
  });

  it('shows the device state as a link to Connect', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    const pill = await screen.findByRole('link', { name: 'Device: Demo Mode. Open connection settings' });
    expect(pill).toHaveAttribute('href', ROUTES.connect);
    expect(pill).toHaveTextContent('Demo Mode');
  });

  it('shows the Demo Mode notice with a way to change it', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const notice = screen.getByText(DEMO_MODE_NOTICE);
    const change = within(notice.parentElement as HTMLElement).getByRole('link', { name: 'Change device mode' });
    expect(change).toHaveAttribute('href', ROUTES.connect);
  });

  it('hides the Demo Mode notice when a hardware ring is chosen', async () => {
    renderRoutes({ route: ROUTES.dashboard, deviceMode: 'hardware' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByText(DEMO_MODE_NOTICE)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Device: .+\. Open connection settings$/ })).not.toHaveTextContent('Demo Mode');
  });

  it('switches the theme from the sidebar', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const theme = within(screen.getByTestId('sidebar')).getByRole('group', { name: 'Theme' });
    expect(within(theme).getByRole('radio', { name: 'System' })).toBeChecked();

    await user.click(within(theme).getByRole('radio', { name: 'Dark' }));
    expect(within(theme).getByRole('radio', { name: 'Dark' })).toBeChecked();
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await user.keyboard('{ArrowLeft}');
    expect(within(theme).getByRole('radio', { name: 'Light' })).toBeChecked();
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
  });

  it('opens the More dialog with the secondary destinations, theme and sign out', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('button', { name: 'More' }));
    const dialog = await screen.findByRole('dialog', { name: 'More' });
    const links = within(dialog).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      ROUTES.connect,
      ROUTES.calibrate,
      ROUTES.history,
      ROUTES.help,
    ]);
    expect(within(dialog).getByRole('link', { name: 'History' })).toHaveAccessibleDescription(
      'Practice activity in this browser',
    );
    expect(within(dialog).getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('link', { name: 'History' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signs out and opens sign-in without a next parameter', async () => {
    const { user } = renderRoutes({ route: ROUTES.settings });
    await screen.findByRole('heading', { level: 1, name: 'Settings' });
    expect(within(screen.getByTestId('sidebar')).getByText('Alex')).toBeInTheDocument();

    await user.click(within(screen.getByTestId('sidebar')).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(ROUTES.signIn));
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });
});

describe('AppShell sign-out failure', () => {
  it('keeps the user signed in and explains when sign-out fails', async () => {
    class FailingSignOut extends LocalDemoAuthService {
      signOut(): Promise<void> {
        return Promise.reject(new AuthError('network', 'The account service could not be reached.'));
      }
    }
    const storage = new MemoryStorageAdapter();
    const { user } = renderRoutes({ route: ROUTES.dashboard, storage, authService: new FailingSignOut(storage) });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const sidebar = within(screen.getByTestId('sidebar'));
    await user.click(sidebar.getByRole('button', { name: 'Sign out' }));
    expect(await sidebar.findByRole('alert')).toHaveTextContent('The account service could not be reached.');
    expect(currentLocation()).toBe(ROUTES.dashboard);
    expect(sidebar.getByRole('button', { name: 'Sign out' })).not.toHaveAttribute('aria-busy');
  });
});

describe('AppShell demo history seeding', () => {
  it('seeds labelled sample history once in Demo Mode', async () => {
    const storage = new MemoryStorageAdapter();
    const services = createServices(storage);
    const seed = vi.spyOn(services.history, 'seedDemo');
    const { user } = renderRoutes({ route: ROUTES.dashboard, storage, services });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await waitFor(() => expect(seed).toHaveBeenCalledTimes(1));
    const count = services.history.count();
    expect(count).toBeGreaterThan(0);
    expect(services.history.list().every((event) => event.seeded && event.evidence === 'simulated')).toBe(true);
    expect(storage.get(STORAGE_KEYS.historySeeded)).not.toBeNull();

    await user.click(within(mainNavs().mobile).getByRole('link', { name: 'Train' }));
    await screen.findByRole('heading', { level: 1, name: 'Train' });
    await user.click(within(mainNavs().mobile).getByRole('link', { name: 'Home' }));
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(seed).toHaveBeenCalledTimes(1);
    expect(services.history.count()).toBe(count);
  });

  it('does not seed on public screens', async () => {
    const storage = new MemoryStorageAdapter();
    const services = createServices(storage);
    const seed = vi.spyOn(services.history, 'seedDemo');
    renderRoutes({ route: ROUTES.signIn, signedIn: false, storage, services });
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(seed).not.toHaveBeenCalled();
  });

  it('does not seed for a hardware ring', async () => {
    const { services } = renderRoutes({ route: ROUTES.dashboard, deviceMode: 'hardware' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(services.history.hasSeededDemo()).toBe(false);
    expect(services.history.count()).toBe(0);
  });
});
