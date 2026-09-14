import { useState } from 'react';
import { ConfirmDialog } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
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
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const controls = stepControls(flow.index);

  return (
    <OnboardingLayout onSkipSetup={controls.showSkipSetup ? () => setConfirmSkip(true) : undefined}>
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
