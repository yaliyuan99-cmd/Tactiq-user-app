/**
 * Playwright fixtures. `signedInPage` starts the app with a Demo Mode profile
 * and onboarding already done, by writing the same localStorage records the
 * app writes — so every spec starts on a real, working dashboard without
 * clicking through setup. `newUserPage` starts signed out with nothing stored.
 */
import { test as base, expect, type Page } from '@playwright/test';

export const DEMO_USER = {
  id: 'user_e2e',
  email: 'sam@example.com',
  displayName: 'Sam',
  createdAt: '2026-09-01T09:00:00.000Z',
};

export interface SeedOptions {
  readonly onboardingCompleted?: boolean;
  readonly signedIn?: boolean;
  readonly preferences?: Record<string, unknown>;
  /** Skip the Demo Mode sample history so counts are predictable. */
  readonly withoutSampleHistory?: boolean;
}

export async function seedStorage(page: Page, options: SeedOptions = {}): Promise<void> {
  const { onboardingCompleted = true, signedIn = true, preferences = {}, withoutSampleHistory = true } = options;
  await page.addInitScript(
    ({ user, onboardingCompleted, signedIn, preferences, withoutSampleHistory }) => {
      // Only seed on the very first load of this test, so reloads keep what the app saved.
      if (window.sessionStorage.getItem('e2e.seeded')) return;
      window.sessionStorage.setItem('e2e.seeded', '1');
      window.localStorage.clear();
      const prefs = {
        version: 1,
        theme: 'light',
        textSize: 'default',
        contrast: 'default',
        reducedMotion: true,
        audioAnnouncements: false,
        visualConfirmation: true,
        hapticFeedback: false,
        longerInteractionTime: false,
        hand: 'right',
        onboardingCompleted,
        onboardingStep: onboardingCompleted ? 7 : 0,
        ...preferences,
      };
      window.localStorage.setItem('tactiq.prefs', JSON.stringify(prefs));
      if (signedIn) {
        window.localStorage.setItem('tactiq.auth.accounts', JSON.stringify([user]));
        window.localStorage.setItem('tactiq.auth.session', JSON.stringify({ userId: user.id, signedInAt: user.createdAt }));
      }
      if (withoutSampleHistory) {
        window.localStorage.setItem('tactiq.history.seeded', JSON.stringify({ seededAt: user.createdAt, count: 0 }));
      }
    },
    { user: DEMO_USER, onboardingCompleted, signedIn, preferences, withoutSampleHistory },
  );
}

type Fixtures = { signedInPage: Page; newUserPage: Page };

export const test = base.extend<Fixtures>({
  signedInPage: async ({ page }, use) => {
    await seedStorage(page);
    await use(page);
  },
  newUserPage: async ({ page }, use) => {
    await seedStorage(page, { signedIn: false, onboardingCompleted: false });
    await use(page);
  },
});

export { expect };

/** Collects console errors and failed page loads so specs can assert none happened. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

export const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/connect',
  '/dashboard/calibrate',
  '/dashboard/train',
  '/dashboard/train/confirm_and_back',
  '/dashboard/simulator',
  '/dashboard/commands',
  '/dashboard/history',
  '/dashboard/settings',
  '/dashboard/help',
] as const;

export const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'] as const;
