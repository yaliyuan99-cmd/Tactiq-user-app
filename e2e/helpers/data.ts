/**
 * Helpers for the data screens spec (Commands, History, Settings, Connect,
 * Dashboard, Help). Everything here drives the app the way a user would, or
 * seeds localStorage records shaped exactly like the app's own.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** The polite live region rendered by FeedbackProvider. */
export function politeAnnouncer(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=status]');
}

/** The assertive live region rendered by FeedbackProvider. */
export function assertiveAnnouncer(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=alert]');
}

/** A stored activity record, shaped like GestureEvent in src/domain/models.ts. */
export interface SeedGestureEvent {
  readonly id: string;
  /** Minutes before the moment the page seeds storage. */
  readonly minutesAgo: number;
  readonly source: 'simulator' | 'training' | 'calibration' | 'device';
  readonly mode: 'guided' | 'free' | 'lesson' | 'calibration' | 'device';
  readonly targetContact: string | null;
  readonly targetToken?: string;
  readonly detectedContact: string | null;
  readonly token: string | null;
  readonly durationMs: number | null;
  readonly outcome: 'recognised' | 'mismatch' | 'rejected_duration' | 'window_closed' | 'emergency' | 'emergency_cancelled';
  readonly evidence: 'simulated' | 'measured';
  readonly seeded: boolean;
}

const DAY_MINUTES = 24 * 60;

/**
 * Three of the user's own records:
 * - today: free practice in the simulator, Confirm recognised;
 * - three days ago: a lesson attempt at Next;
 * - thirty days ago: calibration of the ring fingertip (Read / Repeat).
 */
export const THREE_EVENTS: readonly SeedGestureEvent[] = [
  {
    id: 'evt_e2e_old_calibration',
    minutesAgo: 30 * DAY_MINUTES,
    source: 'calibration',
    mode: 'calibration',
    targetContact: 'ring_tip',
    detectedContact: 'ring_tip',
    token: 'read',
    durationMs: 140,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
  },
  {
    id: 'evt_e2e_lesson_next',
    minutesAgo: 3 * DAY_MINUTES,
    source: 'training',
    mode: 'lesson',
    targetContact: 'middle_base',
    targetToken: 'next',
    detectedContact: 'middle_base',
    token: 'next',
    durationMs: 180,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
  },
  {
    id: 'evt_e2e_today_confirm',
    // "Now" at seed time is always inside today.
    minutesAgo: 0,
    source: 'simulator',
    mode: 'free',
    targetContact: null,
    detectedContact: 'index_tip',
    token: 'confirm',
    durationMs: 120,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
  },
];

/**
 * Writes `tactiq.history` on the first load of the test only. Register it after
 * seedStorage (the signedInPage fixture already has), so it runs after the
 * storage reset.
 */
export async function seedHistory(page: Page, events: readonly SeedGestureEvent[]): Promise<void> {
  await page.addInitScript((records) => {
    if (window.sessionStorage.getItem('e2e.history.seeded')) return;
    window.sessionStorage.setItem('e2e.history.seeded', '1');
    const now = Date.now();
    const stored = records
      .map(({ minutesAgo, ...rest }) => ({ ...rest, at: new Date(now - minutesAgo * 60_000).toISOString() }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    window.localStorage.setItem('tactiq.history', JSON.stringify(stored));
  }, events as SeedGestureEvent[]);
}

/** "YYYY-MM-DD" for the browser's local calendar date, as the app names its downloads. */
export async function browserLocalDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

/**
 * A contact point on the practice surface. The hand view names a point
 * "Pinky fingertip, Shortcut 1: …"; the list view (narrow screens) names it
 * "Pinky fingertip — Shortcut 1: …". Both start with the contact label.
 */
export function contactButton(page: Page, contactLabel: string): Locator {
  const escaped = contactLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole('main').getByRole('button', { name: new RegExp(`^${escaped}(,| —)`) });
}

/** Switches the simulator to Free practice with the Practice mode radios. */
export async function chooseFreePractice(page: Page): Promise<void> {
  const free = page.getByRole('group', { name: 'Practice mode' }).getByRole('radio', { name: 'Free practice' });
  await free.click();
  await expect(free).toBeChecked();
  await expect(page).toHaveURL(/[?&]mode=free/);
}

/**
 * Squeezes the simulated ring and waits until the command window opening is
 * announced. `seconds` is the window the announcement should name.
 */
export async function squeezeRing(page: Page, seconds = 3): Promise<void> {
  await page.getByRole('button', { name: 'Squeeze the ring', exact: true }).click();
  await expect(politeAnnouncer(page)).toContainText(`Command window open for ${seconds} seconds.`);
}

/** Keys in localStorage that belong to Tactiq. */
export async function tactiqStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('tactiq.')));
}

/** How long a lazily loaded route may take on the shared dev server. */
const PAGE_LOAD_TIMEOUT = 20_000;

/** Waits until the routed page has rendered its h1 and no "Loading…" status remains. */
export async function waitForPage(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0, { timeout: PAGE_LOAD_TIMEOUT });
}

/** Opens a route and waits for its page to render. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPage(page);
}

/** Reloads and waits for the page to render again. */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload();
  await waitForPage(page);
}
