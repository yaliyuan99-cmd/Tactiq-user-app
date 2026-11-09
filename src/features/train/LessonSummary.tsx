import { useId, type ReactNode } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { ROUTES, lessonRoute } from '@/app/routes';
import { Button, ButtonLink, EvidenceLabel, VisuallyHidden } from '@/components';
import { getLesson, nextLessonId } from '@/domain/lessons';
import type { EvidenceSource } from '@/domain/evidence';
import { EmergencyNotice, evidenceForDevice } from '@/features/practice';
import { formatPercent } from '@/lib/time';
import { useDevice } from '@/services/device/DeviceProvider';
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
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 text-xl font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Percent({ value, evidence }: { value: number | null; evidence: EvidenceSource }) {
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
        <EvidenceLabel kind={evidence} />
      </span>
    </>
  );
}

/** The end of a run: what happened in plain words and numbers, then what to do next. */
export function LessonSummary({ run, headingLevel, showLessonLinks }: LessonSummaryProps) {
  const headingId = useId();
  const { lesson, state, progress } = run;
  const { state: device } = useDevice();
  // Lessons store no provenance per run, so this run is labelled from the device it was done on.
  const evidence = evidenceForDevice(device);
  const totals = runTotals(state.records);
  const nextId = nextLessonId(lesson.id);
  const next = nextId ? getLesson(nextId) : null;

  return (
    <section aria-labelledby={headingId} className="grid max-w-3xl gap-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="settle-in inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <LessonHeading ref={run.summaryHeadingRef} id={headingId} level={headingLevel} tabIndex={-1}>
            Lesson complete
          </LessonHeading>
          <p className="mt-1 text-lg">{runSummarySentence(lesson, state.records)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-lg border-[1.5px] border-foreground bg-card p-5 shadow-card min-[400px]:grid-cols-2 sm:grid-cols-3 sm:p-6">
        <Stat term="Steps">{lesson.steps.length}</Stat>
        <Stat term="Attempts">{totals.attempts}</Stat>
        <Stat term="Correct">{totals.correct}</Stat>
        <Stat term="Accuracy">
          <Percent value={totals.accuracy} evidence={evidence} />
        </Stat>
        <Stat term="Best accuracy">
          <Percent value={progress.bestAccuracy} evidence="simulated" />
        </Stat>
      </dl>
      <p className="text-sm text-muted-foreground">
        {evidence === 'measured'
          ? 'Accuracy for this run comes from taps on your connected bench ring. Best accuracy is your best completed run of this lesson; lessons do not record which runs used a ring, so it stays labelled Simulated.'
          : 'Accuracy here is from practice in this app, not from a ring. Best accuracy is your best completed run of this lesson.'}
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
