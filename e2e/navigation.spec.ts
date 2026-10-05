/**
 * Navigation, route guards and page structure.
 *
 * Covers the desktop sidebar and the mobile bottom bar with its More dialog,
 * focus and announcements after client-side navigation, the skip link, Help
 * from every dashboard route, sign-in and onboarding redirects, not-found
 * pages, keyboard-only navigation, one main landmark and one h1 per page, and
 * the device status link in the top bar.
 */
import { DASHBOARD_ROUTES, PUBLIC_ROUTES, expect, seedStorage, test, trackConsoleErrors } from './fixtures';
import {
  DESKTOP_PROJECT,
  MOBILE_PROJECT,
  PRIMARY_NAV,
  SECONDARY_NAV,
  TITLE_SUFFIX,
  findFocusHiddenBehind,
  mainNav,
  politeRegion,
  seedGuestProfile,
  tabUntilFocused,
  topBar,
  waitForPage,
} from './helpers/navigation';

test.describe('desktop sidebar', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'The sidebar is only shown from the lg breakpoint.');
  });

  test('lists the primary and secondary destinations in one Main navigation', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    // Only one "Main" navigation is exposed at a time: the bottom bar is hidden on desktop.
    await expect(mainNav(page)).toHaveCount(1);
    const nav = mainNav(page);
    await expect(nav).toBeVisible();

    const links = nav.getByRole('link');
    await expect(links).toHaveText([...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => item.label));
    for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) {
      await expect(nav.getByRole('link', { name: item.label, exact: true })).toHaveAttribute('href', item.path);
    }

    // The secondary group is a list labelled "More".
    const moreList = nav.getByRole('list', { name: 'More' });
    await expect(moreList.getByRole('link')).toHaveText(SECONDARY_NAV.map((item) => item.label));

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
    const order = [...PRIMARY_NAV.slice(1), ...SECONDARY_NAV, PRIMARY_NAV[0]!];
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

  test('bottom navigation has exactly the five primary links', async ({ signedInPage: page }) => {
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

  test('a bottom bar link navigates, marks itself current and focuses the h1', async ({ signedInPage: page }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    const nav = mainNav(page);
    const commands = nav.getByRole('link', { name: 'Commands', exact: true });
    await commands.click();
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/commands');
    await expect(commands).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page).toHaveTitle(`Commands and shortcuts${TITLE_SUFFIX}`);
    await expect(page.locator('#page-title')).toBeFocused();
    await expect(politeRegion(page)).toContainText('Commands and shortcuts');
  });

  test('More opens a dialog with Connect, Calibrate, History, Help and the theme switcher; Escape returns focus to More', async ({
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
    await expect(destinations.getByRole('link')).toHaveCount(SECONDARY_NAV.length);
    for (const item of SECONDARY_NAV) {
      const link = destinations.getByRole('link', { name: item.label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', item.path);
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

  test('top bar and bottom bar controls are at least 44 by 44 CSS pixels', async ({ signedInPage: page }) => {
    await page.goto('/dashboard');
    await waitForPage(page);
    const bar = topBar(page);
    const controls = [
      bar.getByRole('link', { name: 'Tactiq home' }),
      bar.getByRole('link', { name: /^Device: / }),
      bar.getByRole('link', { name: 'Help', exact: true }),
      bar.getByRole('button', { name: 'More' }),
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
      await expect(page).toHaveURL((url) => url.pathname === '/sign-in' && url.searchParams.get('next') === route);
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
      await expect(page).toHaveTitle(`Sign in${TITLE_SUFFIX}`);
      // No app navigation is exposed to a signed-out visitor.
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('Continue as a guest on /sign-in?next=/dashboard/history lands on History when onboarding is done', async ({
    page,
  }) => {
    await seedStorage(page, { onboardingCompleted: true, signedIn: false });
    // The guest profile already exists, so this is the same person coming back
    // and their finished setup stands. A guest profile made for the first time
    // starts setup instead (the test below).
    await seedGuestProfile(page);
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in?next=/dashboard/history');
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
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue as a guest' }).click();

    await expect(page).toHaveURL((url) => url.pathname === '/onboarding');
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a signed-out deep link to a Help section survives sign-in, and focus lands on that section', async ({
    page,
  }) => {
    await seedStorage(page, { onboardingCompleted: true, signedIn: false });
    await page.goto('/dashboard/help#troubleshooting');
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
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/commands');
    await expect(page).toHaveTitle(`Commands and shortcuts${TITLE_SUFFIX}`);
  });

  test('an off-site next is ignored and the signed-in visitor lands on the dashboard', async ({
    signedInPage: page,
  }) => {
    await page.goto(`/sign-in?next=${encodeURIComponent('//evil.example/phish')}`);
    await expect(page).toHaveURL((url) => url.origin === new URL(page.url()).origin && url.pathname === '/dashboard');
    await expect(page).toHaveTitle(`Home${TITLE_SUFFIX}`);
  });
});

test.describe('onboarding gate', () => {
  test('signed in with onboarding incomplete, /dashboard goes to /onboarding', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL((url) => url.pathname === '/onboarding');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome' })).toBeVisible();
    await expect(page).toHaveTitle(`Set up Tactiq${TITLE_SUFFIX}`);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('signed in with onboarding incomplete, other dashboard pages also go to /onboarding', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    await page.goto('/dashboard/simulator');
    await expect(page).toHaveURL((url) => url.pathname === '/onboarding');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome' })).toBeVisible();
  });

  test('signed in with onboarding incomplete, /dashboard/help stays reachable', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false, signedIn: true });
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard/help');
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
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
      await expect(page).toHaveTitle(`Page not found${TITLE_SUFFIX}`);
      await expect(page.getByRole('main')).toContainText(path);
      await expect(page.getByRole('main')).toHaveCount(1);

      const back = page.getByRole('main').getByRole('link', { name: 'Go to the dashboard' });
      await expect(back).toBeVisible();
      await back.click();
      await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
      await expect(page).toHaveTitle(`Home${TITLE_SUFFIX}`);
      await expect(page.locator('#page-title')).toBeFocused();
      expect(errors).toEqual([]);
    });
  }

  test('/dashboard/nope keeps the app navigation around the not-found page', async ({ signedInPage: page }) => {
    await page.goto('/dashboard/nope');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).locator('[aria-current]')).toHaveCount(0);
  });

  test('/nope for a signed-out visitor still shows "Page not found" with a link back', async ({
    newUserPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/nope');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Go to the dashboard' }).click();
    // The dashboard is protected, so a signed-out visitor ends on sign-in.
    await expect(page).toHaveURL((url) => url.pathname === '/sign-in' && url.searchParams.get('next') === '/dashboard');
    expect(errors).toEqual([]);
  });
});

