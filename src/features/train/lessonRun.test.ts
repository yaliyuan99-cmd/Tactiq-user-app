import type { StepEvaluation } from './lessonLogic';
import { advanceRun, beginRun, createRunState, recordEvaluation, runTotals } from './lessonRun';

function judged(correct: boolean, emergencyCompleted = false): StepEvaluation {
  return {
    correct,
    message: correct ? 'Confirm, on the index fingertip.' : 'That was Next, on the middle finger base.',
    announcement: correct ? 'Correct. Confirm, on the index fingertip.' : 'That was Next, on the middle finger base.',
    feedbackKind: emergencyCompleted ? 'emergency' : 'confirm',
    detectedContact: correct ? null : 'middle_base',
    emergencyCompleted,
  };
}

describe('a run through a lesson', () => {
  const correct = judged(true);
  const wrong = judged(false);

  it('starts in the intro and begins practice at step 1 with a new run id', () => {
    const intro = createRunState(3);
    expect(intro).toMatchObject({ phase: 'intro', runId: 0, stepIndex: 0, stepComplete: false, evaluation: null });
    expect(intro.records).toHaveLength(3);
    const run = beginRun(intro, 3);
    expect(run).toMatchObject({ phase: 'practice', runId: 1, stepIndex: 0 });
    expect(beginRun(run, 3).runId).toBe(2);
  });

  it('counts misses on a step, completes it on a correct answer, then moves on', () => {
    let run = beginRun(createRunState(2), 2);
    run = recordEvaluation(run, wrong);
    expect(run).toMatchObject({ stepComplete: false, evaluation: wrong, records: [{ attempts: 1, correct: 0 }, { attempts: 0, correct: 0 }] });
    expect(advanceRun(run)).toBe(run);

    run = recordEvaluation(run, correct);
    expect(run).toMatchObject({ stepComplete: true, records: [{ attempts: 2, correct: 1 }, { attempts: 0, correct: 0 }] });
    // Once complete, further input on the step is not counted.
    expect(recordEvaluation(run, wrong)).toBe(run);

    run = advanceRun(run);
    expect(run).toMatchObject({ phase: 'practice', stepIndex: 1, stepComplete: false, evaluation: null });
    run = advanceRun(recordEvaluation(run, correct));
    expect(run.phase).toBe('summary');
    expect(runTotals(run.records)).toEqual({ attempts: 3, correct: 2, accuracy: 2 / 3 });
  });

  it('ignores input outside practice and remembers a completed emergency hold', () => {
    const intro = createRunState(2);
    expect(recordEvaluation(intro, correct)).toBe(intro);
    const hold = judged(false, true);
    let run = recordEvaluation(beginRun(intro, 2), hold);
    expect(run.emergencyCompleted).toBe(true);
    run = recordEvaluation(run, correct);
    expect(run.emergencyCompleted).toBe(true);
    expect(runTotals([])).toEqual({ attempts: 0, correct: 0, accuracy: null });
  });
});

