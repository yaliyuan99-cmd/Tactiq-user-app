import { useState } from 'react';
import { Callout, ConfirmDialog } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { PREFERENCES_UNREADABLE_NOTE, usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCanPersist } from '@/services/ServicesProvider';
import { WRITES_BLOCKED_NOTE } from '@/services/storage/StorageAdapter';
import { OnboardingLayout } from './OnboardingLayout';
import { PAGE_TITLE } from './onboardingCopy';
import { skipSetupWords, stepControls, type OnboardingStep } from './onboardingFlow';
import { SetupRail } from './SetupRail';
import { StepFrame } from './StepFrame';
import { DoneStep } from './steps/DoneStep';
import { FirstCommandStep } from './steps/FirstCommandStep';
import { HandStep } from './steps/HandStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { useOnboardingFlow } from './useOnboardingFlow';

interface StepContentProps {
  readonly step: OnboardingStep;
  readonly commandDone: boolean;
  readonly onCommandDone: () => void;
}

function StepContent({ step, commandDone, onCommandDone }: StepContentProps) {
  switch (step.id) {
    case 'hand':
      return <HandStep />;
    case 'preferences':
      return <PreferencesStep />;
    case 'first_command':
      return <FirstCommandStep done={commandDone} onDone={onCommandDone} />;
    case 'done':
      return <DoneStep />;
  }
}

/**
 * First-use setup: four short steps, one at a time, without the app
 * navigation. Progress is saved on every move so the user can leave and
 * resume, and every step but the last can be skipped.
 */
export default function OnboardingPage() {
  usePageTitle(PAGE_TITLE);
  const flow = useOnboardingFlow();
  const { recovery } = usePreferences();
  // Setup is outside the app shell, so its storage warning is given here.
  const writesBlocked = !useCanPersist();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [commandDone, setCommandDone] = useState(false);
  const controls = stepControls(flow.index);
  const leaving = skipSetupWords(flow.setupFinished);
  // Someone who had finished setup can only be looking at step 1 again because
  // what was stored could not be read, so say that rather than let it look like
  // the choices were never made.
  const lostProgress = recovery.unreadable || recovery.replacedFields.includes('onboardingCompleted');

  return (
    <OnboardingLayout
      leaveSetupLabel={leaving.label}
      onLeaveSetup={controls.showSkipSetup ? () => setConfirmLeave(true) : undefined}
      rail={<SetupRail index={flow.index} onGoTo={flow.goTo} />}
    >
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
          commandDone={commandDone}
          onCommandDone={() => setCommandDone(true)}
        />
      </StepFrame>

      <ConfirmDialog
        open={confirmLeave}
        title={leaving.title}
        description={leaving.description}
        confirmLabel={leaving.confirmLabel}
        cancelLabel={leaving.cancelLabel}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          flow.skipSetup();
        }}
      />
    </OnboardingLayout>
  );
}