test.describe('keyboard only', () => {
  test('from the dashboard, Tab reaches the Train link and Enter opens Train', async ({ signedInPage: page }) => {
    await page.goto('/dashboard');
    await waitForPage(page);

    const train = mainNav(page).getByRole('link', { name: 'Train', exact: true });
    await tabUntilFocused(page, train);
    await expect(train).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard/train');
    await expect(page).toHaveTitle(`Train${TITLE_SUFFIX}`);
    await expect(train).toHaveAttribute('aria-current', 'page');
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
      await expect(page).toHaveURL((url) => url.pathname === route);
      await waitForPage(page);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`${TITLE_SUFFIX}$`));
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

test.describe('device status link', () => {
  test('the top bar device status reads Demo Mode and opens Connect', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await waitForPage(page);

    const status = topBar(page).getByRole('link', { name: /^Device: Demo Mode\b/ });
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
});

test.describe('consistent naming', () => {
  test('each navigation label is how the page it opens names itself', async ({ signedInPage: page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'Checked once, through the sidebar.');
    await page.goto('/dashboard');
    await waitForPage(page);
    const nav = mainNav(page);
    for (const item of [...PRIMARY_NAV.slice(1), ...SECONDARY_NAV]) {
      await test.step(item.label, async () => {
        await nav.getByRole('link', { name: item.label, exact: true }).click();
        await expect(page).toHaveURL((url) => url.pathname === item.path);
        await waitForPage(page);
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
