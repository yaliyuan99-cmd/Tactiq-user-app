/**
 * Playwright fixtures. `signedInPage` starts the app with a Demo Mode profile
 * and onboarding already done, by writing the same localStorage records the
 * app writes — so every spec starts on a real, working dashboard without
 * clicking through setup. `newUserPage` starts signed out with nothing stored.
 */
import { test as base, expect, type Page } from '@playwright/test';
import { ONBOARDING_LAST_STEP } from '../src/domain/onboarding';

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
    ({ user, onboardingCompleted, signedIn, preferences, withoutSampleHistory, lastStep }) => {
      // Only seed on the very first load of this test, so reloads keep what the app saved.
      if (window.sessionStorage.getItem('e2e.seeded')) return;
      window.sessionStorage.setItem('e2e.seeded', '1');
      window.localStorage.clear();

      // Preferences are stored in two halves, and seeding them as one object
      // is how a build from before profiles existed left them — which the app
      // treats as legacy data to be claimed, not as this profile's record.
      // Appearance describes the browser; the rest describes the person and
      // lives under that profile's prefix.
      const merged = {
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
        onboardingStep: onboardingCompleted ? lastStep : 0,
        ...preferences,
      } as Record<string, unknown>;

      const profileKey = (key: string) => `tactiq.u.${user.id}.${key}`;
      window.localStorage.setItem(
        'tactiq.prefs',
        JSON.stringify({
          version: 1,
          theme: merged.theme,
          textSize: merged.textSize,
          contrast: merged.contrast,
          reducedMotion: merged.reducedMotion,
        }),
      );
      window.localStorage.setItem(
        signedIn ? profileKey('prefs.profile') : 'tactiq.u.signed-out.prefs.profile',
        JSON.stringify({
          version: 1,
          audioAnnouncements: merged.audioAnnouncements,
          visualConfirmation: merged.visualConfirmation,
          hapticFeedback: merged.hapticFeedback,
          longerInteractionTime: merged.longerInteractionTime,
          hand: merged.hand,
          onboardingCompleted: merged.onboardingCompleted,
          onboardingStep: merged.onboardingStep,
        }),
      );

      if (signedIn) {
        window.localStorage.setItem('tactiq.auth.accounts', JSON.stringify([user]));
        window.localStorage.setItem('tactiq.auth.session', JSON.stringify({ userId: user.id, signedInAt: user.createdAt }));
      }
      if (withoutSampleHistory) {
        window.localStorage.setItem(
          signedIn ? profileKey('history.seeded') : 'tactiq.u.signed-out.history.seeded',
          JSON.stringify({ seededAt: user.createdAt, count: 0 }),
        );
      }
    },
    // Everything the init script needs has to be passed in: it is serialised
    // and run in the browser, where this module's imports do not exist.
    { user: DEMO_USER, onboardingCompleted, signedIn, preferences, withoutSampleHistory, lastStep: ONBOARDING_LAST_STEP },
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
