/**
 * Practice flows end to end: the Simulator (free and guided practice, the
 * emergency hold), lessons in Train, and guided Calibration. Everything runs on
 * the simulated ring in Demo Mode, so every result must be labelled Simulated
 * and the emergency hold must never imply that anyone was contacted.
 */
import { test, expect, seedStorage, trackConsoleErrors } from './fixtures';
import {
  CONTACTED_SOMEONE,
  TAP_COMMAND_FOR_CONTACT,
  assertiveRegion,
  choosePracticeView,
  commandWindowTimer,
  contactButton,
  contactLabelFromPhrase,
  escapeRegExp,
  openPage,
  politeRegion,
  reloadPage,
  squeezeAndWaitForWindow,
  tabUntilFocused,
  waitForHoldSeconds,
} from './helpers/practice';
import type { Locator, Page } from '@playwright/test';

const EMERGENCY_NOTICE = 'Simulation only — no emergency message was sent.';
const START_HOLD = 'Start five-second hold on pinky fingertip';
const RELEASE_HOLD = 'Release pinky fingertip';

function attemptLog(page: Page): Locator {
  return page.getByRole('table', { name: 'Latest attempts in this session' });
}

/** Data rows of the simulator's session log, newest first (the first row is the header). */
function attemptRows(page: Page): Locator {
  return attemptLog(page).getByRole('row').filter({ has: page.getByRole('cell') });
}

/** The on-page "Simulation only" notice (the live regions sit outside main). */
function emergencyNotice(page: Page): Locator {
  return page.getByRole('main').getByRole('status').filter({ hasText: EMERGENCY_NOTICE });
}

async function openFreePractice(page: Page): Promise<void> {
  await openPage(page, '/dashboard/simulator?mode=free');
  await expect(page.getByRole('heading', { level: 1, name: 'Simulator' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Free practice' })).toBeChecked();
}

test.describe('Simulator — free practice', () => {
  test('squeeze, then the Middle finger base point in the hand view is recognised as Next and logged', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await choosePracticeView(page, 'Hand view');

    await squeezeAndWaitForWindow(page);
    await expect(politeRegion(page)).toContainText('Command window open for 3 seconds.');

    const point = page.getByRole('button', { name: /^Middle finger base, Next/ });
    await point.click();

    await expect(politeRegion(page)).toContainText('Next.');
    await expect(page.getByRole('region', { name: 'What would happen' }).getByRole('heading', { name: 'Next' })).toBeVisible();

    const rows = attemptRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('None (free practice)');
    await expect(rows.first()).toContainText('Middle finger base');
    await expect(rows.first()).toContainText('Recognised: Next');
    await expect(rows.first()).toContainText('Simulated');
    expect(errors).toEqual([]);
  });

  test('the same command works from the List view after choosing Free practice', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    await page.getByRole('radio', { name: 'Free practice' }).check();
    await expect(page).toHaveURL(/[?&]mode=free/);
    await choosePracticeView(page, 'List view');

    await squeezeAndWaitForWindow(page);
    await page.getByRole('button', { name: /^Middle finger base — Next/ }).click();

    await expect(politeRegion(page)).toContainText('Next.');
    const rows = attemptRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Recognised: Next');
    await expect(rows.first()).toContainText('Simulated');
    expect(errors).toEqual([]);
  });

  test('tapping a point without squeezing says the ring is asleep and runs no command', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);

    await contactButton(page, 'Index fingertip').click();

    await expect(assertiveRegion(page)).toContainText('The ring is asleep. Squeeze first, then tap.');
    await expect(commandWindowTimer(page)).toHaveCount(0);
    await expect(page.getByRole('main').getByText('Not recognised: ring asleep', { exact: true }).first()).toBeVisible();
    const rows = attemptRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Not recognised: ring asleep');
    await expect(rows.first()).not.toContainText('Recognised: Confirm');
    expect(errors).toEqual([]);
  });

  test('works with the keyboard alone: Tab to Squeeze, Enter, Tab to a point, Enter', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);

    const squeeze = page.getByRole('button', { name: 'Squeeze the ring' });
    await tabUntilFocused(page, squeeze);
    await page.keyboard.press('Enter');
    await expect(politeRegion(page)).toContainText('Command window open for 3 seconds.');

    const point = contactButton(page, 'Middle finger base');
    await tabUntilFocused(page, point, 30);
    await expect(point).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(politeRegion(page)).toContainText('Next.');
    const rows = attemptRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Recognised: Next');

    // Space is a brief tap too (the window was refreshed by the first tap).
    await page.keyboard.press(' ');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Recognised: Next');
    expect(errors).toEqual([]);
  });

  test('on a touch screen, tapping Squeeze and then a point recognises the command', async ({ signedInPage: page }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, 'Touch input exists only in the mobile project.');
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);

    await page.getByRole('button', { name: 'Squeeze the ring' }).tap();
    await expect(commandWindowTimer(page)).toBeVisible();
    await contactButton(page, 'Middle finger base').tap();

    await expect(politeRegion(page)).toContainText('Next.');
    // The browser's follow-up click after a touch must not count as a second tap.
    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Recognised: Next');
    expect(errors).toEqual([]);
  });

  test('a screen reader’s activation (a click with no pointer or key press) counts as a brief tap', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);

    // VoiceOver and TalkBack double-tap fire a lone click event on the focused element.
    await contactButton(page, 'Ring fingertip').dispatchEvent('click');

    await expect(politeRegion(page)).toContainText('Read again.');
    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Recognised: Read / Repeat');
    expect(errors).toEqual([]);
  });

  test('holding Enter on the pinky fingertip point for five seconds completes the emergency hold', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);

    const point = contactButton(page, 'Pinky fingertip');
    await point.focus();
    await page.keyboard.down('Enter');
    try {
      await expect(point).toHaveAttribute('aria-pressed', 'true');
      await expect(emergencyNotice(page)).toBeVisible({ timeout: 8_000 });
    } finally {
      await page.keyboard.up('Enter');
    }

    await expect(assertiveRegion(page)).toContainText(`Emergency hold complete. ${EMERGENCY_NOTICE}`);
    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Emergency hold complete (simulation only)');
    expect(errors).toEqual([]);
  });
});

