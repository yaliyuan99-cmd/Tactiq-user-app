/**
 * The last step: what setup says it has saved, where it sends the user next,
 * and how it ends. The next-step links are read from real training progress,
 * so the same step says different things to different users.
 */
import { LESSON_IDS } from '@/domain/lessons';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import type { DeviceMode } from '@/services/device/types';
import { writePreferences } from '@/services/preferences/storedPreferences';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { screen, within } from '@/test/renderApp';
import { CHOICES_HEADING, DONE_LEDE, NEXT_HEADING } from './onboardingCopy';
import { stepIndexOf } from './onboardingFlow';
import {
  currentPathname,
  profileView,
  renderOnboarding,
  storageWithLessons,
  storedPreferences,
} from './testing/renderOnboarding';

const CHOICES: Partial<UserPreferences> = {
  onboardingStep: ONBOARDING_LAST_STEP,
  hand: 'left',
  textSize: 'large',
  audioAnnouncements: true,
  longerInteractionTime: true,
};

interface DoneStepOptions {
  /** Merged over CHOICES. */
  readonly choices?: Partial<UserPreferences>;
  /** A store already holding other records, e.g. training progress. */
  readonly storage?: MemoryStorageAdapter;
  readonly deviceMode?: DeviceMode;
}

/**
 * Opens setup on the last step for a profile that has already made these
 * choices. They are written as the app writes them — the person's half under
 * the signed-in profile — so they survive this step recording setup as
 * finished, which rewrites the device-wide record with appearance only.
 */
async function renderDoneStep({ choices, storage = new MemoryStorageAdapter(), deviceMode }: DoneStepOptions = {}) {
  const preferences: Partial<UserPreferences> = { ...CHOICES, ...choices };
  writePreferences(profileView(storage), { ...DEFAULT_PREFERENCES, ...preferences });
  return renderOnboarding({ storage, preferences, ...(deviceMode ? { deviceMode } : {}) });
}

function choicesRegion(): HTMLElement {
  return screen.getByRole('region', { name: CHOICES_HEADING });
}

function nextRegion(): HTMLElement {
  return screen.getByRole('region', { name: NEXT_HEADING });
}

describe('Step 4: you are ready', () => {
  it('summarises every choice setup made, and has already recorded setup as finished', async () => {
    const { storage } = await renderDoneStep();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('You are ready');
    expect(screen.getByText(DONE_LEDE)).toBeInTheDocument();

    const choices = choicesRegion();
    expect(within(choices).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Hand',
      'Ring',
      'Text size',
      'Increased contrast',
      'Audio announcements',
      'Longer interaction time',
    ]);
    expect(within(choices).getAllByRole('definition').map((value) => value.textContent)).toEqual([
      'Left hand',
      'Demo Mode (simulated ring)',
      'Large',
      'Off',
      'On',
      'On — the command window stays open for 6 seconds',
    ]);
    // Reaching this step is what records setup as finished, not pressing the button on it.
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('sends the user to Settings to change any of it later', async () => {
    const { user } = await renderDoneStep();
    const settings = within(choicesRegion()).getByRole('link', { name: 'Settings' });
    expect(settings).toHaveAttribute('href', '/dashboard/settings');

    await user.click(settings);
    expect(await screen.findByRole('heading', { name: 'Settings stub' })).toBeInTheDocument();
  });

  it('does not promise a six-second window to someone using a Bluetooth ring', async () => {
    await renderDoneStep({ deviceMode: 'hardware' });
    const choices = choicesRegion();
    expect(
      within(choices).getByText('On — it applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window'),
    ).toBeInTheDocument();
    expect(choices).not.toHaveTextContent('6 seconds');
  });

  it('finishes setup and goes to the dashboard from Go to the dashboard', async () => {
    const { user, storage } = await renderDoneStep();
    await user.click(screen.getByRole('button', { name: 'Go to the dashboard' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('finishes setup before a next-step link opens its page', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('first_command') } });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(within(nextRegion()).getByRole('link', { name: 'Open the simulator' }));

    expect(await screen.findByRole('heading', { name: 'Other page stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard/simulator');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });
});

describe('Step 4: where setup sends the user next', () => {
  it('offers lesson 1 to someone with no training progress at all', async () => {
    await renderDoneStep();
    expect(within(nextRegion()).getByRole('link', { name: 'Start training' })).toHaveAttribute(
      'href',
      '/dashboard/train/squeeze_to_activate',
    );
    expect(within(nextRegion()).getByText(/Lesson 1 of 5: Squeeze to activate\./)).toBeInTheDocument();
  });

  it('offers lesson 2 to someone who has finished lesson 1', async () => {
    await renderDoneStep({ storage: storageWithLessons(['squeeze_to_activate']) });
    expect(within(nextRegion()).getByRole('link', { name: 'Continue training' })).toHaveAttribute(
      'href',
      '/dashboard/train/confirm_and_back',
    );
    expect(within(nextRegion()).getByText(/Lesson 2 of 5: Confirm and Back\./)).toBeInTheDocument();
    expect(within(nextRegion()).queryByRole('link', { name: 'Start training' })).not.toBeInTheDocument();
  });

  it('never tells someone who has finished every lesson to continue', async () => {
    await renderDoneStep({ storage: storageWithLessons([...LESSON_IDS]) });
    expect(within(nextRegion()).getByRole('link', { name: 'Open training' })).toHaveAttribute('href', '/dashboard/train');
    expect(
      within(nextRegion()).getByText('All 5 lessons are done. Open training to run any of them again.'),
    ).toBeInTheDocument();
  });

  it('offers calibration as a rehearsal that records taps, never as teaching a ring', async () => {
    await renderDoneStep();
    const next = nextRegion();
    expect(within(next).getAllByRole('link').map((link) => link.textContent?.trim())).toEqual([
      'Start training',
      'Rehearse calibration',
      'Open the simulator',
    ]);
    expect(within(next).getByRole('link', { name: 'Rehearse calibration' })).toHaveAttribute('href', '/dashboard/calibrate');
    expect(within(next).getByText(/3 prompted taps on each of the eight points/)).toHaveTextContent(
      'It records which point you tapped; it does not adjust a ring.',
    );
    expect(next).not.toHaveTextContent(/teach|tune/i);
    expect(within(next).getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', '/dashboard/simulator');
  });
});
