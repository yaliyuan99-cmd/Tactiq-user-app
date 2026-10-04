/**
 * Data screens: Commands, the saved shortcut in the Simulator, History,
 * Settings, Connect, Dashboard and Help. Every test starts from its own
 * seeded browser storage and asserts what a user sees and what a screen
 * reader is told through the live regions.
 */
import { readFile } from 'node:fs/promises';
import { test, expect, seedStorage, trackConsoleErrors } from './fixtures';
import {
  THREE_EVENTS,
  assertiveAnnouncer,
  browserLocalDate,
  chooseFreePractice,
  contactButton,
  openPage,
  politeAnnouncer,
  reloadPage,
  seedHistory,
  squeezeRing,
  tactiqStorageKeys,
  waitForPage,
} from './helpers/data';

const SHORTCUT_1 = 'Shortcut 1 — pinky fingertip, brief tap';
const SHORTCUT_2 = 'Shortcut 2 — pinky finger base';
const PERCENTAGE = /\d+\s?%/;

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

test.describe('Commands', () => {
  test('the command map lists nine commands and marks the seven fixed ones as locked', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/commands');
    await expect(page.getByRole('heading', { level: 1, name: 'Commands and shortcuts' })).toBeVisible();

    const table = page.getByRole('table', { name: 'Command map' });
    await expect(table).toBeVisible();
    // One header row plus one row per command, each named by a row header.
    await expect(table.getByRole('rowheader')).toHaveCount(9);
    await expect(table.getByRole('row')).toHaveCount(10);

    // Rows are matched by their visible row header text; the accessible names are checked in their own test.
    const statusOf = (commandText: RegExp) =>
      table
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader').filter({ hasText: commandText }) })
        .getByRole('cell')
        .last();

    await expect(statusOf(/^Emergency$/)).toHaveText('Fixed — cannot be changed');
    for (const fixed of ['Confirm', 'Dismiss / Back', 'Undo', 'Next', 'Read / Repeat', 'Previous']) {
      await expect(statusOf(new RegExp(`^${fixed}$`)), `${fixed} is fixed`).toHaveText('Fixed');
    }
    await expect(statusOf(/^Shortcut 1/)).toHaveText('Customisable');
    await expect(statusOf(/^Shortcut 2/)).toHaveText('Customisable');
    await expect(table.getByRole('cell').filter({ hasText: /^Fixed$/ })).toHaveCount(6);

    // Only the two shortcuts can be edited: exactly two radio groups, none for Emergency.
    const main = page.getByRole('main');
    const radioGroups = main.getByRole('group').filter({ has: page.getByRole('radio') });
    await expect(radioGroups).toHaveCount(2);
    await expect(main.getByRole('group', { name: SHORTCUT_1 })).toBeVisible();
    await expect(main.getByRole('group', { name: SHORTCUT_2 })).toBeVisible();
    await expect(main.getByRole('group', { name: /Emergency/ }).filter({ has: page.getByRole('radio') })).toHaveCount(0);
    await expect(main.getByText('Emergency is a five-second hold on the pinky fingertip and can never be changed.', { exact: false })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('command map row headers are named by the command alone, without the stacked-layout label', async ({
    signedInPage: page,
  }, testInfo) => {
    test.fixme(
      testInfo.project.name === 'mobile-chromium',
      'FINDING: DataTable stacked-layout ::before labels leak into cell and row header names on phones',
    );
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/commands');
    const table = page.getByRole('table', { name: 'Command map' });
    for (const command of ['Confirm', 'Dismiss / Back', 'Undo', 'Next', 'Read / Repeat', 'Previous', 'Emergency']) {
      await expect(table.getByRole('rowheader', { name: command, exact: true }), `${command} row header`).toHaveCount(1);
    }
    await expect(table.getByRole('rowheader', { name: 'Shortcut 1 Play or pause media', exact: true })).toHaveCount(1);
    await expect(table.getByRole('cell', { name: 'Fixed — cannot be changed', exact: true })).toHaveCount(1);
    await expect(table.getByRole('cell', { name: 'Fixed', exact: true })).toHaveCount(6);
    expect(errors).toEqual([]);
  });

  test('changing Shortcut 1 previews the change, saves with an announcement and persists after reload', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/commands');

    const main = page.getByRole('main');
    const shortcut1 = main.getByRole('group', { name: SHORTCUT_1 });
    const save = main.getByRole('button', { name: 'Save shortcuts' });

    // "Change shortcuts" takes keyboard and screen reader users straight to the editor.
    await main.getByRole('button', { name: 'Change shortcuts' }).click();
    await expect(main.getByRole('heading', { level: 2, name: 'Your shortcuts' })).toBeFocused();

    await expect(shortcut1.getByRole('radio', { name: 'Play or pause media' })).toBeChecked();
    await expect(save).toHaveAttribute('aria-disabled', 'true');
    await expect(save).toHaveAccessibleDescription('No changes yet.');

    await shortcut1.getByRole('radio', { name: 'Announce the time' }).click();
    await expect(shortcut1.getByRole('radio', { name: 'Announce the time' })).toBeChecked();

    // The preview shows the change, and the Save button carries it for screen readers.
    await expect(main.getByText('Shortcut 1: Play or pause media → Announce the time')).toBeVisible();
    await expect(save).toHaveAccessibleDescription('Shortcut 1 changes from Play or pause media to Announce the time.');
    await expect(save).not.toHaveAttribute('aria-disabled', 'true');
    await expect(main.getByText('You have unsaved changes in Your shortcuts.')).toBeVisible();

    await save.click();
    await expect(politeAnnouncer(page)).toHaveText('Shortcuts saved.');
    const result = main.getByRole('status').filter({ hasText: 'Shortcuts saved' });
    await expect(result).toContainText('Shortcut 1: Announce the time');
    await expect(save).toHaveAccessibleDescription('No changes yet.');

    const commandTable = page.getByRole('table', { name: 'Command map' });
    const shortcut1Header = commandTable.getByRole('rowheader').filter({ hasText: /^Shortcut 1/ });
    await expect(shortcut1Header).toContainText('Announce the time');

    await reloadPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Commands and shortcuts' })).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('group', { name: SHORTCUT_1 }).getByRole('radio', { name: 'Announce the time' }),
    ).toBeChecked();
    await expect(shortcut1Header).toContainText('Announce the time');
    await expect(page.getByRole('main').getByText(/^Last changed /)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Restore defaults asks for confirmation, then restores and persists the defaults', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/commands');
    const main = page.getByRole('main');

    await expect(main.getByText('Both shortcuts use the defaults.')).toBeVisible();
    await main.getByRole('group', { name: SHORTCUT_2 }).getByRole('radio', { name: 'Toggle the flashlight' }).check();
    await main.getByRole('button', { name: 'Save shortcuts' }).click();
    await expect(politeAnnouncer(page)).toHaveText('Shortcuts saved.');

    await main.getByRole('button', { name: 'Restore defaults' }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore default shortcuts?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Shortcut 1: Play or pause media');
    await expect(dialog).toContainText('Shortcut 2: Announce the time');

    // Cancelling changes nothing.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByRole('group', { name: SHORTCUT_2 }).getByRole('radio', { name: 'Toggle the flashlight' })).toBeChecked();

    await main.getByRole('button', { name: 'Restore defaults' }).click();
    await page.getByRole('dialog', { name: 'Restore default shortcuts?' }).getByRole('button', { name: 'Restore defaults' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(politeAnnouncer(page)).toHaveText('Default shortcuts restored.');
    await expect(main.getByRole('status').filter({ hasText: 'Default shortcuts restored' })).toBeVisible();
    await expect(main.getByRole('group', { name: SHORTCUT_2 }).getByRole('radio', { name: 'Announce the time' })).toBeChecked();
    await expect(main.getByText('Both shortcuts use the defaults.')).toBeVisible();
    // Restore defaults has gone from the page, so focus lands on the preview heading.
    await expect(main.getByRole('heading', { name: 'Changes to save' })).toBeFocused();

    await reloadPage(page);
    const reloadedMain = page.getByRole('main');
    await expect(reloadedMain.getByRole('group', { name: SHORTCUT_1 }).getByRole('radio', { name: 'Play or pause media' })).toBeChecked();
    await expect(reloadedMain.getByRole('group', { name: SHORTCUT_2 }).getByRole('radio', { name: 'Announce the time' })).toBeChecked();

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Saved shortcut in the simulator                                     */
/* ------------------------------------------------------------------ */

test.describe('Shortcut in the simulator', () => {
  test('a saved Shortcut 1 is what a pinky fingertip tap announces in free practice', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/commands');
    const main = page.getByRole('main');
    await main.getByRole('group', { name: SHORTCUT_1 }).getByRole('radio', { name: 'Toggle the flashlight' }).check();
    await main.getByRole('button', { name: 'Save shortcuts' }).click();
    await expect(politeAnnouncer(page)).toHaveText('Shortcuts saved.');

    await openPage(page, '/dashboard/simulator');
    await expect(page.getByRole('heading', { level: 1, name: 'Simulator' })).toBeVisible();
    await chooseFreePractice(page);

    const pinkyTip = contactButton(page, 'Pinky fingertip');
    await expect(pinkyTip).toHaveAccessibleName(/Shortcut 1: Toggle the flashlight/);

    await squeezeRing(page);
    await pinkyTip.click();

    await expect(politeAnnouncer(page)).toContainText('Shortcut 1: Toggle the flashlight. Flashlight on.');
    await expect(page.getByRole('main').getByText('Shortcut 1: Toggle the flashlight', { exact: true }).first()).toBeVisible();
    // The emergency hold was not triggered by a brief tap.
    await expect(assertiveAnnouncer(page)).not.toContainText('Emergency');

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

test.describe('History', () => {
  test('range, command and source filters update the results, the announcement and the URL, and survive reload', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/history');
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();

    const main = page.getByRole('main');
    const range = main.getByRole('group', { name: 'Range' });
    const command = main.getByRole('combobox', { name: 'Command' });
    const source = main.getByRole('combobox', { name: 'Source' });

    // Default view: last 7 days.
    await expect(range.getByRole('radio', { name: 'Last 7 days' })).toBeChecked();
    await expect(main.getByRole('table', { name: 'Newest first, showing 2 of 2' })).toBeVisible();

    await range.getByRole('radio', { name: 'All time' }).click();
    await expect(range.getByRole('radio', { name: 'All time' })).toBeChecked();
    await expect(politeAnnouncer(page)).toHaveText('Showing 3 attempts.');
    await expect(page).toHaveURL(/range=all/);
    await expect(main.getByRole('table', { name: 'Newest first, showing 3 of 3' })).toBeVisible();

    await range.getByRole('radio', { name: 'Today' }).click();
    await expect(range.getByRole('radio', { name: 'Today' })).toBeChecked();
    await expect(politeAnnouncer(page)).toHaveText('Showing 1 attempt.');
    await expect(page).toHaveURL(/range=today/);
    const todayTable = main.getByRole('table', { name: 'Newest first, showing 1 of 1' });
    await expect(todayTable).toBeVisible();
    await expect(todayTable.getByRole('cell').filter({ hasText: /^Simulator$/ })).toBeVisible();

    // Keyboard: arrow keys move through the native radio group.
    await range.getByRole('radio', { name: 'Today' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(range.getByRole('radio', { name: 'Last 7 days' })).toBeChecked();
    await expect(range.getByRole('radio', { name: 'Last 7 days' })).toBeFocused();
    await expect(politeAnnouncer(page)).toHaveText('Showing 2 attempts.');
    await expect(page).toHaveURL(/range=7d/);

    await command.selectOption({ label: 'Next' });
    await expect(politeAnnouncer(page)).toHaveText('Showing 1 attempt.');
    await expect(page).toHaveURL(/command=next/);
    const nextTable = main.getByRole('table', { name: 'Newest first, showing 1 of 1' });
    await expect(nextTable.getByRole('cell').filter({ hasText: /^Lessons$/ })).toBeVisible();

    await source.selectOption({ label: 'Calibration' });
    await expect(politeAnnouncer(page)).toHaveText('No attempts in this range.');
    await expect(page).toHaveURL(/source=calibration/);
    await expect(main.getByText('Range: last 7 days. Command: Next. Source: Calibration.')).toBeVisible();

    await reloadPage(page);
    await expect(page).toHaveURL(/range=7d/);
    await expect(page).toHaveURL(/command=next/);
    await expect(page).toHaveURL(/source=calibration/);
    const reloaded = page.getByRole('main');
    await expect(reloaded.getByRole('group', { name: 'Range' }).getByRole('radio', { name: 'Last 7 days' })).toBeChecked();
    await expect(reloaded.getByRole('combobox', { name: 'Command' })).toHaveValue('next');
    await expect(reloaded.getByRole('combobox', { name: 'Source' })).toHaveValue('calibration');
    await expect(reloaded.getByText('Range: last 7 days. Command: Next. Source: Calibration.')).toBeVisible();

    // The empty view offers a way out; following it announces the result and returns focus to the filters.
    await reloaded.getByRole('link', { name: 'Show all commands and sources' }).click();
    await expect(politeAnnouncer(page)).toHaveText('Showing 2 attempts.');
    await expect(page).toHaveURL(/range=7d&command=all&source=all/);
    await expect(reloaded.getByRole('heading', { name: 'Filters' })).toBeFocused();

    // Widen the range and pick the command the calibration record aimed for.
    await reloaded.getByRole('group', { name: 'Range' }).getByRole('radio', { name: 'All time' }).click();
    await expect(reloaded.getByRole('group', { name: 'Range' }).getByRole('radio', { name: 'All time' })).toBeChecked();
    await expect(politeAnnouncer(page)).toHaveText('Showing 3 attempts.');
    await reloaded.getByRole('combobox', { name: 'Command' }).selectOption({ label: 'Read / Repeat' });
    await expect(politeAnnouncer(page)).toHaveText('Showing 1 attempt.');
    await expect(page).toHaveURL(/range=all&command=read&source=all/);
    await expect(
      reloaded.getByRole('table', { name: 'Newest first, showing 1 of 1' }).getByRole('cell').filter({ hasText: /^Calibration$/ }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Download JSON and Download CSV save dated files containing every record', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/history');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Your data' })).toBeVisible();
    const today = await browserLocalDate(page);

    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      main.getByRole('button', { name: 'Download JSON' }).click(),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/^tactiq-activity-\d{4}-\d{2}-\d{2}\.json$/);
    expect(jsonDownload.suggestedFilename()).toBe(`tactiq-activity-${today}.json`);
    await expect(politeAnnouncer(page)).toHaveText(`Download started: tactiq-activity-${today}.json.`);
    const json = JSON.parse(await readFile(await jsonDownload.path(), 'utf8')) as {
      format: string;
      note: string;
      events: { id: string; evidence: string }[];
    };
    expect(json.format).toBe('tactiq.history');
    expect(json.note).toMatch(/Not hardware measurements/);
    expect(json.events.map((event) => event.id)).toEqual(THREE_EVENTS.map((event) => event.id));
    expect(json.events.every((event) => event.evidence === 'simulated')).toBe(true);

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      main.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/^tactiq-activity-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csvDownload.suggestedFilename()).toBe(`tactiq-activity-${today}.csv`);
    await expect(politeAnnouncer(page)).toHaveText(`Download started: tactiq-activity-${today}.csv.`);
    const csvLines = (await readFile(await csvDownload.path(), 'utf8')).split(/\r?\n/);
    expect(csvLines[0]).toContain('targetToken');
    expect(csvLines[0]?.split(',')).toContain('targetToken');
    expect(csvLines.filter((line) => line.length > 0)).toHaveLength(4);

    expect(errors).toEqual([]);
  });

  test('Clear all activity needs the typed phrase, then empties the page', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/history?range=all');
    const main = page.getByRole('main');
    await expect(main.getByRole('table', { name: 'Newest first, showing 3 of 3' })).toBeVisible();

    await main.getByRole('button', { name: 'Clear all activity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear all activity?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('3 activity records');
    const phrase = dialog.getByRole('textbox', { name: 'Type “clear” to confirm' });
    await expect(phrase).toBeFocused();

    // Confirming without the phrase explains why nothing happened.
    const confirm = dialog.getByRole('button', { name: 'Clear activity' });
    await expect(confirm).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled keeps the button focusable; a keyboard user can still press it.
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Type “clear” exactly to continue.')).toBeVisible();
    await expect(phrase).toBeFocused();
    // Nothing was deleted (the page behind the modal is hidden from assistive technology meanwhile).
    await expect(page.getByRole('table', { name: 'Newest first, showing 3 of 3', includeHidden: true })).toBeAttached();

    await phrase.fill('clear');
    await confirm.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(main.getByRole('heading', { name: 'No activity yet' })).toBeVisible();
    await expect(politeAnnouncer(page)).toContainText('Activity cleared.');
    // The button that was pressed has gone, so focus moves to the page title.
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeFocused();
    await expect(main.getByRole('table')).toHaveCount(0);

    await reloadPage(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'No activity yet' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Demo Mode sample records are labelled Sample and can be removed', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { withoutSampleHistory: false });
    await openPage(page, '/dashboard/history?range=all');
    const main = page.getByRole('main');

    await expect(
      main.getByText('Includes sample records created for Demo Mode so this page is not empty. They are marked Sample.'),
    ).toBeVisible();
    const table = main.getByRole('table', { name: /^Newest first, showing \d+ of \d+$/ });
    await expect(table).toBeVisible();
    await expect(table.getByRole('cell').filter({ hasText: /^Sample$/ }).first()).toBeVisible();

    await main.getByRole('button', { name: 'Remove sample records' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove sample records?' });
    await expect(dialog).toContainText('Your own practice stays.');
    await dialog.getByRole('button', { name: 'Remove samples' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(politeAnnouncer(page)).toContainText(/Removed \d+ sample records?\./);
    await expect(main.getByRole('heading', { name: 'No activity yet' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Remove sample records' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeFocused();

    // Samples are not written again.
    await reloadPage(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'No activity yet' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('removing sample records keeps the user\'s own practice', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { withoutSampleHistory: false });
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/history?range=all');
    const main = page.getByRole('main');

    const allRows = main.getByRole('table', { name: /^Newest first, showing \d+ of \d+$/ });
    await expect(allRows.getByRole('cell').filter({ hasText: /^Sample$/ }).first()).toBeVisible();
    await main.getByRole('button', { name: 'Remove sample records' }).click();
    await page.getByRole('dialog', { name: 'Remove sample records?' }).getByRole('button', { name: 'Remove samples' }).click();

    await expect(politeAnnouncer(page)).toContainText(/Removed \d+ sample records?\./);
    const ownRows = main.getByRole('table', { name: 'Newest first, showing 3 of 3' });
    await expect(ownRows).toBeVisible();
    await expect(ownRows.getByRole('cell').filter({ hasText: /^Sample$/ })).toHaveCount(0);
    await expect(ownRows.getByRole('cell').filter({ hasText: /^Simulated$/ })).toHaveCount(3);
    // The Remove button has gone, so focus continues from the filters.
    await expect(main.getByRole('heading', { name: 'Filters' })).toBeFocused();

    expect(errors).toEqual([]);
  });

  test('a completed emergency hold is labelled as a simulation that contacted no one', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, [
      ...THREE_EVENTS,
      {
        id: 'evt_e2e_emergency',
        minutesAgo: 1,
        source: 'simulator',
        mode: 'free',
        targetContact: null,
        detectedContact: 'pinky_tip',
        token: 'emergency',
        durationMs: 5000,
        outcome: 'emergency',
        evidence: 'simulated',
        seeded: false,
      },
    ]);
    await openPage(page, '/dashboard/history');
    const main = page.getByRole('main');
    await main.getByRole('combobox', { name: 'Command' }).selectOption({ label: 'Emergency' });
    await expect(politeAnnouncer(page)).toHaveText('Showing 1 emergency hold.');
    await expect(page).toHaveURL(/command=emergency/);
    await expect(main.getByText('1 completed, 0 cancelled')).toBeVisible();
    await expect(main.getByText('Simulation only — no emergency message was sent.').first()).toBeVisible();
    await expect(
      main.getByRole('table', { name: 'Newest first, showing 1 of 1' }).getByRole('cell').filter({ hasText: 'Emergency hold completed (simulated)' }),
    ).toBeVisible();

    await openPage(page, '/dashboard');
    const recent = page.getByRole('main').getByRole('region', { name: 'Recent activity' });
    await expect(
      recent.getByRole('listitem').filter({ hasText: 'Emergency hold completed. Simulation only — no emergency message was sent.' }),
    ).toHaveCount(1);
    await expect(recent).not.toContainText(/emergency (services|contact) (were|was) (called|contacted|notified)/i);

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

test.describe('Settings', () => {
  test('Theme Dark adds the dark class and persists after reload', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/settings');
    const html = page.locator('html');
    const theme = page.getByRole('main').getByRole('group', { name: 'Theme' });

    await expect(html).not.toHaveClass(/\bdark\b/);
    await theme.getByRole('radio', { name: 'Dark' }).check();
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(politeAnnouncer(page)).toHaveText('Theme set to Dark.');

    await reloadPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(page.getByRole('main').getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'Dark' })).toBeChecked();

    expect(errors).toEqual([]);
  });

  test('Text size, contrast and reduce motion change the document and are announced', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/settings');
    const html = page.locator('html');
    const main = page.getByRole('main');

    await main.getByRole('group', { name: 'Text size' }).getByRole('radio', { name: 'Larger' }).check();
    await expect(html).toHaveAttribute('data-text-size', 'larger');
    await expect(politeAnnouncer(page)).toHaveText('Text size set to Larger.');

    await main.getByRole('group', { name: 'Contrast' }).getByRole('radio', { name: 'Increased' }).check();
    await expect(html).toHaveAttribute('data-contrast', 'high');
    await expect(politeAnnouncer(page)).toHaveText('Contrast set to Increased.');

    const reduceMotion = main.getByRole('switch', { name: 'Reduce motion' });
    await expect(reduceMotion).toHaveAttribute('aria-checked', 'true');
    await expect(html).toHaveClass(/\bforce-reduced-motion\b/);
    await reduceMotion.click();
    await expect(reduceMotion).toHaveAttribute('aria-checked', 'false');
    await expect(html).not.toHaveClass(/\bforce-reduced-motion\b/);
    await expect(politeAnnouncer(page)).toHaveText('Reduce motion off.');
    await reduceMotion.click();
    await expect(reduceMotion).toHaveAttribute('aria-checked', 'true');
    await expect(html).toHaveClass(/\bforce-reduced-motion\b/);
    await expect(politeAnnouncer(page)).toHaveText('Reduce motion on.');

    await reloadPage(page);
    await expect(html).toHaveAttribute('data-text-size', 'larger');
    await expect(html).toHaveAttribute('data-contrast', 'high');

    expect(errors).toEqual([]);
  });

  test('Longer interaction time persists and gives the simulated ring a six-second window', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/settings');
    const main = page.getByRole('main');
    const longer = main.getByRole('switch', { name: 'Longer interaction time' });

    await expect(longer).toHaveAttribute('aria-checked', 'false');
    await expect(main.getByText('Command window in this app: 3 s')).toBeVisible();
    await longer.click();
    await expect(longer).toHaveAttribute('aria-checked', 'true');
    await expect(politeAnnouncer(page)).toHaveText(
      'Longer interaction time on. The command window stays open for 6 seconds.',
    );
    await expect(main.getByText('Command window in this app: 6 s')).toBeVisible();

    await reloadPage(page);
    await expect(page.getByRole('main').getByRole('switch', { name: 'Longer interaction time' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await openPage(page, '/dashboard/simulator?mode=free');
    await expect(page.getByRole('heading', { level: 1, name: 'Simulator' })).toBeVisible();
    await squeezeRing(page, 6);

    expect(errors).toEqual([]);
  });

  test('Hand Left is announced, previewed and persists', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/settings');
    const main = page.getByRole('main');
    const hand = main.getByRole('group', { name: 'Hand you wear the ring on' });

    await hand.getByRole('radio', { name: 'Left' }).check();
    await expect(politeAnnouncer(page)).toHaveText('Hand set to Left.');
    await expect(main.getByText('Preview: left hand, palm facing you.')).toBeVisible();

    await reloadPage(page);
    await expect(
      page.getByRole('main').getByRole('group', { name: 'Hand you wear the ring on' }).getByRole('radio', { name: 'Left' }),
    ).toBeChecked();

    // The command map mirrors to match.
    await openPage(page, '/dashboard/commands');
    await expect(page.getByRole('main').getByText(/^Left hand, palm facing you\./)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Download all my data saves a dated JSON file of everything kept in this browser', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/settings');
    const today = await browserLocalDate(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('main').getByRole('button', { name: 'Download all my data' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`tactiq-data-${today}.json`);
    await expect(politeAnnouncer(page)).toHaveText(`Download started: tactiq-data-${today}.json.`);
    const exported = JSON.parse(await readFile(await download.path(), 'utf8')) as {
      format: string;
      data: Record<string, unknown>;
    };
    expect(exported.format).toBe('tactiq.local-data');
    expect(Object.keys(exported.data)).toEqual(expect.arrayContaining(['tactiq.prefs', 'tactiq.history', 'tactiq.auth.accounts']));
    expect((exported.data['tactiq.history'] as unknown[]).length).toBe(3);

    expect(errors).toEqual([]);
  });

  test('Delete all local data requires typing the phrase and lands on sign-in signed out', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await seedHistory(page, THREE_EVENTS);
    await openPage(page, '/dashboard/settings');
    const main = page.getByRole('main');

    await main.getByRole('button', { name: 'Delete all local data' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete all local data?' });
    await expect(dialog).toBeVisible();
    const phrase = dialog.getByRole('textbox', { name: 'Type “delete” to confirm' });
    await expect(phrase).toBeFocused();

    const confirm = dialog.getByRole('button', { name: 'Delete everything' });
    await expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByText('Type “delete” exactly to continue.')).toBeVisible();
    await expect(phrase).toBeFocused();
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    await phrase.fill('delete');
    await confirm.click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('status').filter({ hasText: 'You have signed out.' })).toBeVisible();

    const keys = await tactiqStorageKeys(page);
    expect(keys).not.toContain('tactiq.auth.session');
    expect(keys).not.toContain('tactiq.auth.accounts');
    expect(keys).not.toContain('tactiq.history');
    expect(keys).not.toContain('tactiq.prefs');

    // The dashboard is closed again.
    await openPage(page, '/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);

    expect(errors).toEqual([]);
  });

  test('sign-in confirms that local data was deleted, not only that the user signed out', async ({ signedInPage: page }) => {
    test.fixme(true, 'FINDING: Sign-in ignores dataDeleted and never confirms the local data was deleted');
    await openPage(page, '/dashboard/settings');
    await page.getByRole('main').getByRole('button', { name: 'Delete all local data' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete all local data?' });
    await dialog.getByRole('textbox', { name: 'Type “delete” to confirm' }).fill('delete');
    await dialog.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await waitForPage(page);
    await expect(page.getByRole('main').getByRole('status').filter({ hasText: /deleted/i })).toBeVisible();
  });

  test('Reset preferences restores defaults and keeps a finished user out of onboarding', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/settings');
    const main = page.getByRole('main');

    await main.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'Dark' }).check();
    await main.getByRole('group', { name: 'Hand you wear the ring on' }).getByRole('radio', { name: 'Left' }).check();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await main.getByRole('button', { name: 'Reset preferences' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset preferences?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Reset to defaults' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(politeAnnouncer(page)).toHaveText('Preferences reset to their defaults.');
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(main.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(main.getByRole('group', { name: 'Hand you wear the ring on' }).getByRole('radio', { name: 'Right' })).toBeChecked();

    await reloadPage(page);
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    await openPage(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page).toHaveTitle('Home · Tactiq');

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Connect                                                             */
/* ------------------------------------------------------------------ */

test.describe('Connect', () => {
  test('Demo Mode shows the simulated ring with battery Not reported and no percentage', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/connect');
    const main = page.getByRole('main');

    await expect(main.getByRole('group', { name: 'How do you want to use Tactiq?' }).getByRole('radio', { name: 'Demo Mode (simulated ring)' })).toBeChecked();
    const device = main.getByRole('region', { name: 'Simulated ring' });
    await expect(device).toBeVisible();
    await expect(device.getByText('Tactiq Ring (simulated)')).toBeVisible();
    await expect(device.getByText('Not reported', { exact: true })).toBeVisible();
    await expect(device).toContainText('Battery');
    await expect(device).toContainText('Simulated');
    expect(await device.textContent()).not.toMatch(PERCENTAGE);
    expect(await main.textContent()).not.toMatch(PERCENTAGE);

    expect(errors).toEqual([]);
  });

  test('choosing the Bluetooth ring explains support or offers Connect, and Demo Mode can be restored', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/connect');
    const main = page.getByRole('main');
    const modes = main.getByRole('group', { name: 'How do you want to use Tactiq?' });

    await modes.getByRole('radio', { name: 'Bluetooth ring (bench prototype)' }).check();
    await expect(main.getByRole('heading', { name: 'Bench prototype ring' })).toBeVisible();
    await expect(politeAnnouncer(page)).toContainText('Status:');

    const hasBluetooth = await page.evaluate(
      () => window.isSecureContext && 'bluetooth' in navigator && Boolean((navigator as { bluetooth?: unknown }).bluetooth),
    );
    const device = main.getByRole('region', { name: 'Bench prototype ring' });
    if (hasBluetooth) {
      // Never clicked: it would open the browser's Bluetooth chooser.
      await expect(device.getByRole('button', { name: 'Connect a ring' })).toBeVisible();
      await expect(device.getByText('Your browser asks for Bluetooth permission only when you choose this button.')).toBeVisible();
      await modes.getByRole('radio', { name: 'Demo Mode (simulated ring)' }).check();
    } else {
      await expect(device.getByText(/This browser cannot connect to a ring|This page is not secure enough for Bluetooth/)).toBeVisible();
      await device.getByRole('button', { name: 'Use Demo Mode instead' }).click();
    }

    await expect(main.getByRole('heading', { name: 'Simulated ring' })).toBeVisible();
    await expect(modes.getByRole('radio', { name: 'Demo Mode (simulated ring)' })).toBeChecked();
    await expect(politeAnnouncer(page)).toContainText('Status: Demo Mode.');

    expect(errors).toEqual([]);
  });

  test('"Use Demo Mode instead" returns an unsupported browser to Demo Mode', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    // Make this browser one without Web Bluetooth, so the unsupported explanation is shown.
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'bluetooth', { get: () => undefined, configurable: true });
      } catch {
        /* ignore */
      }
    });
    await openPage(page, '/dashboard/connect');
    const main = page.getByRole('main');
    const modes = main.getByRole('group', { name: 'How do you want to use Tactiq?' });

    await modes.getByRole('radio', { name: 'Bluetooth ring (bench prototype)' }).check();
    const device = main.getByRole('region', { name: 'Bench prototype ring' });
    await expect(device.getByText('This browser cannot connect to a ring')).toBeVisible();
    await expect(device.getByRole('button', { name: 'Connect a ring' })).toHaveCount(0);
    await expect(politeAnnouncer(page)).toContainText('Status: Bluetooth unavailable.');

    await device.getByRole('button', { name: 'Use Demo Mode instead' }).click();
    await expect(main.getByRole('region', { name: 'Simulated ring' })).toBeVisible();
    // The button's panel was replaced, so focus moves to the device heading rather than the top of the page.
    await expect(main.getByRole('heading', { name: 'Simulated ring' })).toBeFocused();
    await expect(modes.getByRole('radio', { name: 'Demo Mode (simulated ring)' })).toBeChecked();
    await expect(politeAnnouncer(page)).toContainText('Status: Demo Mode.');

    expect(errors).toEqual([]);
  });

  test('Technical details disclose the Nordic UART service UUID', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/connect');
    const main = page.getByRole('main');
    const uuid = main.getByText('6e400001-b5a3-f393-e0a9-e50e24dcca9e', { exact: true });

    await expect(uuid).toBeHidden();
    const summary = main.locator('summary', { hasText: 'Technical details' });
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(uuid).toBeVisible();
    await expect(main.getByText('Service (Nordic UART Service)')).toBeVisible();
    expect(await main.textContent()).not.toMatch(PERCENTAGE);

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

test.describe('Dashboard', () => {
  test('Home shows Demo Mode without battery, training and calibration progress, and a link to practise', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard');
    const main = page.getByRole('main');
    await expect(page).toHaveTitle('Home · Tactiq');

    const ring = main.getByRole('region', { name: 'Your ring' });
    await expect(ring.getByText('Demo Mode (simulated ring)')).toBeVisible();
    await expect(ring).not.toContainText(/battery/i);
    expect(await main.textContent()).not.toMatch(PERCENTAGE);

    const training = main.getByRole('region', { name: 'Training' });
    await expect(training.getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', /^0 of \d+$/);
    await expect(training).toContainText('Commands learnt');
    await expect(training).toContainText('Simulated');

    const calibration = main.getByRole('region', { name: 'Calibration' });
    await expect(calibration.getByText('Not calibrated')).toBeVisible();
    await expect(calibration.getByText('Never')).toBeVisible();

    const recent = main.getByRole('region', { name: 'Recent activity' });
    await expect(recent.getByText('No activity yet.')).toBeVisible();

    const practise = main.getByRole('link', { name: 'Practise a command' });
    await expect(practise).toHaveAttribute('href', '/dashboard/simulator');
    await practise.click();
    await expect(page).toHaveURL(/\/dashboard\/simulator$/);
    await waitForPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Simulator' })).toBeVisible();
    await expect(politeAnnouncer(page)).toContainText('Simulator');

    expect(errors).toEqual([]);
  });

  test('recent activity on Home shows an attempt made in the simulator', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/simulator');
    await chooseFreePractice(page);
    await squeezeRing(page);
    await contactButton(page, 'Index fingertip').click();
    await expect(politeAnnouncer(page)).toContainText('Confirm.');

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await waitForPage(page);
    const recent = page.getByRole('main').getByRole('region', { name: 'Recent activity' });
    const item = recent.getByRole('listitem').filter({ hasText: 'Confirm recognised' });
    await expect(item).toHaveCount(1);
    await expect(item).toContainText('Simulator, free practice');
    await expect(item).toContainText('Simulated');
    await expect(recent.getByText('No activity yet.')).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Help                                                                */
/* ------------------------------------------------------------------ */

test.describe('Help', () => {
  test('contents links jump to Troubleshooting and Project limitations', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/help');
    const main = page.getByRole('main');
    const contents = main.getByRole('navigation', { name: 'On this page' });

    await contents.getByRole('link', { name: 'Troubleshooting' }).click();
    await expect(page).toHaveURL(/\/dashboard\/help#troubleshooting$/);
    const troubleshooting = main.getByRole('heading', { level: 2, name: 'Troubleshooting' });
    await expect(troubleshooting).toBeFocused();
    await expect(troubleshooting).toBeInViewport();

    // Keyboard: Enter on a contents link.
    await contents.getByRole('link', { name: 'Project limitations' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard\/help#limitations$/);
    const limitations = main.getByRole('heading', { level: 2, name: 'Project limitations' });
    await expect(limitations).toBeFocused();
    await expect(limitations).toBeInViewport();

    const limitationsSection = main.getByRole('region', { name: 'Project limitations' });
    await expect(limitationsSection).toContainText('The Emergency command in this app never contacts anyone.');
    await expect(limitationsSection).toContainText('Simulation only — no emergency message was sent.');

    expect(errors).toEqual([]);
  });

  test('troubleshooting answers open with the keyboard', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/help');
    const main = page.getByRole('main');
    const section = main.getByRole('region', { name: 'Troubleshooting' });

    const firstAnswer = section.getByText('Connecting a ring uses Web Bluetooth, which only some browsers offer.');
    await expect(firstAnswer).toBeHidden();
    const firstSummary = section.locator('summary', { hasText: 'My browser says Bluetooth is unavailable' });
    await firstSummary.focus();
    await expect(firstSummary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(firstAnswer).toBeVisible();

    // Space closes it again, and Tab reaches the next question.
    await page.keyboard.press('Space');
    await expect(firstAnswer).toBeHidden();

    const secondSummary = section.locator('summary', { hasText: 'The Bluetooth window shows no ring' });
    await secondSummary.focus();
    await page.keyboard.press('Space');
    await expect(section.getByText('The window only lists nearby devices that are advertising.', { exact: false })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('links from other screens open the right place in Help', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await openPage(page, '/dashboard/connect');
    await page.getByRole('main').getByRole('link', { name: 'Read the full troubleshooting guide' }).click();
    await expect(page).toHaveURL(/\/dashboard\/help#troubleshooting$/);
    await waitForPage(page);
    const section = page.getByRole('main').getByRole('region', { name: 'Troubleshooting' });
    await expect(section).toBeFocused();
    await expect(section).toBeInViewport();
    await expect(politeAnnouncer(page)).toContainText('Help');

    // A deep link to one answer opens it.
    await openPage(page, '/dashboard/help#bluetooth-unavailable');
    await expect(
      page.getByRole('main').getByText('Connecting a ring uses Web Bluetooth, which only some browsers offer.'),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });
});
