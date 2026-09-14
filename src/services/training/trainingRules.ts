/**
 * Pure training rules: empty progress, stored-data checks and the summary.
 * Accuracy here is accuracy in simulated lessons, never ring accuracy.
 */
import { COMMAND_TOKENS } from '@/domain/commands';
import { LESSON_IDS, getLesson, type LessonId } from '@/domain/lessons';
import type { LessonProgress, LessonStatus, TrainingProgress, TrainingSummary } from '@/domain/models';

const STATUSES: readonly LessonStatus[] = ['not_started', 'in_progress', 'complete'];

export function emptyLessonProgress(lessonId: LessonId): LessonProgress {
  return {
    lessonId,
    status: 'not_started',
    attempts: 0,
    correct: 0,
    bestAccuracy: null,
    lastAccuracy: null,
    lastAttemptAt: null,
    completedAt: null,
    runs: 0,
    runAttempts: 0,
    runCorrect: 0,
  };
}

export function emptyTrainingProgress(): TrainingProgress {
  const lessons = Object.fromEntries(LESSON_IDS.map((id) => [id, emptyLessonProgress(id)])) as Record<
    LessonId,
    LessonProgress
  >;
  return { version: 1, lessons };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function ratio(value: unknown): number | null {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : null;
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

/** Rebuilds a lesson record from stored data, falling back field by field. */
export function normaliseLessonProgress(lessonId: LessonId, raw: unknown): LessonProgress {
  if (!isRecord(raw)) return emptyLessonProgress(lessonId);
  const status: LessonStatus = STATUSES.find((s) => s === raw.status) ?? 'not_started';
  const attempts = count(raw.attempts);
  const runAttempts = count(raw.runAttempts);
  return {
    lessonId,
    status,
    attempts,
    correct: Math.min(count(raw.correct), attempts),
    bestAccuracy: ratio(raw.bestAccuracy),
    lastAccuracy: ratio(raw.lastAccuracy),
    lastAttemptAt: isoOrNull(raw.lastAttemptAt),
    completedAt: isoOrNull(raw.completedAt),
    runs: count(raw.runs),
    runAttempts,
    runCorrect: Math.min(count(raw.runCorrect), runAttempts),
  };
}

/** Always returns an entry for every lesson in LESSON_IDS. */
export function normaliseTrainingProgress(raw: unknown): TrainingProgress {
  const stored = isRecord(raw) && isRecord(raw.lessons) ? raw.lessons : {};
  const lessons = Object.fromEntries(
    LESSON_IDS.map((id) => [id, normaliseLessonProgress(id, stored[id])]),
  ) as Record<LessonId, LessonProgress>;
  return { version: 1, lessons };
}

export function firstIncompleteLesson(progress: TrainingProgress): LessonId | null {
  return LESSON_IDS.find((id) => progress.lessons[id].status !== 'complete') ?? null;
}

export function summariseTraining(progress: TrainingProgress): TrainingSummary {
  const all = LESSON_IDS.map((id) => progress.lessons[id]);
  const completed = all.filter((l) => l.status === 'complete');
  const attempts = all.reduce((sum, l) => sum + l.attempts, 0);
  const correct = all.reduce((sum, l) => sum + l.correct, 0);
  const taught = new Set(completed.flatMap((l) => getLesson(l.lessonId).teaches));
  return {
    lessonsCompleted: completed.length,
    lessonsTotal: LESSON_IDS.length,
    attempts,
    correct,
    accuracy: attempts > 0 ? correct / attempts : null,
    commandsLearnt: COMMAND_TOKENS.filter((token) => taught.has(token)),
    nextLesson: firstIncompleteLesson(progress),
    evidence: 'simulated',
  };
}
