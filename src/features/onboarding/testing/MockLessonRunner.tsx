/**
 * Test stand-in for the Train feature's LessonRunner, so onboarding tests do
 * not depend on its internals. Use it with:
 *   vi.mock('@/features/train/LessonRunner', () => import('./testing/MockLessonRunner'));
 */
import type { LessonRunnerProps } from '@/features/train/LessonRunner';

export function LessonRunner({ lessonId, onComplete, onExit, embedded, headingLevel = 2 }: LessonRunnerProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div data-testid="lesson-runner" data-lesson={lessonId} data-embedded={String(embedded === true)}>
      <Heading>Mock lesson: {lessonId}</Heading>
      <button type="button" onClick={() => onComplete?.({ lessonId, attempts: 3, correct: 3, accuracy: 1 })}>
        Finish lesson
      </button>
      <button type="button" onClick={() => onExit?.()}>
        Exit lesson
      </button>
    </div>
  );
}
