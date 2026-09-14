/**
 * Lesson logic: what an input means for the current step, in words the user
 * hears and sees. Pure: no React, no services.
 */
import {
  DEFAULT_SHORTCUT_MAPPING,
  commandLabelWithShortcut,
  getCommand,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { LessonStep } from '@/domain/lessons';
import { describeGate, describeRingResult, formatSeconds, type RingResult } from '@/features/practice/ringResults';
import type { FeedbackKind } from '@/services/feedback/types';

/** How long a correct answer stays on screen before the next step appears. */
export const ADVANCE_DELAY_MS = 800;

/** Something the ring did that a step can be judged on. */
export type LessonInput =
  | { readonly kind: 'window_opened'; readonly windowMs: number }
  | { readonly kind: 'result'; readonly result: RingResult };

export interface StepEvaluation {
  readonly correct: boolean;
  /** The on-screen words, without the "Correct" verdict (the panel shows that as its own line). */
  readonly message: string;
  /** What is announced: the verdict and message, plus the emergency notice when a hold completed. */
  readonly announcement: string;
  /** Mirrors the ring's own feedback kind, so the lesson's words replace the ring's rather than repeat them. */
  readonly feedbackKind: FeedbackKind;
  /** A command that landed on a point other than the target. */
  readonly detectedContact: ContactKey | null;
  /** A five-second hold completed, so EMERGENCY_SIMULATION_NOTICE must be shown. */
  readonly emergencyCompleted: boolean;
}

function place(contact: ContactKey): string {
  return getContact(contact).label.toLowerCase();
}

/** "Confirm on the index fingertip", or what to do for a hold step. */
export function targetPhrase(step: LessonStep): string {
  switch (step.kind) {
    case 'squeeze':
      return 'squeeze the ring to open the command window';
    case 'tap':
      return `${getCommand(step.token).label} on the ${place(step.contact)}`;
    case 'hold':
      return step.expect === 'cancel'
        ? `start the hold on the ${place(step.contact)}, then let go before five seconds`
        : `hold the ${place(step.contact)} for the full five seconds`;
  }
}

/** The contact a step asks for, or null for a squeeze. */
export function stepTargetContact(step: LessonStep): ContactKey | null {
  return step.kind === 'squeeze' ? null : step.contact;
}

/** One short line shown before the first attempt on a step. */
export function stepHint(step: LessonStep): string {
  switch (step.kind) {
    case 'squeeze':
      return 'The step is done when the command window opens.';
    case 'tap':
      return `The target is the ${place(step.contact)}, marked Target.`;
    case 'hold':
      return step.expect === 'cancel'
        ? 'Watch the hold progress, and let go at any point before five seconds.'
        : 'Keep holding until the hold progress is full. At two seconds, the app tells you the hold is being counted.';
  }
}

function evaluation(
  correct: boolean,
  message: string,
  feedbackKind: FeedbackKind,
  extra: { detectedContact?: ContactKey | null; emergencyCompleted?: boolean } = {},
): StepEvaluation {
  const emergencyCompleted = extra.emergencyCompleted ?? false;
  const spoken = correct ? `Correct. ${message}` : message;
  return {
    correct,
    message,
    announcement: emergencyCompleted ? `${spoken} ${EMERGENCY_SIMULATION_NOTICE}` : spoken,
    feedbackKind,
    detectedContact: extra.detectedContact ?? null,
    emergencyCompleted,
  };
}

/** Results that are not the target command, judged the same way on tap and hold steps. */
function wrongResult(step: Exclude<LessonStep, { kind: 'squeeze' }>, result: RingResult, mapping: ShortcutMapping): StepEvaluation {
  const target = targetPhrase(step);
  const description = describeRingResult(result, mapping);
  switch (result.kind) {
    case 'command': {
      const label = commandLabelWithShortcut(getCommand(result.token), mapping);
      return evaluation(false, `That was ${label}, on the ${place(result.contact)}. Try again: ${target}.`, description.feedbackKind, {
        detectedContact: result.contact === step.contact ? null : result.contact,
      });
    }
    case 'emergency':
      return evaluation(
        false,
        `The hold reached five seconds, which is the emergency hold. Try again: a brief tap for ${target}.`,
        description.feedbackKind,
        { emergencyCompleted: true },
      );
    case 'emergency_cancelled':
      return evaluation(false, `${description.message} Try again: a brief tap for ${target}.`, description.feedbackKind);
    case 'rejected':
      return evaluation(false, description.message, description.feedbackKind);
  }
}

function evaluateHold(step: Extract<LessonStep, { kind: 'hold' }>, result: RingResult, mapping: ShortcutMapping): StepEvaluation {
  const kind = describeRingResult(result, mapping).feedbackKind;
  if (result.kind === 'emergency') {
    return step.expect === 'complete'
      ? evaluation(true, 'The hold reached five seconds.', kind, { emergencyCompleted: true })
      : evaluation(false, 'The hold reached five seconds. This time, let go sooner.', kind, { emergencyCompleted: true });
  }
  if (result.kind === 'emergency_cancelled') {
    return step.expect === 'cancel'
      ? evaluation(true, 'Cancelled in time. Nothing was sent.', kind)
      : evaluation(false, `You let go after ${formatSeconds(result.elapsedMs)} seconds. Hold for the full five seconds.`, kind);
  }
  if (result.kind === 'command') {
    const label = commandLabelWithShortcut(getCommand(result.token), mapping);
    return evaluation(false, `That was ${label}, on the ${place(result.contact)}. Try again: ${targetPhrase(step)}.`, kind, {
      detectedContact: result.contact === step.contact ? null : result.contact,
    });
  }
  return evaluation(false, describeRingResult(result, mapping).message, kind);
}

/**
 * Judges one input against a step. Returns null when the input says nothing
 * about the step (a result during a squeeze step, the window opening during a
 * tap or hold step).
 */
export function evaluateStep(
  step: LessonStep,
  input: LessonInput,
  mapping: ShortcutMapping = DEFAULT_SHORTCUT_MAPPING,
): StepEvaluation | null {
  if (step.kind === 'squeeze') {
    return input.kind === 'window_opened' ? evaluation(true, describeGate(true, input.windowMs), 'armed') : null;
  }
  if (input.kind !== 'result') return null;
  const { result } = input;
  if (step.kind === 'hold') return evaluateHold(step, result, mapping);
  if (result.kind === 'command' && result.contact === step.contact) {
    const label = commandLabelWithShortcut(getCommand(result.token), mapping);
    return evaluation(true, `${label}, on the ${place(result.contact)}.`, describeRingResult(result, mapping).feedbackKind);
  }
  return wrongResult(step, result, mapping);
}
