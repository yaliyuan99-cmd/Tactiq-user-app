import { Check, CircleCheck, CircleDashed, Circle, type LucideIcon } from 'lucide-react';
import { lessonRoute } from '@/app/routes';
import { ButtonLink, EvidenceLabel, VisuallyHidden } from '@/components';
import { getCommand } from '@/domain/commands';
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

function PathNode({ lesson, status, recommended }: { lesson: Lesson; status: LessonStatus; recommended: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-semibold tabular-nums',
        status === 'complete' && 'border-primary bg-primary text-primary-foreground',
        status !== 'complete' && (recommended ? 'border-primary bg-card text-primary-strong' : 'border-border-strong bg-card'),
      )}
    >
      {status === 'complete' ? <Check className="h-5 w-5" /> : lesson.number}
    </span>
  );
}

function LessonItem({
  lesson,
  progress,
  recommended,
  last,
}: {
  lesson: Lesson;
  progress: LessonProgress;
  recommended: boolean;
  last: boolean;
}) {
  const { Icon, tone } = STATUS_ICONS[progress.status];
  const practises = lesson.teaches.length > 0 ? lesson.teaches.map((token) => getCommand(token).label) : ['Squeeze'];

  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 pb-3 sm:gap-x-4">
      {/* The path between one lesson and the next: solid once this one is done. */}
      {!last && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 left-[1.3125rem] top-0 w-0.5',
            progress.status === 'complete' ? 'bg-primary' : 'bg-border-strong',
          )}
        />
      )}
      <PathNode lesson={lesson} status={progress.status} recommended={recommended} />
      <div
        className={cn(
          'lift relative grid gap-3 rounded-lg border bg-card p-4 shadow-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5',
          recommended ? 'border-primary' : 'border-border',
        )}
      >
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3>
              <VisuallyHidden>{`Lesson ${lesson.number}: `}</VisuallyHidden>
              {lesson.title}
            </h3>
            {recommended && (
              <span className="font-mono-label rounded-full bg-secondary px-2.5 py-0.5 text-primary-strong">Recommended</span>
            )}
          </div>
          <p className="text-muted-foreground">{lesson.summary}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-hidden="true" />
              {lessonStatusLabel(progress.status)}
            </span>
            <span className="text-muted-foreground tabular-nums">{lesson.steps.length} steps</span>
            {progress.bestAccuracy !== null && (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <span className="tabular-nums">Best: {formatPercent(progress.bestAccuracy)}</span>
                <EvidenceLabel kind="simulated" />
              </span>
            )}
          </p>
          <p className="flex flex-wrap gap-1.5">
            {practises.map((label) => (
              <span key={label} className="rounded-full bg-muted px-2.5 py-0.5 text-sm">
                {label}
              </span>
            ))}
          </p>
        </div>
        <ButtonLink
          to={lessonRoute(lesson.id)}
          variant={recommended ? 'primary' : 'secondary'}
          size="sm"
          className="stretched-link justify-self-start"
        >
          {lessonActionLabel(progress.status)}
          <VisuallyHidden>{` lesson ${lesson.number}: ${lesson.title}`}</VisuallyHidden>
        </ButtonLink>
      </div>
    </li>
  );
}

/** The five lessons, in order, as a path: each with its status and the one action that fits it. */
export function LessonList({ progress, recommended }: LessonListProps) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>Lessons</h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Each lesson builds on the one before. You can take them in any order and repeat them as often as you like.
      </p>
      <ol role="list" className="mt-5 grid">
        {LESSONS.map((lesson, index) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            progress={progress.lessons[lesson.id]}
            recommended={lesson.id === recommended}
            last={index === LESSONS.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}
