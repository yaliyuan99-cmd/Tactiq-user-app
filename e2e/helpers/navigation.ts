/**
 * Shared data and small helpers for the navigation spec. Labels, paths and
 * document titles are taken from the app source (src/app/shell/navItems.ts and
 * each page's usePageTitle call), never guessed.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

export interface NavDestination {
  /** Accessible name of the navigation link. */
  readonly label: string;
  readonly path: string;
  /** The page's document title without the " · Tactiq" suffix. */
  readonly title: string;
}

/** Bottom bar (mobile) and first sidebar group (desktop). */
export const PRIMARY_NAV: readonly NavDestination[] = [
  { label: 'Home', path: '/dashboard', title: 'Home' },
  { label: 'Train', path: '/dashboard/train', title: 'Train' },
  { label: 'Simulator', path: '/dashboard/simulator', title: 'Simulator' },
  { label: 'Commands', path: '/dashboard/commands', title: 'Commands and shortcuts' },
  { label: 'Settings', path: '/dashboard/settings', title: 'Settings' },
];

/** Sidebar "More" group (desktop) and the More dialog (mobile). */
export const SECONDARY_NAV: readonly NavDestination[] = [
  { label: 'Connect', path: '/dashboard/connect', title: 'Connect your ring' },
  { label: 'Calibrate', path: '/dashboard/calibrate', title: 'Calibrate' },
  { label: 'History', path: '/dashboard/history', title: 'Activity' },
  { label: 'Help', path: '/dashboard/help', title: 'Help' },
];

export const TITLE_SUFFIX = ' · Tactiq';

export const DESKTOP_PROJECT = 'desktop-chromium';
export const MOBILE_PROJECT = 'mobile-chromium';

/** The polite live region rendered by FeedbackProvider. */
export function politeRegion(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=status]');
}

/** The single visible "Main" navigation (sidebar on desktop, bottom bar on mobile). */
export function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main' });
}

/** The app top bar (the only banner landmark on dashboard pages). */
export function topBar(page: Page): Locator {
  return page.getByRole('banner');
}

/** Waits until the routed page has rendered its h1 (lazy chunks load behind a "Loading…" status). */
export async function waitForPage(page: Page): Promise<void> {
  // The dev server is shared, so a first-time chunk transform can take longer than the default 5 s.
  await expect(page.locator('#page-title')).toBeVisible({ timeout: 15_000 });
}

/** Path + search + hash of the current page URL. */
export function currentPath(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Presses Tab until `target` has focus, up to `maxPresses` times. Returns the
 * number of presses used; the caller asserts focus afterwards.
 */
export async function tabUntilFocused(page: Page, target: Locator, maxPresses = 80): Promise<number> {
  for (let presses = 1; presses <= maxPresses; presses += 1) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluate((el) => el === document.activeElement).catch(() => false);
    if (focused) return presses;
  }
  return maxPresses;
}

export interface ObscuredFocus {
  readonly name: string;
  readonly tag: string;
  readonly top: number;
  readonly bottom: number;
  readonly coverTop: number;
  readonly coverBottom: number;
}

/**
 * Moves keyboard focus through every focusable element inside the main
 * landmark (Tab forwards from the h1, or Shift+Tab backwards from the last
 * element) and returns each focused element whose visible part lies entirely
 * behind `cover` (a sticky or fixed bar), i.e. WCAG 2.4.11 failures.
 */
export async function findFocusHiddenBehind(
  page: Page,
  cover: Locator,
  direction: 'forward' | 'backward',
  maxPresses = 400,
): Promise<ObscuredFocus[]> {
  const focusInMain = () => page.evaluate(() => Boolean(document.activeElement?.closest('#main-content')));
  await page.locator('#page-title').focus();
  if (direction === 'backward') {
    // Walk to the end of main first; the next Shift+Tab lands back on its last control.
    for (let i = 0; i < maxPresses && (await focusInMain()); i += 1) await page.keyboard.press('Tab');
  }
  const key = direction === 'forward' ? 'Tab' : 'Shift+Tab';
  const hidden: ObscuredFocus[] = [];
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press(key);
    if (!(await focusInMain())) break;
    const result = await cover.evaluate((bar) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, window.innerHeight);
      if (rect.width === 0 || visibleBottom <= visibleTop) return null;
      const covered = visibleTop >= barRect.top - 0.5 && visibleBottom <= barRect.bottom + 0.5;
      if (!covered) return null;
      return {
        name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 60),
        tag: el.tagName.toLowerCase(),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        coverTop: Math.round(barRect.top),
        coverBottom: Math.round(barRect.bottom),
      };
    });
    if (result) hidden.push(result);
  }
  return hidden;
}
