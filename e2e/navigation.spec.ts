/**
 * Navigation, route guards and page structure.
 *
 * Covers the desktop sidebar with its Practice and Device groups, the mobile
 * bottom bar with its More dialog, focus and announcements after client-side
 * navigation, the skip link, Help from every dashboard route, the public
 * product page at "/" and the guest demonstration at "/demo", sign-in and
 * onboarding redirects, not-found pages, keyboard-only navigation, one main
 * landmark and one h1 per page, and the shell's single mode bar.
 */
import { modeSentence } from '../src/app/shell/modeNote';
import { ONBOARDING_LAST_STEP } from '../src/domain/onboarding';
import { DASHBOARD_ROUTES, PUBLIC_ROUTES, expect, seedStorage, test, trackConsoleErrors } from './fixtures';
import {
  DESKTOP_PROJECT,
  MOBILE_PROJECT,
  TITLE_SUFFIX,
  findFocusHiddenBehind,
  mainNav,
  politeRegion,
  seedGuestProfile,
  tabUntilFocused,
  topBar,
  waitForPage,
} from './helpers/navigation';
import { expectOnboardingStep } from './helpers/onboarding';

/**
 * The navigation, as src/app/shell/navItems.ts defines it. PRIMARY_NAV and
 * SECONDARY_NAV in helpers/navigation.ts still describe the flat navigation
 * from before the rebuild (Home, Train, Simulator, Commands, Settings over a
 * "More" group), so the shape is taken from the source here instead: five
 * parents, two of which group the pages underneath them, with Help beside
 * them. Labels, paths and titles are read from navItems.ts, routes.ts and
 * each page's usePageTitle call, never guessed.
 */
interface Destination {
  /** Accessible name of the navigation link. */
  readonly label: string;
  readonly path: string;
  /** The page's document title without the " · Tactiq" suffix. */
  readonly title: string;
}

interface Parent extends Destination {
  /** The pages shown under this one: nested in the sidebar, listed in the More dialog. */
  readonly children?: readonly Destination[];
}

const TRAIN: Destination = { label: 'Train', path: '/dashboard/train', title: 'Train' };
const SIMULATOR: Destination = { label: 'Simulator', path: '/dashboard/simulator', title: 'Simulator' };
const COMMANDS: Destination = { label: 'Commands', path: '/dashboard/commands', title: 'Commands and shortcuts' };
const CONNECT: Destination = { label: 'Connect', path: '/dashboard/connect', title: 'Connect your ring' };
const CALIBRATE: Destination = { label: 'Calibrate', path: '/dashboard/calibrate', title: 'Calibrate' };

/** The mobile bottom bar, and the parents of the desktop sidebar's groups. */
const PRIMARY_NAV: readonly Parent[] = [
  { label: 'Home', path: '/dashboard', title: 'Home' },
  { label: 'Practice', path: '/dashboard/train', title: 'Train', children: [TRAIN, SIMULATOR, COMMANDS] },
  { label: 'Device', path: '/dashboard/connect', title: 'Connect your ring', children: [CONNECT, CALIBRATE] },
  { label: 'Activity', path: '/dashboard/history', title: 'History' },
  { label: 'Settings', path: '/dashboard/settings', title: 'Settings' },
];

/** Always reachable, from the top bar and from the end of every navigation. */
const HELP: Destination = { label: 'Help', path: '/dashboard/help', title: 'Help' };

/** The two parents that group pages rather than linking to one of their own. */
const GROUPS: readonly Parent[] = PRIMARY_NAV.filter((item) => item.children !== undefined);

/** Every link in the sidebar, in reading order: a group contributes its pages, not itself. */
const SIDEBAR_NAV: readonly Destination[] = [...PRIMARY_NAV.flatMap((item) => item.children ?? [item]), HELP];

/** The More dialog: everything the five-destination bottom bar cannot hold. */
const MORE_NAV: readonly Destination[] = [...PRIMARY_NAV.flatMap((item) => item.children ?? []), HELP];

