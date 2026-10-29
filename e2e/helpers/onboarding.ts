/**
 * Helpers for the sign-up, sign-in and onboarding specs. Every locator uses the
 * accessible names from the source (src/features/auth, src/features/onboarding),
 * never CSS classes or test ids.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { ONBOARDING_STEPS } from '../../src/domain/onboarding';

/**
 * Titles of the onboarding steps, in order. Taken from the domain rather than
 * copied, so a step added or renamed there cannot leave these specs asserting
 * a flow the app no longer has — which is exactly what happened when setup was
 * shortened from eight steps to four.
 */
export const STEP_TITLES = ONBOARDING_STEPS.map((step) => step.title);

export const STEP_COUNT = STEP_TITLES.length;

/** The polite live region rendered by FeedbackProvider. */
export function politeAnnouncer(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=status]');
}

/** The assertive live region rendered by FeedbackProvider. */
export function assertiveAnnouncer(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=alert]');
}

declare global {
  interface Window {
    __e2eAnnouncements?: string[];
  }
}

/**
 * Records every text the FeedbackProvider writes into its live regions, so a
 * spec can check an announcement that a later one (such as the route title)
 * replaces a moment afterwards. Call before the first navigation. The log is
 * per page load.
 */
export async function recordAnnouncements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__e2eAnnouncements = [];
    const record = (node: Node | null) => {
      const element = node instanceof Element ? node : node?.parentElement;
      const region = element?.closest('[data-live-announcer] [role]');
      const text = region?.textContent?.trim();
      if (text) window.__e2eAnnouncements?.push(text);
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) record(mutation.target);
    });
    const start = () => observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  });
}

/** Everything announced since this page load (see recordAnnouncements). */
export async function announcements(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__e2eAnnouncements ?? []);
}

/** Waits until an announcement containing `text` has been made since this page load. */
export async function expectAnnounced(page: Page, text: string): Promise<void> {
  await expect
    .poll(async () => (await announcements(page)).some((message) => message.includes(text)), {
      message: `expected an announcement containing "${text}"`,
    })
    .toBe(true);
}

/** Asserts the onboarding page shows step `n` (1-based): URL, h1, progress bar value and visible progress text. */
export async function expectOnboardingStep(page: Page, n: number): Promise<void> {
  const title = STEP_TITLES[n - 1];
  if (!title) throw new Error(`There is no onboarding step ${n}`);
  const progress = `Step ${n} of ${STEP_COUNT} — ${title}`;
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute('aria-valuetext', progress);
  await expect(page.getByText(progress, { exact: true })).toBeVisible();
}

/** The step's primary action ("Continue", "Calibrate after setup" or "Go to the dashboard"). */
export function continueButton(page: Page, label = 'Continue'): Locator {
  return page.getByRole('button', { name: label, exact: true });
}

export interface NewProfile {
  readonly name: string;
  readonly email: string;
}

/** Signs up in Demo Mode from /sign-up and waits for step 1 of onboarding. */
export async function createDemoProfile(page: Page, profile: NewProfile): Promise<void> {
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name' }).fill(profile.name);
  await page.getByRole('textbox', { name: 'Email' }).fill(profile.email);
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expectOnboardingStep(page, 1);
}

/** True below the lg breakpoint, where the sidebar is replaced by the bottom bar and the More menu. */
export function isNarrow(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 1024;
}

/** Matches the dashboard h1 greeting for a first name, e.g. "Good morning, Robin". */
export function greeting(firstName: string): RegExp {
  return new RegExp(`^Good (morning|afternoon|evening), ${firstName}$`);
}
