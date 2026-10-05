/**
 * Sign-up, sign-in, sign-out and the eight-step onboarding flow, end to end,
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

const ROBIN = { name: 'Robin Vale', email: 'robin@example.com' };
const APP_ORIGIN = 'http://localhost:5188';

const DEMO_NOT_FOUND = 'No local profile uses that email on this device. Create one, or continue as a guest.';
const DEMO_NO_PASSWORDS = 'Demo Mode keeps no passwords, so there is nothing to reset. Sign in with just your email.';
const SIGNED_OUT = 'You have signed out.';
const LESSON_DONE = 'Lesson complete. You practised opening the command window on purpose.';

test.describe('Sign up and onboarding', () => {
  test('a new user creates a Demo Mode profile and lands on step 1 of 8', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    await recordAnnouncements(page);

    await page.goto('/sign-up');
    await expect(page).toHaveTitle('Create your profile · Tactiq');
    await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible();
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
    await expect(page.getByText('Simulated', { exact: true }).first()).toBeVisible();
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

  test('walks all eight steps with keyboard and mouse, finishing the squeeze lesson for real', async ({
    newUserPage: page,
  }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    await createDemoProfile(page, ROBIN);
    const html = page.locator('html');
    const status = politeAnnouncer(page);
    const h1 = page.getByRole('heading', { level: 1 });
    // Visible text is looked up inside main: the live regions sit outside it.
    const main = page.getByRole('main');

    // Step 1 — Welcome: continue with the keyboard.
    await expect(page.getByRole('region', { name: 'How it would work' })).toBeVisible();
    await continueButton(page).focus();
    await page.keyboard.press('Enter');
    await expectOnboardingStep(page, 2);
    await expect(h1).toBeFocused();
    await expect(status).toContainText('Step 2 of 8: Accessibility preferences.');

    // Back returns to step 1, Continue (mouse) comes forward again.
    await page.getByRole('button', { name: 'Back' }).click();
    await expectOnboardingStep(page, 1);
    await continueButton(page).click();
    await expectOnboardingStep(page, 2);

    // Step 2 — Accessibility preferences: pick Large text with the arrow keys.
    const textSize = page.getByRole('group', { name: 'Text size' });
    await expect(textSize.getByRole('radio', { name: 'Default', exact: true })).toBeChecked();
    await expect(html).not.toHaveAttribute('data-text-size', /.+/);
    await textSize.getByRole('radio', { name: 'Default', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(textSize.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
    await expect(html).toHaveAttribute('data-text-size', 'large');
    await expect(status).toContainText('Text size set to Large.');
    await continueButton(page).click();

    // Step 3 — Which hand: choose Left with the mouse; the preview mirrors.
    await expectOnboardingStep(page, 3);
    await expect(page.getByRole('radio', { name: 'Right', exact: true })).toBeChecked();
    await expect(page.getByRole('figure', { name: 'Preview: right hand, palm facing you.' })).toBeVisible();
    await page.getByRole('radio', { name: 'Left', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Left', exact: true })).toBeChecked();
    await expect(page.getByRole('figure', { name: 'Preview: left hand, palm facing you.' })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Preview: right hand, palm facing you.' })).toHaveCount(0);
    await expect(status).toContainText('Hand set to Left.');
    await continueButton(page).focus();
    await page.keyboard.press('Space');

    // Step 4 — Demo Mode or a ring: keep Demo Mode.
    await expectOnboardingStep(page, 4);
    const deviceGroup = page.getByRole('group', { name: 'How will you use Tactiq?' });
    await expect(deviceGroup.getByRole('radio', { name: 'Demo Mode (recommended while no ring exists)' })).toBeChecked();
    await expect(deviceGroup.getByRole('radio', { name: 'Bluetooth ring' })).not.toBeChecked();
    await expect(main.getByText('Simulated', { exact: true }).first()).toBeVisible();
    await continueButton(page).click();

    // Step 5 — Calibration intro: the primary action means "later"; there is no separate skip.
    await expectOnboardingStep(page, 5);
    await expect(page.getByRole('link', { name: 'Open calibration now' })).toHaveAttribute('href', '/dashboard/calibrate');
    await expect(page.getByRole('button', { name: 'Skip this step' })).toHaveCount(0);
    await continueButton(page, 'Calibrate after setup').click();

    // Step 6 — Feedback: the try-it buttons respond and nothing breaks.
    await expectOnboardingStep(page, 6);
    await page.getByRole('button', { name: 'Hear an announcement' }).click();
    await expect(main.getByText('Announced: “Next.”')).toBeVisible();
    await expect(status).toContainText('Next.');
    const tryVibration = page.getByRole('button', { name: 'Try a vibration' });
    if ((await tryVibration.count()) > 0) {
      await tryVibration.click();
      // Haptic feedback is off in this profile, so the page says nothing vibrated.
      await expect(main.getByText(/Haptic feedback is switched off, so nothing vibrated\./)).toBeVisible();
      await expect(status).toContainText('Haptic feedback is switched off');
    } else {
      await expect(main.getByText(/This browser or device does not allow vibration/)).toBeVisible();
    }
    await expect(h1).toHaveText('Feedback');
    await continueButton(page).click();

    // Step 7 — First lesson: Squeeze to activate, three squeeze steps.
    await expectOnboardingStep(page, 7);
    await page.getByRole('button', { name: 'Start lesson' }).click();
    const squeeze = page.getByRole('button', { name: 'Squeeze the ring' });

    const step1 = page.getByRole('heading', { name: 'Step 1 of 3: Squeeze the ring to open the command window.' });
    await expect(step1).toBeVisible();
    await expect(step1).toBeFocused();
    await squeeze.click();
    await expect(main.getByText('Correct', { exact: true })).toBeVisible();
    await expect(status).toContainText('Correct. Command window open for 3 seconds.');
    // A squeeze step moves on by itself once the three-second window has closed.
    const step2 = page.getByRole('heading', { name: /^Step 2 of 3: Squeeze again\./ });
    await expect(step2).toBeVisible({ timeout: 10_000 });

    await expect(main.getByText('Command window closed. Squeeze to open it.')).toBeVisible();
    await squeeze.click();
    await expect(main.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next step' }).click();

    const step3 = page.getByRole('heading', { name: /^Step 3 of 3: One more squeeze/ });
    await expect(step3).toBeVisible();
    await expect(main.getByText('Command window closed. Squeeze to open it.')).toBeVisible();
    await squeeze.click();
    await expect(main.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Finish lesson' }).click();

    const summary = page.getByRole('heading', { name: 'Lesson complete', exact: true });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(main.getByText(/with no retries\./)).toBeVisible();
    await expect(main.getByText(LESSON_DONE)).toBeVisible();
    await continueButton(page).click();

    // Step 8 — All set: the summary reflects the choices; no Skip setup is left.
    await expectOnboardingStep(page, 8);
    const choices = page.getByRole('region', { name: 'Your choices' });
    await expect(choices.getByRole('definition')).toHaveText([
      'Left hand',
      'Demo Mode (simulated ring)',
      'Large',
      'Off',
      'Off — the command window stays open for 3 seconds',
    ]);
    await expect(page.getByRole('button', { name: 'Skip setup' })).toHaveCount(0);
    await continueButton(page, 'Go to the dashboard').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page).toHaveTitle('Home · Tactiq');
    await expect(h1).toHaveText(greeting('Robin'));
    // The lesson finished in setup counts, and setup is no longer offered as the next step.
    await expect(page.getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', '1 of 5');
    const nextStep = page.getByRole('region', { name: 'What to do next' });
    await expect(nextStep.getByRole('link', { name: 'Resume setup' })).toHaveCount(0);
    await expect(nextStep.getByRole('link', { name: 'Calibrate your ring' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('leaving the first lesson offers a way back in, with focus on it', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { onboardingCompleted: false, preferences: { onboardingStep: 6 } });
    await page.goto('/onboarding');
    await expectOnboardingStep(page, 7);

    await page.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.getByRole('button', { name: 'Squeeze the ring' })).toBeVisible();
    await page.getByRole('button', { name: 'Exit lesson' }).click();

    const main = page.getByRole('main');
    await expect(main.getByText('You left the lesson. Start it again, or continue when you are ready.')).toBeVisible();
    const restart = page.getByRole('button', { name: 'Start the lesson again' });
    await expect(restart).toBeFocused();
    await restart.click();
    await expect(page.getByRole('heading', { level: 2, name: 'Lesson 1: Squeeze to activate' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Start lesson' })).toBeVisible();
    // Leaving the lesson does not block setup.
    await continueButton(page).click();
    await expectOnboardingStep(page, 8);
    expect(errors).toEqual([]);
  });

  test('leaving setup for calibration resumes after the calibration step', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await seedStorage(page, { onboardingCompleted: false, preferences: { onboardingStep: 4 } });
    await page.goto('/onboarding');
    await expectOnboardingStep(page, 5);

    await page.getByRole('link', { name: 'Open calibration now' }).click();
    await expect(page).toHaveURL(/\/dashboard\/calibrate$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Calibrate · Tactiq');

    await page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const nextStep = page.getByRole('region', { name: 'What to do next' });
    await expect(nextStep).toContainText('Setup stopped at step 6 of 8 (Feedback)');
    await nextStep.getByRole('link', { name: 'Resume setup' }).click();
    await expectOnboardingStep(page, 6);
    expect(errors).toEqual([]);
  });

  test('a second new profile in the same browser starts setup at step 1', async ({ newUserPage: page }) => {
    const errors = trackConsoleErrors(page);
    // First person: creates a profile and finishes setup straight away.
    await createDemoProfile(page, ROBIN);
    for (let step = 1; step < 8; step += 1) {
      await continueButton(page, step === 5 ? 'Calibrate after setup' : 'Continue').click();
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

    await continueButton(page).click();
    await expectOnboardingStep(page, 2);
    await page.getByRole('group', { name: 'Text size' }).getByRole('radio', { name: 'Large', exact: true }).check();
    await continueButton(page).click();
    await expectOnboardingStep(page, 3);
    await page.getByRole('radio', { name: 'Left', exact: true }).check();
    await continueButton(page).click();
    await expectOnboardingStep(page, 4);
    await page.getByRole('button', { name: 'Skip this step' }).click();
    await expectOnboardingStep(page, 5);
    await continueButton(page, 'Calibrate after setup').click();
    await expectOnboardingStep(page, 6);
    await page.getByRole('button', { name: 'Skip this step' }).click();
    await expectOnboardingStep(page, 7);
    await page.getByRole('button', { name: 'Skip this step' }).click();
    await expectOnboardingStep(page, 8);
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
    await expect(nextStep).toContainText('Setup stopped at step 1 of 8 (Welcome)');
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
