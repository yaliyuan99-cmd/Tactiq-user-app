import { ROUTES } from '@/app/routes';
import { fillParams, PUBLIC_ALIASES, SECTION_ALIASES } from './aliases';
import { sectionChild } from './sections';

describe('route aliases', () => {
  it('keeps the common spellings of the account flow working', () => {
    expect(PUBLIC_ALIASES).toEqual([
      { from: '/login', to: ROUTES.signIn },
      { from: '/signup', to: ROUTES.signUp },
    ]);
  });

  it('reserves the grouped vocabulary the navigation speaks', () => {
    expect(SECTION_ALIASES.map((alias) => alias.from)).toEqual([
      '/dashboard/practice',
      '/dashboard/practice/train',
      '/dashboard/practice/train/:lessonId',
      '/dashboard/practice/simulator',
      '/dashboard/practice/commands',
      '/dashboard/device',
      '/dashboard/device/connect',
      '/dashboard/device/calibrate',
      '/dashboard/activity',
    ]);
  });

  it('points every section alias at a canonical account path', () => {
    const canonical: string[] = Object.values(ROUTES);
    for (const alias of SECTION_ALIASES) {
      const target = alias.to.replace(/\/:\w+$/, '');
      expect(canonical, `${alias.from} → ${alias.to}`).toContain(target);
      expect(alias.from.startsWith('/dashboard/')).toBe(true);
      expect(sectionChild(alias.from)).not.toContain('/dashboard');
    }
  });

  it('never aliases an address to itself, which would loop', () => {
    for (const alias of [...PUBLIC_ALIASES, ...SECTION_ALIASES]) expect(alias.from).not.toBe(alias.to);
  });
});

describe('fillParams', () => {
  it('substitutes a matched route parameter', () => {
    expect(fillParams('/dashboard/train/:lessonId', { lessonId: 'confirm_and_back' })).toBe(
      '/dashboard/train/confirm_and_back',
    );
  });

  it('leaves a token with no value in place rather than inventing one', () => {
    expect(fillParams('/dashboard/train/:lessonId', {})).toBe('/dashboard/train/:lessonId');
  });

  it('leaves a path without tokens alone', () => {
    expect(fillParams('/dashboard/history', { lessonId: 'x' })).toBe('/dashboard/history');
  });
});
