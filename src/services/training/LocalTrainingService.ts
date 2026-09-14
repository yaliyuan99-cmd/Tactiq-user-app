/**
 * Lesson progress kept on this device. A "run" is one pass through a
 * lesson; its counters live on the lesson record as `runAttempts` and
 * `runCorrect` (optional fields on LessonProgress, always filled in here).
 */
import { isLessonId, type LessonId } from '@/domain/lessons';
import type { LessonProgress, TrainingProgress, TrainingSummary } from '@/domain/models';
import { nowIso } from '@/lib/time';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, type Unsubscribe } from '@/services/useSubscription';
import { emptyTrainingProgress, firstIncompleteLesson, normaliseTrainingProgress, summariseTraining } from './trainingRules';
import type { AttemptInput, TrainingService } from './types';

export class LocalTrainingService implements TrainingService {
  private cache: TrainingProgress | null = null;
  private lastWrite = true;
  private readonly notifier: ChangeNotifier;

  constructor(private readonly storage: StorageAdapter) {
    this.notifier = new ChangeNotifier(storage, [STORAGE_KEYS.training], () => {
      this.cache = null;
    });
  }

  readonly subscribe = (listener: () => void): Unsubscribe => this.notifier.subscribe(listener);

  getProgress(): TrainingProgress {
    if (!this.cache) this.cache = normaliseTrainingProgress(this.storage.get<unknown>(STORAGE_KEYS.training));
    return this.cache;
  }

  getLesson(lessonId: LessonId): LessonProgress {
    assertLessonId(lessonId);
    return this.getProgress().lessons[lessonId];
  }

  startRun(lessonId: LessonId): LessonProgress {
    return this.update(lessonId, (lesson) => ({ ...lesson, status: 'in_progress', runAttempts: 0, runCorrect: 0 }));
  }

  /** Counts towards the lesson's totals and the current run. A lesson not yet started becomes in progress. */
  recordAttempt(lessonId: LessonId, attempt: AttemptInput): LessonProgress {
    return this.update(lessonId, (lesson) => ({
      ...lesson,
      status: lesson.status === 'not_started' ? 'in_progress' : lesson.status,
      attempts: lesson.attempts + 1,
      correct: lesson.correct + (attempt.correct ? 1 : 0),
      runAttempts: (lesson.runAttempts ?? 0) + 1,
      runCorrect: (lesson.runCorrect ?? 0) + (attempt.correct ? 1 : 0),
      lastAttemptAt: attempt.at ?? nowIso(),
    }));
  }

  completeRun(lessonId: LessonId): LessonProgress {
    return this.update(lessonId, (lesson) => {
      const runAttempts = lesson.runAttempts ?? 0;
      const lastAccuracy = runAttempts > 0 ? (lesson.runCorrect ?? 0) / runAttempts : null;
      const bestAccuracy =
        lastAccuracy === null
          ? lesson.bestAccuracy
          : lesson.bestAccuracy === null
            ? lastAccuracy
            : Math.max(lesson.bestAccuracy, lastAccuracy);
      return {
        ...lesson,
        status: 'complete',
        lastAccuracy,
        bestAccuracy,
        completedAt: nowIso(),
        runs: lesson.runs + 1,
      };
    });
  }

  /** Back to not started. Keeps lifetime attempts, correct, best accuracy and run count; clears completedAt. */
  restartLesson(lessonId: LessonId): LessonProgress {
    return this.update(lessonId, (lesson) => ({
      ...lesson,
      status: 'not_started',
      completedAt: null,
      runAttempts: 0,
      runCorrect: 0,
    }));
  }

  resetAll(): void {
    this.notifier.quietly(() => this.storage.remove(STORAGE_KEYS.training));
    this.cache = emptyTrainingProgress();
    this.lastWrite = true;
    this.notifier.emit();
  }

  summary(): TrainingSummary {
    return summariseTraining(this.getProgress());
  }

  nextLesson(): LessonId | null {
    return firstIncompleteLesson(this.getProgress());
  }

  /** Whether the last change was persisted (false in private browsing or when storage is full). */
  lastWriteSucceeded(): boolean {
    return this.lastWrite;
  }

  dispose(): void {
    this.notifier.dispose();
  }

  private update(lessonId: LessonId, change: (lesson: LessonProgress) => LessonProgress): LessonProgress {
    assertLessonId(lessonId);
    const progress = this.getProgress();
    const lesson = change(progress.lessons[lessonId]);
    const next: TrainingProgress = { version: 1, lessons: { ...progress.lessons, [lessonId]: lesson } };
    this.lastWrite = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.training, next));
    this.cache = next;
    this.notifier.emit();
    return lesson;
  }
}

function assertLessonId(lessonId: string): asserts lessonId is LessonId {
  if (!isLessonId(lessonId)) throw new Error(`There is no lesson called "${lessonId}".`);
}
