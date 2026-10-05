import { useState } from 'react';
import { Callout, ConfirmDialog } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { PREFERENCES_UNREADABLE_NOTE, usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCanPersist } from '@/services/ServicesProvider';
import { WRITES_BLOCKED_NOTE } from '@/services/storage/StorageAdapter';
import { OnboardingLayout } from './OnboardingLayout';
import {
  PAGE_TITLE,
  SKIP_SETUP_CANCEL,
  SKIP_SETUP_DESCRIPTION,
  SKIP_SETUP_LABEL,
  SKIP_SETUP_TITLE,
} from './onboardingCopy';
import { stepControls, type OnboardingStep } from './onboardingFlow';
import { StepFrame } from './StepFrame';
import { AccessibilityStep } from './steps/AccessibilityStep';
import { CalibrationStep } from './steps/CalibrationStep';
import { DeviceStep } from './steps/DeviceStep';
import { DoneStep } from './steps/DoneStep';
import { FeedbackStep } from './steps/FeedbackStep';
import { FirstLessonStep } from './steps/FirstLessonStep';
import { HandStep } from './steps/HandStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { useOnboardingFlow, type OnboardingFlow } from './useOnboardingFlow';

interface StepContentProps {
  readonly step: OnboardingStep;
  readonly flow: OnboardingFlow;
  readonly lessonCompleted: boolean;
  readonly onLessonComplete: () => void;
}

function StepContent({ step, flow, lessonCompleted, onLessonComplete }: StepContentProps) {
  switch (step.id) {
    case 'welcome':
      return <WelcomeStep />;
    case 'accessibility':
      return <AccessibilityStep />;
    case 'hand':
      return <HandStep />;
    case 'device':
      return <DeviceStep />;
    case 'calibration':
      return <CalibrationStep onOpenCalibration={flow.leaveForCalibration} />;
    case 'feedback':
      return <FeedbackStep />;
    case 'first_lesson':
      return <FirstLessonStep completed={lessonCompleted} onComplete={onLessonComplete} />;
    case 'done':
      return <DoneStep onLeave={flow.markFinished} />;
  }
}

/**
 * Guided first-run setup, one step at a time, without the app navigation.
 * Progress is saved on every move so the user can leave and resume.
 */
export default function OnboardingPage() {
  usePageTitle(PAGE_TITLE);
  const flow = useOnboardingFlow();
  const { recovery } = usePreferences();
  // Setup is outside the app shell, so its storage warning is given here.
  const writesBlocked = !useCanPersist();
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const controls = stepControls(flow.index);
  // Someone who had finished setup can only be looking at step 1 again because
  // what was stored could not be read, so say that rather than let it look like
  // the choices were never made.
  const lostProgress = recovery.unreadable || recovery.replacedFields.includes('onboardingCompleted');

  return (
    <OnboardingLayout onSkipSetup={controls.showSkipSetup ? () => setConfirmSkip(true) : undefined}>
      {lostProgress && (
        <Callout kind="warning" role="status" title="Your saved setup could not be read" className="mb-6">
          {PREFERENCES_UNREADABLE_NOTE}
        </Callout>
      )}
      {writesBlocked && (
        <Callout kind="warning" role="status" title="Changes are not being saved" className="mb-6">
          {WRITES_BLOCKED_NOTE}
        </Callout>
      )}
      <StepFrame
        index={flow.index}
        headingRef={flow.headingRef}
        onBack={flow.back}
        onSkip={flow.next}
        onContinue={controls.continueAction === 'finish' ? flow.finish : flow.next}
      >
        <StepContent
          key={flow.step.id}
          step={flow.step}
          flow={flow}
          lessonCompleted={lessonCompleted}
          onLessonComplete={() => setLessonCompleted(true)}
        />
      </StepFrame>

      <ConfirmDialog
        open={confirmSkip}
        title={SKIP_SETUP_TITLE}
        description={SKIP_SETUP_DESCRIPTION}
        confirmLabel={SKIP_SETUP_LABEL}
        cancelLabel={SKIP_SETUP_CANCEL}
        onCancel={() => setConfirmSkip(false)}
        onConfirm={() => {
          setConfirmSkip(false);
          flow.skipSetup();
        }}
      />
    </OnboardingLayout>
  );
}
