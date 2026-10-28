/**
 * Pure decisions for the onboarding flow: which step to resume at, what to
 * save when the user moves, how progress and the step change are worded,
 * which controls a step shows, and the summary on the last step. No React
 * here. The links off the last step live in nextSteps.ts.
 */
import { ONBOARDING_LAST_STEP, ONBOARDING_STEPS, type OnboardingStepId } from '@/domain/onboarding';
import type { ContrastPreference, Hand, TextSize, UserPreferences } from '@/domain/models';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS } from '@/domain/timing';
import type { DeviceMode } from '@/services/device/types';

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_COUNT = ONBOARDING_STEPS.length;

/** A whole step index between the first and the last step. Anything unusable becomes the first step. */
export function clampStepIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), ONBOARDING_LAST_STEP);
}

/** Where the flow opens: the furthest step saved, never beyond the last step. */
export function initialStepIndex(savedStep: number): number {
  return clampStepIndex(savedStep);
}

export function stepAt(index: number): OnboardingStep {
  return ONBOARDING_STEPS[clampStepIndex(index)] ?? ONBOARDING_STEPS[0];
}

export function stepIndexOf(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((step) => step.id === id);
}

/** The furthest step reached after moving to `index`: max(saved, index), both clamped. */
export function savedStepAfterMove(savedStep: number, index: number): number {
  return Math.max(clampStepIndex(savedStep), clampStepIndex(index));
}

/** The preference patch a move needs, or null when the saved step is already right. */
export function stepSavePatch(savedStep: number, index: number): Pick<UserPreferences, 'onboardingStep'> | null {
  const next = savedStepAfterMove(savedStep, index);
  return next === savedStep ? null : { onboardingStep: next };
}

/**
 * Onboarding progress for a profile that has just been created. Preferences
 * live once per browser, not per profile, so a new profile starts setup at the
 * first step instead of resuming where the previous person stopped.
 */
export const NEW_PROFILE_SETUP_PATCH: Pick<UserPreferences, 'onboardingCompleted' | 'onboardingStep'> = {
  onboardingCompleted: false,
  onboardingStep: 0,
};

/** "Skip setup": leave the flow, keep the furthest step so the dashboard can offer "Resume setup". */
export const SKIP_SETUP_PATCH: Pick<UserPreferences, 'onboardingCompleted'> = { onboardingCompleted: true };

/**
 * Setup is finished. Saved as soon as the user reaches the last step, not when
 * they press the button there: the last step says setup is finished, so the
 * dashboard must already be open to them.
 */
export const FINISH_SETUP_PATCH: Pick<UserPreferences, 'onboardingCompleted' | 'onboardingStep'> = {
  onboardingCompleted: true,
  onboardingStep: ONBOARDING_LAST_STEP,
};

/** "Step 3 of 4 — Your first command" */
export function progressText(index: number): string {
  const i = clampStepIndex(index);
  return `Step ${i + 1} of ${STEP_COUNT} — ${stepAt(i).title}`;
}

/** "Step 3 of 4: Your first command." — announced when the step changes. */
export function stepAnnouncement(index: number): string {
  const i = clampStepIndex(index);
  return `Step ${i + 1} of ${STEP_COUNT}: ${stepAt(i).title}.`;
}

export type ContinueAction = 'next' | 'finish';

export interface StepControls {
  readonly showBack: boolean;
  readonly showSkip: boolean;
  readonly continueLabel: string;
  readonly continueAction: ContinueAction;
  /**
   * How loud the continue control is. 'secondary' on the first-command step,
   * whose ring surface owns the filled "Squeeze" button: two filled buttons
   * would not say which action the step is asking for.
   */
  readonly continueVariant: 'primary' | 'secondary';
  /** The "leave setup" control in the top bar; hidden on the last step, where nothing is left to leave. */
  readonly showSkipSetup: boolean;
}

/** The controls under a step. Every step but the last is optional, so every one can be skipped. */
export function stepControls(index: number): StepControls {
  const i = clampStepIndex(index);
  const step = stepAt(i);
  const isLast = i === ONBOARDING_LAST_STEP;
  return {
    showBack: i > 0,
    showSkip: step.optional,
    continueLabel: isLast ? 'Go to the dashboard' : 'Continue',
    continueAction: isLast ? 'finish' : 'next',
    continueVariant: step.id === 'first_command' ? 'secondary' : 'primary',
    showSkipSetup: !isLast,
  };
}

export interface SkipSetupWords {
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
}

/**
 * The top-bar control that leaves setup, and its confirmation. Once setup has
 * been recorded as finished — the user reached the last step, or skipped
 * earlier and came back through "Resume setup" — there is nothing left to
 * skip, so it says it leaves instead of claiming the choices are unfinished.
 */
