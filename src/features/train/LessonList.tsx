import { Circle, CircleCheck, CircleDashed, type LucideIcon } from 'lucide-react';
import { lessonRoute } from '@/app/routes';
import { ButtonLink, EvidenceLabel, VisuallyHidden } from '@/components';
import { LESSONS, type Lesson, type LessonId } from '@/domain/lessons';
import type { LessonProgress, LessonStatus, TrainingProgress } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/time';
import { lessonActionLabel, lessonStatusLabel } from './trainingWords';

export interface LessonListProps {
  readonly progress: TrainingProgress;
  readonly recommended: LessonId | null;
}

const HEADING_ID = 'lesson-list-heading';

const STATUS_ICONS: Record<LessonStatus, { Icon: LucideIcon; tone: string }> = {
  not_started: { Icon: Circle, tone: 'text-muted-foreground' },
  in_progress: { Icon: CircleDashed, tone: 'text-primary-strong' },
  complete: { Icon: CircleCheck, tone: 'text-status-confirmed' },
};

function LessonItem({ lesson, progress, recommended }: { lesson: Lesson; progress: LessonProgress; recommended: boolean }) {
  const { Icon, tone } = STATUS_ICONS[progress.status];
  const headingId = `lesson-${lesson.id}-heading`;

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
        <span
          aria-hidden="true"
          className="font-mono-label inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong sm:h-10 sm:w-10"
        >
          {lesson.number}
        </span>
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 id={headingId}>
              <VisuallyHidden>{`Lesson ${lesson.number}: `}</VisuallyHidden>
              {lesson.title}
            </h3>
            {recommended && (
              <span className="font-mono-label rounded-sm border border-primary-strong px-1.5 py-0.5 text-primary-strong">
                Recommended
              </span>
            )}
          </div>
          <p className="text-muted-foreground">{lesson.summary}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-hidden="true" />
              {lessonStatusLabel(progress.status)}
            </span>
            {progress.bestAccuracy !== null && (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <span className="tabular-nums">Best: {formatPercent(progress.bestAccuracy)}</span>
                <EvidenceLabel kind="simulated" />
              </span>
            )}
          </p>
        </div>
        <div className="col-start-2 sm:col-start-3 sm:self-center">
          <ButtonLink to={lessonRoute(lesson.id)} variant="secondary" size="sm">
            {lessonActionLabel(progress.status)}
            <VisuallyHidden>{` lesson ${lesson.number}: ${lesson.title}`}</VisuallyHidden>
          </ButtonLink>
        </div>
      </div>
    </li>
  );
}

/** The five lessons, in order, each with its status and the one action that fits it. */
export function LessonList({ progress, recommended }: LessonListProps) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>Lessons</h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Each lesson builds on the one before. You can take them in any order and repeat them as often as you like.
      </p>
      <ol role="list" className="mt-5 grid gap-3">
        {LESSONS.map((lesson) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            progress={progress.lessons[lesson.id]}
            recommended={lesson.id === recommended}
          />
        ))}
      </ol>
    </section>
  );
}
