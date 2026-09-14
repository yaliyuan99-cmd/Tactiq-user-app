/**
 * One run through a lesson: judges ring input against the current step,
 * records it (training progress and activity history), gives immediate
 * feedback, and moves between steps.
 *
 * Announcements: `useRing` announces every ring outcome itself. The lesson's
 * words for the same outcome are sent with the same feedback kind in the same
 * tick, so they replace the ring's announcement in the live region instead of
 * being read after it. Nothing is announced twice.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { getLesson, type Lesson, type LessonId } from '@/domain/lessons';
import type { LessonProgress } from '@/domain/models';
import { describeGate } from '@/features/practice/ringResults';
import { useRecordResult, useRecordSqueeze } from '@/features/practice/useRecordResult';
import { useShortcutLabels } from '@/features/practice/useShortcutLabels';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import type { FeedbackKind } from '@/services/feedback/types';
import { useTraining } from '@/services/ServicesProvider';
import { ADVANCE_DELAY_MS, evaluateStep, stepTargetContact, type LessonInput } from './lessonLogic';
import { advanceRun, beginRun, createRunState, recordEvaluation, runTotals, type LessonRunState } from './lessonRun';
import type { LessonRunnerResult } from './LessonRunner';

/** A result and a window closing this close together are one moment (matches the practice core). */
const SAME_MOMENT_MS = 50;

interface SentAnnouncement {
  readonly kind: FeedbackKind;
  readonly text: string;
  readonly at: number;
  /** Only dropped or cancelled presses can close the window in the same moment. */
  readonly canCloseWindow: boolean;
}

export interface LessonRun {
  readonly lesson: Lesson;
  readonly state: LessonRunState;
  /** Stored progress for the lesson; re-read on every change. */
  readonly progress: LessonProgress;
  /** Receives focus whenever the step changes. */
  readonly stepHeadingRef: RefObject<HTMLHeadingElement>;
  /** Receives focus when the summary appears. */
  readonly summaryHeadingRef: RefObject<HTMLHeadingElement>;
  /** Starts a run at step 1: from the intro, "Restart lesson" and "Practise again". */
  readonly start: () => void;
  /** Ring input for the current step. */
  readonly submit: (input: LessonInput) => void;
  /** The command window closed. */
  readonly windowClosed: (windowMs: number) => void;
  /** "Next step": moves on from a completed step now. */
  readonly nextStep: () => void;
  /** The user reached for "Next step", so the step no longer moves on by itself. */
  readonly holdStep: () => void;
  /** False once the user has reached for "Next step" on the current step. */
  readonly autoAdvance: boolean;
}

export interface UseLessonRunOptions {
  readonly onComplete?: (result: LessonRunnerResult) => void;
}

export function useLessonRun(lessonId: LessonId, { onComplete }: UseLessonRunOptions = {}): LessonRun {
  const lesson = getLesson(lessonId);
  const training = useTraining();
  const { feedback } = useFeedback();
  const record = useRecordResult();
  const recordSqueeze = useRecordSqueeze();
  const { mapping } = useShortcutLabels();

  const [state, setState] = useState<LessonRunState>(() => createRunState(lesson.steps.length));
  const stateRef = useRef(state);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusRef = useRef<'step' | 'summary' | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const [held, setHeld] = useState(false);
  const sentRef = useRef<SentAnnouncement | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const target = focusRef.current;
    if (target === null) return;
    focusRef.current = null;
    (target === 'summary' ? summaryHeadingRef : stepHeadingRef).current?.focus();
  }, [state.phase, state.stepIndex, state.runId]);

  const commit = (next: LessonRunState) => {
    stateRef.current = next;
    setState(next);
  };

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const start = () => {
    clearTimer();
    heldRef.current = false;
    setHeld(false);
    sentRef.current = null;
    training.startRun(lessonId);
    focusRef.current = 'step';
    commit(beginRun(stateRef.current, lesson.steps.length));
  };

  const advance = () => {
    clearTimer();
    const current = stateRef.current;
    const next = advanceRun(current);
    if (next === current) return;
    heldRef.current = false;
    setHeld(false);
    if (next.phase === 'summary') {
      training.completeRun(lessonId);
      focusRef.current = 'summary';
      commit(next);
      onCompleteRef.current?.({ lessonId, ...runTotals(next.records) });
      return;
    }
    focusRef.current = 'step';
    commit(next);
  };

  const scheduleAdvance = () => {
    if (heldRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      advance();
    }, ADVANCE_DELAY_MS);
  };

  const submit = (input: LessonInput) => {
    const current = stateRef.current;
    if (current.phase !== 'practice' || current.stepComplete) return;
    const step = lesson.steps[current.stepIndex];
    if (!step) return;
    const evaluation = evaluateStep(step, input, mapping);
    if (!evaluation) return;

    if (input.kind === 'window_opened') {
      recordSqueeze({ source: 'training', mode: 'lesson', lessonId });
    } else {
      record(input.result, { source: 'training', mode: 'lesson', lessonId, targetContact: stepTargetContact(step) });
    }
    const durationMs =
      input.kind !== 'result' ? null : input.result.kind === 'emergency_cancelled' ? input.result.elapsedMs : input.result.durationMs;
    training.recordAttempt(lessonId, { correct: evaluation.correct, ...(durationMs !== null ? { durationMs } : {}) });

    feedback(evaluation.feedbackKind, evaluation.announcement);
    sentRef.current = {
      kind: evaluation.feedbackKind,
      text: evaluation.announcement,
      at: Date.now(),
      canCloseWindow: input.kind === 'result' && (input.result.kind === 'rejected' || input.result.kind === 'emergency_cancelled'),
    };

    commit(recordEvaluation(current, evaluation));
    // A squeeze step moves on once the window has closed on its own (see windowClosed).
    if (evaluation.correct && step.kind !== 'squeeze') scheduleAdvance();
  };

  const windowClosed = (windowMs: number) => {
    const sent = sentRef.current;
    sentRef.current = null;
    // The ring folded "Command window closed." into its words for this press; keep that in the lesson's words too.
    if (sent && sent.canCloseWindow && Date.now() - sent.at <= SAME_MOMENT_MS) {
      feedback(sent.kind, `${sent.text} ${describeGate(false, windowMs)}`);
    }
    const current = stateRef.current;
    if (current.phase === 'practice' && current.stepComplete && lesson.steps[current.stepIndex]?.kind === 'squeeze') {
      scheduleAdvance();
    }
  };

  const holdStep = () => {
    heldRef.current = true;
    setHeld(true);
    clearTimer();
  };

  return {
    lesson,
    state,
    progress: training.getLesson(lessonId),
    stepHeadingRef,
    summaryHeadingRef,
    start,
    submit,
    windowClosed,
    nextStep: advance,
    holdStep,
    autoAdvance: !held,
  };
}
