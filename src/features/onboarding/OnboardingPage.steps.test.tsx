/**
 * The three steps before the last one: the hand choice, the preferences, and
 * the one real command. The last step has its own file
 * (OnboardingPage.finish.test.tsx), and the frame around every step is covered
 * by OnboardingPage.test.tsx.
 */
import { screen, waitFor, within } from '@/test/renderApp';
import {
  AUDIO_DESCRIPTION,
  CONTRAST_DESCRIPTION,
  FIRST_COMMAND_DEMO_NOTE,
  FIRST_COMMAND_DONE,
  FIRST_COMMAND_DONE_TITLE,
  FIRST_COMMAND_HARDWARE_NOTE,
  FIRST_COMMAND_LEDE,
  FIRST_COMMAND_NO_ATTEMPT,
  FIRST_COMMAND_OFFLINE,
  FIRST_COMMAND_SKIPPABLE,
  FIRST_COMMAND_STEPS,
  HAND_LEDE,
  HAND_QUESTION,
  MORE_IN_SETTINGS,
  PREFERENCES_LEDE,
  SETUP_HONESTY,
  TEXT_SIZE_HINT,
} from './onboardingCopy';
import { stepIndexOf } from './onboardingFlow';
import { politeRegion, renderOnboarding, storedPreferences } from './testing/renderOnboarding';

const LONGER_TIME_DESCRIPTION =
  'After a squeeze, the command window stays open for 3 seconds. Switch this on to keep it open for 6 seconds in Demo Mode. A Bluetooth bench ring keeps its own 3-second window.';

/**
 * Opens the command window the way a person does — squeeze, wait for the
 * window to open, then tap a point.
 */
async function squeezeAndTap(user: Awaited<ReturnType<typeof renderOnboarding>>['user'], pointName: RegExp): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
  await screen.findByRole('progressbar', { name: 'Command window time left' });
  await user.click(screen.getByRole('button', { name: pointName }));
}

describe('Step 1: which hand', () => {
  it('asks one question, says what is simulated, and mirrors the preview as the hand changes', async () => {
    const { user, storage } = await renderOnboarding();
    expect(screen.getByText(HAND_LEDE)).toBeInTheDocument();
    expect(screen.getByText(SETUP_HONESTY)).toBeInTheDocument();

    const group = screen.getByRole('group', { name: HAND_QUESTION });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['left', 'right']);
    // Each option says what it means for the hand, not just which word is highlighted.
    expect(within(group).getByRole('radio', { name: 'Left' })).toHaveAccessibleDescription(
      'Ring on your left index finger. Your left thumb taps.',
    );
    expect(within(group).getByRole('radio', { name: 'Right' })).toBeChecked();
    expect(
      screen.getByRole('figure', { name: 'Preview: right hand, palm facing you. The ring sits on the index finger.' }),
    ).toHaveAttribute('data-hand', 'right');

    await user.click(within(group).getByRole('radio', { name: 'Left' }));
    expect(
      screen.getByRole('figure', { name: 'Preview: left hand, palm facing you. The ring sits on the index finger.' }),
    ).toHaveAttribute('data-hand', 'left');
    expect(storedPreferences(storage).hand).toBe('left');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Hand set to Left.'));
  });
});

