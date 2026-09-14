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
  /** Marks a lesson as started (status in_progress) and begins a run. */
  startRun(lessonId: LessonId): LessonProgress;
  recordAttempt(lessonId: LessonId, attempt: AttemptInput): LessonProgress;
  /** Ends the run: computes accuracy for this run and marks the lesson complete. */
  completeRun(lessonId: LessonId): LessonProgress;
  restartLesson(lessonId: LessonId): LessonProgress;
  resetAll(): void;
  summary(): TrainingSummary;
  nextLesson(): LessonId | null;
  subscribe(listener: () => void): () => void;
}
