import '@/app/testing/mockPages';
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { renderRoutes, currentLocation } from '@/app/testing/renderRoutes';
import { useAuth } from '@/services/auth/AuthProvider';
import { LocalDemoAuthService } from '@/services/auth/LocalDemoAuthService';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';

function SignInProbe() {
  const { user, continueAsGuest } = useAuth();
  return (
    <>
      <button type="button" onClick={() => void continueAsGuest()}>
        Probe: continue as guest
      </button>
      {user && <p>Probe: signed in</p>}
    </>
  );
}

async function findPageHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('AppRoutes: root and guards', () => {
  it('sends a signed-in user from / to the dashboard', async () => {
    renderRoutes({ route: '/' });
    expect(await findPageHeading('Home')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.dashboard);
  });

  it('sends a signed-out visitor from / to sign-in', async () => {
    renderRoutes({ route: '/', signedIn: false });
    expect(await findPageHeading('Sign in')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.signIn);
  });

  it('sends a signed-out visitor from /dashboard to sign-in with a next parameter', async () => {
    renderRoutes({ route: '/dashboard', signedIn: false });
    expect(await findPageHeading('Sign in')).toBeInTheDocument();
    expect(currentLocation()).toBe('/sign-in?next=%2Fdashboard');
  });

  it('keeps the search string in next', async () => {
    renderRoutes({ route: '/dashboard/history?range=7d', signedIn: false });
    await findPageHeading('Sign in');
    expect(currentLocation()).toBe('/sign-in?next=%2Fdashboard%2Fhistory%3Frange%3D7d');
  });

  it('shows an accessible loading status while the session is being restored', async () => {
    class PendingAuth extends LocalDemoAuthService {
      getSession() {
        return new Promise<null>(() => undefined);
      }
    }
    const storage = new MemoryStorageAdapter();
    renderRoutes({ route: '/dashboard', storage, authService: new PendingAuth(storage) });
    const loading = await screen.findByText('Loading…');
    expect(loading.closest('[role="status"]')).not.toBeNull();
    expect(within(screen.getByRole('main')).getByText('Loading…')).toBe(loading);
    expect(currentLocation()).toBe(ROUTES.dashboard);
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('sends a signed-in user whose onboarding is incomplete to onboarding', async () => {
    renderRoutes({ route: '/dashboard/train', preferences: { onboardingCompleted: false } });
    expect(await findPageHeading('Welcome to Tactiq')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.onboarding);
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('keeps Help reachable before onboarding is finished', async () => {
    renderRoutes({ route: ROUTES.help, preferences: { onboardingCompleted: false } });
    expect(await findPageHeading('Help')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.help);
  });

  it('redirects a signed-out visitor from onboarding to sign-in', async () => {
    renderRoutes({ route: ROUTES.onboarding, signedIn: false });
    await findPageHeading('Sign in');
    expect(currentLocation()).toBe('/sign-in?next=%2Fonboarding');
  });
});

describe('AppRoutes: auth screens', () => {
  it('sends an already signed-in user from sign-in to the safe next path', async () => {
    renderRoutes({ route: '/sign-in?next=%2Fdashboard%2Fhistory' });
    expect(await findPageHeading('History')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.history);
  });

  it('ignores an unsafe next path', async () => {
    renderRoutes({ route: `/sign-in?next=${encodeURIComponent('https://evil.example')}` });
    await findPageHeading('Home');
    expect(currentLocation()).toBe(ROUTES.dashboard);
  });

  it('sends a signed-in user away from sign-up', async () => {
    renderRoutes({ route: ROUTES.signUp });
    await findPageHeading('Home');
    expect(currentLocation()).toBe(ROUTES.dashboard);
  });

  it('shows forgot-password to signed-out visitors', async () => {
    renderRoutes({ route: ROUTES.forgotPassword, signedIn: false });
    expect(await findPageHeading('Forgot password')).toBeInTheDocument();
  });

  it('keeps reset-password reachable while signed in and while signed out', async () => {
    const first = renderRoutes({ route: ROUTES.resetPassword });
    expect(await findPageHeading('Choose a new password')).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.resetPassword);
    first.unmount();
    renderRoutes({ route: ROUTES.resetPassword, signedIn: false });
    expect(await findPageHeading('Choose a new password')).toBeInTheDocument();
  });

  it('renders auth screens inside a bare main landmark', async () => {
    renderRoutes({ route: ROUTES.signIn, signedIn: false });
    await findPageHeading('Sign in');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tactiq home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('lets the sign-in page navigate after signing in instead of racing it', async () => {
    const { user } = renderRoutes({ route: '/sign-in?next=%2Fdashboard%2Fhistory', signedIn: false, children: <SignInProbe /> });
    await findPageHeading('Sign in');
    await user.click(screen.getByRole('button', { name: 'Probe: continue as guest' }));
    // AuthRoute leaves the signed-in user on the page; the page decides where to go.
    expect(await screen.findByText('Probe: signed in')).toBeInTheDocument();
    expect(currentLocation()).toBe('/sign-in?next=%2Fdashboard%2Fhistory');
  });

  it('renders onboarding outside the public frame, so the page supplies the only main landmark', async () => {
    // The onboarding page is a stub here; App.onboarding.test.tsx renders the real page and
    // checks there is exactly one main landmark and one skip link.
    renderRoutes({ route: ROUTES.onboarding, preferences: { onboardingCompleted: false } });
    await findPageHeading('Welcome to Tactiq');
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Skip to main content' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tactiq home' })).not.toBeInTheDocument();
  });

  it('keeps the public frame for Page not found: one main landmark and one skip link', async () => {
    renderRoutes({ route: '/no-such-place' });
    await findPageHeading('Page not found');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Skip to main content' })).toHaveLength(1);
    const banner = screen.getByRole('link', { name: 'Tactiq home' }).closest('header');
    expect(within(banner as HTMLElement).getByRole('link', { name: 'Help' })).toHaveAttribute('href', ROUTES.help);
  });
});

describe('AppRoutes: unknown addresses', () => {
  it('shows Page not found with a link to the dashboard', async () => {
    renderRoutes({ route: '/no-such-place' });
    expect(await findPageHeading('Page not found')).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Tactiq');
    expect(screen.getByText('/no-such-place')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute('href', ROUTES.dashboard);
  });

  it('shows Page not found inside the shell for an unknown dashboard page', async () => {
    const { user } = renderRoutes({ route: '/dashboard/nowhere' });
    expect(await findPageHeading('Page not found')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Main' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('link', { name: 'Go to the dashboard' }));
    expect(await findPageHeading('Home')).toBeInTheDocument();
  });

  it('renders the lesson route with its parameter', async () => {
    renderRoutes({ route: '/dashboard/train/confirm_and_back' });
    expect(await findPageHeading('Lesson')).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe('/dashboard/train/confirm_and_back'));
  });
});
