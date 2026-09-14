import { lessonRoute, ROUTES } from '@/app/routes';
import { navCurrent, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navItems';

describe('nav items', () => {
  it('has exactly five primary destinations for the mobile bar', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual(['Home', 'Train', 'Simulator', 'Commands', 'Settings']);
  });

  it('has the four secondary destinations', () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.label)).toEqual(['Connect', 'Calibrate', 'History', 'Help']);
  });

  it('links every item with a route constant', () => {
    const routes: string[] = Object.values(ROUTES);
    for (const item of [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]) expect(routes).toContain(item.to);
  });
});

describe('navCurrent', () => {
  it('marks the exact page', () => {
    expect(navCurrent(ROUTES.train, ROUTES.train)).toBe('page');
    expect(navCurrent(ROUTES.train, `${ROUTES.train}/`)).toBe('page');
    expect(navCurrent(ROUTES.dashboard, ROUTES.dashboard, true)).toBe('page');
  });

  it('marks a parent section with "true" while a child page is open', () => {
    expect(navCurrent(ROUTES.train, lessonRoute('confirm_and_back'))).toBe('true');
  });

  it('keeps exact items inactive on child pages', () => {
    expect(navCurrent(ROUTES.dashboard, ROUTES.train, true)).toBeUndefined();
  });

  it('does not match a path that only shares a prefix', () => {
    expect(navCurrent(ROUTES.help, '/dashboard/helpful')).toBeUndefined();
    expect(navCurrent(ROUTES.train, ROUTES.simulator)).toBeUndefined();
  });
});
