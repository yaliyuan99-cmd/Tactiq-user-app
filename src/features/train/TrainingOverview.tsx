import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES, lessonRoute } from '@/app/routes';
import { ButtonLink, EvidenceLabel, ProgressBar, VisuallyHidden } from '@/components';
import { getLesson, type LessonId } from '@/domain/lessons';
import type { LessonStatus, TrainingSummary } from '@/domain/models';
import { evidenceForDevice } from '@/features/practice';
import { formatPercent } from '@/lib/time';
import { useDevice } from '@/services/device/DeviceProvider';

export interface TrainingOverviewProps {
  readonly summary: TrainingSummary;
  readonly recommended: LessonId | null;
  readonly recommendedStatus: LessonStatus | null;
}

const HEADING_ID = 'training-overview-heading';

/** Lessons completed, attempts and accuracy (Simulated), and the lesson to do next. */
export function TrainingOverview({ summary, recommended, recommendedStatus }: TrainingOverviewProps) {
  const lesson = recommended ? getLesson(recommended) : null;
  // Training totals carry no provenance, so with a ring connected the label is a limitation, not a claim.
  const measured = evidenceForDevice(useDevice().state) === 'measured';

  return (
    <section aria-labelledby={HEADING_ID} className="hero-band rounded-lg p-5 sm:p-7">
      <div className="grid gap-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
        <div className="grid content-center gap-4">
          {lesson ? (
            <>
              <p>
                <span className="font-mono-label block text-muted-foreground">Recommended next</span>
                <span className="mt-1 block text-3xl font-bold leading-tight text-balance sm:text-4xl">
                  Lesson {lesson.number}: {lesson.title}
                </span>
              </p>
              <p className="max-w-prose text-muted-foreground">{lesson.summary}</p>
              <div>
                <ButtonLink to={lessonRoute(lesson.id)} size="lg" trailingIcon={<ArrowRight className="h-5 w-5" />}>
                  {recommendedStatus === 'in_progress' ? 'Continue' : 'Start'} lesson {lesson.number}
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="text-lg">
              You have completed all five lessons. Practise any of them again below, or try free practice in the{' '}
              <Link to={ROUTES.simulator} className="font-medium text-primary-strong underline">
                Simulator
              </Link>
              .
            </p>
          )}
        </div>

        <div className="grid content-start gap-5">
          <h2 id={HEADING_ID} className="text-xl">
            Your progress
          </h2>
          <ProgressBar label="Lessons completed" value={summary.lessonsCompleted} max={summary.lessonsTotal} segmented />
          <dl className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">Attempts</dt>
              <dd className="text-2xl font-semibold tabular-nums">{summary.attempts}</dd>
            </div>
            <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">Accuracy</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {summary.accuracy === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <VisuallyHidden>Not available until you make an attempt</VisuallyHidden>
                  </>
                ) : (
                  formatPercent(summary.accuracy)
                )}
              </dd>
            </div>
          </dl>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <EvidenceLabel kind="simulated" />
            <span>
              {measured
                ? 'Attempts and accuracy come from lessons in this app. Lessons do not record which attempts came from a ring.'
                : 'Attempts and accuracy come from lessons in this app, not from a ring.'}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