export function skipSetupWords(setupFinished: boolean): SkipSetupWords {
  if (setupFinished) {
    return {
      label: 'Leave setup',
      title: 'Leave setup?',
      description: 'Your choices are saved. You can come back to setup from the dashboard.',
      confirmLabel: 'Leave setup',
      cancelLabel: 'Stay here',
    };
  }
  return {
    label: 'Skip setup',
    title: 'Skip setup?',
    description: 'You can finish it later from the dashboard.',
    confirmLabel: 'Skip setup',
    cancelLabel: 'Keep setting up',
  };
}

/* ------------------------------------------------------------------ */
/* Wording shared by the steps                                          */
/* ------------------------------------------------------------------ */

export const HAND_LABELS: Readonly<Record<Hand, string>> = { left: 'Left', right: 'Right' };
export const TEXT_SIZE_LABELS: Readonly<Record<TextSize, string>> = { default: 'Default', large: 'Large', larger: 'Larger' };

export function wholeSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

/**
 * Seconds the command window stays open. "Longer interaction time" is an app
 * preference, so it only lengthens the simulated ring's window; a Bluetooth
 * bench ring keeps the firmware window of COMMAND_WINDOW_MS.
 */
export function commandWindowSeconds(longerInteractionTime: boolean, deviceMode: DeviceMode = 'demo'): number {
  const longer = longerInteractionTime && deviceMode === 'demo';
  return wholeSeconds(longer ? COMMAND_WINDOW_LONG_MS : COMMAND_WINDOW_MS);
}

/** "Text size set to Larger." */
export function choiceAnnouncement(setting: string, choice: string): string {
  return `${setting} set to ${choice}.`;
}

/** "Reduce motion on." */
export function switchAnnouncement(setting: string, on: boolean): string {
  return `${setting} ${on ? 'on' : 'off'}.`;
}

/** "Longer interaction time on. The command window stays open for 6 seconds." */
export function longerTimeAnnouncement(on: boolean, deviceMode: DeviceMode = 'demo'): string {
  const setting = `Longer interaction time ${on ? 'on' : 'off'}.`;
  if (on && deviceMode === 'hardware') {
    return `${setting} It applies to Demo Mode, so the Bluetooth bench ring keeps its own ${commandWindowSeconds(
      false,
    )}-second window.`;
  }
  return `${setting} The command window stays open for ${commandWindowSeconds(on, deviceMode)} seconds.`;
}

/** Ends a sentence with a full stop unless it already ends in punctuation ("Searching…"). */
export function sentence(text: string): string {
  return /[.…!?]$/.test(text) ? text : `${text}.`;
}

/* ------------------------------------------------------------------ */
/* Summary on the last step                                             */
/* ------------------------------------------------------------------ */

export interface ChoiceSummaryInput {
  readonly hand: Hand;
  readonly textSize: TextSize;
  readonly contrast: ContrastPreference;
  readonly audioAnnouncements: boolean;
  readonly longerInteractionTime: boolean;
  readonly deviceMode: DeviceMode;
  /** describeDeviceState(state).label, used for a Bluetooth ring. */
  readonly deviceStatusLabel: string;
}

export type ChoiceSummaryId = 'hand' | 'ring' | 'text_size' | 'contrast' | 'audio' | 'longer_time';

export interface ChoiceSummaryItem {
  readonly id: ChoiceSummaryId;
  readonly label: string;
  readonly value: string;
}

function trimEllipsis(text: string): string {
  return text.replace(/…$/, '');
}

/** Says which ring the six seconds belong to, so the summary is true in both modes. */
function longerTimeSummary(on: boolean, deviceMode: DeviceMode): string {
  if (on && deviceMode === 'hardware') {
    return `On — it applies to Demo Mode, so the Bluetooth bench ring keeps its own ${commandWindowSeconds(
      false,
    )}-second window`;
  }
  return `${on ? 'On' : 'Off'} — the command window stays open for ${commandWindowSeconds(on, deviceMode)} seconds`;
}

export function summariseChoices(input: ChoiceSummaryInput): readonly ChoiceSummaryItem[] {
  const ring =
    input.deviceMode === 'demo'
      ? 'Demo Mode (simulated ring)'
      : `Bluetooth ring — ${trimEllipsis(input.deviceStatusLabel)}`;
  return [
    { id: 'hand', label: 'Hand', value: `${HAND_LABELS[input.hand]} hand` },
    { id: 'ring', label: 'Ring', value: ring },
    { id: 'text_size', label: 'Text size', value: TEXT_SIZE_LABELS[input.textSize] },
    { id: 'contrast', label: 'Increased contrast', value: input.contrast === 'high' ? 'On' : 'Off' },
    { id: 'audio', label: 'Audio announcements', value: input.audioAnnouncements ? 'On' : 'Off' },
    {
      id: 'longer_time',
      label: 'Longer interaction time',
      value: longerTimeSummary(input.longerInteractionTime, input.deviceMode),
    },
  ];
}

/** One plain line of the summary: "Hand: Right hand. Ring: Demo Mode (simulated ring). …" */
export function summaryText(items: readonly ChoiceSummaryItem[]): string {
  return items.map((item) => `${item.label}: ${item.value}.`).join(' ');
}
