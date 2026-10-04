/**
 * Accessibility checks across the Tactiq user app.
 *
 *  1. axe (WCAG 2.0/2.1/2.2 A + AA) on every public, onboarding and dashboard
 *     route, and on dynamic states: the simulator after a squeeze and a tap,
 *     calibration mid-run, a lesson in practice, a dirty shortcut draft, an
 *     open ConfirmDialog and the mobile More dialog. Serious/critical fail;
 *     moderate/minor are recorded as `a11y-advisory` annotations.
 *  2. The dashboard routes again in dark, high-contrast and high-contrast dark.
 *  3. No horizontal overflow at 320×640, default and larger text.
 *  4. Reflow at 640×450 (200 % zoom of 1280×900) with the main nav reachable.
 *  5. 44×44 CSS px pointer targets on every dashboard route.
 *  6. A visible focus indicator on the first 15 tab stops.
 *  7. prefers-reduced-motion stops CSS animation on the simulator.
 *  8. One h1, lang="en", one main landmark; the hand drawing is hidden from AT
 *     while the real point buttons carry the point names.
 *
 * Labels and names come from the app source (see the file referenced beside
 * each one), never guesses.
 */
import type { Page } from '@playwright/test';
import { DASHBOARD_ROUTES, PUBLIC_ROUTES, expect, seedStorage, test, trackConsoleErrors } from './fixtures';
import {
  assertiveRegion,
  expectNoHorizontalOverflow,
  expectNoSeriousAxeViolations,
  findSmallTargets,
  politeRegion,
  readActiveFocusStyle,
  startAnimationSampler,
  stopAnimationSampler,
  waitForPageReady,
} from './helpers/a11y';

/** src/domain/onboarding.ts ONBOARDING_STEPS, in order. */
const ONBOARDING_STEP_TITLES = [
  'Welcome',
  'Accessibility preferences',
  'Which hand',
  'Demo Mode or a ring',
  'Calibration',
  'Feedback',
  'First lesson',
  'All set',
] as const;

/** src/domain/contacts.ts labels, anatomical order. */
const CONTACT_LABELS = [
  'Index fingertip',
  'Index finger base',
  'Middle fingertip',
  'Middle finger base',
  'Ring fingertip',
  'Ring finger base',
  'Pinky fingertip',
  'Pinky finger base',
] as const;

const THEMES = [
  { name: 'dark', preferences: { theme: 'dark' } },
  { name: 'high contrast', preferences: { contrast: 'high' } },
  { name: 'high contrast dark', preferences: { theme: 'dark', contrast: 'high' } },
] as const;

// axe scans of whole pages are CPU-heavy and the dev server is shared, so allow more than the default 45 s.
test.describe.configure({ timeout: 120_000 });

