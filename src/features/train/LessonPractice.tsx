import { useEffect, useRef, useState } from 'react';
import { LogOut, RotateCcw } from 'lucide-react';
import { Button, ConfirmDialog, ProgressBar, VisuallyHidden } from '@/components';
import {
  EmergencyNotice,
  PRACTICE_PANEL_CLASSES,
  PracticeSurface,
  SqueezeControl,
  evidenceForDevice,
  useRing,
} from '@/features/practice';
import { useDevice } from '@/services/device/DeviceProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import type { HeadingLevel } from './headingLevel';
import { LessonHeading } from './LessonHeading';
import { runTotals } from './lessonRun';
import { RunStats } from './RunStats';
import { StepFeedbackPanel } from './StepFeedbackPanel';
import { lessonStatusLabel } from './trainingWords';
import type { LessonRun } from './useLessonRun';

export interface LessonPracticeProps {
  readonly run: LessonRun;
  /** Level of the step instruction heading. */
  readonly headingLevel: HeadingLevel;
  readonly onExit?: () => void;
}

/**
 * The practice phase: step indicator, the instruction (focused on every step
 * change), the result of the latest attempt, the ring surface for the step
 * and the run's totals. The ring lives here, so it is only listened to while
 * the user is practising.
 */
export function LessonPractice({ run, headingLevel, onExit }: LessonPracticeProps) {
  const { lesson, state } = run;
  const { preferences } = usePreferences();
  const device = useDevice().state;
  const windowMs = device.commandWindowMs;
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const ring = useRing({
    onResult: (result) => run.submit({ kind: 'result', result }),
    onGate: (armed) => (armed ? run.submit({ kind: 'window_opened', windowMs }) : run.windowClosed(windowMs)),
  });

  const step = lesson.steps[state.stepIndex];
  const stepKind = step?.kind;
  const { armed, canOperate, closeWindow } = ring;
  const armedRef = useRef(armed);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  // A squeeze step is practised from a closed window: a squeeze while it is open only refreshes it.
  useEffect(() => {
    if (stepKind === 'squeeze' && canOperate && armedRef.current) closeWindow();
  }, [stepKind, state.stepIndex, state.runId, canOperate, closeWindow]);

  if (!step) return null;

  const total = lesson.steps.length;
  const position = state.stepIndex + 1;
  const attempts = state.records[state.stepIndex]?.attempts ?? 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <ProgressBar label="Lesson progress" value={position} max={total} valueText={`Step ${position} of ${total}`} segmented />
        <LessonHeading
          key={state.stepIndex}
          ref={run.stepHeadingRef}
          level={headingLevel}
          tabIndex={-1}
          className="animate-enter-rise text-2xl font-bold leading-snug text-balance sm:text-3xl"
        >
          <VisuallyHidden>{`Step ${position} of ${total}: `}</VisuallyHidden>
          {step.instruction}
        </LessonHeading>
      </div>

      {/* The same arrangement as the Simulator: the stage on the left, what to do and how it went beside it. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-4 lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1">
          <StepFeedbackPanel
            step={step}
            evaluation={state.evaluation}
            attempts={attempts}
            stepComplete={state.stepComplete}
            isLastStep={position === total}
            autoAdvance={run.autoAdvance}
            onNextStep={run.nextStep}
            onHold={run.holdStep}
          />

          {/* Whenever a hold completes the notice must be visible — including on a squeeze step,
              where the step itself has nothing to say about it. */}
          {(state.emergencyCompleted || ring.lastResult?.kind === 'emergency') && <EmergencyNotice />}
          <RunStats totals={runTotals(state.records)} evidence={evidenceForDevice(device)} />
        </div>

        {step.kind === 'squeeze' ? (
          <div className={`grid min-w-0 gap-4 lg:col-start-1 lg:row-start-1 ${PRACTICE_PANEL_CLASSES}`}>
            <SqueezeControl ring={ring} />
            {armed && !state.stepComplete ? (
              <p>The command window is still open. Let it close, then squeeze again.</p>
            ) : (
              <p className="text-muted-foreground">No tapping needed yet.</p>
            )}
          </div>
        ) : (
          <div className={`min-w-0 lg:col-start-1 lg:row-start-1 ${PRACTICE_PANEL_CLASSES}`}>
            <PracticeSurface
              ring={ring}
              hand={preferences.hand}
              targetContact={step.contact}
              detectedContact={state.evaluation?.detectedContact ?? null}
              showEmergencyHold={step.kind === 'hold'}
              showEmergencyNotice={false}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button variant="secondary" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmingRestart(true)}>
          Restart lesson
        </Button>
        {onExit && (
          <>
            <Button variant="ghost" leadingIcon={<LogOut className="h-4 w-4" />} onClick={onExit}>
              Exit lesson
            </Button>
            {/* Replaying a completed lesson keeps it Completed; otherwise starting a run made it In progress. */}
            <p className="text-sm text-muted-foreground">Leaving keeps this lesson marked {lessonStatusLabel(run.progress.status)}.</p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmingRestart}
        title="Restart this lesson?"
        description="You go back to step 1, and this run’s attempts start again from zero. Attempts you have already made still count towards your training totals."
        confirmLabel="Restart lesson"
        onCancel={() => setConfirmingRestart(false)}
        onConfirm={() => {
          setConfirmingRestart(false);
          run.start();
        }}
      />
    </div>
  );
}
