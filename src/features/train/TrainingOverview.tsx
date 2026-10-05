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
    <section aria-labelledby={HEADING_ID} className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 id={HEADING_ID}>Your progress</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-8">
        <div className="grid gap-4">
          <ProgressBar label="Lessons completed" value={summary.lessonsCompleted} max={summary.lessonsTotal} />
          <dl className="grid grid-cols-2 gap-3">
            <div className="min-w-0 border-l-2 border-border-strong pl-3">
              <dt className="text-sm text-muted-foreground">Attempts</dt>
              <dd className="text-xl font-semibold tabular-nums">{summary.attempts}</dd>
            </div>
            <div className="min-w-0 border-l-2 border-border-strong pl-3">
              <dt className="text-sm text-muted-foreground">Accuracy</dt>
              <dd className="text-xl font-semibold tabular-nums">
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
                ? 'Attempts and accuracy come from lessons in this app. Lessons do not record which attempts came from a ring, so every one is labelled Simulated.'
                : 'Attempts and accuracy come from lessons in this app, not from a ring.'}
            </span>
          </p>
        </div>

        <div className="grid gap-3 md:border-l md:border-border md:pl-8">
          {lesson ? (
            <>
              <p>
                <span className="font-mono-label block text-muted-foreground">Recommended next</span>
                <span className="font-semibold">
                  Lesson {lesson.number}: {lesson.title}
                </span>
              </p>
              <div>
                <ButtonLink to={lessonRoute(lesson.id)} trailingIcon={<ArrowRight className="h-5 w-5" />}>
                  {recommendedStatus === 'in_progress' ? 'Continue' : 'Start'} lesson {lesson.number}
                </ButtonLink>
              </div>
            </>
          ) : (
            <p>
              You have completed all five lessons. Practise any of them again below, or try free practice in the{' '}
              <Link to={ROUTES.simulator} className="font-medium text-primary-strong underline">
                Simulator
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
