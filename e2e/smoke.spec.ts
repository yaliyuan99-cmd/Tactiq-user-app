/**
 * The app's entry points, smoke level: the public product page at "/", the
 * signed-in dashboard, and the guard that sends a signed-out visitor to
 * sign-in. Each one has to paint its own h1 and title with a clean console;
 * the detail of every screen belongs to the other specs.
 */
import { test, expect, trackConsoleErrors, DEMO_USER } from './fixtures';

/** The dashboard h1 greets by local time, so the hour must not decide the result. */
const GREETING = new RegExp(`^Good (morning|afternoon|evening), ${DEMO_USER.displayName}$`);

test('a visitor gets the public product page at "/"', async ({ newUserPage: page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');
  // "/" is the product page itself now, so a visitor with no account stays on
  // it instead of being sent to sign-in; the app lives under /dashboard.
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Tactiq');
  // Signed out, the banner offers the two ways in rather than the dashboard.
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Get started' })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Open dashboard' })).toBeHidden();
  expect(errors).toEqual([]);
});

test('signed-in user lands on the Home dashboard', async ({ signedInPage: page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/dashboard');
  // Naming the heading proves the seeded profile was claimed, rather than only
  // that some h1 arrived. The allowance is for the dev server, which transforms
  // this route's chunk on the first request that asks for it.
  await expect(page.getByRole('heading', { level: 1, name: GREETING })).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle('Home · Tactiq');
  expect(errors).toEqual([]);
});

test('signed-out visitor is sent to sign-in', async ({ newUserPage: page }) => {
  await page.goto('/dashboard/simulator');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fsimulator/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});
