import { type ReactNode, type RefObject } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, PAGE_TITLE_ID, ProgressBar } from '@/components';
import { PROGRESS_LABEL } from './onboardingCopy';
import { STEP_COUNT, progressText, stepAt, stepControls } from './onboardingFlow';

export interface StepFrameProps {
  readonly index: number;
  readonly headingRef: RefObject<HTMLHeadingElement>;
  readonly onBack: () => void;
  readonly onSkip: () => void;
  readonly onContinue: () => void;
  readonly children: ReactNode;
}

/**
 * One onboarding step: progress in words and as a bar, the page's single h1
 * (id page-title, focusable so the flow can move focus to it), the step's
 * content, then Back / Skip this step / Continue in reading order.
 */
export function StepFrame({ index, headingRef, onBack, onSkip, onContinue, children }: StepFrameProps) {
  const step = stepAt(index);
  const controls = stepControls(index);
  const progress = progressText(index);

  return (
    <div data-step={step.id}>
      <div className="mb-5">
        <ProgressBar
          value={index + 1}
          max={STEP_COUNT}
          label={PROGRESS_LABEL}
          valueText={progress}
          showValueText={false}
          segmented
        />
        {/* The progress bar carries this text as its value, so it is not read twice. */}
        <p className="font-mono-label mt-2 text-muted-foreground" aria-hidden="true">
          {progress}
        </p>
      </div>

      <h1 key={step.id} id={PAGE_TITLE_ID} ref={headingRef} tabIndex={-1} className="animate-enter-rise">
        {step.title}
      </h1>

      <div className="mt-5 grid min-w-0 gap-8">{children}</div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div>
          {controls.showBack && (
            <Button variant="secondary" leadingIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls.showSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip this step
            </Button>
          )}
          <Button
            variant={controls.continueVariant}
            trailingIcon={controls.continueAction === 'next' ? <ArrowRight className="h-4 w-4" /> : undefined}
            onClick={onContinue}
          >
            {controls.continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
