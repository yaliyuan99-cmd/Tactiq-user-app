import { test, expect, trackConsoleErrors } from './fixtures';

test('signed-in user lands on the Home dashboard', async ({ signedInPage: page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Home · Tactiq');
  expect(errors).toEqual([]);
});

test('signed-out visitor is sent to sign-in', async ({ newUserPage: page }) => {
  await page.goto('/dashboard/simulator');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fsimulator/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});
