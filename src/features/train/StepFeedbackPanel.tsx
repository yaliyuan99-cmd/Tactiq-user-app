import { ArrowRight, CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import { Button } from '@/components';
import type { LessonStep } from '@/domain/lessons';
import { cn } from '@/lib/cn';
import { stepHint, type StepEvaluation } from './lessonLogic';

export interface StepFeedbackPanelProps {
  readonly step: LessonStep;
  readonly evaluation: StepEvaluation | null;
  /** Attempts on the current step. */
  readonly attempts: number;
  readonly stepComplete: boolean;
  readonly isLastStep: boolean;
  /** Whether the step still moves on by itself. */
  readonly autoAdvance: boolean;
  readonly onNextStep: () => void;
  /** The user reached for the button: stop moving on by itself. */
  readonly onHold: () => void;
}

function outcome(evaluation: StepEvaluation | null) {
  if (!evaluation) return { key: 'waiting', title: 'Waiting for an attempt', Icon: CircleDashed, tone: 'text-muted-foreground' };
  return evaluation.correct
    ? { key: 'correct', title: 'Correct', Icon: CircleCheck, tone: 'text-status-confirmed' }
    : { key: 'incorrect', title: 'Not yet', Icon: CircleX, tone: 'text-destructive' };
}

/**
 * The visible result of the latest attempt. Deliberately not a live region:
 * the same words are announced once through FeedbackProvider. Its structure
 * stays the same before and after an attempt, so the practice controls below
 * it barely move.
 */
export function StepFeedbackPanel({
  step,
  evaluation,
  attempts,
  stepComplete,
  isLastStep,
  autoAdvance,
  onNextStep,
  onHold,
}: StepFeedbackPanelProps) {
  const { key, title, Icon, tone } = outcome(evaluation);
  const nextLabel = isLastStep ? 'Finish lesson' : 'Next step';

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card p-4 shadow-card sm:p-5" data-outcome={key}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon className={cn('h-5 w-5 shrink-0', tone)} aria-hidden="true" />
        <span>{title}</span>
      </p>
      <p>{evaluation ? evaluation.message : stepHint(step)}</p>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">Attempts on this step: {attempts}</p>
        {stepComplete && (
          <Button
            size="sm"
            onClick={onNextStep}
            onFocus={onHold}
            onPointerEnter={onHold}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            {nextLabel}
          </Button>
        )}
      </div>
      {stepComplete && step.kind === 'squeeze' && (
        <p className="text-sm text-muted-foreground">
          {autoAdvance
            ? `${isLastStep ? 'The lesson finishes' : 'The next step starts'} when the command window closes, or choose ${nextLabel} now.`
            : `Choose ${nextLabel} when you are ready.`}
        </p>
      )}
    </div>
  );
}
