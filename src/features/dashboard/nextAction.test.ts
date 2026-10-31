import { ROUTES, lessonRoute } from '@/app/routes';
import { getLesson } from '@/domain/lessons';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import type { DeviceConnectionStatus } from '@/services/device/types';
import { isSetupUnfinished, nextAction, PRACTISE_LABEL, showsPractiseLink, type NextActionInputs } from './nextAction';

/** Everything done: setup finished, Demo Mode, calibrated, every lesson complete. */
const ALL_DONE: NextActionInputs = {
  onboardingCompleted: true,
  onboardingStep: ONBOARDING_LAST_STEP,
  deviceMode: 'demo',
  deviceStatus: 'ready',
  calibrationStatus: 'complete',
  nextLesson: null,
};

describe('nextAction', () => {
  it('offers Resume setup while onboarding stopped before the last step, even when marked completed', () => {
    const action = nextAction({ ...ALL_DONE, onboardingStep: ONBOARDING_LAST_STEP - 1 });
    expect(action).toMatchObject({ id: 'resume_setup', label: 'Resume setup', to: ROUTES.onboarding });
    expect(action.reason).toBe('Setup stopped at step 3 of 4 (Your first command), so some of your choices are not made yet.');
  });

  it('offers Resume setup when onboarding is not completed at all', () => {
    expect(nextAction({ ...ALL_DONE, onboardingCompleted: false }).id).toBe('resume_setup');
  });

  it('clamps an out-of-range onboarding step in the reason', () => {
    expect(nextAction({ ...ALL_DONE, onboardingStep: -2 }).reason).toContain('step 1 of 4 (Which hand)');
    expect(nextAction({ ...ALL_DONE, onboardingCompleted: false, onboardingStep: 99 }).reason).toContain('step 4 of 4 (You are ready)');
  });

  it('puts setup ahead of every other step', () => {
    const action = nextAction({
      onboardingCompleted: true,
      onboardingStep: 0,
      deviceMode: 'hardware',
      deviceStatus: 'disconnected',
      calibrationStatus: 'not_started',
      nextLesson: 'squeeze_to_activate',
    });
    expect(action.id).toBe('resume_setup');
  });

  it.each<DeviceConnectionStatus>([
    'disconnected',
    'ready',
    'scanning',
    'connecting',
    'reconnecting',
    'unsupported',
    'permission_denied',
    'error',
  ])('asks a hardware user to reconnect when the ring is %s', (status) => {
    const action = nextAction({ ...ALL_DONE, deviceMode: 'hardware', deviceStatus: status, calibrationStatus: 'not_started' });
    expect(action).toMatchObject({ id: 'reconnect_ring', label: 'Reconnect your ring', to: ROUTES.connect });
    expect(action.reason.length).toBeGreaterThan(10);
  });

  it('does not ask to reconnect in Demo Mode or when the hardware ring is connected', () => {
    expect(nextAction({ ...ALL_DONE, deviceMode: 'demo', deviceStatus: 'ready' }).id).toBe('practise');
    expect(nextAction({ ...ALL_DONE, deviceMode: 'hardware', deviceStatus: 'connected' }).id).toBe('practise');
  });

  it.each(['not_started', 'in_progress', 'incomplete'] as const)('asks to calibrate when calibration is %s', (status) => {
    const action = nextAction({ ...ALL_DONE, calibrationStatus: status, nextLesson: 'confirm_and_back' });
    expect(action).toMatchObject({ id: 'calibrate', label: 'Calibrate your ring', to: ROUTES.calibrate });
  });

  it('explains uncalibrated without claiming the ring is told anything', () => {
    const { reason } = nextAction({ ...ALL_DONE, calibrationStatus: 'not_started' });
    // Nothing but PING is ever written to a ring, so the dashboard's primary
    // call to action must not say calibration informs one.
    expect(reason).toMatch(/record where each one is for your hand, on this device/);
    expect(reason).not.toMatch(/teach|tell them apart/i);
  });

  it('continues training with the next lesson once calibrated', () => {
    const action = nextAction({ ...ALL_DONE, nextLesson: 'next_previous_read' });
    const lesson = getLesson('next_previous_read');
    expect(action).toEqual({
      id: 'continue_training',
      label: 'Continue training: Lesson 3, Next, Previous and Read',
      to: lessonRoute('next_previous_read'),
      reason: lesson.summary,
    });
  });

  it('suggests practice when everything else is done', () => {
    const action = nextAction(ALL_DONE);
    expect(action).toMatchObject({ id: 'practise', label: PRACTISE_LABEL, to: ROUTES.simulator });
    expect(action.reason).toContain('all 5 lessons');
  });
});

describe('showsPractiseLink', () => {
  it('hides the secondary practice link only when practice is already the primary action', () => {
    expect(showsPractiseLink(nextAction(ALL_DONE))).toBe(false);
    expect(showsPractiseLink(nextAction({ ...ALL_DONE, nextLesson: 'confirm_and_back' }))).toBe(true);
  });
});

describe('isSetupUnfinished', () => {
  it('is false only when onboarding is completed at the last step', () => {
    expect(isSetupUnfinished({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP })).toBe(false);
    expect(isSetupUnfinished({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP - 1 })).toBe(true);
    expect(isSetupUnfinished({ onboardingCompleted: false, onboardingStep: ONBOARDING_LAST_STEP })).toBe(true);
  });
});
