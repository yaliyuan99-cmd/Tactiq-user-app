/**
 * Every address the app has ever handed out still resolves.
 *
 * The navigation was regrouped (Home, Practice, Device, Activity, Settings),
 * which changed what things are called but deliberately not where they live:
 * the flat /dashboard paths stay canonical, and the grouped vocabulary is
 * mounted as redirects beside them. These tests are the proof for both halves.
 */
import '@/app/testing/mockPages';
import { screen, waitFor } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { SECTION_ALIASES } from '@/app/routing/aliases';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';

/** Every deep link the previous navigation published, with the page it must still open. */
const LEGACY_URLS: readonly (readonly [string, string])[] = [
  [ROUTES.dashboard, 'Home'],
  [ROUTES.connect, 'Connect'],
  [ROUTES.calibrate, 'Calibrate'],
  [ROUTES.train, 'Train'],
  ['/dashboard/train/confirm_and_back', 'Lesson'],
  [ROUTES.simulator, 'Simulator'],
  [ROUTES.commands, 'Commands'],
  [ROUTES.history, 'History'],
  [ROUTES.settings, 'Settings'],
  [ROUTES.help, 'Help'],
];

describe('AppRoutes: the published account URLs', () => {
  it.each(LEGACY_URLS)('%s still resolves to %s, at the same address', async (url, heading) => {
    renderRoutes({ route: url });
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(url));
  });

  it('keeps a trailing slash and a hash working', async () => {
    renderRoutes({ route: '/dashboard/help#troubleshooting' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/dashboard/help#troubleshooting');
  });
});

describe('AppRoutes: the account-flow aliases', () => {
  it('sends /login to sign-in', async () => {
    renderRoutes({ route: '/login', signedIn: false });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.signIn);
  });

  it('sends /signup to sign-up', async () => {
    renderRoutes({ route: '/signup', signedIn: false });
    expect(await screen.findByRole('heading', { level: 1, name: 'Create a profile' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.signUp);
  });

  it('carries a next destination through the alias', async () => {
    renderRoutes({ route: '/login?next=%2Fdashboard%2Fhistory', signedIn: false });
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(currentLocation()).toBe('/sign-in?next=%2Fdashboard%2Fhistory');
  });
});

describe('AppRoutes: the grouped navigation vocabulary', () => {
  const EXPECTED: Readonly<Record<string, readonly [string, string]>> = {
    '/dashboard/practice': [ROUTES.train, 'Train'],
    '/dashboard/practice/train': [ROUTES.train, 'Train'],
    '/dashboard/practice/simulator': [ROUTES.simulator, 'Simulator'],
    '/dashboard/practice/commands': [ROUTES.commands, 'Commands'],
    '/dashboard/device': [ROUTES.connect, 'Connect'],
    '/dashboard/device/connect': [ROUTES.connect, 'Connect'],
    '/dashboard/device/calibrate': [ROUTES.calibrate, 'Calibrate'],
    '/dashboard/activity': [ROUTES.history, 'History'],
  };

  it.each(Object.entries(EXPECTED))('%s resolves to the canonical address', async (alias, [canonical, heading]) => {
    renderRoutes({ route: alias });
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(canonical));
  });

  it('covers every alias in the table, so a new one cannot be added untested', () => {
    const tested = new Set([...Object.keys(EXPECTED), '/dashboard/practice/train/:lessonId']);
    expect(SECTION_ALIASES.map((alias) => alias.from).filter((from) => !tested.has(from))) .toEqual([]);
  });

  it('carries the lesson parameter across', async () => {
    renderRoutes({ route: '/dashboard/practice/train/confirm_and_back?step=2#top' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Lesson' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe('/dashboard/train/confirm_and_back?step=2#top'));
  });
});
