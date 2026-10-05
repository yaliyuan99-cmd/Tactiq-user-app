import type { CommandToken } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { LessonStep } from '@/domain/lessons';
import type { RingResult } from '@/features/practice/ringResults';
import {
  evaluateStep,
  stepHint,
  stepTargetContact,
  stepTargetToken,
  targetPhrase,
  type LessonInput,
  type StepEvaluation,
} from './lessonLogic';

const confirmStep: LessonStep = { kind: 'tap', contact: 'index_tip', token: 'confirm', instruction: 'Tap Confirm.' };
const shortcutStep: LessonStep = { kind: 'tap', contact: 'pinky_tip', token: 'quick_action_1', instruction: 'Tap Shortcut 1.' };
const squeezeStep: LessonStep = { kind: 'squeeze', instruction: 'Squeeze.' };
const cancelStep: LessonStep = {
  kind: 'hold',
  contact: 'pinky_tip',
  token: 'emergency',
  holdMs: 5000,
  expect: 'cancel',
  instruction: 'Cancel.',
};
const completeStep: LessonStep = { ...cancelStep, expect: 'complete', instruction: 'Complete.' };

type ResultBody = RingResult extends infer R ? (R extends RingResult ? Omit<R, 'id' | 'at'> : never) : never;

function result(body: ResultBody): LessonInput {
  return { kind: 'result', result: { id: 'r1', at: 1000, ...body } };
}

function tap(token: CommandToken, contact: ContactKey): LessonInput {
  return result({ kind: 'command', token, contact, durationMs: 150 });
}

const opened: LessonInput = { kind: 'window_opened', windowMs: 3000 };

function evaluate(step: LessonStep, input: LessonInput): StepEvaluation {
  const evaluation = evaluateStep(step, input);
  if (!evaluation) throw new Error('Expected an evaluation');
  return evaluation;
}

describe('evaluateStep: squeeze steps', () => {
  it('is correct when the command window opens, in the words the ring uses', () => {
    expect(evaluate(squeezeStep, opened)).toEqual({
      correct: true,
      message: 'Command window open for 3 seconds.',
      announcement: 'Correct. Command window open for 3 seconds.',
      feedbackKind: 'armed',
      detectedContact: null,
      emergencyCompleted: false,
    });
    expect(evaluate(squeezeStep, { kind: 'window_opened', windowMs: 6000 }).message).toBe('Command window open for 6 seconds.');
  });

  it('ignores ring results, because nothing is tapped yet', () => {
    expect(evaluateStep(squeezeStep, tap('confirm', 'index_tip'))).toBeNull();
    expect(evaluateStep(squeezeStep, result({ kind: 'rejected', reason: 'not_armed', contact: 'index_tip', durationMs: null }))).toBeNull();
  });
});

describe('evaluateStep: tap steps', () => {
  it('is correct for a command on the step contact', () => {
    expect(evaluate(confirmStep, tap('confirm', 'index_tip'))).toMatchObject({
      correct: true,
      message: 'Confirm, on the index fingertip.',
      announcement: 'Correct. Confirm, on the index fingertip.',
      feedbackKind: 'confirm',
      detectedContact: null,
    });
  });

  it('names the command and point that were used instead, and the target', () => {
    expect(evaluate(confirmStep, tap('back', 'index_base'))).toMatchObject({
      correct: false,
      message: 'That was Dismiss / Back, on the index finger base. Try again: Confirm on the index fingertip.',
      // Spoken label: a screen reader would read the display slash as "Dismiss slash Back".
      announcement: 'That was Dismiss or Back, on the index finger base. Try again: Confirm on the index fingertip.',
      feedbackKind: 'confirm',
      detectedContact: 'index_base',
    });
  });

  it('includes the user’s shortcut choice when a shortcut was used', () => {
    const evaluation = evaluateStep(confirmStep, tap('quick_action_2', 'pinky_base'), {
      quick_action_1: 'unassigned',
      quick_action_2: 'toggle_flashlight',
    });
    expect(evaluation?.message).toBe(
      'That was Shortcut 2: Turn the torch on or off, on the pinky finger base. Try again: Confirm on the index fingertip.',
    );
    expect(evaluate(shortcutStep, tap('quick_action_1', 'pinky_tip')).message).toBe(
      'Shortcut 1: Play or pause media, on the pinky fingertip.',
    );
  });

  it('uses the ring’s own words for a rejected press', () => {
    const tooLong = evaluate(confirmStep, result({ kind: 'rejected', reason: 'indeterminate_duration', contact: 'index_tip', durationMs: 1200 }));
    expect(tooLong).toMatchObject({
      correct: false,
      message:
        'Not recognised. That press lasted 1.2 seconds — longer than a tap and shorter than the emergency hold, so nothing happened.',
      feedbackKind: 'reject',
      detectedContact: null,
    });
    expect(evaluate(confirmStep, result({ kind: 'rejected', reason: 'not_armed', contact: 'index_tip', durationMs: null })).message).toBe(
      'The ring is asleep. Squeeze first, then tap.',
    );
  });

  it('treats an emergency hold or a cancelled hold as a miss, and flags the completed hold', () => {
    const completed = evaluate(shortcutStep, result({ kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }));
    expect(completed).toMatchObject({ correct: false, feedbackKind: 'emergency', emergencyCompleted: true });
    expect(completed.announcement).toContain(EMERGENCY_SIMULATION_NOTICE);
    expect(completed.message).toBe(
      'The hold reached five seconds, which is the emergency hold. Try again: a brief tap for Shortcut 1 on the pinky fingertip.',
    );

    const cancelled = evaluate(shortcutStep, result({ kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 900 }));
    expect(cancelled).toMatchObject({ correct: false, feedbackKind: 'emergency_cancelled', emergencyCompleted: false });
    expect(cancelled.message).toBe(
      'Emergency hold cancelled after 0.9 seconds. Nothing was sent. Try again: a brief tap for Shortcut 1 on the pinky fingertip.',
    );
  });

  it('ignores the window opening', () => {
    expect(evaluateStep(confirmStep, opened)).toBeNull();
  });
});

