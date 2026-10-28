import { ROUTES } from '@/app/routes';
import {
  ACCOUNT_BASE,
  canonicalPath,
  DEMO_BASE,
  DEMO_SCOPE_ID,
  demoPath,
  isAccountPath,
  isDemoPath,
  sectionBase,
  sectionChild,
  sectionPath,
  withLocation,
} from './sections';

describe('section bases', () => {
  it('names the two bases the account screens are mounted under', () => {
    expect(ACCOUNT_BASE).toBe(ROUTES.dashboard);
    expect(DEMO_BASE).toBe(ROUTES.demo);
    expect(sectionBase('account')).toBe('/dashboard');
    expect(sectionBase('demo')).toBe('/demo');
  });

  it('reserves one scope id for the demonstration, which can never be a user id', () => {
    expect(DEMO_SCOPE_ID).toBe('demo');
  });
});

describe('sectionChild', () => {
  it('reduces a canonical path to the child path the route table uses', () => {
    expect(sectionChild(ROUTES.train)).toBe('train');
    expect(sectionChild('/dashboard/practice/train/:lessonId')).toBe('practice/train/:lessonId');
  });
});

describe('sectionPath', () => {
  it('leaves canonical paths alone for the account', () => {
    expect(sectionPath('account', ROUTES.history)).toBe('/dashboard/history');
  });

  it('moves the base for the demonstration', () => {
    expect(sectionPath('demo', ROUTES.dashboard)).toBe('/demo');
    expect(sectionPath('demo', ROUTES.history)).toBe('/demo/history');
    expect(demoPath('/dashboard/train/squeeze_to_activate')).toBe('/demo/train/squeeze_to_activate');
  });

  it('leaves shared addresses alone, so a demonstration still signs people up', () => {
    expect(sectionPath('demo', ROUTES.signUp)).toBe('/sign-up');
    expect(sectionPath('demo', ROUTES.root)).toBe('/');
    expect(sectionPath('demo', '/dashboardish')).toBe('/dashboardish');
  });
});

describe('canonicalPath', () => {
  it('reads a demonstration address as the canonical one, keeping parameter case', () => {
    expect(canonicalPath('/demo')).toBe('/dashboard');
    expect(canonicalPath('/demo/train/Confirm_And_Back')).toBe('/dashboard/train/Confirm_And_Back');
  });

  it('leaves everything else alone', () => {
    expect(canonicalPath('/dashboard/help')).toBe('/dashboard/help');
    expect(canonicalPath('/demonstration')).toBe('/demonstration');
    expect(canonicalPath('/')).toBe('/');
  });
});

describe('isAccountPath and isDemoPath', () => {
  it.each([
    ['/dashboard', true, false],
    ['/dashboard/', true, false],
    ['/Dashboard/Help', true, false],
    ['/dashboardish', false, false],
    ['/demo', false, true],
    ['/demo/settings', false, true],
    ['/demonstration', false, false],
    ['/sign-in', false, false],
  ])('%s', (pathname, account, demo) => {
    expect(isAccountPath(pathname)).toBe(account);
    expect(isDemoPath(pathname)).toBe(demo);
  });
});

describe('withLocation', () => {
  it('re-attaches the query and hash so deep links survive a redirect', () => {
    expect(withLocation('/dashboard/history', { search: '?range=7d', hash: '#top' })).toBe(
      '/dashboard/history?range=7d#top',
    );
    expect(withLocation('/dashboard')).toBe('/dashboard');
  });
});