/** Announcements go through a timer and an animation frame; give them room on a busy machine. */
const ANNOUNCEMENT_TIMEOUT = 10_000;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A point button in the hand view ("Index fingertip, Confirm") or the list view ("Index fingertip — Confirm"). */
function pointButton(page: Page, label: string) {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}(,| —)`) });
}

async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageReady(page);
}

/**
 * On the simulator (free practice, seeded with Longer interaction time so the
 * 6 s window leaves room on a busy machine): squeeze, then tap Confirm on the
 * index fingertip. Both outcomes must reach the polite live region.
 */
async function squeezeAndTapConfirm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Squeeze the ring', exact: true }).click();
  await expect(politeRegion(page)).toContainText('Command window open for 6 seconds.', { timeout: ANNOUNCEMENT_TIMEOUT });
  await pointButton(page, 'Index fingertip').click();
  await expect(politeRegion(page)).toContainText('Confirm.', { timeout: ANNOUNCEMENT_TIMEOUT });
}

/** The visible target line in the "Your target" card (src/features/simulator/guided.ts describeTarget). */
const GUIDED_TARGET_LINE = /^(Confirm|Dismiss \/ Back|Undo|Next|Read \/ Repeat|Previous|Shortcut 1|Shortcut 2|Emergency) — /;

/**
 * Guided practice picks a random target. Presses "Skip" (as a user would)
 * until the target line matches `wanted`, checking each new target is announced.
 */
async function skipToGuidedTarget(page: Page, wanted: RegExp): Promise<void> {
  const card = page.getByRole('region', { name: 'Your target' });
  const line = card.getByText(GUIDED_TARGET_LINE);
  await expect(line).toBeVisible();
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const current = ((await line.textContent()) ?? '').trim();
    if (wanted.test(current)) return;
    await card.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(line).not.toHaveText(current);
    await expect(politeRegion(page)).toContainText('New target: ', { timeout: ANNOUNCEMENT_TIMEOUT });
  }
  throw new Error(`Guided practice never offered a target matching ${wanted} after 80 skips`);
}

/* ------------------------------------------------------------------ */
/* 1. axe: routes and dynamic states (light theme)                      */
/* ------------------------------------------------------------------ */

test.describe('axe — public routes (signed out)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`axe: ${route} has no serious or critical violations`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));
      await expectNoSeriousAxeViolations(page, `${route} (signed out)`);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('axe — onboarding (signed in, setup not finished)', () => {
  test('axe: /onboarding step 1 (Welcome) has no serious or critical violations', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/onboarding');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/onboarding step 1 (Welcome)');
    expect(errors).toEqual([]);
  });

  test('axe: /onboarding step 2 (Accessibility preferences) has no serious or critical violations', async ({ page }) => {
    await seedStorage(page, { onboardingCompleted: false });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/onboarding');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const heading = page.getByRole('heading', { level: 1, name: 'Accessibility preferences' });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(politeRegion(page)).toContainText('Step 2 of 8: Accessibility preferences.', { timeout: ANNOUNCEMENT_TIMEOUT });
    await expectNoSeriousAxeViolations(page, '/onboarding step 2 (Accessibility preferences)');
    expect(errors).toEqual([]);
  });
});

test.describe('axe — dashboard routes (light)', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`axe: ${route} has no serious or critical violations`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));
      await expectNoSeriousAxeViolations(page, `${route} (light)`);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('axe — dynamic states', () => {
  test('axe: simulator after a squeeze and a tap', async ({ page }) => {
    await seedStorage(page, { preferences: { longerInteractionTime: true } });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    await squeezeAndTapConfirm(page);
    await expect(page.getByRole('progressbar', { name: 'Command window time left' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/dashboard/simulator after squeeze + tap (window open, last result shown)');
    expect(errors).toEqual([]);
  });

  test('axe: calibrate page mid-run', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/calibrate');
    await page.getByRole('button', { name: 'Start calibration', exact: true }).click();
    await expect(politeRegion(page)).toContainText('Calibration started.', { timeout: ANNOUNCEMENT_TIMEOUT });
    const prompt = page.getByRole('heading', { level: 2, name: /^Tap your / });
    await expect(prompt).toBeFocused();
    const label = ((await prompt.textContent()) ?? '').replace(/^Tap your /, '').trim();
    expect(CONTACT_LABELS).toContain(label);
    // The page opens the command window for the user; tap once it is open.
    await expect(page.getByText(/^Command window open ·/)).toBeVisible();
    await pointButton(page, label).click();
    await expect(politeRegion(page)).toContainText(`Got it. 1 of 3 on the ${label.toLowerCase()}.`, { timeout: ANNOUNCEMENT_TIMEOUT });
    await expect(page.getByRole('progressbar', { name: 'Calibration progress' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/dashboard/calibrate mid-run (1 of 24 taps)');
    expect(errors).toEqual([]);
  });

  test('axe: lesson in its practice phase', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/train/confirm_and_back');
    await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
    const step = page.getByRole('heading', { name: /^Step 1 of 5: Squeeze, then tap the index fingertip for Confirm\./ });
    await expect(step).toBeVisible();
    await expect(step).toBeFocused();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/dashboard/train/confirm_and_back in practice phase');
    expect(errors).toEqual([]);
  });

  test('axe: commands page with a dirty shortcut draft', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/commands');
    const slot = page.getByRole('group', { name: 'Shortcut 1 — pinky fingertip, brief tap' });
    await slot.getByRole('radio', { name: 'Toggle the flashlight' }).check();
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard changes' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/dashboard/commands with an unsaved shortcut draft');
    expect(errors).toEqual([]);
  });

  test('axe: History "Clear all activity" ConfirmDialog open', async ({ page }) => {
    await seedStorage(page, { withoutSampleHistory: false });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/history');
    await page.getByRole('button', { name: 'Clear all activity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear all activity?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Type “clear” to confirm' })).toBeFocused();
    await expectNoSeriousAxeViolations(page, '/dashboard/history with the Clear all activity dialog open');
    expect(errors).toEqual([]);
  });

  test('axe: More dialog on mobile', async ({ signedInPage: page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'The More dialog only exists below the lg breakpoint.');
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'More' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('navigation', { name: 'More destinations' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, '/dashboard with the More dialog open (mobile)');
    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 2. axe: dashboard routes in dark / high contrast / both              */
/* ------------------------------------------------------------------ */

for (const theme of THEMES) {
  test.describe(`axe — dashboard routes (${theme.name})`, () => {
    for (const route of DASHBOARD_ROUTES) {
      test(`axe (${theme.name}): ${route} has no serious or critical violations, colour contrast included`, async ({ page }) => {
        await seedStorage(page, { preferences: theme.preferences });
        const errors = trackConsoleErrors(page);
        await gotoReady(page, route);
        const html = page.locator('html');
        if ('theme' in theme.preferences) await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
        else await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
        if ('contrast' in theme.preferences) await expect(html).toHaveAttribute('data-contrast', 'high');
        else await expect(html).not.toHaveAttribute('data-contrast', 'high');
        await expectNoSeriousAxeViolations(page, `${route} (${theme.name})`);
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('axe — pages with Demo Mode sample history, all four themes', () => {
  const allThemes = [{ name: 'light', preferences: {} }, ...THEMES] as const;
  for (const theme of allThemes) {
    for (const route of ['/dashboard', '/dashboard/history'] as const) {
      test(`axe (${theme.name}, sample history): ${route} has no serious or critical violations`, async ({ page }) => {
        await seedStorage(page, { withoutSampleHistory: false, preferences: theme.preferences });
        const errors = trackConsoleErrors(page);
        await gotoReady(page, route);
        if (route === '/dashboard/history') {
          // Filters and the data section only render once there is activity.
          await expect(page.getByRole('button', { name: 'Clear all activity' })).toBeVisible();
        }
        await expectNoSeriousAxeViolations(page, `${route} with sample history (${theme.name})`);
        expect(errors).toEqual([]);
      });
    }
  }
});

/* ------------------------------------------------------------------ */
/* 3. No horizontal overflow at 320×640                                 */
/* ------------------------------------------------------------------ */

const TEXT_SIZES = ['default', 'larger'] as const;

test.describe('reflow at 320×640', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const textSize of TEXT_SIZES) {
    for (const route of PUBLIC_ROUTES) {
      test(`no horizontal overflow (${textSize} text): ${route}`, async ({ page }) => {
        await seedStorage(page, { signedIn: false, onboardingCompleted: false, preferences: { textSize } });
        const errors = trackConsoleErrors(page);
        await gotoReady(page, route);
        await expectNoHorizontalOverflow(page, `${route} at 320×640, ${textSize} text`);
        expect(errors).toEqual([]);
      });
    }

    ONBOARDING_STEP_TITLES.forEach((title, index) => {
      test(`no horizontal overflow (${textSize} text): /onboarding step ${index + 1} (${title})`, async ({ page }) => {
        await seedStorage(page, { onboardingCompleted: false, preferences: { textSize, onboardingStep: index } });
        const errors = trackConsoleErrors(page);
        await gotoReady(page, '/onboarding');
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
        await expectNoHorizontalOverflow(page, `/onboarding step ${index + 1} (${title}) at 320×640, ${textSize} text`);
        expect(errors).toEqual([]);
      });
    });

    for (const route of DASHBOARD_ROUTES) {
      test(`no horizontal overflow (${textSize} text): ${route}`, async ({ page }) => {
        test.fixme(
          textSize === 'larger' && route === '/dashboard/settings',
          'FINDING: Settings page scrolls horizontally at 320 px with Larger text',
        );
        await seedStorage(page, { preferences: { textSize } });
        const errors = trackConsoleErrors(page);
        await gotoReady(page, route);
        if (textSize === 'larger') await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger');
        // Guided practice starts on a random target; start from a fixed command so the result is repeatable.
        // Shortcut targets are covered by their own test below.
        if (route === '/dashboard/simulator') await skipToGuidedTarget(page, /^(?!Shortcut)/);
        await expectNoHorizontalOverflow(page, `${route} at 320×640, ${textSize} text`);
        expect(errors).toEqual([]);
      });
    }

    test(`no horizontal overflow (${textSize} text): /dashboard/simulator with a Shortcut 1 or Shortcut 2 guided target`, async ({ page }) => {
      test.fixme(textSize === 'larger', 'FINDING: Simulator overflows at 320 px with Larger text when the guided target is a shortcut');
      await seedStorage(page, { preferences: { textSize } });
      const errors = trackConsoleErrors(page);
      await gotoReady(page, '/dashboard/simulator');
      for (const shortcut of ['Shortcut 1', 'Shortcut 2']) {
        await skipToGuidedTarget(page, new RegExp(`^${shortcut} — `));
        await expect(pointButton(page, shortcut === 'Shortcut 1' ? 'Pinky fingertip' : 'Pinky finger base')).toHaveAccessibleName(/, target$/);
        await expectNoHorizontalOverflow(page, `/dashboard/simulator (guided target ${shortcut}) at 320×640, ${textSize} text`);
      }
      expect(errors).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */
/* 4. Reflow at 200 % zoom (640×450), desktop project                   */
/* ------------------------------------------------------------------ */

test.describe('reflow at 640×450 (200% zoom)', () => {
  test.use({ viewport: { width: 640, height: 450 } });

  for (const route of DASHBOARD_ROUTES) {
    test(`200% zoom: ${route} does not overflow and the main nav stays reachable`, async ({ signedInPage: page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Zoom reflow is checked on the desktop project.');
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      await expectNoHorizontalOverflow(page, `${route} at 640×450`);

      const nav = page.getByRole('navigation', { name: 'Main' });
      await expect(nav).toHaveCount(1);
      await expect(nav).toBeVisible();
      await expect(nav).toBeInViewport({ ratio: 1 });
      for (const label of ['Home', 'Train', 'Simulator', 'Commands', 'Settings']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeInViewport({ ratio: 1 });
      }
      await expect(page.getByRole('button', { name: 'More', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('200% zoom: every More destination and Sign out can be reached in the More dialog', async ({ signedInPage: page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Zoom reflow is checked on the desktop project.');
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'More' });
    await expect(dialog).toBeVisible();
    await expectNoHorizontalOverflow(page, '/dashboard More dialog at 640×450');
    for (const label of ['Connect', 'Calibrate', 'History', 'Help']) {
      const link = dialog.getByRole('link', { name: label, exact: true });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport({ ratio: 1 });
    }
    const signOut = dialog.getByRole('button', { name: /^Sign out/ });
    await signOut.scrollIntoViewIfNeeded();
    await expect(signOut).toBeInViewport({ ratio: 1 });
    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Target size                                                       */
/* ------------------------------------------------------------------ */

test.describe('target size 44×44', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`targets in main and nav are at least 44×44 CSS px: ${route}`, async ({ signedInPage: page }, testInfo) => {
      test.fixme(
        route === '/dashboard/simulator' && testInfo.project.name === 'desktop-chromium',
        'FINDING: CheckboxField pointer target is 21×21 px plus a 23 px-tall label; its 44 px wrapper is not clickable',
      );
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      const offenders = await findSmallTargets(page);
      expect(
        offenders.map((o) => `${o.role} "${o.name}" ${o.width}×${o.height}`),
        `Pointer targets under 44×44 CSS px on ${route}`,
      ).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */
/* 6. Focus visibility                                                  */
/* ------------------------------------------------------------------ */

test.describe('focus visibility', () => {
  for (const route of ['/dashboard', '/dashboard/simulator'] as const) {
    test(`the first 15 tab stops on ${route} show a focus indicator`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      const missing: string[] = [];
      const visited: string[] = [];
      for (let i = 0; i < 15; i += 1) {
        await page.keyboard.press('Tab');
        const focus = await readActiveFocusStyle(page);
        expect(focus, `Tab ${i + 1} on ${route} left focus on the document body`).not.toBeNull();
        if (!focus) continue;
        visited.push(focus.description);
        const outlined = focus.outlineStyle !== 'none' && parseFloat(focus.outlineWidth) > 0;
        const shadowed = focus.boxShadow !== 'none' && focus.boxShadow !== '';
        if (!outlined && !shadowed) {
          missing.push(
            `Tab ${i + 1}: ${focus.description}${focus.fromLabel ? ' (read from its label)' : ''} — outline ${focus.outlineStyle} ${focus.outlineWidth}, box-shadow ${focus.boxShadow}`,
          );
        }
      }
      expect(visited).toHaveLength(15);
      expect(missing, `Focused elements without a visible focus indicator on ${route}`).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

/**
 * WCAG 2.4.11 Focus Not Obscured (Minimum): as the keyboard moves through the
 * first 15 tab stops, no focused control may end up completely hidden behind
 * the fixed bottom "Main" navigation or the sticky top bar.
 */
async function collectObscuredFocus(page: Page, route: string, stops = 15): Promise<string[]> {
  const obscured: string[] = [];
  for (let i = 0; i < stops; i += 1) {
    await page.keyboard.press('Tab');
    const focus = await readActiveFocusStyle(page);
    expect(focus, `Tab ${i + 1} on ${route} left focus on the document body`).not.toBeNull();
    if (focus?.obscuredBy) {
      obscured.push(
        `Tab ${i + 1}: ${focus.description} at y=${focus.box.top}–${focus.box.bottom} of ${focus.box.viewportHeight} is hidden by ${focus.obscuredBy}`,
      );
    }
  }
  return obscured;
}

test.describe('focus not obscured', () => {
  for (const route of ['/dashboard', '/dashboard/simulator'] as const) {
    test(`the first 15 tab stops on ${route} are not hidden behind the fixed navigation or top bar`, async ({ signedInPage: page }, testInfo) => {
      test.fixme(
        testInfo.project.name === 'mobile-chromium',
        'FINDING: Keyboard focus is hidden behind the fixed bottom navigation below the lg breakpoint',
      );
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      const obscured = await collectObscuredFocus(page, route);
      expect(obscured, `Focused controls completely hidden on ${route}`).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('focus not obscured at 640×450 (200% zoom)', () => {
  test.use({ viewport: { width: 640, height: 450 } });

  for (const route of ['/dashboard', '/dashboard/simulator'] as const) {
    test(`200% zoom: the first 15 tab stops on ${route} are not hidden behind the fixed navigation or top bar`, async ({ signedInPage: page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Zoom reflow is checked on the desktop project.');
      test.fixme(true, 'FINDING: Keyboard focus is hidden behind the fixed bottom navigation below the lg breakpoint');
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      const obscured = await collectObscuredFocus(page, route);
      expect(obscured, `Focused controls completely hidden on ${route} at 640×450`).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */
/* 7. Reduced motion                                                    */
/* ------------------------------------------------------------------ */

test.describe('reduced motion', () => {
  test('the animation probe sees the contact flash when motion is allowed (control)', async ({ page }) => {
    await seedStorage(page, { preferences: { reducedMotion: false, longerInteractionTime: true } });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    await startAnimationSampler(page);
    await squeezeAndTapConfirm(page);
    const found = await stopAnimationSampler(page);
    expect(found.map((a) => a.name)).toContain('contact-flash');
    expect(errors).toEqual([]);
  });

  test('with prefers-reduced-motion: reduce, no CSS animation longer than 0.01 s runs on the simulator after a tap', async ({ page }) => {
    // The app-level setting is off, so only the operating-system preference is in play.
    await seedStorage(page, { preferences: { reducedMotion: false, longerInteractionTime: true } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    await expect(page.locator('html')).not.toHaveClass(/force-reduced-motion/);
    await startAnimationSampler(page);
    await squeezeAndTapConfirm(page);
    const found = await stopAnimationSampler(page);
    expect(
      found.map((a) => `${a.kind} ${a.name} ${a.durationMs}ms on ${a.element}`),
      'Running CSS animations or transitions longer than 0.01 s with reduced motion',
    ).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('with the app Reduce motion setting on, no CSS animation longer than 0.01 s runs on the simulator after a tap', async ({ page }) => {
    await seedStorage(page, { preferences: { reducedMotion: true, longerInteractionTime: true } });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    await expect(page.locator('html')).toHaveClass(/force-reduced-motion/);
    await startAnimationSampler(page);
    await squeezeAndTapConfirm(page);
    const found = await stopAnimationSampler(page);
    expect(
      found.map((a) => `${a.kind} ${a.name} ${a.durationMs}ms on ${a.element}`),
      'Running CSS animations or transitions longer than 0.01 s with the Reduce motion setting',
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 8. Document structure and the hand map                               */
/* ------------------------------------------------------------------ */

async function expectPageStructure(page: Page, context: string): Promise<void> {
  await expect(page.locator('html'), `lang on ${context}`).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1'), `exactly one h1 element on ${context}`).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 }), `exactly one level-1 heading on ${context}`).toHaveCount(1);
  await expect(page.getByRole('main'), `exactly one main landmark on ${context}`).toHaveCount(1);
}

test.describe('document structure', () => {
  for (const route of [...PUBLIC_ROUTES, '/this-page-does-not-exist']) {
    test(`one h1, lang="en" and one main landmark: ${route} (signed out)`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      await expectPageStructure(page, `${route} (signed out)`);
      expect(errors).toEqual([]);
    });
  }

  ONBOARDING_STEP_TITLES.forEach((title, index) => {
    test(`one h1, lang="en" and one main landmark: /onboarding step ${index + 1} (${title})`, async ({ page }) => {
      await seedStorage(page, { onboardingCompleted: false, preferences: { onboardingStep: index } });
      const errors = trackConsoleErrors(page);
      await gotoReady(page, '/onboarding');
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expectPageStructure(page, `/onboarding step ${index + 1}`);
      expect(errors).toEqual([]);
    });
  });

  for (const route of [...DASHBOARD_ROUTES, '/dashboard/this-page-does-not-exist']) {
    test(`one h1, lang="en" and one main landmark: ${route}`, async ({ signedInPage: page }) => {
      const errors = trackConsoleErrors(page);
      await gotoReady(page, route);
      await expectPageStructure(page, route);
      expect(errors).toEqual([]);
    });
  }

  test('simulator hand map: the drawing is aria-hidden and the eight real buttons carry the point names', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    // Narrow screens start in the list view; the hand drawing is one radio away.
    await page.getByRole('radio', { name: 'Hand view' }).check();
    const figure = page.getByRole('figure', { name: 'Right hand contact map' });
    await expect(figure).toBeVisible();

    const drawing = figure.locator('svg').first();
    await expect(drawing).toHaveAttribute('aria-hidden', 'true');
    await expect(drawing).toHaveAttribute('focusable', 'false');
    // Nothing inside the drawing is exposed: no image role and no graphic names.
    await expect(figure.getByRole('img')).toHaveCount(0);

    const buttons = figure.getByRole('button');
    await expect(buttons).toHaveCount(8);
    const expected = [
      'Index fingertip, Confirm',
      'Index finger base, Dismiss / Back',
      'Middle fingertip, Undo',
      'Middle finger base, Next',
      'Ring fingertip, Read / Repeat',
      'Ring finger base, Previous',
      'Pinky fingertip, Shortcut 1: Play or pause media, or hold five seconds for Emergency',
      'Pinky finger base, Shortcut 2: Announce the time',
    ];
    for (const name of expected) {
      const button = figure.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, `bounding box of "${name}"`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    // The two-letter abbreviations are decoration, not part of any button name.
    await expect(figure.getByRole('button', { name: /^(IT|IB|MT|MB|RT|RB|PT|PB)\b/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('commands hand map: decorative drawing and points are aria-hidden and the point names are in a text list', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/commands');
    const figure = page.getByRole('figure', { name: /^Right hand, palm facing you\. Letters name each point/ });
    await expect(figure).toBeVisible();
    const drawing = figure.locator('svg').first();
    await expect(drawing).toHaveAttribute('aria-hidden', 'true');
    await expect(drawing).toHaveAttribute('focusable', 'false');
    // Decorative map: no buttons, and nothing focusable inside the figure.
    await expect(figure.getByRole('button')).toHaveCount(0);
    await expect(figure.getByRole('img')).toHaveCount(0);
    // The eight point names are exposed as a text list (visually hidden), in anatomical order.
    const pointList = figure.getByRole('list').filter({ hasText: 'Index finger base' });
    await expect(pointList).toHaveCount(1);
    const items = pointList.getByRole('listitem');
    await expect(items).toHaveCount(8);
    for (const [index, label] of CONTACT_LABELS.entries()) {
      await expect(items.nth(index)).toContainText(label);
    }
    expect(errors).toEqual([]);
  });

  test('a tap while the ring is asleep is announced in the assertive region, not as a command', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, '/dashboard/simulator?mode=free');
    await pointButton(page, 'Index fingertip').click();
    await expect(assertiveRegion(page)).toHaveText('The ring is asleep. Squeeze first, then tap.', { timeout: ANNOUNCEMENT_TIMEOUT });
    await expect(politeRegion(page)).not.toContainText('Confirm.');
    expect(errors).toEqual([]);
  });
});