/**
 * Labels that stand for a place in the hierarchy rather than for one page: the
 * two group names, and Activity, whose single page is History.
 */
const HIERARCHY_LABELS: ReadonlySet<string> = new Set([...GROUPS.map((group) => group.label), 'Activity']);

/** The shell's one simulation disclaimer, for the signed-in app on the simulated ring. */
const ACCOUNT_MODE_NOTE = modeSentence('account', 'demo');

test.describe('desktop sidebar', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'The sidebar is only shown from the lg breakpoint.');
  });

  test('lists every destination in one Main navigation, with Practice and Device as groups', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    // Only one "Main" navigation is exposed at a time: the bottom bar is hidden on desktop.
    await expect(mainNav(page)).toHaveCount(1);
    const nav = mainNav(page);
    await expect(nav).toBeVisible();

    const links = nav.getByRole('link');
    await expect(links).toHaveText(SIDEBAR_NAV.map((item) => item.label));
    for (const item of SIDEBAR_NAV) {
      await expect(nav.getByRole('link', { name: item.label, exact: true })).toHaveAttribute('href', item.path);
    }

    // A group is a list named after its parent, and that name labels the list
    // rather than repeating a link to the first child, so nothing is offered twice.
    for (const group of GROUPS) {
      const list = nav.getByRole('list', { name: group.label });
      await expect(list.getByRole('link')).toHaveText((group.children ?? []).map((child) => child.label));
      await expect(nav.getByRole('link', { name: group.label, exact: true })).toHaveCount(0);
    }

    // The mobile More button is not shown on desktop.
    await expect(topBar(page).getByRole('button', { name: 'More' })).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('each sidebar link changes the URL, marks itself current, sets the title, focuses the h1 and announces the page', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');

    // Home last, so every click is a real pathname change.
    const order = [...SIDEBAR_NAV.slice(1), SIDEBAR_NAV[0]!];
    for (const item of order) {
      await test.step(`${item.label} → ${item.path}`, async () => {
        const link = nav.getByRole('link', { name: item.label, exact: true });
        await link.click();

        await expect(page).toHaveURL((url) => url.pathname === item.path);
        await expect(link).toHaveAttribute('aria-current', 'page');
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(page).toHaveTitle(`${item.title}${TITLE_SUFFIX}`);
        await expect(page.locator('#page-title')).toBeFocused();
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(politeRegion(page)).toContainText(item.title);
      });
    }
    expect(errors).toEqual([]);
  });

  test('Train stays marked (aria-current=true) while a lesson is open', async ({ signedInPage: page }) => {
    await page.goto('/dashboard/train/confirm_and_back');
    await waitForPage(page);
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Train', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).not.toHaveAttribute('aria-current', /.*/);
  });

  test('a trailing slash in the address still marks the matching sidebar link as the current page', async ({
    signedInPage: page,
  }) => {
    await page.goto('/dashboard/simulator/');
    await waitForPage(page);
    await expect(page).toHaveTitle(`Simulator${TITLE_SUFFIX}`);
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Simulator', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test('browser Back returns to the previous page and moves focus to its heading', async ({ signedInPage: page }) => {
    await page.goto('/dashboard/settings');
    await waitForPage(page);
    const nav = mainNav(page);
    await nav.getByRole('link', { name: 'Simulator', exact: true }).click();
    await expect(page).toHaveTitle(`Simulator${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/settings');
    await expect(page).toHaveTitle(`Settings${TITLE_SUFFIX}`);
    await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Settings');
  });
});

test.describe('mobile bottom bar and More dialog', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'The bottom bar and More menu are only shown below lg.');
  });

  test('bottom navigation has exactly the five primary destinations', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    await expect(mainNav(page)).toHaveCount(1);
    const nav = mainNav(page);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveCount(5);
    await expect(nav.getByRole('link')).toHaveText(PRIMARY_NAV.map((item) => item.label));
    for (const item of PRIMARY_NAV) {
      const link = nav.getByRole('link', { name: item.label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', item.path);
    }
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('a bottom bar group opens the first page inside it, marks itself current and focuses the h1', async ({
    signedInPage: page,
  }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    const nav = mainNav(page);
    // Practice stands for the three pages grouped under it, and the bar only has
    // room for the parent, so activating it opens the first of them.
    const practice = nav.getByRole('link', { name: 'Practice', exact: true });
    await practice.click();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/train');
    await expect(practice).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page).toHaveTitle(`Train${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Train');
  });

  test('a group stays marked (aria-current=true) while any page inside it is open', async ({ signedInPage: page }) => {
    await page.goto('/dashboard/simulator');
    await waitForPage(page);
    const nav = mainNav(page);
    // The bar carries no Simulator link of its own, so Practice is what tells the
    // visitor which of the five sections they are in.
    await expect(nav.getByRole('link', { name: 'Practice', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).not.toHaveAttribute('aria-current', /.*/);
  });

  test('More opens a dialog with the Practice and Device pages, Help and the theme switcher; Escape returns focus to More', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    const more = topBar(page).getByRole('button', { name: 'More' });
    await expect(more).toBeVisible();
    await expect(more).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(more).toHaveAttribute('aria-expanded', 'false');

    await more.click();
    const dialog = page.getByRole('dialog', { name: 'More' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    // While the modal is open the rest of the page is hidden from assistive technology,
    // so the opener is only reachable with includeHidden.
    const moreWhileOpen = page
      .getByRole('banner', { includeHidden: true })
      .getByRole('button', { name: 'More', includeHidden: true });
    await expect(moreWhileOpen).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('banner')).toHaveCount(0);

    const destinations = dialog.getByRole('navigation', { name: 'More destinations' });
    await expect(destinations.getByRole('link')).toHaveCount(MORE_NAV.length);
    for (const item of MORE_NAV) {
      const link = destinations.getByRole('link', { name: item.label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', item.path);
    }
    // Grouped under the same names as the sidebar, so the two navigations teach one shape.
    for (const group of GROUPS) {
      const list = destinations.getByRole('list', { name: group.label });
      await expect(list.getByRole('link')).toHaveCount((group.children ?? []).length);
    }

    const theme = dialog.getByRole('group', { name: 'Theme' });
    await expect(theme).toBeVisible();
    await expect(theme.getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect(theme.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
    await expect(theme.getByRole('radio', { name: 'System' })).not.toBeChecked();

    // Focus moved into the dialog.
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(errors).toEqual([]);
  });

  test('the More dialog keeps Tab inside it and its theme switcher works from the keyboard', async ({
    signedInPage: page,
  }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    await topBar(page).getByRole('button', { name: 'More' }).click();
    const dialog = page.getByRole('dialog', { name: 'More' });
    await expect(dialog).toBeVisible();

    const focusInsideDialog = () => dialog.evaluate((el) => el.contains(document.activeElement));
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await focusInsideDialog()).toBe(true);
    }
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusInsideDialog()).toBe(true);
    }

    const theme = dialog.getByRole('group', { name: 'Theme' });
    const light = theme.getByRole('radio', { name: 'Light' });
    const dark = theme.getByRole('radio', { name: 'Dark' });
    await light.focus();
    await page.keyboard.press('ArrowRight');
    await expect(dark).toBeChecked();
    await expect(dark).toBeFocused();
    await expect(light).not.toBeChecked();
    await expect(dialog).toBeVisible();
  });

  test('top bar, mode bar and bottom bar controls are at least 44 by 44 CSS pixels', async ({ signedInPage: page }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    const bar = topBar(page);
    const controls = [
      bar.getByRole('link', { name: 'Tactiq home' }),
      bar.getByRole('link', { name: 'Help', exact: true }),
      bar.getByRole('button', { name: 'More' }),
      // The device state is a row lower now, in the shell's mode bar.
      page.getByRole('link', { name: /^Device: / }),
      ...PRIMARY_NAV.map((item) => mainNav(page).getByRole('link', { name: item.label, exact: true })),
    ];
    for (const control of controls) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box, `${control} has a layout box`).not.toBeNull();
      expect(Math.round(box!.width), `${control} width`).toBeGreaterThanOrEqual(44);
      expect(Math.round(box!.height), `${control} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('a destination in the More dialog navigates, closes the dialog and focuses the h1', async ({
    signedInPage: page,
  }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    await topBar(page).getByRole('button', { name: 'More' }).click();
    const dialog = page.getByRole('dialog', { name: 'More' });
    await dialog.getByRole('link', { name: 'Calibrate', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/calibrate');
    await expect(page).toHaveTitle(`Calibrate${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Calibrate');
  });
});

test.describe('skip link', () => {
  for (const path of ['/dashboard', '/dashboard/simulator', '/nope']) {
    test(`first Tab on ${path} focuses "Skip to main content", which moves focus into main`, async ({
      signedInPage: page,
    }) => {
      await page.goto(path);
      await waitForPage(page);

      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();

      await page.keyboard.press('Enter');
      const main = page.locator('#main-content');
      await expect(main).toBeFocused();
      await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content');

      // The next Tab continues inside main rather than back in the header.
      await page.keyboard.press('Tab');
      await expect
        .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('#main-content'))))
        .toBe(true);
    });
  }
});

