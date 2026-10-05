import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Callout } from '@/components';
import { getLesson } from '@/domain/lessons';
import { LessonRunner } from '@/features/train/LessonRunner';
import { useDevice } from '@/services/device/DeviceProvider';
import { LESSON_DONE, LESSON_LEFT, RESTART_LESSON_LABEL } from '../onboardingCopy';
import { StepLede } from './StepSection';

const FIRST_LESSON = getLesson('squeeze_to_activate');

export interface FirstLessonStepProps {
  /** Kept by the flow, so the success line survives moving back and forth. */
  readonly completed: boolean;
  readonly onComplete: () => void;
}

export function FirstLessonStep({ completed, onComplete }: FirstLessonStepProps) {
  const { state } = useDevice();
  const [left, setLeft] = useState(false);
  const [run, setRun] = useState(0);
  const restartRef = useRef<HTMLButtonElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const shownRun = useRef(run);

  // Leaving the lesson removes the control that had focus, so focus goes to the way back in.
  useEffect(() => {
    if (left) restartRef.current?.focus();
  }, [left]);

  // Restarting removes the restart button, so focus goes to the new lesson's heading.
  useEffect(() => {
    if (shownRun.current === run) return;
    shownRun.current = run;
    const container = lessonRef.current;
    if (!container) return;
    const heading = container.querySelector<HTMLElement>('h2, h3');
    const target = heading ?? container;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  }, [run]);

  return (
    <>
      <StepLede>
        Try lesson {FIRST_LESSON.number}, {FIRST_LESSON.title}. {FIRST_LESSON.summary}
      </StepLede>
      {/* The lesson card below states the command window, so this step does not repeat it. */}
      <p className="max-w-prose">
        {state.mode === 'demo'
          ? 'In Demo Mode, a Squeeze button stands in for the ring.'
          : 'With a Bluetooth bench ring, squeeze the ring itself.'}
      </p>

      {left ? (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <p>{LESSON_LEFT}</p>
          <div>
            <Button
              ref={restartRef}
              variant="secondary"
              leadingIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                setRun((n) => n + 1);
                setLeft(false);
              }}
            >
              {RESTART_LESSON_LABEL}
            </Button>
          </div>
        </div>
      ) : (
        <div ref={lessonRef} className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-card outline-none sm:p-6">
          <LessonRunner
            key={run}
            lessonId={FIRST_LESSON.id}
            embedded
            headingLevel={2}
            onComplete={onComplete}
            onExit={() => setLeft(true)}
          />
        </div>
      )}

      {completed && (
        <Callout kind="success">
          <p>{LESSON_DONE}</p>
        </Callout>
      )}
    </>
  );
}
