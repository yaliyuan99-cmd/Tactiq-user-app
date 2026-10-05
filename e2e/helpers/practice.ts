/**
 * Helpers for the practice specs (Simulator, Train, Calibrate). Everything is
 * located by role and accessible name, the way a screen-reader user finds it.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

/** The polite live region rendered by FeedbackProvider. */
export function politeRegion(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=status]');
}

/** The assertive live region rendered by FeedbackProvider. */
export function assertiveRegion(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=alert]');
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A command name as it is announced. The visible labels keep the slash
 * ("Dismiss / Back"), but every announcement uses the command's spokenLabel,
 * which spells the slash out so a screen reader does not read "slash".
 */
export function spokenCommand(label: string): string {
  return label.replace(/ \/ /g, ' or ');
}

/**
 * Chooses Free or Guided practice. The mode lives in the URL, so the radio is
 * only checked once that navigation has landed; check() asserts the new state
 * in the same tick and reports "did not change its state", so the choice is
 * made with a click and then awaited.
 */
export async function choosePracticeMode(page: Page, mode: 'Free practice' | 'Guided practice'): Promise<void> {
  const radio = page.getByRole('radio', { name: mode });
  await radio.click();
  await expect(radio).toBeChecked();
}

/**
 * A contact-point button by its contact label. The hand view names points
 * "Middle finger base, Next" and the list view "Middle finger base — Next";
 * both start with the contact label.
 */
export function contactButton(scope: Page | Locator, contactLabel: string): Locator {
  return scope.getByRole('button', { name: new RegExp(`^${escapeRegExp(contactLabel)}(,| —)`) });
}

export async function choosePracticeView(page: Page, view: 'Hand view' | 'List view'): Promise<void> {
  const radio = page.getByRole('radio', { name: view });
  await radio.check();
  await expect(radio).toBeChecked();
}

/** The countdown only exists while the command window is open. */
export function commandWindowTimer(page: Page): Locator {
  return page.getByRole('progressbar', { name: 'Command window time left' });
}

/** Presses "Squeeze the ring" and waits until the command window is open (the gate arms 150 ms later). */
export async function squeezeAndWaitForWindow(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Squeeze the ring' }).click();
  await expect(commandWindowTimer(page)).toBeVisible();
}

/** Presses Tab until `target` has focus. Fails if it is not reached within `maxTabs` presses. */
export async function tabUntilFocused(page: Page, target: Locator, maxTabs = 80): Promise<number> {
  for (let presses = 1; presses <= maxTabs; presses += 1) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluate((element) => element === document.activeElement).catch(() => false);
    if (focused) return presses;
  }
  throw new Error(`Focus did not reach the target within ${maxTabs} Tab presses.`);
}

/** "middle finger base" → "Middle finger base"; drops the ", brief tap" hint the guided prompt adds. */
export function contactLabelFromPhrase(phrase: string): string {
  const cleaned = phrase.replace(/, brief tap$/, '').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export const CONTACT_LABELS = [
  'Index fingertip',
  'Index finger base',
  'Middle fingertip',
  'Middle finger base',
  'Ring fingertip',
  'Ring finger base',
  'Pinky fingertip',
  'Pinky finger base',
] as const;

/** Tap command labels per contact, as the app names them (default shortcuts). */
export const TAP_COMMAND_FOR_CONTACT: Readonly<Record<(typeof CONTACT_LABELS)[number], string>> = {
  'Index fingertip': 'Confirm',
  'Index finger base': 'Dismiss / Back',
  'Middle fingertip': 'Undo',
  'Middle finger base': 'Next',
  'Ring fingertip': 'Read / Repeat',
  'Ring finger base': 'Previous',
  'Pinky fingertip': 'Shortcut 1',
  'Pinky finger base': 'Shortcut 2',
};

/**
 * Waits, on the product's own clock, until an emergency hold has run for at
 * least `seconds` (read from the hold progress ring's aria-valuenow).
 */
export async function waitForHoldSeconds(page: Page, seconds: number): Promise<void> {
  const ring = page.getByRole('progressbar', { name: 'Emergency hold progress' }).first();
  await expect
    .poll(async () => Number((await ring.getAttribute('aria-valuenow').catch(() => null)) ?? '0'), {
      intervals: [50],
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(seconds);
}

/**
 * Phrases that would suggest someone was called, messaged or alerted. The
 * emergency simulation must never imply any of these.
 */
export const CONTACTED_SOMEONE =
  /\b(calling|called|dialling|dialing|dialled|dialed|messaged|messaging|texted|texting|contacted|notified|alerted|help is on the way|on their way|emergency services (have|has|were|was)|was sent to|has been sent|have been sent|sms sent|message sent)\b/i;

/**
 * Navigates and waits for the page's h1. Pages are lazy-loaded and the dev server is shared, so the first render can
 * take a while; this keeps later five-second assertions about behaviour, not about loading.
 */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
}

export async function reloadPage(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
}