test.describe('Help from every dashboard route', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`a visible Help link on ${route} opens Help`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      await waitForPage(page);

      const help = topBar(page).getByRole('link', { name: 'Help', exact: true });
      await expect(help).toBeVisible();
      await expect(help).toHaveAttribute('href', '/dashboard/help');
      await help.click();

      await expect(page).toHaveURL((url) => url.pathname === '/dashboard/help');
      await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
      await expect(page).toHaveTitle(`Help${TITLE_SUFFIX}`);
      await expect(help).toHaveAttribute('aria-current', 'page');
      expect(errors).toEqual([]);
    });
  }
});

test.describe('route protection', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`signed-out visit to ${route} redirects to sign-in with next`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      // The guard only runs once the app has booted, and a cold chunk on the
      // shared dev server can take longer than an assertion's own timeout, so
      // wait for a page to render before judging which one the guard chose.
      await waitForPage(page);
      await expect(page).toHaveURL((url) => url.pathname === '/sign-in' && url.searchParams.get('next') === route);
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
      await expect(page).toHaveTitle(`Sign in${TITLE_SUFFIX}`);
      // No app navigation is exposed to a signed-out visitor.
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('"/" is public: a signed-out visitor gets the product page rather than sign-in', async ({
    newUserPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/');
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/');
    // The product page is not the app: it carries no app navigation, and the
    // way in is offered rather than forced.
    await expect(mainNav(page)).toHaveCount(0);
    await expect(topBar(page).getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page).toHaveTitle('Tactiq');
    expect(errors).toEqual([]);
  });

  test('the demonstration at /demo renders the app for a signed-out visitor, at /demo paths', async ({
    newUserPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/demo');
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/demo');

    // Same screens and same navigation, with every link rewritten to this section.
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/demo');
    const settings = nav.getByRole('link', { name: 'Settings', exact: true });
    await expect(settings).toHaveAttribute('href', '/demo/settings');
    // Named a demonstration, never a signed-in session.
    await expect(page.getByText(modeSentence('demo', 'demo'), { exact: true })).toBeVisible();

    await settings.click();
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/demo/settings');
    await expect(page).toHaveTitle(`Settings${TITLE_SUFFIX}`);
    expect(errors).toEqual([]);
  });

  test('Continue as a guest on /sign-in?next=/dashboard/history lands on History when onboarding is done', async ({
    page,
  }) => {
    await seedStorage(page, { onboardingCompleted: true, signedIn: false });
    // The guest profile already exists, so this is the same person coming back
    // and their finished setup stands. A guest profile made for the first time
    // starts setup instead (the test below).
    await seedGuestProfile(page);
    // Setup progress follows the person, not the browser, so "their finished
    // setup" is a record under that guest's own id. seedGuestProfile writes only
    // the account, and seedStorage writes the signed-out scope, which no profile
    // ever reads — hence this third record, under the id seedGuestProfile uses.
    await page.addInitScript((lastStep) => {
      if (window.sessionStorage.getItem('e2e.guestPrefsSeeded')) return;
      window.sessionStorage.setItem('e2e.guestPrefsSeeded', '1');
      window.localStorage.setItem(
        'tactiq.u.user_guest_e2e.prefs.profile',
        JSON.stringify({ version: 1, hand: 'right', onboardingCompleted: true, onboardingStep: lastStep }),
      );
    }, ONBOARDING_LAST_STEP);
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in?next=/dashboard/history');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue as a guest' }).click();

    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/history' && url.searchParams.get('next') === null);
    await waitForPage(page);
    await expect(page).toHaveTitle(`History${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(mainNav(page)).toBeVisible();
    await expect(politeRegion(page)).toContainText('History');
    expect(errors).toEqual([]);
  });

  test('a guest profile made for the first time starts setup, even where setup was already finished', async ({
    page,
  }) => {
    // Preferences belong to the browser, not the profile: whoever finished
    // setup here, this guest has not, so they are not dropped into the app.
    await seedStorage(page, { onboardingCompleted: true, signedIn: false });
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in?next=/dashboard/history');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue as a guest' }).click();

    await waitForPage(page);
    await expectOnboardingStep(page, 1);
    expect(errors).toEqual([]);
  });

  test('a signed-out deep link to a Help section survives sign-in, and focus lands on that section', async ({
    page,
  }) => {
    await seedStorage(page, { onboardingCompleted: true, signedIn: false });
    await page.goto('/dashboard/help#troubleshooting');
    await waitForPage(page);
    await expect(page).toHaveURL(
      (url) => url.pathname === '/sign-in' && url.searchParams.get('next') === '/dashboard/help#troubleshooting',
    );

    await page.getByRole('button', { name: 'Continue as a guest' }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/help' && url.hash === '#troubleshooting');
    await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
    await expect(page.locator('#troubleshooting')).toBeFocused();
  });

  test('a signed-in visitor to sign-in is sent straight to the safe next page', async ({ signedInPage: page }) => {
    await page.goto('/sign-in?next=/dashboard/commands');
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/commands');
    await expect(page).toHaveTitle(`Commands and shortcuts${TITLE_SUFFIX}`);
  });

  test('an off-site next is ignored and the signed-in visitor lands on the dashboard', async ({
    signedInPage: page,
  }) => {
    await page.goto(`/sign-in?next=${encodeURIComponent('//evil.example/phish')}`);
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.origin === new URL(page.url()).origin && url.pathname === '/dashboard');
    await expect(page).toHaveTitle(`Home${TITLE_SUFFIX}`);
  });
});

test.describe('onboarding gate', () => {
  test('signed in with onboarding incomplete, /dashboard goes to /onboarding', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);
    await expectOnboardingStep(page, 1);
    await expect(page).toHaveTitle(`Set up Tactiq${TITLE_SUFFIX}`);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('signed in with onboarding incomplete, other dashboard pages also go to /onboarding', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    await page.goto('/dashboard/simulator');
    await waitForPage(page);
    await expectOnboardingStep(page, 1);
  });

  test('signed in with onboarding incomplete, /dashboard/help stays reachable', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard/help');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/help');
    await expect(page).toHaveTitle(`Help${TITLE_SUFFIX}`);
    expect(errors).toEqual([]);
  });

  test('Help in the onboarding banner opens Help without being bounced back', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    await page.goto('/onboarding');
    await waitForPage(page);
    await page.getByRole('banner').getByRole('link', { name: 'Help', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/help');
    await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
    await expect(page.locator('#page-title')).toBeFocused();
  });
});

test.describe('unknown routes', () => {
  for (const path of ['/nope', '/dashboard/nope']) {
    test(`${path} shows "Page not found" with a link back to the dashboard`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(path);
      await waitForPage(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
      await expect(page).toHaveTitle(`Page not found${TITLE_SUFFIX}`);
      await expect(page.getByRole('main')).toContainText(path);
      await expect(page.getByRole('main')).toHaveCount(1);

      const back = page.getByRole('main').getByRole('link', { name: 'Go to the dashboard' });
      await expect(back).toBeVisible();
      await back.click();
      await waitForPage(page);
      await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
      await expect(page).toHaveTitle(`Home${TITLE_SUFFIX}`);
      await expect(page.locator('#page-title')).toBeFocused();
      expect(errors).toEqual([]);
    });
  }

  test('/dashboard/nope keeps the app navigation around the not-found page', async ({ signedInPage: page }) => {
    await page.goto('/dashboard/nope');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).locator('[aria-current]')).toHaveCount(0);
  });

  test('/nope for a signed-out visitor offers the public home page, which needs no sign-in', async ({
    newUserPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/nope');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    // "/" is public, so back goes to the product page instead of through sign-in.
    await page.getByRole('main').getByRole('link', { name: 'Go to the home page' }).click();
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/');
    await expect(page).toHaveTitle('Tactiq');
    expect(errors).toEqual([]);
  });

  test('/demo/nope keeps the demonstration around the not-found page and leads back into it', async ({
    newUserPage: page,
  }) => {
    await page.goto('/demo/nope');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(mainNav(page)).toBeVisible();
    // A guest is sent back to the demonstration, not to an account address.
    await page.getByRole('main').getByRole('link', { name: 'Back to the demonstration' }).click();
    await waitForPage(page);
    await expect(page).toHaveURL((url) => url.pathname === '/demo');
    await expect(page).toHaveTitle(`Home${TITLE_SUFFIX}`);
  });
});

test.describe('keyboard only', () => {
  test('from the dashboard, Tab reaches the Practice section and Enter opens Train', async ({
    signedInPage: page,
  }, testInfo) => {
    await page.goto('/dashboard');
    await waitForPage(page);

    // The sidebar lists the pages inside Practice, the bottom bar only has room
    // for Practice itself; either way the first stop in the section opens Train.
    const label = testInfo.project.name === MOBILE_PROJECT ? 'Practice' : 'Train';
    const link = mainNav(page).getByRole('link', { name: label, exact: true });
    await tabUntilFocused(page, link);
    await expect(link).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/train');
    await expect(page).toHaveTitle(`Train${TITLE_SUFFIX}`);
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Train');
  });
});

test.describe('page structure', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`${route} loads with no console errors, one main landmark and one h1`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      await waitForPage(page);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`${TITLE_SUFFIX}$`));
      expect(errors).toEqual([]);
    });
  }

  for (const route of PUBLIC_ROUTES) {
    test(`${route} loads with no console errors, one main landmark and one h1`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      await waitForPage(page);
      await expect(page).toHaveURL((url) => url.pathname === route);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`${TITLE_SUFFIX}$`));
      expect(errors).toEqual([]);
    });
  }

  // The product page is titled with the bare product name, and the
  // demonstration needs no account, so both are checked without those rules.
  for (const route of ['/', '/demo']) {
    test(`${route} loads for a signed-out visitor with one main landmark, one h1 and one skip link`, async ({
      newUserPage: page,
    }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      await waitForPage(page);
      await expect(page).toHaveURL((url) => url.pathname === route);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }

  for (const route of ['/onboarding', '/nope']) {
    test(`${route} loads with no console errors, one main landmark and one h1`, async ({ page }) => {
      await seedStorage(page, { onboardingCompleted: false, signedIn: true });
      const errors = trackConsoleErrors(page);
      await page.goto(route);
      await waitForPage(page);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('mode bar', () => {
  test('the mode bar names the mode, says what is simulated and opens Connect', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    const note = page.getByText(ACCOUNT_MODE_NOTE, { exact: true });
    await expect(note).toHaveCount(1);
    await expect(note).toBeVisible();

    const status = page.getByRole('link', { name: /^Device: Demo Mode\b/ });
    await expect(status).toBeVisible();
    await expect(status).toHaveText('Demo Mode');
    await expect(status).toHaveAccessibleName('Device: Demo Mode. Open connection settings');
    await expect(status).toHaveAttribute('href', '/dashboard/connect');
    // No battery figure or invented measurement next to the device state.
    await expect(status).not.toContainText(/\d/);

    await status.click();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/connect');
    await expect(page).toHaveTitle(`Connect your ring${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Connect your ring');
    expect(errors).toEqual([]);
  });

  test('every dashboard route states once, and only once, what is simulated', async ({ signedInPage: page }) => {
    test.setTimeout(180_000);
    // The per-page and per-card disclaimers were deliberately removed: the shell
    // says it one row under the top bar, so it is heard once a visit.
    for (const route of DASHBOARD_ROUTES) {
      await page.goto(route);
      await waitForPage(page);
      await expect(page.getByText(ACCOUNT_MODE_NOTE, { exact: true })).toHaveCount(1);
    }
  });
});

test.describe('consistent naming', () => {
  test('each navigation label that names a page is how that page names itself', async ({
    signedInPage: page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'Checked once, through the sidebar.');
    await page.goto('/dashboard');
    await waitForPage(page);
    const nav = mainNav(page);
    for (const item of SIDEBAR_NAV.slice(1)) {
      await test.step(item.label, async () => {
        await nav.getByRole('link', { name: item.label, exact: true }).click();
        await expect(page).toHaveURL((url) => url.pathname === item.path);
        await waitForPage(page);
        if (HIERARCHY_LABELS.has(item.label)) {
          // Activity names the section rather than the one page in it, so what
          // matters is that the section leads where the hierarchy says it does.
          await expect(page).toHaveTitle(`${item.title}${TITLE_SUFFIX}`);
          return;
        }
        // A screen reader user hears the document title after activating the link;
        // it should start with the word they just chose.
        await expect(page).toHaveTitle(new RegExp(`^${item.label}\\b`));
        await expect(page.locator('#page-title')).toHaveText(new RegExp(`^${item.label}\\b`));
      });
    }
  });
});

test.describe('focus not obscured by the app bars', () => {
  test('on mobile, Tab never moves focus to a control completely hidden behind the bottom navigation', async ({
    signedInPage: page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'The fixed bottom bar is only shown below lg.');
    test.setTimeout(180_000);
    const hidden: string[] = [];
    for (const route of DASHBOARD_ROUTES) {
      await page.goto(route);
      await waitForPage(page);
      for (const item of await findFocusHiddenBehind(page, mainNav(page), 'forward')) {
        hidden.push(`${route}: <${item.tag}> "${item.name}" at ${item.top}-${item.bottom}px, bar ${item.coverTop}-${item.coverBottom}px`);
      }
    }
    expect(hidden).toEqual([]);
  });

  test('on desktop, Shift+Tab never moves focus to a control completely hidden behind the sticky top bar', async ({
    signedInPage: page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'Checked at the desktop width, where the top bar is sticky.');
    test.setTimeout(180_000);
    const hidden: string[] = [];
    for (const route of DASHBOARD_ROUTES) {
      await page.goto(route);
      await waitForPage(page);
      for (const item of await findFocusHiddenBehind(page, topBar(page), 'backward')) {
        hidden.push(`${route}: <${item.tag}> "${item.name}" at ${item.top}-${item.bottom}px, bar ${item.coverTop}-${item.coverBottom}px`);
      }
    }
    expect(hidden).toEqual([]);
  });
});