describe('Step 2: a few preferences', () => {
  const atPreferences = { preferences: { onboardingStep: stepIndexOf('preferences') } };

  it('applies larger text at once, saves it and announces it', async () => {
    const { user, storage } = await renderOnboarding(atPreferences);
    expect(screen.getByText(PREFERENCES_LEDE)).toBeInTheDocument();
    expect(screen.getByText(TEXT_SIZE_HINT)).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-text-size');

    const textSize = screen.getByRole('group', { name: 'Text size' });
    expect(within(textSize).getByRole('radio', { name: 'Default' })).toBeChecked();
    await user.click(within(textSize).getByRole('radio', { name: 'Larger' }));

    expect(document.documentElement).toHaveAttribute('data-text-size', 'larger');
    expect(storedPreferences(storage).textSize).toBe('larger');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Text size set to Larger.'));
  });

  it('binds every switch on the step live to preferences, under one heading', async () => {
    const { user, storage } = await renderOnboarding(atPreferences);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Reading, speech and time']);

    const contrast = screen.getByRole('switch', { name: 'Increased contrast' });
    expect(contrast).toHaveAccessibleDescription(CONTRAST_DESCRIPTION);
    await user.click(contrast);
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Increased contrast on.'));

    const audio = screen.getByRole('switch', { name: 'Audio announcements' });
    expect(audio).toHaveAccessibleDescription(AUDIO_DESCRIPTION);
    await user.click(audio);
    expect(audio).toHaveAttribute('aria-checked', 'true');

    const longer = screen.getByRole('switch', { name: 'Longer interaction time' });
    expect(longer).toHaveAccessibleDescription(LONGER_TIME_DESCRIPTION);
    await user.click(longer);
    expect(longer).toHaveAttribute('aria-checked', 'true');
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Longer interaction time on. The command window stays open for 6 seconds.'),
    );

    expect(storedPreferences(storage)).toMatchObject({
      contrast: 'high',
      audioAnnouncements: true,
      longerInteractionTime: true,
    });
  });

  it('keeps the settings it no longer asks about editable, and says where they are', async () => {
    await renderOnboarding(atPreferences);
    // Reduced motion, on-screen confirmation and vibration left setup for Settings, which the step names.
    for (const name of ['Reduce motion', 'Visual confirmation', 'Haptic feedback']) {
      expect(screen.queryByRole('switch', { name })).not.toBeInTheDocument();
    }
    expect(screen.getByText(MORE_IN_SETTINGS)).toBeInTheDocument();
    expect(MORE_IN_SETTINGS).toContain('reduced motion');
    expect(MORE_IN_SETTINGS).toContain('on-screen confirmation');
    expect(MORE_IN_SETTINGS).toContain('vibration on this phone');
    // Nothing chosen here is final, including the four on the step.
    expect(PREFERENCES_LEDE).toContain('change them any time in Settings');
  });

  it('tells a Bluetooth ring user that the longer window belongs to Demo Mode', async () => {
    const { user } = await renderOnboarding({ ...atPreferences, deviceMode: 'hardware' });

    const longer = screen.getByRole('switch', { name: 'Longer interaction time' });
    // The switch names Demo Mode and the bench ring's own window, so the 6 seconds are never promised to a ring.
    expect(longer).toHaveAccessibleDescription(/6 seconds in Demo Mode\. A Bluetooth bench ring keeps its own 3-second window\./);
    await user.click(longer);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Longer interaction time on. It applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window.',
      ),
    );
  });
});

describe('Step 3: your first command', () => {
  const atFirstCommand = { preferences: { onboardingStep: stepIndexOf('first_command') } };

  it('asks for one command on the simulated ring and says nothing has been measured', async () => {
    await renderOnboarding(atFirstCommand);
    expect(screen.getByText(FIRST_COMMAND_LEDE)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(expect.arrayContaining([...FIRST_COMMAND_STEPS]));
    expect(screen.getByText(FIRST_COMMAND_DEMO_NOTE)).toBeInTheDocument();
    expect(screen.getByText('Simulated — no phone is involved')).toBeInTheDocument();
    expect(screen.getByText(FIRST_COMMAND_NO_ATTEMPT)).toBeInTheDocument();
    expect(screen.queryByText(FIRST_COMMAND_DONE_TITLE)).not.toBeInTheDocument();
    // The step can be skipped, and says where else the command can be practised.
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
    expect(screen.getByText(FIRST_COMMAND_SKIPPABLE)).toBeInTheDocument();
  });

  it('confirms the command when it lands on the point asked for, and keeps the ring on screen', async () => {
    const { user } = await renderOnboarding(atFirstCommand);
    await squeezeAndTap(user, /^Index fingertip, Confirm, target/);

    expect(await screen.findByText(FIRST_COMMAND_DONE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(FIRST_COMMAND_DONE)).toBeInTheDocument();
    expect(FIRST_COMMAND_DONE).toContain('Nothing was sent to a phone');
    expect(within(screen.getByRole('main')).getByText('Confirm on the index fingertip. That is the command.')).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Confirm on the index fingertip. That is the command.'));
    // Nothing that had focus disappears: the command can be run again.
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toBeInTheDocument();
  });

  it('names where a tap landed instead, and asks again', async () => {
    const { user } = await renderOnboarding(atFirstCommand);
    await squeezeAndTap(user, /^Index finger base/);

    expect(
      await screen.findByText('That was Dismiss / Back, on the index finger base. Try again: squeeze, then tap the index fingertip.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(FIRST_COMMAND_DONE_TITLE)).not.toBeInTheDocument();
  });

  it('keeps the success when the user steps away and comes back', async () => {
    const { user } = await renderOnboarding(atFirstCommand);
    await squeezeAndTap(user, /^Index fingertip, Confirm, target/);
    expect(await screen.findByText(FIRST_COMMAND_DONE_TITLE)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(FIRST_COMMAND_DONE_TITLE)).toBeInTheDocument();
  });

  it('says no tap can arrive when a Bluetooth ring is chosen and not connected', async () => {
    await renderOnboarding({ ...atFirstCommand, deviceMode: 'hardware' });
    expect(screen.getByText('No ring is connected')).toBeInTheDocument();
    expect(screen.getByText(FIRST_COMMAND_OFFLINE)).toBeInTheDocument();
    expect(screen.getByText(FIRST_COMMAND_HARDWARE_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(FIRST_COMMAND_DEMO_NOTE)).not.toBeInTheDocument();
    // There is still a way on: the step is optional.
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
  });
});