describe('evaluateStep: hold steps', () => {
  it('cancel step: letting go early is correct', () => {
    expect(evaluate(cancelStep, result({ kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 1400 }))).toMatchObject({
      correct: true,
      message: 'Cancelled in time. Nothing was sent.',
      announcement: 'Correct. Cancelled in time. Nothing was sent.',
      feedbackKind: 'emergency_cancelled',
      emergencyCompleted: false,
    });
  });

  it('cancel step: a completed hold is a miss and announces the simulation notice verbatim', () => {
    const evaluation = evaluate(cancelStep, result({ kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }));
    expect(evaluation).toMatchObject({
      correct: false,
      message: 'The hold reached five seconds. This time, let go sooner.',
      announcement: `The hold reached five seconds. This time, let go sooner. ${EMERGENCY_SIMULATION_NOTICE}`,
      feedbackKind: 'emergency',
      emergencyCompleted: true,
    });
  });

  it('complete step: the full hold is correct and announces the simulation notice', () => {
    expect(evaluate(completeStep, result({ kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }))).toMatchObject({
      correct: true,
      message: 'The hold reached five seconds.',
      announcement: `Correct. The hold reached five seconds. ${EMERGENCY_SIMULATION_NOTICE}`,
      emergencyCompleted: true,
    });
  });

  it('complete step: letting go early says how long the hold lasted', () => {
    expect(evaluate(completeStep, result({ kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 3100 }))).toMatchObject({
      correct: false,
      message: 'You let go after 3.1 seconds. Hold for the full five seconds.',
    });
  });

  it('a brief tap or a rejected press on a hold step is a miss', () => {
    expect(evaluate(completeStep, tap('quick_action_1', 'pinky_tip'))).toMatchObject({
      correct: false,
      message:
        'That was Shortcut 1: Play or pause media, on the pinky fingertip. Try again: hold the pinky fingertip for the full five seconds.',
      detectedContact: null,
    });
    expect(evaluate(cancelStep, tap('next', 'middle_base'))).toMatchObject({ correct: false, detectedContact: 'middle_base' });
    expect(
      evaluate(cancelStep, result({ kind: 'rejected', reason: 'not_armed', contact: 'pinky_tip', durationMs: null })).message,
    ).toBe('The ring is asleep. Squeeze first, then tap.');
    expect(evaluateStep(cancelStep, opened)).toBeNull();
  });
});

describe('step words', () => {
  it('describes targets, hints and contacts for every kind of step', () => {
    expect(targetPhrase(confirmStep)).toBe('Confirm on the index fingertip');
    expect(targetPhrase(squeezeStep)).toBe('squeeze the ring to open the command window');
    expect(targetPhrase(cancelStep)).toBe('start the hold on the pinky fingertip, then let go before five seconds');
    expect(targetPhrase(completeStep)).toBe('hold the pinky fingertip for the full five seconds');
    expect(stepHint(squeezeStep)).toBe('The step is done when the command window opens.');
    expect(stepHint(confirmStep)).toBe('The target is the index fingertip, marked Target.');
    expect(stepHint(cancelStep)).toMatch(/let go at any point before five seconds/);
    expect(stepHint(completeStep)).toMatch(/Keep holding/);
    expect(stepTargetContact(squeezeStep)).toBeNull();
    expect(stepTargetContact(completeStep)).toBe('pinky_tip');
  });

  it('names the command each step asks for: the tap’s token, Emergency for a hold, nothing for a squeeze', () => {
    expect(stepTargetToken(confirmStep)).toBe('confirm');
    expect(stepTargetToken(shortcutStep)).toBe('quick_action_1');
    expect(stepTargetToken(cancelStep)).toBe('emergency');
    expect(stepTargetToken(completeStep)).toBe('emergency');
    expect(stepTargetToken(squeezeStep)).toBeNull();
  });
});
