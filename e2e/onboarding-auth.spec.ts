/**
 * Sign-up, sign-in, sign-out and the four-step setup flow, end to end,
 * in Demo Mode (no account backend configured).
 */
import { test, expect, seedStorage, trackConsoleErrors } from './fixtures';
import {
  assertiveAnnouncer,
  continueButton,
  createDemoProfile,
  expectAnnounced,
  expectOnboardingStep,
  greeting,
  isNarrow,
  politeAnnouncer,
  recordAnnouncements,
} from './helpers/onboarding';
// Setup's first-command step is the practice surface the rest of the app uses,
// so it is driven with the same helpers as the practice screens.
import { contactButton, squeezeAndWaitForWindow } from './helpers/practice';

const ROBIN = { name: 'Robin Vale', email: 'robin@example.com' };
const APP_ORIGIN = 'http://localhost:5188';

const DEMO_NOT_FOUND = 'No local profile uses that email on this device. Create one, or continue as a guest.';
const DEMO_NO_PASSWORDS = 'Demo Mode keeps no passwords, so there is nothing to reset. Sign in with just your email.';
const SIGNED_OUT = 'You have signed out.';
const FIRST_COMMAND_CORRECT = 'Confirm on the index fingertip. That is the command.';
const FIRST_COMMAND_DONE = 'You have run your first command';

