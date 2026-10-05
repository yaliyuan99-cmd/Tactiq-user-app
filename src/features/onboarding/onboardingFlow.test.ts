import { ONBOARDING_LAST_STEP, ONBOARDING_STEPS } from '@/domain/onboarding';
import {
  FINISH_SETUP_PATCH,
  SKIP_SETUP_PATCH,
  STEP_COUNT,
  calibrationDetourPatch,
  clampStepIndex,
  commandWindowSeconds,
  initialStepIndex,
  longerTimeAnnouncement,
  progressText,
  savedStepAfterMove,
  sentence,
  stepAnnouncement,
  stepAt,
  stepControls,
  stepIndexOf,
  stepSavePatch,
  summariseChoices,
  summaryText,
  type ChoiceSummaryInput,
} from './onboardingFlow';

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
    expect(initialStepIndex(4)).toBe(4);
    expect(initialStepIndex(40)).toBe(ONBOARDING_LAST_STEP);
  });

  it('looks steps up by index and id', () => {
    expect(stepAt(2).id).toBe('hand');
    expect(stepAt(100).id).toBe('done');
    expect(stepIndexOf('calibration')).toBe(4);
    expect(STEP_COUNT).toBe(ONBOARDING_STEPS.length);
  });
});

describe('saving progress', () => {
  it('keeps the furthest step reached', () => {
    expect(savedStepAfterMove(2, 3)).toBe(3);
    expect(savedStepAfterMove(5, 1)).toBe(5);
    expect(savedStepAfterMove(12, 1)).toBe(ONBOARDING_LAST_STEP);
  });

  it('only patches when the saved step changes', () => {
    expect(stepSavePatch(0, 1)).toEqual({ onboardingStep: 1 });
    expect(stepSavePatch(4, 2)).toBeNull();
    expect(stepSavePatch(3, 3)).toBeNull();
    expect(stepSavePatch(20, 2)).toEqual({ onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('skipping keeps the step, finishing records the last step', () => {
    expect(SKIP_SETUP_PATCH).toEqual({ onboardingCompleted: true });
    expect(FINISH_SETUP_PATCH).toEqual({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('leaving for calibration moves the resume point past calibration', () => {
    const calibration = stepIndexOf('calibration');
    expect(calibrationDetourPatch(calibration, calibration)).toEqual({ onboardingCompleted: true, onboardingStep: calibration + 1 });
    expect(calibrationDetourPatch(7, calibration)).toEqual({ onboardingCompleted: true, onboardingStep: 7 });
  });
});

describe('progress wording', () => {
  it('names the step number and title', () => {
    expect(progressText(2)).toBe('Step 3 of 8 — Which hand');
    expect(stepAnnouncement(0)).toBe('Step 1 of 8: Welcome.');
    expect(stepAnnouncement(ONBOARDING_LAST_STEP)).toBe('Step 8 of 8: All set.');
  });
});

describe('step controls', () => {
  it('has no Back or skip on the first step', () => {
    expect(stepControls(0)).toEqual({
      showBack: false,
      showSkip: false,
      continueLabel: 'Continue',
      continueAction: 'next',
      continueVariant: 'primary',
      showSkipSetup: true,
    });
  });

  it('offers Skip this step on optional steps', () => {
    for (const id of ['accessibility', 'hand', 'device', 'feedback', 'first_lesson'] as const) {
      const controls = stepControls(stepIndexOf(id));
      expect(controls.showBack).toBe(true);
      expect(controls.showSkip).toBe(true);
      expect(controls.continueLabel).toBe('Continue');
    }
  });

  it('labels the calibration step’s primary action as calibrating after setup', () => {
    expect(stepControls(stepIndexOf('calibration'))).toMatchObject({
      showSkip: false,
      continueLabel: 'Calibrate after setup',
      continueAction: 'next',
    });
  });

  it('finishes from the last step and hides Skip setup there', () => {
    expect(stepControls(ONBOARDING_LAST_STEP)).toEqual({
      showBack: true,
      showSkip: false,
      continueLabel: 'Go to the dashboard',
      continueAction: 'finish',
      continueVariant: 'primary',
      showSkipSetup: false,
    });
  });

  it('demotes Continue on the first-lesson step, whose lesson owns the filled button', () => {
    expect(stepControls(stepIndexOf('first_lesson')).continueVariant).toBe('secondary');
    expect(stepControls(stepIndexOf('welcome')).continueVariant).toBe('primary');
    expect(stepControls(stepIndexOf('calibration')).continueVariant).toBe('primary');
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
    audioAnnouncements: true,
    longerInteractionTime: false,
    deviceMode: 'demo',
    deviceStatusLabel: 'Demo Mode',
  };

  it('lists hand, ring, text size, audio and longer time', () => {
    expect(summariseChoices(base)).toEqual([
      { id: 'hand', label: 'Hand', value: 'Left hand' },
      { id: 'ring', label: 'Ring', value: 'Demo Mode (simulated ring)' },
      { id: 'text_size', label: 'Text size', value: 'Larger' },
      { id: 'audio', label: 'Audio announcements', value: 'On' },
      { id: 'longer_time', label: 'Longer interaction time', value: 'Off — the command window stays open for 3 seconds' },
    ]);
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
      'Hand: Left hand. Ring: Demo Mode (simulated ring). Text size: Larger. Audio announcements: On. Longer interaction time: Off — the command window stays open for 3 seconds.',
    );
  });
});
