/**
 * Onboarding steps, in order. `UserPreferences.onboardingStep` stores the
 * index of the furthest step reached, so a user can leave and resume.
 * `onboardingCompleted` becomes true when the user finishes OR skips setup;
 * the dashboard offers "Resume setup" while onboardingStep < ONBOARDING_LAST_STEP.
 */
export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', optional: false },
  { id: 'accessibility', title: 'Accessibility preferences', optional: true },
  { id: 'hand', title: 'Which hand', optional: true },
  { id: 'device', title: 'Demo Mode or a ring', optional: true },
  { id: 'calibration', title: 'Calibration', optional: true },
  { id: 'feedback', title: 'Feedback', optional: true },
  { id: 'first_lesson', title: 'First lesson', optional: true },
  { id: 'done', title: 'All set', optional: false },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export const ONBOARDING_LAST_STEP = ONBOARDING_STEPS.length - 1;