test.describe('Simulator — guided practice', () => {
  /** Reads "Next — middle finger base" from the target card. */
  async function readTarget(page: Page): Promise<{ command: string; where: string; contact: string; text: string }> {
    const card = page.getByRole('region', { name: 'Your target' });
    const prompt = card.getByText(/^[^—]+ — [^—]+$/);
    await expect(prompt).toBeVisible();
    const text = ((await prompt.textContent()) ?? '').trim();
    const [command = '', where = ''] = text.split(' — ');
    return { command, where, contact: contactLabelFromPhrase(where), text };
  }

  test('the prompted point is Correct; a wrong point names what was detected', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    await expect(page.getByRole('radio', { name: 'Guided practice' })).toBeChecked();
    const card = page.getByRole('region', { name: 'Your target' });

    const first = await readTarget(page);
    await expect(
      page.getByRole('button', { name: new RegExp(`^${escapeRegExp(first.contact)}(,| —).*, target$`) }),
    ).toBeVisible();

    await squeezeAndWaitForWindow(page);
    await contactButton(page, first.contact).click();

    await expect(card).toContainText(`Correct: ${first.command}.`);
    await expect(politeRegion(page)).toContainText(`Correct: ${first.command}.`);
    await expect(card).toContainText('This session: 1 of 1 correct');
    await expect(attemptRows(page).first()).toContainText('Correct');
    await expect(attemptRows(page).first()).toContainText('Simulated');

    // After a short pause the next target (never the same one) replaces it.
    await expect(card.getByText('Done', { exact: true })).toHaveCount(0);
    const second = await readTarget(page);
    expect(second.text).not.toBe(first.text);

    const wrong = second.contact === 'Index fingertip' ? 'Index finger base' : 'Index fingertip';
    const wrongCommand = TAP_COMMAND_FOR_CONTACT[wrong];
    await squeezeAndWaitForWindow(page);
    await contactButton(page, wrong).click();

    const message = `That was ${wrongCommand}, on the ${wrong.toLowerCase()}. Try again: ${second.command}, ${second.where}.`;
    await expect(card).toContainText(message);
    await expect(politeRegion(page)).toContainText(message);
    await expect(card).toContainText('This session: 1 of 2 correct');
    await expect(
      page.getByRole('button', { name: new RegExp(`^${escapeRegExp(wrong)}(,| —).*, detected here$`) }),
    ).toBeVisible();
    await expect(attemptRows(page).first()).toContainText(`Not the target: ${wrongCommand}`);
    expect(errors).toEqual([]);
  });

  test('a guided answer is announced once, without the ring’s own words read first', async ({ signedInPage: page }) => {
    test.fixme(true, 'FINDING: Guided practice announces every result twice (ring words + guided words)');
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    const target = await readTarget(page);

    await squeezeAndWaitForWindow(page);
    await contactButton(page, target.contact).click();

    // useGuidedPractice says its words "replace" the ring's for the same result, so the region holds only the verdict.
    await expect(politeRegion(page)).toHaveText(
      new RegExp(`^Correct: ${escapeRegExp(target.command)}\\. New target: .+\\.$`),
    );
    expect(errors).toEqual([]);
  });

  test('Repeat the prompt announces the current target', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    const target = await readTarget(page);

    await page.getByRole('button', { name: 'Repeat the prompt' }).click();
    await expect(politeRegion(page)).toContainText(`Your target: ${target.command}, ${target.where}.`);
    expect(errors).toEqual([]);
  });

  test('an Emergency target is completed by the five-second hold and says nothing was sent', async ({
    signedInPage: page,
  }) => {
    test.setTimeout(90_000);
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    const card = page.getByRole('region', { name: 'Your target' });
    await card.getByRole('checkbox', { name: 'Include the five-second emergency hold' }).check();

    // Targets are random; skip until the emergency hold is the one asked for.
    const emergencyPrompt = card.getByText('Emergency — hold the pinky fingertip for five seconds', { exact: true });
    for (let skips = 0; skips < 80 && !(await emergencyPrompt.isVisible()); skips += 1) {
      await card.getByRole('button', { name: 'Skip' }).click();
    }
    await expect(emergencyPrompt).toBeVisible();

    await squeezeAndWaitForWindow(page);
    await page.getByRole('button', { name: START_HOLD }).click();
    await expect(emergencyNotice(page)).toBeVisible({ timeout: 8_000 });

    await expect(card).toContainText(`Correct: Emergency hold complete. ${EMERGENCY_NOTICE}`);
    await expect(assertiveRegion(page)).toContainText(`Correct: Emergency hold complete. ${EMERGENCY_NOTICE}`);
    await expect(attemptRows(page).first()).toContainText('Correct');
    const everything = (await page.getByRole('main').innerText()) + (await assertiveRegion(page).innerText());
    expect(everything).not.toMatch(CONTACTED_SOMEONE);
    expect(errors).toEqual([]);
  });
});

