/**
 * A run through a lesson: which step the user is on, attempts per step, and
 * moving from step to step. Pure: no React, no services.
 */
import type { StepEvaluation } from './lessonLogic';

export type LessonPhase = 'intro' | 'practice' | 'summary';

export interface StepRecord {
  readonly attempts: number;
  readonly correct: number;
}

export interface LessonRunState {
  readonly phase: LessonPhase;
  /** Increases every time a run starts, so a restart is a new run even on the same step. */
  readonly runId: number;
  readonly stepIndex: number;
  readonly records: readonly StepRecord[];
  /** The current step has been answered correctly and is waiting to move on. */
  readonly stepComplete: boolean;
  /** The latest judgement on the current step. */
  readonly evaluation: StepEvaluation | null;
  /** A five-second hold completed at some point in this run. */
  readonly emergencyCompleted: boolean;
}

function freshRecords(stepCount: number): StepRecord[] {
  return Array.from({ length: Math.max(0, stepCount) }, () => ({ attempts: 0, correct: 0 }));
}

export function createRunState(stepCount: number): LessonRunState {
  return {
    phase: 'intro',
    runId: 0,
    stepIndex: 0,
    records: freshRecords(stepCount),
    stepComplete: false,
    evaluation: null,
    emergencyCompleted: false,
  };
}

/** Starts (or restarts) a run at step 1. */
export function beginRun(state: LessonRunState, stepCount: number): LessonRunState {
  return { ...createRunState(stepCount), phase: 'practice', runId: state.runId + 1 };
}

/** Counts an attempt on the current step. Ignored outside practice and once the step is complete. */
export function recordEvaluation(state: LessonRunState, result: StepEvaluation): LessonRunState {
  if (state.phase !== 'practice' || state.stepComplete) return state;
  const current = state.records[state.stepIndex];
  if (!current) return state;
  const records = state.records.map((record, index) =>
    index === state.stepIndex ? { attempts: record.attempts + 1, correct: record.correct + (result.correct ? 1 : 0) } : record,
  );
  return {
    ...state,
    records,
    stepComplete: result.correct,
    evaluation: result,
    emergencyCompleted: state.emergencyCompleted || result.emergencyCompleted,
  };
}

/** Moves on from a completed step: to the next step, or to the summary after the last one. */
export function advanceRun(state: LessonRunState): LessonRunState {
  if (state.phase !== 'practice' || !state.stepComplete) return state;
  if (state.stepIndex + 1 >= state.records.length) {
    return { ...state, phase: 'summary', stepComplete: false, evaluation: null };
  }
  return { ...state, stepIndex: state.stepIndex + 1, stepComplete: false, evaluation: null };
}

export interface RunTotals {
  readonly attempts: number;
  readonly correct: number;
  /** correct / attempts, or null when there were no attempts. */
  readonly accuracy: number | null;
}

export function runTotals(records: readonly StepRecord[]): RunTotals {
  const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
  const correct = records.reduce((sum, record) => sum + record.correct, 0);
  return { attempts, correct, accuracy: attempts > 0 ? correct / attempts : null };
}
