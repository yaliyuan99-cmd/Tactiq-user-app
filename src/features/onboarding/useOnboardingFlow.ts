/**
 * The onboarding flow controller: the current step, saving progress, focus
 * and announcements on every step change, and the ways out of setup.
 *
 * Reaching the last step is what finishes setup, not pressing the button
 * there: that step says setup is finished, so the dashboard has to be open to
 * the user from the moment it appears.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import {
  FINISH_SETUP_PATCH,
  SKIP_SETUP_PATCH,
  clampStepIndex,
  initialStepIndex,
  stepAnnouncement,
  stepAt,
  stepSavePatch,
  type OnboardingStep,
} from './onboardingFlow';

export interface OnboardingFlow {
  readonly index: number;
  readonly step: OnboardingStep;
  /** The step's h1. Focus moves here whenever the step changes. */
  readonly headingRef: RefObject<HTMLHeadingElement>;
  /** True once setup has been recorded as finished, so the app is no longer gated. */
  readonly setupFinished: boolean;
  readonly goTo: (index: number) => void;
  readonly next: () => void;
  readonly back: () => void;
  /** Goes to the dashboard from the last step. */
  readonly finish: () => void;
  /** Leaves setup (keeping the furthest step) and goes to the dashboard. */
  readonly skipSetup: () => void;
}

function scrollMainToTop(): void {
  const main = document.getElementById('main-content');
  if (main && typeof main.scrollIntoView === 'function') main.scrollIntoView({ block: 'start' });
}

export function useOnboardingFlow(): OnboardingFlow {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();
  const navigate = useNavigate();
  const [index, setIndex] = useState(() => initialStepIndex(preferences.onboardingStep));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownIndex = useRef(index);
  const savedStep = preferences.onboardingStep;
  const setupFinished = preferences.onboardingCompleted && savedStep >= ONBOARDING_LAST_STEP;

  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    scrollMainToTop();
    headingRef.current?.focus({ preventScroll: true });
    announce(stepAnnouncement(index));
  }, [index, announce]);

  // The last step states that setup is finished, so record it before the step is read.
  useEffect(() => {
    if (index === ONBOARDING_LAST_STEP && !setupFinished) update(FINISH_SETUP_PATCH);
  }, [index, setupFinished, update]);

  const goTo = useCallback(
    (target: number) => {
      const next = clampStepIndex(target);
      const patch = stepSavePatch(savedStep, next);
      if (patch) update(patch);
      setIndex(next);
    },
    [savedStep, update],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  const finish = useCallback(() => {
    update(FINISH_SETUP_PATCH);
    navigate(ROUTES.dashboard);
  }, [update, navigate]);

  const skipSetup = useCallback(() => {
    update(SKIP_SETUP_PATCH);
    navigate(ROUTES.dashboard);
  }, [update, navigate]);

  return {
    index,
    step: stepAt(index),
    headingRef,
    setupFinished,
    goTo,
    next,
    back,
    finish,
    skipSetup,
  };
}