test.describe('Simulator — emergency hold', () => {
  test('the five-second hold button completes the hold and shows only the simulation notice', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);

    await squeezeAndWaitForWindow(page);
    await page.getByRole('button', { name: START_HOLD }).click();
    await expect(page.getByRole('button', { name: RELEASE_HOLD })).toBeVisible();

    await expect(assertiveRegion(page)).toContainText(
      'Emergency hold is being counted. Keep holding for five seconds, or let go to cancel.',
      { timeout: 5_000 },
    );
    await waitForHoldSeconds(page, 4.5);
    await expect(emergencyNotice(page)).toHaveCount(0);

    await expect(emergencyNotice(page)).toBeVisible({ timeout: 5_000 });
    await expect(emergencyNotice(page)).toContainText('Simulation only');
    await expect(assertiveRegion(page)).toContainText(`Emergency hold complete. ${EMERGENCY_NOTICE}`);
    await expect(page.getByRole('button', { name: START_HOLD })).toBeVisible();
    await expect(politeRegion(page)).not.toContainText('Command window closed.');

    const mainText = (await page.getByRole('main').innerText()) + (await assertiveRegion(page).innerText());
    expect(mainText).not.toMatch(CONTACTED_SOMEONE);

    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Emergency hold complete (simulation only)');
    await expect(attemptRows(page).first()).toContainText('Simulated');
    expect(errors).toEqual([]);
  });

  test('releasing the hold after about 2.5 seconds cancels it with no notice', async ({ page }) => {
    // Longer interaction time keeps the window open well past the release, so the window closing is not in the same moment.
    await seedStorage(page, { preferences: { longerInteractionTime: true } });
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);

    await squeezeAndWaitForWindow(page);
    await expect(politeRegion(page)).toContainText('Command window open for 6 seconds.');
    await page.getByRole('button', { name: START_HOLD }).click();
    await waitForHoldSeconds(page, 2.5);
    await page.getByRole('button', { name: RELEASE_HOLD }).click();

    await expect(politeRegion(page)).toContainText(/Emergency hold cancelled after [23]\.\d seconds\. Nothing was sent\./);
    await expect(page.getByRole('button', { name: START_HOLD })).toBeVisible();
    await expect(emergencyNotice(page)).toHaveCount(0);
    await expect(page.getByRole('main').getByText(EMERGENCY_NOTICE)).toHaveCount(0);
    await expect(assertiveRegion(page)).not.toContainText('Emergency hold complete');

    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Emergency hold cancelled');
    expect(errors).toEqual([]);
  });

  test('Escape lets go of a hold started with the hold button, cancelling it', async ({ page }) => {
    await seedStorage(page, { preferences: { longerInteractionTime: true } });
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);

    await page.getByRole('button', { name: START_HOLD }).click();
    await waitForHoldSeconds(page, 1);
    await page.keyboard.press('Escape');

    await expect(politeRegion(page)).toContainText(/Emergency hold cancelled after \d\.\d seconds\. Nothing was sent\./);
    await expect(page.getByRole('button', { name: START_HOLD })).toBeVisible();
    await expect(emergencyNotice(page)).toHaveCount(0);
    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Emergency hold cancelled');
    expect(errors).toEqual([]);
  });

  test('a hold released after the 3-second window has run out says the cancel and the window closing in one announcement', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);

    await page.getByRole('button', { name: START_HOLD }).click();
    // The window's time runs out while the point is held (it is held open), then the hold is released.
    await waitForHoldSeconds(page, 3.3);
    await page.getByRole('button', { name: RELEASE_HOLD }).click();

    await expect(politeRegion(page)).toHaveText(
      /^Emergency hold cancelled after \d\.\d seconds\. Nothing was sent\. Command window closed\.$/,
    );
    await expect(commandWindowTimer(page)).toHaveCount(0);
    await expect(emergencyNotice(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('pressing and holding the pinky fingertip point with the mouse for five seconds completes the hold', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);

    const point = contactButton(page, 'Pinky fingertip');
    await point.scrollIntoViewIfNeeded();
    const box = await point.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    try {
      await expect(point).toHaveAttribute('aria-pressed', 'true');
      await waitForHoldSeconds(page, 4.5);
      await expect(emergencyNotice(page)).toHaveCount(0);
      await expect(emergencyNotice(page)).toBeVisible({ timeout: 5_000 });
    } finally {
      await page.mouse.up();
    }

    await expect(assertiveRegion(page)).toContainText(`Emergency hold complete. ${EMERGENCY_NOTICE}`);
    await expect(point).toHaveAttribute('aria-pressed', 'false');
    // Letting go after the hold completed must not also count as a Shortcut 1 tap or a cancelled hold.
    await expect(attemptRows(page)).toHaveCount(1);
    await expect(attemptRows(page).first()).toContainText('Emergency hold complete (simulation only)');
    await expect(politeRegion(page)).not.toContainText('Shortcut');
    const mainText = await page.getByRole('main').innerText();
    expect(mainText).not.toMatch(CONTACTED_SOMEONE);
    expect(errors).toEqual([]);
  });
});

