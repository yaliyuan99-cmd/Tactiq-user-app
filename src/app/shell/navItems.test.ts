import { lessonRoute, ROUTES } from '@/app/routes';
import {
  HELP_NAV_ITEM,
  navCurrent,
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  sectionCurrent,
  type NavItem,
} from './navItems';

const byId = (id: string): NavItem => {
  const item = PRIMARY_NAV_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`No primary nav item ${id}`);
  return item;
};

describe('nav items', () => {
  it('has exactly five primary destinations for the bottom bar', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Home',
      'Practice',
      'Device',
      'Activity',
      'Settings',
    ]);
  });

  it('groups the lessons, the simulator and the command map under Practice', () => {
    expect(byId('practice').children?.map((child) => child.label)).toEqual(['Train', 'Simulator', 'Commands']);
  });

  it('groups the connection and calibration under Device', () => {
    expect(byId('device').children?.map((child) => child.label)).toEqual(['Connect', 'Calibrate']);
  });

  it('keeps Help outside the five, so it is reachable from everywhere', () => {
    expect(HELP_NAV_ITEM.to).toBe(ROUTES.help);
    expect(PRIMARY_NAV_ITEMS.some((item) => item.id === 'help')).toBe(false);
    expect(SECONDARY_NAV_ITEMS.at(-1)).toBe(HELP_NAV_ITEM);
  });

  it('lists every grouped destination, then Help, as the secondary set', () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Train',
      'Simulator',
      'Commands',
      'Connect',
      'Calibrate',
      'Help',
    ]);
  });

  it('opens each group on one of its own pages', () => {
    for (const item of PRIMARY_NAV_ITEMS) {
      if (!item.children) continue;
      expect(item.children.map((child) => child.to)).toContain(item.to);
    }
  });

  it('links every item with a route constant and describes it in one line', () => {
    const routes: string[] = Object.values(ROUTES);
    for (const item of [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS, HELP_NAV_ITEM]) {
      expect(routes, item.label).toContain(item.to);
      expect(item.description.length).toBeGreaterThan(0);
    }
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

describe('sectionCurrent', () => {
  it('marks a group as the page when its own destination is open', () => {
    expect(sectionCurrent(byId('practice'), ROUTES.train)).toBe('page');
  });

  it('marks a group as the current section on any page inside it', () => {
    expect(sectionCurrent(byId('practice'), ROUTES.simulator)).toBe('true');
    expect(sectionCurrent(byId('practice'), lessonRoute('confirm_and_back'))).toBe('true');
    expect(sectionCurrent(byId('device'), ROUTES.calibrate)).toBe('true');
  });

  it('leaves a group alone outside it, and Home alone on every other page', () => {
    expect(sectionCurrent(byId('device'), ROUTES.simulator)).toBeUndefined();
    expect(sectionCurrent(byId('home'), ROUTES.train)).toBeUndefined();
    expect(sectionCurrent(byId('home'), ROUTES.dashboard)).toBe('page');
  });

  it('marks nothing on an unknown page inside the shell', () => {
    for (const item of PRIMARY_NAV_ITEMS) expect(sectionCurrent(item, '/dashboard/nowhere')).toBeUndefined();
  });
});
