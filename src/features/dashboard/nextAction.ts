/**
 * The one thing the dashboard suggests doing next. Pure: every input comes
 * from preferences, the device state and the local services.
 *
 * Order: unfinished setup → a hardware ring that is not connected →
 * calibration that is not complete → the next lesson → practice.
 */
import { ROUTES, lessonRoute } from '@/app/routes';
import { getLesson, LESSONS, type LessonId } from '@/domain/lessons';
import type { CalibrationStatus } from '@/domain/models';
import { ONBOARDING_LAST_STEP, ONBOARDING_STEPS } from '@/domain/onboarding';
import type { DeviceConnectionStatus, DeviceMode } from '@/services/device/types';

export interface NextActionInputs {
  readonly onboardingCompleted: boolean;
  /** Index of the furthest onboarding step reached. */
  readonly onboardingStep: number;
  readonly deviceMode: DeviceMode;
  readonly deviceStatus: DeviceConnectionStatus;
  readonly calibrationStatus: CalibrationStatus;
  readonly nextLesson: LessonId | null;
}

export type NextActionId = 'resume_setup' | 'reconnect_ring' | 'calibrate' | 'continue_training' | 'practise';

export interface NextAction {
  readonly id: NextActionId;
  /** Visible text of the primary action. */
  readonly label: string;
  readonly to: string;
  /** One sentence: why this is the next step. */
  readonly reason: string;
}

export const PRACTISE_LABEL = 'Practise a command';

/** Setup counts as unfinished until the user has reached its last step, even if they skipped. */
export function isSetupUnfinished(inputs: Pick<NextActionInputs, 'onboardingCompleted' | 'onboardingStep'>): boolean {
  return !inputs.onboardingCompleted || inputs.onboardingStep < ONBOARDING_LAST_STEP;
}

function setupReason(step: number): string {
  const index = Number.isInteger(step) ? Math.min(Math.max(step, 0), ONBOARDING_LAST_STEP) : 0;
  const title = ONBOARDING_STEPS[index]?.title ?? ONBOARDING_STEPS[0].title;
  return `Setup stopped at step ${index + 1} of ${ONBOARDING_STEPS.length} (${title}), so some of your choices are not made yet.`;
}

const RECONNECT_REASONS: Readonly<Record<DeviceConnectionStatus, string>> = {
  ready: 'Your Bluetooth ring is not connected, so its commands cannot reach this app.',
  disconnected: 'Your Bluetooth ring is not connected, so its commands cannot reach this app.',
  scanning: 'A connection to your ring has started but is not finished yet.',
  connecting: 'A connection to your ring has started but is not finished yet.',
  reconnecting: 'The connection to your ring dropped and has not come back yet.',
  unsupported: 'This browser cannot connect to a Bluetooth ring, so ring commands cannot reach this app.',
  permission_denied: 'Bluetooth permission was not granted, so the ring cannot connect.',
  error: 'The last connection attempt failed, so the ring is not connected.',
  connected: 'Your Bluetooth ring is connected.',
};

const CALIBRATION_REASONS: Readonly<Record<Exclude<CalibrationStatus, 'complete'>, string>> = {
  not_started:
    'Calibration has not been done yet; guided taps on all eight points record where each one is for your hand, on this device.',
  in_progress: 'Calibration is under way but not finished, so some points have not been tapped enough yet.',
  incomplete: 'Some contact points still need repeating before calibration is complete.',
};

export function nextAction(inputs: NextActionInputs): NextAction {
  if (isSetupUnfinished(inputs)) {
    return { id: 'resume_setup', label: 'Resume setup', to: ROUTES.onboarding, reason: setupReason(inputs.onboardingStep) };
  }
  if (inputs.deviceMode === 'hardware' && inputs.deviceStatus !== 'connected') {
    return {
      id: 'reconnect_ring',
      label: 'Reconnect your ring',
      to: ROUTES.connect,
      reason: RECONNECT_REASONS[inputs.deviceStatus],
    };
  }
  if (inputs.calibrationStatus !== 'complete') {
    return {
      id: 'calibrate',
      label: 'Calibrate your ring',
      to: ROUTES.calibrate,
      reason: CALIBRATION_REASONS[inputs.calibrationStatus],
    };
  }
  if (inputs.nextLesson) {
    const lesson = getLesson(inputs.nextLesson);
    return {
      id: 'continue_training',
      label: `Continue training: Lesson ${lesson.number}, ${lesson.title}`,
      to: lessonRoute(lesson.id),
      reason: lesson.summary,
    };
  }
  return {
    id: 'practise',
    label: PRACTISE_LABEL,
    to: ROUTES.simulator,
    reason: `Setup, calibration and all ${LESSONS.length} lessons are done, so the simulator is the place to keep every command familiar.`,
  };
}

/** The secondary "Practise a command" link is shown unless practice is already the primary action. */
export function showsPractiseLink(action: NextAction): boolean {
  return action.id !== 'practise';
}
