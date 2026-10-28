/**
 * First-use setup, in order. It is deliberately short: one choice, a few
 * preferences, one real command, then the way on. Nothing here explains the
 * product at length — Help does that, and it stays reachable throughout.
 *
 * Every step before the last is optional, so setup can be skipped a step at a
 * time or all at once. `UserPreferences.onboardingStep` stores the index of
 * the furthest step reached, so a user can leave and resume.
 * `onboardingCompleted` becomes true when the user reaches the last step OR
 * skips setup; the dashboard offers "Resume setup" while
 * onboardingStep < ONBOARDING_LAST_STEP.
 */
export const ONBOARDING_STEPS = [
  { id: 'hand', title: 'Which hand', optional: true },
  { id: 'preferences', title: 'A few preferences', optional: true },
  { id: 'first_command', title: 'Your first command', optional: true },
  { id: 'done', title: 'You are ready', optional: false },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export const ONBOARDING_LAST_STEP = ONBOARDING_STEPS.length - 1;
