import type { LessonId } from '@/domain/lessons';
import type { LessonProgress, TrainingProgress, TrainingSummary } from '@/domain/models';

export interface AttemptInput {
  readonly correct: boolean;
  readonly durationMs?: number;
  readonly at?: string;
}

export interface TrainingService {
  getProgress(): TrainingProgress;
  getLesson(lessonId: LessonId): LessonProgress;
  /**
   * Begins a run (run counters zeroed). A lesson that is not complete becomes
   * in_progress; a complete lesson stays complete while it is replayed, so the
   * summary's completed lessons and commands learnt do not drop.
   */
  startRun(lessonId: LessonId): LessonProgress;
  recordAttempt(lessonId: LessonId, attempt: AttemptInput): LessonProgress;
  /** Ends the run: computes accuracy for this run and marks the lesson complete. */
  completeRun(lessonId: LessonId): LessonProgress;
  /** Back to not started. Keeps lifetime attempts, correct, best accuracy and run count; clears completedAt. */
  restartLesson(lessonId: LessonId): LessonProgress;
  resetAll(): void;
  summary(): TrainingSummary;
  nextLesson(): LessonId | null;
  subscribe(listener: () => void): () => void;
}
