/* PLACEHOLDER — the train feature replaces this implementation and MUST keep LessonRunnerProps. */
import type { LessonId } from '@/domain/lessons';

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
}

export function LessonRunner({ lessonId }: LessonRunnerProps) {
  return <p>Lesson {lessonId} is not built yet.</p>;
}