test.describe('Sign up and onboarding', () => {
  test('a new user creates a Demo Mode profile and lands on step 1 of 4', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await recordAnnouncements(page);

    await page.goto('/sign-up');
    // The page is lazy-loaded from a shared dev server, so its first render is given
    // room; everything asserted after it is about the page, not about loading.
    await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveTitle('Create your profile · Tactiq');
    await expect(page.getByRole('note').filter({ hasText: 'Demo Mode' })).toContainText('No password is stored or checked');
    // Demo Mode has no password fields.
    await expect(page.getByLabel('Password')).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Name' }).fill(ROBIN.name);
    await page.getByRole('textbox', { name: 'Email' }).fill(ROBIN.email);
    await page.getByRole('button', { name: 'Create profile' }).click();

    await expectOnboardingStep(page, 1);
    await expect(page).toHaveTitle('Set up Tactiq · Tactiq');
    await expectAnnounced(page, 'Profile created.');
    // The first step has no Back, but Help and Skip setup are always offered.
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Help' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();
    // The honesty note is made once, on the first step, and names the length of setup.
    await expect(page.getByText('Simulated', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Setup takes four short steps');
    expect(errors).toEqual([]);
  });

  test('sign-up explains a missing name and an invalid email beside the fields', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-up');
    await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
    await page.getByRole('button', { name: 'Create profile' }).click();

    const name = page.getByRole('textbox', { name: 'Name' });
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription(/Enter a name so we know what to call you\./);
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      /Enter an email address like name@example\.com\./,
    );
    await expect(page).toHaveURL(/\/sign-up$/);
    expect(errors).toEqual([]);
  });

  test('walks all four steps with keyboard and mouse, running the first command for real', async ({
    newUserPage: page,
  }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    await recordAnnouncements(page);
    // Sign-up is loaded once before createDemoProfile, whose own waits are at the
    // default timeout and would otherwise be measuring a cold lazy-loaded page.
    await page.goto('/sign-up');
    await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible({ timeout: 20_000 });
    await createDemoProfile(page, ROBIN);
    const html = page.locator('html');
    const status = politeAnnouncer(page);
    const h1 = page.getByRole('heading', { level: 1 });
    // Visible text is looked up inside main: the live regions sit outside it.
    const main = page.getByRole('main');

    // Step 1 — Which hand: choose Left with the mouse; the preview mirrors.
    await expect(page.getByRole('group', { name: 'Which hand will wear the ring?' })).toBeVisible();
    const rightPreview = page.getByRole('figure', {
      name: 'Preview: right hand, palm facing you. The ring sits on the index finger.',
    });
    const leftPreview = page.getByRole('figure', {
      name: 'Preview: left hand, palm facing you. The ring sits on the index finger.',
    });
    await expect(page.getByRole('radio', { name: 'Right', exact: true })).toBeChecked();
    await expect(rightPreview).toBeVisible();
    await page.getByRole('radio', { name: 'Left', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Left', exact: true })).toBeChecked();
    await expect(leftPreview).toBeVisible();
    await expect(rightPreview).toHaveCount(0);
    await expect(status).toContainText('Hand set to Left.');

    // Continue with the keyboard; the new step takes focus and says where it is.
    await continueButton(page).focus();
    await page.keyboard.press('Enter');
    await expectOnboardingStep(page, 2);
    await expect(h1).toBeFocused();
    await expect(status).toContainText('Step 2 of 4: A few preferences.');

    // Back returns to step 1, Continue (mouse) comes forward again.
    await page.getByRole('button', { name: 'Back' }).click();
    await expectOnboardingStep(page, 1);
    await continueButton(page).click();
    await expectOnboardingStep(page, 2);

    // Step 2 — A few preferences: pick Large text with the arrow keys.
    const textSize = page.getByRole('group', { name: 'Text size' });
    await expect(textSize.getByRole('radio', { name: 'Default', exact: true })).toBeChecked();
    await expect(html).not.toHaveAttribute('data-text-size', /.+/);
    await textSize.getByRole('radio', { name: 'Default', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(textSize.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
    await expect(html).toHaveAttribute('data-text-size', 'large');
    await expect(status).toContainText('Text size set to Large.');

    // Setup's switches each apply at once and say what changed; the summary on the
    // last step is read back from what they saved.
    const contrast = page.getByRole('switch', { name: 'Increased contrast' });
    await contrast.click();
    await expect(contrast).toBeChecked();
    await expect(html).toHaveAttribute('data-contrast', 'high');
    await expect(status).toContainText('Increased contrast on.');
    const longerTime = page.getByRole('switch', { name: 'Longer interaction time' });
    await longerTime.click();
    await expect(longerTime).toBeChecked();
    await expect(status).toContainText('Longer interaction time on. The command window stays open for 6 seconds.');
    await continueButton(page).focus();
    await page.keyboard.press('Space');

    // Step 3 — Your first command: one real Confirm on the simulated ring.
    await expectOnboardingStep(page, 3);
    await expect(main.getByText('None yet. Squeeze, then tap the point marked Target.')).toBeVisible();
    // A squeeze only opens the command window after the gate hold, so the tap waits for it.
    await squeezeAndWaitForWindow(page);
    await contactButton(main, 'Index fingertip').click();
    await expect(main.getByText(FIRST_COMMAND_CORRECT)).toBeVisible();
    await expectAnnounced(page, FIRST_COMMAND_CORRECT);
    await expect(main.getByText(FIRST_COMMAND_DONE)).toBeVisible();
    await continueButton(page).click();

    // Step 4 — You are ready: the summary reflects the choices; no Skip setup is left.
    await expectOnboardingStep(page, 4);
    const choices = page.getByRole('region', { name: 'Your choices' });
    await expect(choices.getByRole('definition')).toHaveText([
      'Left hand',
      'Demo Mode (simulated ring)',
      'Large',
      'On',
      'Off',
      'On — the command window stays open for 6 seconds',
    ]);
    await expect(page.getByRole('button', { name: 'Skip setup' })).toHaveCount(0);
    // Setup ends by pointing at the screens that used to be steps of its own.
    const whatNext = page.getByRole('region', { name: 'What to do next' });
    await expect(whatNext.getByRole('link', { name: 'Start training' })).toBeVisible();
    await expect(whatNext.getByRole('link', { name: 'Rehearse calibration' })).toHaveAttribute(
      'href',
      '/dashboard/calibrate',
    );
    await continueButton(page, 'Go to the dashboard').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page).toHaveTitle('Home · Tactiq');
    await expect(h1).toHaveText(greeting('Robin'));
    // The first command is not a lesson, so training is still untouched — and setup
    // is no longer offered as the next step.
    await expect(page.getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', '0 of 5');
    const nextStep = page.getByRole('region', { name: 'What to do next' });
    await expect(nextStep.getByRole('link', { name: 'Resume setup' })).toHaveCount(0);
    await expect(nextStep.getByRole('link', { name: 'Calibrate your ring' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  // Setup no longer runs a lesson that can be exited, so there is nothing to offer a
  // way back into: the ring surface stays on screen and the command can be run again.
  // What has to survive instead is the record that it was run, when setup moves off
  // the step and back.
  test('the first command stays done when setup moves off the step and back', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { onboardingCompleted: false, preferences: { onboardingStep: 2 } });
    await page.goto('/onboarding');
    // Setup is lazy-loaded on a shared dev server, so the first render is given room;
    // every assertion after it is then about behaviour rather than about loading.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectOnboardingStep(page, 3);
    const main = page.getByRole('main');

    await squeezeAndWaitForWindow(page);
    await contactButton(main, 'Index fingertip').click();
    const done = main.getByText(FIRST_COMMAND_DONE);
    await expect(done).toBeVisible();

    // Exact: a contact point on this step carries the Dismiss / Back command.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expectOnboardingStep(page, 2);
    await continueButton(page).click();
    await expectOnboardingStep(page, 3);
    await expect(done).toBeVisible();
    await expect(page.getByRole('button', { name: 'Squeeze the ring' })).toBeVisible();

    // The step is optional, so running the command is never a condition of finishing.
    await continueButton(page).click();
    await expectOnboardingStep(page, 4);
    expect(errors).toEqual([]);
  });

  // Calibration used to be a step of setup with a link out to it. It is a screen of
  // its own now, so what this checks is that reaching it does not lose the step setup
  // got to: the dashboard still names that step and resumes there.
  test('leaving setup for calibration resumes at the step setup reached', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { onboardingCompleted: false, preferences: { onboardingStep: 2 } });
    await page.goto('/onboarding');
    // As above: the cold first render is given room, the rest of the test is not.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectOnboardingStep(page, 3);

    // Unfinished setup gates the dashboard, so leaving setup is the way to calibration.
    await page.getByRole('button', { name: 'Skip setup' }).click();
    await page
      .getByRole('dialog', { name: 'Skip setup?' })
      .getByRole('button', { name: 'Skip setup', exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/dashboard/calibrate');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Calibrate · Tactiq');

    await page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const nextStep = page.getByRole('region', { name: 'What to do next' });
    await expect(nextStep).toContainText('Setup stopped at step 3 of 4 (Your first command)');
    await nextStep.getByRole('link', { name: 'Resume setup' }).click();
    await expectOnboardingStep(page, 3);
    expect(errors).toEqual([]);
  });

  test('a second new profile in the same browser starts setup at step 1', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    // First person: creates a profile and finishes setup straight away.
    await createDemoProfile(page, ROBIN);
    for (let step = 1; step < 4; step += 1) {
      await continueButton(page).click();
      await expectOnboardingStep(page, step + 1);
    }
    await continueButton(page, 'Go to the dashboard').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // They sign out; a second person creates their own profile in the same browser.
    await page.goto('/dashboard/settings');
    await page.getByRole('main').getByRole('region', { name: 'Account' }).getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByRole('link', { name: 'Create a profile' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Alex Morgan');
    await page.getByRole('textbox', { name: 'Email' }).fill('alex@example.com');
    await page.getByRole('button', { name: 'Create profile' }).click();

    // A brand-new profile has made no choices, so it must not be told "Setup is finished. Here is what you chose."
    await expectOnboardingStep(page, 1);
    expect(errors).toEqual([]);
  });

  test('after a reload setup stays finished, text stays Large and the hand stays Left', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await createDemoProfile(page, ROBIN);

    await page.getByRole('radio', { name: 'Left', exact: true }).check();
    await continueButton(page).click();
    await expectOnboardingStep(page, 2);
    await page.getByRole('group', { name: 'Text size' }).getByRole('radio', { name: 'Large', exact: true }).check();
    await continueButton(page).click();
    await expectOnboardingStep(page, 3);
    await page.getByRole('button', { name: 'Skip this step' }).click();
    await expectOnboardingStep(page, 4);
    await continueButton(page, 'Go to the dashboard').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greeting('Robin'));
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
    // Setup was finished, so the dashboard does not suggest resuming it.
    await expect(page.getByRole('link', { name: 'Resume setup' })).toHaveCount(0);

    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
    await expect(
      page.getByRole('group', { name: 'Text size' }).getByRole('radio', { name: 'Large', exact: true }),
    ).toBeChecked();
    const hand = page.getByRole('group', { name: 'Hand you wear the ring on' });
    await expect(hand.getByRole('radio', { name: 'Left', exact: true })).toBeChecked();
    await expect(hand.getByRole('radio', { name: 'Right', exact: true })).not.toBeChecked();
    await expect(page.getByRole('figure', { name: 'Preview: left hand, palm facing you.' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('leaving setup at step 3 through Help resumes at step 3', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await createDemoProfile(page, ROBIN);
    await continueButton(page).click();
    await expectOnboardingStep(page, 2);
    await continueButton(page).click();
    await expectOnboardingStep(page, 3);

    await page.getByRole('banner').getByRole('link', { name: 'Help' }).click();
    await expect(page).toHaveURL(/\/dashboard\/help$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();

    await page.goBack();
    await expectOnboardingStep(page, 3);

    // A fresh load of /onboarding resumes at the same step.
    await page.goto('/onboarding');
    await expectOnboardingStep(page, 3);

    // Unfinished setup still gates the dashboard, and the gate lands on the saved step.
    await page.goto('/dashboard');
    await expectOnboardingStep(page, 3);
    expect(errors).toEqual([]);
  });

  test('Skip setup asks to confirm, then the dashboard offers Resume setup', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await createDemoProfile(page, ROBIN);

    const skipSetup = page.getByRole('button', { name: 'Skip setup' });
    await skipSetup.click();
    const dialog = page.getByRole('dialog', { name: 'Skip setup?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription('You can finish it later from the dashboard.');

    // Keep setting up closes the dialog, stays on step 1 and returns focus to the opener.
    await dialog.getByRole('button', { name: 'Keep setting up' }).click();
    await expect(dialog).toHaveCount(0);
    await expectOnboardingStep(page, 1);
    await expect(skipSetup).toBeFocused();

    await skipSetup.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Skip setup', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greeting('Robin'));
    const nextStep = page.getByRole('region', { name: 'What to do next' });
    await expect(nextStep).toContainText('Setup stopped at step 1 of 4 (Which hand)');
    const resume = nextStep.getByRole('link', { name: 'Resume setup' });
    await expect(resume).toBeVisible();

    // A reload keeps the skip (the dashboard is not gated any more).
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await resume.click();
    await expectOnboardingStep(page, 1);
    expect(errors).toEqual([]);
  });
});

test.describe('Sign in and sign out', () => {
  test('signing in with an unknown email shows an alert and stays on sign-in', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill('nobody@example.com');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText(DEMO_NOT_FOUND);
    await expect(alert).toBeFocused();
    await expect(page).toHaveURL(/\/sign-in$/);
    // The FeedbackProvider's own alert region stays quiet: the in-page alert carries the message.
    await expect(assertiveAnnouncer(page)).not.toContainText('Signed in');
    expect(errors).toEqual([]);
  });

  test('continue as a guest signs in and opens setup', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await recordAnnouncements(page);
    await page.goto('/sign-in');
    await expect(page.getByText('Opens a guest profile in this browser. No email needed.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue as a guest' }).click();

    await expectOnboardingStep(page, 1);
    await expectAnnounced(page, 'Signed in as a guest.');

    // The guest profile is a real session: it survives a reload.
    await page.reload();
    await expectOnboardingStep(page, 1);
    expect(errors).toEqual([]);
  });

  test('sign out from Settings returns to sign-in with the signed-out confirmation', async ({
    signedInPage: page,
  }) => {
    const errors = trackConsoleErrors(page);
    await recordAnnouncements(page);
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    const account = page.getByRole('main').getByRole('region', { name: 'Account' });
    await expect(account).toContainText('sam@example.com');
    await account.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('status')).toContainText(SIGNED_OUT);

    // Signed out for real: the dashboard is locked again.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
    // A later visit to sign-in does not repeat the confirmation.
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByText(SIGNED_OUT)).toHaveCount(0);

    // The same profile signs back in by email alone and returns to the page it asked for.
    await page.getByRole('textbox', { name: 'Email' }).fill('sam@example.com');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greeting('Sam'));
    await expectAnnounced(page, 'Signed in as Sam.');
    expect(errors).toEqual([]);
  });

  test('sign out from the navigation (sidebar or More menu) returns to sign-in', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greeting('Sam'));

    if (isNarrow(page)) {
      await page.getByRole('button', { name: 'More' }).click();
      const more = page.getByRole('dialog', { name: 'More' });
      await expect(more).toContainText('Sam');
      await more.getByRole('button', { name: 'Sign out' }).click();
    } else {
      const account = page.getByRole('region', { name: 'Account' });
      await expect(account).toContainText('Sam');
      await account.getByRole('button', { name: 'Sign out' }).click();
    }

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('main').getByRole('status')).toContainText(SIGNED_OUT);

    // A refresh does not repeat the confirmation.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByText(SIGNED_OUT)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('forgot password in Demo Mode explains there are no passwords', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in');
    await expect(page.getByLabel('Password')).toHaveCount(0);
    await page.getByRole('link', { name: 'About passwords in Demo Mode' }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
    await expect(page.getByText(DEMO_NO_PASSWORDS)).toBeVisible();
    // No email form: nothing is sent in Demo Mode.
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send reset link' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in with your email' })).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('link', { name: 'Create a new profile' })).toHaveAttribute('href', '/sign-up');

    await page.getByRole('link', { name: 'Create a new profile' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('The next parameter stays on this site', () => {
  const unsafeNext = ['//evil.example', 'https://evil.example/', '/\\evil.example'];

  for (const next of unsafeNext) {
    test(`next=${next} is ignored after guest sign-in`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      const offSite: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).origin !== APP_ORIGIN) offSite.push(request.url());
      });

      await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue as a guest' }).click();

      // A new guest has not finished setup, so the safe fallback (dashboard) is gated to onboarding.
      await expectOnboardingStep(page, 1);
      const url = new URL(page.url());
      expect(url.origin).toBe(APP_ORIGIN);
      expect(url.pathname).toMatch(/^\/(dashboard|onboarding)(\/|$)/);
      expect(offSite.filter((request) => request.includes('evil.example'))).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  // Dot segments that URL normalisation turns into a protocol-relative "//evil.example".
  const dotSegmentNext = ['/.//evil.example', '/dashboard/../..//evil.example'];

  for (const next of dotSegmentNext) {
    test(`next=${next} falls back instead of passing on a //host path`, async ({ newUserPage: page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue as a guest' }).click();

      await expect(page).not.toHaveURL(/\/sign-in/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');
      await expectOnboardingStep(page, 1);
      const url = new URL(page.url());
      expect(url.origin).toBe(APP_ORIGIN);
      expect(url.pathname).toMatch(/^\/(dashboard|onboarding)(\/|$)/);
      expect(errors).toEqual([]);
    });
  }

  test('a safe next path is still honoured', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(`/sign-in?next=${encodeURIComponent('/dashboard/help')}`);
    await page.getByRole('button', { name: 'Continue as a guest' }).click();
    await expect(page).toHaveURL(`${APP_ORIGIN}/dashboard/help`);
    await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('an already signed-in visitor with an unsafe next goes to the dashboard', async ({ signedInPage: page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/sign-in?next=//evil.example');
    await expect(page).toHaveURL(`${APP_ORIGIN}/dashboard`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greeting('Sam'));
    expect(errors).toEqual([]);
  });
});
