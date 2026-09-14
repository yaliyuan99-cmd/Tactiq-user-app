/**
 * One lesson from start to finish: intro → practice → summary. Used by the
 * lesson page and embedded in onboarding.
 *
 * It calls `useRing` itself while the user practises, so do not render
 * another `useRing` screen (such as PracticeSurface with its own ring) beside
 * it, or ring outcomes would be announced twice.
 */
import type { LessonId } from '@/domain/lessons';
import { PageHeader } from '@/components';
import { subLevel } from './headingLevel';
import { LessonHeading } from './LessonHeading';
import { LessonIntro } from './LessonIntro';
import { LessonPractice } from './LessonPractice';
import { LessonSummary } from './LessonSummary';
import { lessonTitle } from './trainingWords';
import { useLessonRun } from './useLessonRun';

export interface LessonRunnerResult {
  readonly lessonId: LessonId;
  readonly attempts: number;
  readonly correct: number;
  /** correct / attempts for this run, or null when there were no attempts. */
  readonly accuracy: number | null;
}

export interface LessonRunnerProps {
  readonly lessonId: LessonId;
  /** Called once when the user reaches the lesson summary. */
  readonly onComplete?: (result: LessonRunnerResult) => void;
  /** Called when the user leaves before finishing (e.g. "Exit lesson"). */
  readonly onExit?: () => void;
  /** Hides the page-level chrome (explanation heading level 2 instead of 1) for embedding in onboarding. */
  readonly embedded?: boolean;
  /** Heading level for the lesson title when embedded. Defaults to 2. */
  readonly headingLevel?: 2 | 3;
  /**
   * Shows "Next lesson: …" (or "Back to all lessons") on the summary. Defaults to true on the page and
   * false when embedded, where the host usually offers its own way on.
   */
  readonly showLessonLinks?: boolean;
}

export function LessonRunner({ lessonId, onComplete, onExit, embedded = false, headingLevel = 2, showLessonLinks }: LessonRunnerProps) {
  const run = useLessonRun(lessonId, { onComplete });
  const { lesson, state, progress } = run;
  const title = lessonTitle(lesson);
  const sectionLevel = embedded ? subLevel(headingLevel) : 2;

  return (
    <div data-lesson={lesson.id} data-phase={state.phase}>
      {embedded ? (
        <div className="mb-6">
          <LessonHeading level={headingLevel}>{title}</LessonHeading>
          {state.phase === 'intro' && <p className="mt-2 text-muted-foreground">{lesson.summary}</p>}
        </div>
      ) : (
        <PageHeader title={title} lede={state.phase === 'intro' ? lesson.summary : undefined} />
      )}

      {state.phase === 'intro' && (
        <LessonIntro lesson={lesson} progress={progress} headingLevel={sectionLevel} onStart={run.start} />
      )}
      {state.phase === 'practice' && <LessonPractice run={run} headingLevel={sectionLevel} onExit={onExit} />}
      {state.phase === 'summary' && (
        <LessonSummary run={run} headingLevel={sectionLevel} showLessonLinks={showLessonLinks ?? !embedded} />
      )}
    </div>
  );
}
