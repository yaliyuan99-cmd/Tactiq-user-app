import { ROUTES } from '@/app/routes';
import {
  isOnboardingExempt,
  isSignedOutLocationState,
  normalisePathname,
  safeNextPath,
  signInRedirectPath,
} from './redirects';

describe('signInRedirectPath', () => {
  it('carries the requested path and search in ?next=', () => {
    expect(signInRedirectPath({ pathname: '/dashboard', search: '' })).toBe('/sign-in?next=%2Fdashboard');
    expect(signInRedirectPath({ pathname: '/dashboard/history', search: '?range=7d' })).toBe(
      '/sign-in?next=%2Fdashboard%2Fhistory%3Frange%3D7d',
    );
  });

  it('keeps a hash so help deep links survive sign-in', () => {
    expect(signInRedirectPath({ pathname: '/dashboard/help', search: '', hash: '#emergency' })).toBe(
      '/sign-in?next=%2Fdashboard%2Fhelp%23emergency',
    );
  });

  it('omits next for the root path', () => {
    expect(signInRedirectPath({ pathname: '/', search: '' })).toBe(ROUTES.signIn);
  });
});

describe('safeNextPath', () => {
  it('returns an in-app path from ?next=', () => {
    expect(safeNextPath('?next=%2Fdashboard%2Fhistory%3Frange%3D7d')).toBe('/dashboard/history?range=7d');
    expect(safeNextPath('?next=/dashboard/help%23emergency')).toBe('/dashboard/help#emergency');
    expect(safeNextPath(`?next=${encodeURIComponent('/dashboard/train/confirm_and_back?step=2#top')}`)).toBe(
      '/dashboard/train/confirm_and_back?step=2#top',
    );
  });

  it('keeps a backslash later in the path on this origin, but refuses one straight after the slash', () => {
    expect(safeNextPath(`?next=${encodeURIComponent('/dashboard\\history')}`)).toBe('/dashboard/history');
    expect(safeNextPath('?next=/%5Cevil.example')).toBe(ROUTES.dashboard);
    expect(safeNextPath('?next=%2F%2Fevil.example')).toBe(ROUTES.dashboard);
  });

  it('allows reset-password, which a recovery link needs while signed in', () => {
    expect(safeNextPath(`?next=${encodeURIComponent(ROUTES.resetPassword)}`)).toBe(ROUTES.resetPassword);
  });

  it('falls back to the dashboard when next is missing or empty', () => {
    expect(safeNextPath('')).toBe(ROUTES.dashboard);
    expect(safeNextPath('?next=')).toBe(ROUTES.dashboard);
    expect(safeNextPath('', '/elsewhere')).toBe('/elsewhere');
  });

  it.each([
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example'],
    ['a protocol-relative URL without a dot', '//evil'],
    ['a backslash host', '/\\evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a relative path', 'dashboard'],
    ['control characters', '/dashboard\n/evil'],
    ['a header injection attempt', '/dashboard\nSet-Cookie'],
    ['a NUL character', '/dash\u0000board'],
    ['the sign-in screen', '/sign-in?next=/dashboard'],
    ['the sign-up screen', '/Sign-Up/'],
    ['the forgot-password screen', '/forgot-password'],
    ['the forgot-password screen with a query', '/forgot-password?x=1'],
  ])('refuses %s', (_label, next) => {
    expect(safeNextPath(`?next=${encodeURIComponent(next)}`)).toBe(ROUTES.dashboard);
  });
});

describe('isOnboardingExempt', () => {
  it('lets Help through before onboarding is finished', () => {
    expect(isOnboardingExempt(ROUTES.help)).toBe(true);
    expect(isOnboardingExempt(`${ROUTES.help}/`)).toBe(true);
  });

  it('gates every other dashboard path', () => {
    expect(isOnboardingExempt(ROUTES.dashboard)).toBe(false);
    expect(isOnboardingExempt(ROUTES.train)).toBe(false);
    expect(isOnboardingExempt('/dashboard/helpful')).toBe(false);
  });
});

describe('normalisePathname', () => {
  it('lower-cases and trims trailing slashes', () => {
    expect(normalisePathname('/Dashboard/Train/')).toBe('/dashboard/train');
    expect(normalisePathname('/')).toBe('/');
  });
});

describe('isSignedOutLocationState', () => {
  it('recognises the sign-out marker only', () => {
    expect(isSignedOutLocationState({ signedOut: true })).toBe(true);
    expect(isSignedOutLocationState({ signedOut: 'yes' })).toBe(false);
    expect(isSignedOutLocationState(null)).toBe(false);
  });
});
