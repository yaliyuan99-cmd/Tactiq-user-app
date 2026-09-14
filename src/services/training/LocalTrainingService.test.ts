import { LESSON_IDS, type LessonId } from '@/domain/lessons';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { LocalTrainingService } from './LocalTrainingService';
import { normaliseTrainingProgress } from './trainingRules';

const NOW = new Date('2026-09-15T04:30:00.000Z');

describe('LocalTrainingService', () => {
  let storage: MemoryStorageAdapter;
  let training: LocalTrainingService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    storage = new MemoryStorageAdapter();
    training = new LocalTrainingService(storage);
  });

  afterEach(() => {
    training.dispose();
    vi.useRealTimers();
  });

  function run(lessonId: LessonId, results: readonly boolean[]): void {
    training.startRun(lessonId);
    results.forEach((correct) => training.recordAttempt(lessonId, { correct }));
    training.completeRun(lessonId);
  }

  it('has an untouched entry for every lesson', () => {
    const progress = training.getProgress();
    expect(progress.version).toBe(1);
    expect(Object.keys(progress.lessons)).toEqual([...LESSON_IDS]);
    expect(training.getLesson('confirm_and_back')).toEqual({
      lessonId: 'confirm_and_back',
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
    });
  });

  it('starts a run as in progress with zeroed run counters', () => {
    const lesson = training.startRun('confirm_and_back');
    expect(lesson).toMatchObject({ status: 'in_progress', runAttempts: 0, runCorrect: 0 });
    const stored = normaliseTrainingProgress(storage.get(STORAGE_KEYS.training));
    expect(stored.lessons.confirm_and_back.status).toBe('in_progress');
  });

  it('records attempts against the lesson and the run', () => {
    training.startRun('confirm_and_back');
    training.recordAttempt('confirm_and_back', { correct: true });
    const lesson = training.recordAttempt('confirm_and_back', { correct: false, at: '2026-09-15T04:31:00.000Z' });
    expect(lesson).toMatchObject({ attempts: 2, correct: 1, runAttempts: 2, runCorrect: 1, lastAttemptAt: '2026-09-15T04:31:00.000Z' });
  });

  it('marks a lesson in progress when an attempt arrives before a run starts', () => {
    const lesson = training.recordAttempt('next_previous_read', { correct: true });
    expect(lesson).toMatchObject({ status: 'in_progress', attempts: 1, runAttempts: 1, lastAttemptAt: NOW.toISOString() });
  });

  it('completes a run with last and best accuracy', () => {
    run('confirm_and_back', [true, true, false, true]);
    let lesson = training.getLesson('confirm_and_back');
    expect(lesson).toMatchObject({ status: 'complete', lastAccuracy: 0.75, bestAccuracy: 0.75, runs: 1, completedAt: NOW.toISOString() });

    run('confirm_and_back', [true, false]);
    lesson = training.getLesson('confirm_and_back');
    expect(lesson).toMatchObject({ lastAccuracy: 0.5, bestAccuracy: 0.75, runs: 2, attempts: 6, correct: 4 });

    run('confirm_and_back', [true, true]);
    expect(training.getLesson('confirm_and_back')).toMatchObject({ lastAccuracy: 1, bestAccuracy: 1, runs: 3 });
  });

  it('completes a run with no attempts without inventing an accuracy', () => {
    training.startRun('squeeze_to_activate');
    const lesson = training.completeRun('squeeze_to_activate');
    expect(lesson).toMatchObject({ status: 'complete', lastAccuracy: null, bestAccuracy: null, runs: 1 });
  });

  it('restarts a lesson but keeps lifetime figures', () => {
    run('confirm_and_back', [true, false]);
    const lesson = training.restartLesson('confirm_and_back');
    expect(lesson).toMatchObject({
      status: 'not_started',
      attempts: 2,
      correct: 1,
      bestAccuracy: 0.5,
      runs: 1,
      runAttempts: 0,
      runCorrect: 0,
      completedAt: null,
    });
  });

  it('summarises lessons, accuracy, commands learnt and the next lesson', () => {
    expect(training.summary()).toEqual({
      lessonsCompleted: 0,
      lessonsTotal: 5,
      attempts: 0,
      correct: 0,
      accuracy: null,
      commandsLearnt: [],
      nextLesson: 'squeeze_to_activate',
      evidence: 'simulated',
    });

    run('squeeze_to_activate', []);
    run('next_previous_read', [true, true, true, false]);
    run('confirm_and_back', [true, true, true, true]);
    training.startRun('undo_and_shortcuts');
    training.recordAttempt('undo_and_shortcuts', { correct: false });

    const summary = training.summary();
    expect(summary.lessonsCompleted).toBe(3);
    expect(summary.attempts).toBe(9);
    expect(summary.correct).toBe(7);
    expect(summary.accuracy).toBeCloseTo(7 / 9);
    expect(summary.commandsLearnt).toEqual(['confirm', 'back', 'next', 'read', 'previous']);
    expect(summary.nextLesson).toBe('undo_and_shortcuts');
    expect(training.nextLesson()).toBe('undo_and_shortcuts');
  });

  it('has no next lesson once all five are complete', () => {
    LESSON_IDS.forEach((id) => run(id, [true]));
    expect(training.nextLesson()).toBeNull();
    expect(training.summary().commandsLearnt).toHaveLength(9);
  });

  it('resets everything', () => {
    run('confirm_and_back', [true]);
    training.resetAll();
    expect(training.summary().lessonsCompleted).toBe(0);
    expect(storage.get(STORAGE_KEYS.training)).toBeNull();
  });

  it('refuses an unknown lesson', () => {
    expect(() => training.startRun('lesson_six' as LessonId)).toThrow('There is no lesson called "lesson_six".');
  });

  it('repairs malformed stored progress', () => {
    storage.set(STORAGE_KEYS.training, {
      version: 1,
      lessons: { confirm_and_back: { status: 'finished', attempts: -3, correct: 9, bestAccuracy: 4, runs: 2 } },
    });
    const lesson = training.getLesson('confirm_and_back');
    expect(lesson).toMatchObject({ status: 'not_started', attempts: 0, correct: 0, bestAccuracy: null, runs: 2 });
    expect(training.getLesson('emergency_hold').status).toBe('not_started');
  });

  it('notifies on changes, including outside changes to its key', () => {
    const listener = vi.fn();
    const unsubscribe = training.subscribe(listener);
    run('confirm_and_back', [true]);
    expect(listener).toHaveBeenCalledTimes(3);
    storage.remove(STORAGE_KEYS.training);
    expect(listener).toHaveBeenCalledTimes(4);
    expect(training.getLesson('confirm_and_back').status).toBe('not_started');
    unsubscribe();
    training.resetAll();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('reports failed writes', () => {
    vi.spyOn(storage, 'set').mockReturnValue(false);
    training.startRun('confirm_and_back');
    expect(training.lastWriteSucceeded()).toBe(false);
    expect(training.getLesson('confirm_and_back').status).toBe('in_progress');
  });
});
