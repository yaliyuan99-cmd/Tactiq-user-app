/**
 * The public surface: the one route a visitor can reach without an account.
 *
 * `/` is the product homepage. It is a single page with real section ids
 * rather than a set of marketing routes, so every link in its header and
 * footer resolves signed in and signed out, with no extra guard and no extra
 * chunk. Add a section here before you add a route.
 */
export const PUBLIC_ROUTES = {
  home: '/',
} as const;

export type PublicRoutePath = (typeof PUBLIC_ROUTES)[keyof typeof PUBLIC_ROUTES];

/** Every anchor on the homepage. Each id is on a real <section>. */
export const HOME_SECTIONS = {
  scenarios: 'everyday-moments',
  howItWorks: 'how-it-works',
  ring: 'the-ring',
  commands: 'commands',
  app: 'the-app',
  research: 'research',
  questions: 'questions',
  privacy: 'privacy',
  accessibility: 'accessibility',
} as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[keyof typeof HOME_SECTIONS];

export const HOME_SECTION_IDS: readonly HomeSectionId[] = Object.values(HOME_SECTIONS);

/** "#how-it-works" — an in-page link, used while the homepage is on screen. */
export function homeHash(section: HomeSectionId): string {
  return `#${section}`;
}

/** "/#how-it-works" — a link to a homepage section from anywhere else in the app. */
export function homeLink(section?: HomeSectionId): string {
  return section ? `${PUBLIC_ROUTES.home}${homeHash(section)}` : PUBLIC_ROUTES.home;
}
