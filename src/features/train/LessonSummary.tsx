import { useId, type ReactNode } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { ROUTES, lessonRoute } from '@/app/routes';
import { Button, ButtonLink, EvidenceLabel, VisuallyHidden } from '@/components';
import { getLesson, nextLessonId } from '@/domain/lessons';
import { formatPercent } from '@/lib/time';
import { EmergencyNotice } from '@/features/practice';
import type { HeadingLevel } from './headingLevel';
import { LessonHeading } from './LessonHeading';
import { runTotals } from './lessonRun';
import { runSummarySentence } from './trainingWords';
import type { LessonRun } from './useLessonRun';

export interface LessonSummaryProps {
  readonly run: LessonRun;
  readonly headingLevel: HeadingLevel;
  /** Shows "Next lesson: …" or "Back to all lessons". */
  readonly showLessonLinks: boolean;
}

function Stat({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-l-2 border-border-strong pl-3">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 text-xl font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Percent({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <VisuallyHidden>Not available</VisuallyHidden>
      </>
    );
  }
  return (
    <>
      <span>{formatPercent(value)}</span>
      <span className="font-normal">
        <EvidenceLabel kind="simulated" />
      </span>
    </>
  );
}

/** The end of a run: what happened in plain words and numbers, then what to do next. */
export function LessonSummary({ run, headingLevel, showLessonLinks }: LessonSummaryProps) {
  const headingId = useId();
  const { lesson, state, progress } = run;
  const totals = runTotals(state.records);
  const nextId = nextLessonId(lesson.id);
  const next = nextId ? getLesson(nextId) : null;

  return (
    <section aria-labelledby={headingId} className="grid max-w-3xl gap-6">
      <div>
        <LessonHeading ref={run.summaryHeadingRef} id={headingId} level={headingLevel} tabIndex={-1}>
          Lesson complete
        </LessonHeading>
        <p className="mt-2 text-lg">{runSummarySentence(lesson, state.records)}</p>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-5 shadow-card min-[400px]:grid-cols-2 sm:grid-cols-3 sm:p-6">
        <Stat term="Steps">{lesson.steps.length}</Stat>
        <Stat term="Attempts">{totals.attempts}</Stat>
        <Stat term="Correct">{totals.correct}</Stat>
        <Stat term="Accuracy">
          <Percent value={totals.accuracy} />
        </Stat>
        <Stat term="Best accuracy">
          <Percent value={progress.bestAccuracy} />
        </Stat>
      </dl>
      <p className="text-sm text-muted-foreground">
        Accuracy here is from practice in this app, not from a ring. Best accuracy is your best completed run of this lesson.
      </p>

      {state.emergencyCompleted && <EmergencyNotice />}

      <div className="flex flex-wrap gap-3">
        {showLessonLinks &&
          (next ? (
            <ButtonLink to={lessonRoute(next.id)} trailingIcon={<ArrowRight className="h-5 w-5" />}>
              Next lesson: {next.title}
            </ButtonLink>
          ) : (
            <ButtonLink to={ROUTES.train}>Back to all lessons</ButtonLink>
          ))}
        <Button variant="secondary" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={run.start}>
          Practise again
        </Button>
      </div>
    </section>
  );
}
