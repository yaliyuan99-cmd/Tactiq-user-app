/**
 * The onboarding flow controller: the current step, saving progress, focus
 * and announcements on every step change, and the ways out of setup.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import {
  FINISH_SETUP_PATCH,
  SKIP_SETUP_PATCH,
  calibrationDetourPatch,
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
  readonly goTo: (index: number) => void;
  readonly next: () => void;
  readonly back: () => void;
  /** Marks setup finished without navigating, for links that navigate themselves. */
  readonly markFinished: () => void;
  /** Marks setup finished and goes to the dashboard. */
  readonly finish: () => void;
  /** Leaves setup (keeping the furthest step) and goes to the dashboard. */
  readonly skipSetup: () => void;
  /** Saves progress before the "Open calibration now" link navigates. */
  readonly leaveForCalibration: () => void;
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

  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    scrollMainToTop();
    headingRef.current?.focus({ preventScroll: true });
    announce(stepAnnouncement(index));
  }, [index, announce]);

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

  const markFinished = useCallback(() => update(FINISH_SETUP_PATCH), [update]);

  const finish = useCallback(() => {
    update(FINISH_SETUP_PATCH);
    navigate(ROUTES.dashboard);
  }, [update, navigate]);

  const skipSetup = useCallback(() => {
    update(SKIP_SETUP_PATCH);
    navigate(ROUTES.dashboard);
  }, [update, navigate]);

  const leaveForCalibration = useCallback(() => update(calibrationDetourPatch(savedStep, index)), [update, savedStep, index]);

  return {
    index,
    step: stepAt(index),
    headingRef,
    goTo,
    next,
    back,
    markFinished,
    finish,
    skipSetup,
    leaveForCalibration,
  };
}