test.describe('Activity history after the simulator', () => {
  test('simulator attempts appear in Activity labelled Simulated', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openFreePractice(page);
    await squeezeAndWaitForWindow(page);
    await contactButton(page, 'Middle finger base').click();
    await expect(politeRegion(page)).toContainText('Next.');
    await contactButton(page, 'Index fingertip').click();
    await expect(politeRegion(page)).toContainText('Confirm.');
    await expect(attemptRows(page)).toHaveCount(2);

    await openPage(page, '/dashboard/history');
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
    const table = page.getByRole('table', { name: /^Newest first, showing 2 of 2$/ });
    await expect(table).toBeVisible();
    const rows = table.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(rows).toHaveCount(2);

    const next = rows.filter({ hasText: 'Middle finger base' });
    await expect(next).toHaveCount(1);
    await expect(next).toContainText('Simulator');
    await expect(next).toContainText('Recognised');
    await expect(next).toContainText('Simulated');
    await expect(next).not.toContainText('Sample');

    const confirm = rows.filter({ hasText: 'Index fingertip' });
    await expect(confirm).toContainText('Simulator');
    await expect(confirm).toContainText('Simulated');
    expect(errors).toEqual([]);
  });
});

test.describe('Train', () => {
  test('Lesson 2 Confirm and Back: every step correct reaches Lesson complete, then shows Completed', async ({
    signedInPage: page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/train/confirm_and_back');
    await expect(page.getByRole('heading', { level: 1, name: 'Lesson 2: Confirm and Back' })).toBeVisible();
    await page.getByRole('button', { name: 'Start lesson' }).click();

    const total = 5;
    for (let step = 1; step <= total; step += 1) {
      const heading = page.getByRole('heading', { level: 2, name: new RegExp(`^Step ${step} of ${total}: `) });
      await expect(heading).toBeVisible();
      await expect(heading).toBeFocused();
      const instruction = ((await heading.textContent()) ?? '').trim();
      const match = /tap the (.+?) for .+\.$/.exec(instruction) ?? /on the (.+?)\.$/.exec(instruction);
      expect(match, `could not read the point from "${instruction}"`).not.toBeNull();
      const contact = contactLabelFromPhrase(match![1]!);

      await squeezeAndWaitForWindow(page);
      const target = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(contact)}(,| —).*, target$`) });
      await target.click();

      await expect(page.getByRole('main').getByText('Correct', { exact: true })).toBeVisible();
      const command = TAP_COMMAND_FOR_CONTACT[contact as keyof typeof TAP_COMMAND_FOR_CONTACT];
      // The lesson's words replace the ring's own ("Confirm.") in the same moment, so they are read once.
      await expect(politeRegion(page)).toHaveText(`Correct. ${command}, on the ${contact.toLowerCase()}.`);
    }

    const summary = page.getByRole('region', { name: 'Lesson complete' });
    await expect(page.getByRole('heading', { level: 2, name: 'Lesson complete' })).toBeFocused();
    await expect(summary).toContainText('You found every point, with no retries.');
    const accuracy = summary.getByRole('term').filter({ hasText: /^Accuracy$/ }).locator('..').getByRole('definition');
    await expect(accuracy).toContainText('100%');
    await expect(accuracy).toContainText('Simulated');
    const attempts = summary.getByRole('term').filter({ hasText: /^Attempts$/ }).locator('..').getByRole('definition');
    await expect(attempts).toHaveText('5');

    await openPage(page, '/dashboard/train');
    await reloadPage(page);
    const lesson = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Lesson 2: Confirm and Back' }) });
    await expect(lesson).toContainText('Completed');
    await expect(lesson).toContainText('Best: 100%');
    await expect(lesson).toContainText('Simulated');
    await expect(page.getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', '1 of 5');
    expect(errors).toEqual([]);
  });

  test('Lesson 2: a wrong point is explained, does not advance, and is counted as a retry in the summary', async ({
    signedInPage: page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/train/confirm_and_back');
    await page.getByRole('button', { name: 'Start lesson' }).click();

    const total = 5;
    for (let step = 1; step <= total; step += 1) {
      const heading = page.getByRole('heading', { level: 2, name: new RegExp(`^Step ${step} of ${total}: `) });
      await expect(heading).toBeVisible();
      const instruction = ((await heading.textContent()) ?? '').trim();
      const match = /tap the (.+?) for .+\.$/.exec(instruction) ?? /on the (.+?)\.$/.exec(instruction);
      expect(match, `could not read the point from "${instruction}"`).not.toBeNull();
      const contact = contactLabelFromPhrase(match![1]!) as keyof typeof TAP_COMMAND_FOR_CONTACT;

      await squeezeAndWaitForWindow(page);
      if (step === 1) {
        // Step 1 asks for Confirm on the index fingertip; tap its neighbour first.
        expect(contact).toBe('Index fingertip');
        await contactButton(page, 'Index finger base').click();
        const message =
          'That was Dismiss / Back, on the index finger base. Try again: Confirm on the index fingertip.';
        await expect(page.getByRole('main').getByText('Not yet', { exact: true })).toBeVisible();
        await expect(page.getByRole('main').getByText(message)).toBeVisible();
        await expect(politeRegion(page)).toHaveText(message);
        await expect(page.getByText('Attempts on this step: 1')).toBeVisible();
        await expect(page.getByRole('button', { name: /^Index finger base(,| —).*, detected here$/ })).toBeVisible();
        await expect(heading).toBeVisible();
      }

      await page.getByRole('button', { name: new RegExp(`^${escapeRegExp(contact)}(,| —).*, target$`) }).click();
      await expect(page.getByRole('main').getByText('Correct', { exact: true })).toBeVisible();
    }

    const summary = page.getByRole('region', { name: 'Lesson complete' });
    await expect(summary).toContainText('You found every point, with one retry on Confirm.');
    const accuracy = summary.getByRole('term').filter({ hasText: /^Accuracy$/ }).locator('..').getByRole('definition');
    await expect(accuracy).toContainText('83%');
    await expect(accuracy).toContainText('Simulated');
    const attempts = summary.getByRole('term').filter({ hasText: /^Attempts$/ }).locator('..').getByRole('definition');
    await expect(attempts).toHaveText('6');
    expect(errors).toEqual([]);
  });

  test('Lesson 5 emergency hold: the cancel step passes when released early', async ({ signedInPage: page }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/train/emergency_hold');
    await page.getByRole('button', { name: 'Start lesson' }).click();

    await expect(page.getByRole('heading', { level: 2, name: /^Step 1 of 2: .*let go before five seconds to cancel\.$/ })).toBeVisible();
    await squeezeAndWaitForWindow(page);
    await page.getByRole('button', { name: START_HOLD }).click();
    await waitForHoldSeconds(page, 1.5);
    await page.getByRole('button', { name: RELEASE_HOLD }).click();

    await expect(page.getByRole('main').getByText('Correct', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('Cancelled in time. Nothing was sent.')).toBeVisible();
    // The lesson's words replace the ring's own for the same result, so this is read once.
    await expect(politeRegion(page)).toHaveText('Correct. Cancelled in time. Nothing was sent.');
    await expect(emergencyNotice(page)).toHaveCount(0);

    // Step 2: the full hold completes the lesson, with the simulation notice.
    await expect(page.getByRole('heading', { level: 2, name: /^Step 2 of 2: / })).toBeVisible();
    await squeezeAndWaitForWindow(page);
    await page.getByRole('button', { name: START_HOLD }).click();
    await expect(emergencyNotice(page)).toBeVisible({ timeout: 8_000 });
    await expect(assertiveRegion(page)).toContainText(
      `Correct. The hold reached five seconds. ${EMERGENCY_NOTICE}`,
    );

    const summary = page.getByRole('region', { name: 'Lesson complete' });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('You completed every hold step, with no retries.');
    await expect(summary.getByRole('status').filter({ hasText: EMERGENCY_NOTICE })).toBeVisible();
    expect(await page.getByRole('main').innerText()).not.toMatch(CONTACTED_SOMEONE);
    expect(errors).toEqual([]);
  });
});

test.describe('Calibrate', () => {
  function promptHeading(page: Page): Locator {
    return page.getByRole('heading', { level: 2, name: /^Tap your / });
  }

  function calibrationProgress(page: Page): Locator {
    return page.getByRole('progressbar', { name: 'Calibration progress' });
  }

  test('a press longer than a tap on the prompted point is explained and does not count', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/calibrate');
    await page.getByRole('button', { name: 'Start calibration' }).click();
    await expect(promptHeading(page)).toHaveText('Tap your Index fingertip');
    await expect(commandWindowTimer(page)).toBeVisible();

    const point = contactButton(page, 'Index fingertip');
    await point.scrollIntoViewIfNeeded();
    const box = await point.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    // A tap is at most half a second (design value); this press is timed on purpose.
    await page.waitForTimeout(900);
    await page.mouse.up();

    const message = 'That press was too long. Tap briefly, under half a second.';
    await expect(assertiveRegion(page)).toContainText(message);
    await expect(page.getByRole('main').getByText(message)).toBeVisible();
    await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', '0 of 24 taps');
    await expect(promptHeading(page)).toHaveText('Tap your Index fingertip');
    expect(errors).toEqual([]);
  });

  test('a wrong tap gives the corrective message and does not count', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/calibrate');
    await page.getByRole('button', { name: 'Start calibration' }).click();

    await expect(promptHeading(page)).toHaveText('Tap your Index fingertip');
    await expect(commandWindowTimer(page)).toBeVisible();
    await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', '0 of 24 taps');

    await contactButton(page, 'Middle finger base').click();

    const corrective = 'That was the middle finger base. Tap the index fingertip.';
    await expect(assertiveRegion(page)).toContainText(corrective);
    await expect(page.getByRole('main').getByText(corrective)).toBeVisible();
    await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', '0 of 24 taps');
    await expect(page.getByText('Sample 1 of 3')).toBeVisible();
    await expect(promptHeading(page)).toHaveText('Tap your Index fingertip');
    await expect(page.getByRole('button', { name: /^Middle finger base(,| —).*, detected here$/ })).toBeVisible();

    await contactButton(page, 'Index fingertip').click();
    await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', '1 of 24 taps');
    await expect(politeRegion(page)).toContainText('Got it. 1 of 3 on the index fingertip.');
    await expect(page.getByText('Sample 2 of 3')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('all 24 samples reach results with 8 Done rows, and the calibration shows complete and Simulated after reload', async ({
    signedInPage: page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/calibrate');
    await page.getByRole('button', { name: 'Start calibration' }).click();

    for (let accepted = 0; accepted < 24; accepted += 1) {
      const heading = promptHeading(page);
      await expect(heading).toBeVisible();
      await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', `${accepted} of 24 taps`);
      const contact = ((await heading.textContent()) ?? '').replace(/^Tap your /, '').trim();
      await expect(page.getByText(`Sample ${(accepted % 3) + 1} of 3`)).toBeVisible();
      await expect(commandWindowTimer(page)).toBeVisible();

      await page.getByRole('button', { name: new RegExp(`^${escapeRegExp(contact)}(,| —).*, target$`) }).click();

      if (accepted < 23) {
        await expect(calibrationProgress(page)).toHaveAttribute('aria-valuetext', `${accepted + 1} of 24 taps`);
      }
    }

    await expect(page.getByRole('heading', { level: 2, name: 'Calibration complete' })).toBeVisible();
    await expect(politeRegion(page)).toContainText('All eight points have three accepted taps.');
    const table = page.getByRole('table', { name: 'Samples per point' });
    const rows = table.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(rows).toHaveCount(8);
    await expect(rows.filter({ hasText: 'Done' })).toHaveCount(8);
    await expect(rows.filter({ hasText: 'Repeat' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Calibration complete' })).toContainText('Simulated');

    await reloadPage(page);
    await expect(page.getByRole('region', { name: 'Last calibration' })).toContainText('Complete');
    await expect(page.getByRole('region', { name: 'Last calibration' })).toContainText('Simulated');

    await openPage(page, '/dashboard');
    const dashboardCard = page.getByRole('region', { name: 'Calibration', exact: true });
    await expect(dashboardCard).toContainText('Complete');
    await expect(dashboardCard).toContainText('Simulated');

    await openPage(page, '/dashboard/settings');
    const settingsSection = page.getByRole('region', { name: 'Calibration', exact: true });
    await expect(settingsSection).toContainText('Complete');
    await expect(settingsSection).toContainText('Simulated');
    expect(errors).toEqual([]);
  });
});
