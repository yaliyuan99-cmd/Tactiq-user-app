import { ONBOARDING_LAST_STEP, ONBOARDING_STEPS } from '@/domain/onboarding';
import {
  FINISH_SETUP_PATCH,
  SKIP_SETUP_PATCH,
  STEP_COUNT,
  clampStepIndex,
  commandWindowSeconds,
  initialStepIndex,
  longerTimeAnnouncement,
  progressText,
  savedStepAfterMove,
  sentence,
  skipSetupWords,
  stepAnnouncement,
  stepAt,
  stepControls,
  stepIndexOf,
  stepSavePatch,
  summariseChoices,
  summaryText,
  type ChoiceSummaryInput,
} from './onboardingFlow';

describe('the shape of setup', () => {
  it('is four steps: one choice, a few preferences, one command, then the way on', () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual(['hand', 'preferences', 'first_command', 'done']);
    expect(STEP_COUNT).toBe(4);
    expect(ONBOARDING_LAST_STEP).toBe(3);
  });

  it('makes every step before the last one optional, so each one can be skipped', () => {
    expect(ONBOARDING_STEPS.filter((step) => !step.optional).map((step) => step.id)).toEqual(['done']);
  });
});

describe('step index', () => {
  it('clamps to the first and last steps and drops fractions', () => {
    expect(clampStepIndex(-3)).toBe(0);
    expect(clampStepIndex(2.7)).toBe(2);
    expect(clampStepIndex(99)).toBe(ONBOARDING_LAST_STEP);
    expect(clampStepIndex(Number.NaN)).toBe(0);
    expect(clampStepIndex(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('resumes at the saved step but never beyond the last step', () => {
    expect(initialStepIndex(0)).toBe(0);
    expect(initialStepIndex(2)).toBe(2);
    expect(initialStepIndex(40)).toBe(ONBOARDING_LAST_STEP);
  });

  it('looks steps up by index and id', () => {
    expect(stepAt(1).id).toBe('preferences');
    expect(stepAt(100).id).toBe('done');
    expect(stepIndexOf('first_command')).toBe(2);
    expect(STEP_COUNT).toBe(ONBOARDING_STEPS.length);
  });
});

describe('saving progress', () => {
  it('keeps the furthest step reached', () => {
    expect(savedStepAfterMove(1, 2)).toBe(2);
    expect(savedStepAfterMove(3, 1)).toBe(3);
    expect(savedStepAfterMove(12, 1)).toBe(ONBOARDING_LAST_STEP);
  });

  it('only patches when the saved step changes', () => {
    expect(stepSavePatch(0, 1)).toEqual({ onboardingStep: 1 });
    expect(stepSavePatch(3, 2)).toBeNull();
    expect(stepSavePatch(2, 2)).toBeNull();
    expect(stepSavePatch(20, 2)).toEqual({ onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('skipping keeps the step, finishing records the last step', () => {
    expect(SKIP_SETUP_PATCH).toEqual({ onboardingCompleted: true });
    expect(FINISH_SETUP_PATCH).toEqual({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });
});

describe('progress wording', () => {
  it('names the step number and title', () => {
    expect(progressText(0)).toBe('Step 1 of 4 — Which hand');
    expect(stepAnnouncement(1)).toBe('Step 2 of 4: A few preferences.');
    expect(stepAnnouncement(ONBOARDING_LAST_STEP)).toBe('Step 4 of 4: You are ready.');
  });
});

describe('step controls', () => {
  it('has no Back on the first step, but can still be skipped', () => {
    expect(stepControls(0)).toEqual({
      showBack: false,
      showSkip: true,
      continueLabel: 'Continue',
      continueAction: 'next',
      continueVariant: 'primary',
      showSkipSetup: true,
    });
  });

  it('offers Skip this step on every step before the last', () => {
    for (const id of ['hand', 'preferences', 'first_command'] as const) {
      const controls = stepControls(stepIndexOf(id));
      expect(controls.showSkip).toBe(true);
      expect(controls.continueLabel).toBe('Continue');
      expect(controls.continueAction).toBe('next');
    }
  });

  it('finishes from the last step and hides the leave control there', () => {
    expect(stepControls(ONBOARDING_LAST_STEP)).toEqual({
      showBack: true,
      showSkip: false,
      continueLabel: 'Go to the dashboard',
      continueAction: 'finish',
      continueVariant: 'primary',
      showSkipSetup: false,
    });
  });

  it('demotes Continue on the first-command step, whose ring surface owns the filled button', () => {
    expect(stepControls(stepIndexOf('first_command')).continueVariant).toBe('secondary');
    expect(stepControls(stepIndexOf('hand')).continueVariant).toBe('primary');
    expect(stepControls(stepIndexOf('preferences')).continueVariant).toBe('primary');
  });
});

describe('leaving setup', () => {
  it('says it skips while setup is unfinished', () => {
    expect(skipSetupWords(false)).toEqual({
      label: 'Skip setup',
      title: 'Skip setup?',
      description: 'You can finish it later from the dashboard.',
      confirmLabel: 'Skip setup',
      cancelLabel: 'Keep setting up',
    });
  });

  it('says it leaves once setup is recorded as finished, because nothing is left to skip', () => {
    const words = skipSetupWords(true);
    expect(words.label).toBe('Leave setup');
    expect(words.title).toBe('Leave setup?');
    expect(words.description).toContain('Your choices are saved');
    expect(words.description).not.toContain('finish it later');
  });
});

describe('timing and sentences', () => {
  it('uses the command window constants', () => {
    expect(commandWindowSeconds(false)).toBe(3);
    expect(commandWindowSeconds(true)).toBe(6);
    expect(longerTimeAnnouncement(true)).toBe('Longer interaction time on. The command window stays open for 6 seconds.');
    expect(longerTimeAnnouncement(false)).toBe('Longer interaction time off. The command window stays open for 3 seconds.');
  });

  it('keeps the bench ring on its own window, whatever the preference says', () => {
    expect(commandWindowSeconds(true, 'hardware')).toBe(3);
    expect(commandWindowSeconds(false, 'hardware')).toBe(3);
    expect(commandWindowSeconds(true, 'demo')).toBe(6);
    expect(longerTimeAnnouncement(true, 'hardware')).toBe(
      'Longer interaction time on. It applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window.',
    );
    expect(longerTimeAnnouncement(false, 'hardware')).toBe(
      'Longer interaction time off. The command window stays open for 3 seconds.',
    );
  });

  it('adds a full stop only where needed', () => {
    expect(sentence('Connected')).toBe('Connected.');
    expect(sentence('Searching…')).toBe('Searching…');
    expect(sentence('Done.')).toBe('Done.');
  });
});

describe('summary', () => {
  const base: ChoiceSummaryInput = {
    hand: 'left',
    textSize: 'larger',
    contrast: 'default',
    audioAnnouncements: true,
    longerInteractionTime: false,
    deviceMode: 'demo',
    deviceStatusLabel: 'Demo Mode',
  };

  it('lists every choice the four steps make', () => {
    expect(summariseChoices(base)).toEqual([
      { id: 'hand', label: 'Hand', value: 'Left hand' },
      { id: 'ring', label: 'Ring', value: 'Demo Mode (simulated ring)' },
      { id: 'text_size', label: 'Text size', value: 'Larger' },
      { id: 'contrast', label: 'Increased contrast', value: 'Off' },
      { id: 'audio', label: 'Audio announcements', value: 'On' },
      { id: 'longer_time', label: 'Longer interaction time', value: 'Off — the command window stays open for 3 seconds' },
    ]);
  });

  it('reports increased contrast when it is on', () => {
    const items = summariseChoices({ ...base, contrast: 'high' });
    expect(items.find((item) => item.id === 'contrast')?.value).toBe('On');
  });

  it('describes a Bluetooth ring by its status and keeps its three-second window', () => {
    const items = summariseChoices({ ...base, deviceMode: 'hardware', deviceStatusLabel: 'Searching…', longerInteractionTime: true });
    expect(items.find((item) => item.id === 'ring')?.value).toBe('Bluetooth ring — Searching');
    expect(items.find((item) => item.id === 'longer_time')?.value).toBe(
      'On — it applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window',
    );
  });

  it('gives the simulated ring the six-second window it really has', () => {
    const items = summariseChoices({ ...base, longerInteractionTime: true });
    expect(items.find((item) => item.id === 'longer_time')?.value).toBe('On — the command window stays open for 6 seconds');
  });

  it('says three seconds for either ring when longer interaction time is off', () => {
    const hardware = summariseChoices({ ...base, deviceMode: 'hardware', deviceStatusLabel: 'Disconnected' });
    expect(hardware.find((item) => item.id === 'longer_time')?.value).toBe(
      'Off — the command window stays open for 3 seconds',
    );
  });

  it('reads as one line of text', () => {
    expect(summaryText(summariseChoices(base))).toBe(
      'Hand: Left hand. Ring: Demo Mode (simulated ring). Text size: Larger. Increased contrast: Off. Audio announcements: On. Longer interaction time: Off — the command window stays open for 3 seconds.',
    );
  });
});
