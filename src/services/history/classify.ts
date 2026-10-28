/**
 * What each activity record is, and which records a command accuracy figure
 * may be divided by. This is the one place those rules are written down.
 *
 * A command accuracy denominator may only contain ATTEMPTS AT A KNOWN TARGET —
 * presses that answered a question this app asked:
 *
 *   counted    guided practice (a command and a point were asked for)
 *   counted    lesson steps that ask for a tap (the step names the target)
 *   counted    calibration prompts (a contact point was asked for)
 *
 *   excluded   activations: the squeeze that opens the command window is not
 *              an answer to anything, right or wrong
 *   excluded   free practice: no question was asked, so a recognised command
 *              is not a correct answer
 *   excluded   emergency holds, completed or cancelled, and presses that
 *              answered an Emergency prompt without holding: a five-second
 *              hold is never a "recognised" tap, so scoring it with taps would
 *              deflate the figure exactly as free practice inflates it. They
 *              are counted on their own terms instead
 *
 * Dropped presses (too long for a tap, or after the window closed) at a known
 * target stay in the denominator: the user answered and the answer was not
 * usable. They are failures, not absences.
 *
 * Calibration records attribute to no command. Calibration prompts a contact
 * point and records prompted contacts only, so calling a prompted pinky
 * fingertip tap a "Shortcut 1" attempt would claim an exercise that never
 * happened. Those attempts are counted in the accuracy denominator and shown
 * by point, never by command.
 */
import { resolveCommand, type CommandToken } from '@/domain/commands';
import type {
  ActivityRecordClass,
  GestureEvent,
  GestureEventKind,
  GestureEventMode,
  GestureEventSource,
  GestureOutcome,
} from '@/domain/models';

/** The fields the classification rules read. A whole `GestureEvent` satisfies it. */
export type ClassifiableEvent = Pick<
  GestureEvent,
  'kind' | 'source' | 'mode' | 'targetContact' | 'targetToken' | 'detectedContact' | 'token' | 'outcome' | 'durationMs' | 'lessonId'
>;

/**
 * The fields `intendedToken` reads. Kept narrow, and `mode` optional, so a row
 * renderer can pass the subset it already has.
 */
export type TargetedEvent = Pick<GestureEvent, 'source' | 'targetContact' | 'targetToken' | 'token' | 'outcome' | 'lessonId'> & {
  readonly mode?: GestureEventMode;
};

/** Outcomes that are a five-second hold rather than a tap. */
export const EMERGENCY_OUTCOMES: readonly GestureOutcome[] = ['emergency', 'emergency_cancelled'];

/** Outcomes where the press was dropped rather than read as a command. Never guessed. */
export const DROPPED_OUTCOMES: readonly GestureOutcome[] = ['rejected_duration', 'window_closed'];

/** The row label for an activation record, so no screen has to invent one. */
export const ACTIVATION_LABEL = 'Ring activated';

/** The sentence that goes with it: an activation is recorded, never scored. */
export const ACTIVATION_NOTE = 'A squeeze opened the command window. No command was given, so it is not counted as an attempt.';

function isEmergencyOutcome(outcome: GestureOutcome): boolean {
  return EMERGENCY_OUTCOMES.includes(outcome);
}

/**
 * The old squeeze records carried no contact, no command and no duration, and
 * were saved as recognised. Nothing else in the app can look like that, so a
 * record without an explicit `kind` that matches is read as an activation
 * rather than left to show "— / — / Recognised".
 */
function looksLikeLegacyActivation(event: ClassifiableEvent): boolean {
  return (
    event.outcome === 'recognised' &&
    event.token === null &&
    event.detectedContact === null &&
    event.targetContact === null &&
    event.targetToken === undefined &&
    event.durationMs === null
  );
}

/** What the record describes. Records saved before `kind` existed are command records, bar the old squeezes. */
export function eventKind(event: ClassifiableEvent): GestureEventKind {
  if (event.kind) return event.kind;
  return looksLikeLegacyActivation(event) ? 'activation' : 'command';
}

export function isActivation(event: ClassifiableEvent): boolean {
  return eventKind(event) === 'activation';
}

/** True when calibration recorded this press: it prompted a contact point, never a command. */
export function isContactPrompt(event: { readonly source: GestureEventSource; readonly mode?: GestureEventMode }): boolean {
  return event.source === 'calibration' || event.mode === 'calibration';
}

/**
 * The command the user was aiming for, or null when no command was asked for.
 * - A calibration record names no command (see the note at the top).
 * - `targetToken`, when stored, wins: it is the only way to tell a guided
 *   Emergency hold answered with a brief tap from a Shortcut 1 attempt on the
 *   same point.
 * - Otherwise an emergency hold (token `emergency`, an emergency outcome, or a
 *   step of the emergency lesson on the pinky fingertip) is `emergency`.
 * - Otherwise, when a point was asked for, the tap command on that point.
 * - Otherwise the command that was recognised (free practice), or null.
 */
export function intendedToken(event: TargetedEvent): CommandToken | null {
  if (isContactPrompt(event)) return null;
  if (event.targetToken) return event.targetToken;
  const isHold =
    event.token === 'emergency' ||
    isEmergencyOutcome(event.outcome) ||
    (event.lessonId === 'emergency_hold' && event.targetContact === 'pinky_tip');
  if (isHold) return 'emergency';
  if (event.targetContact) {
    return resolveCommand(event.targetContact, 'tap')?.token ?? event.token;
  }
  return event.token;
}

/** True when the exercise asked for something this record can be judged against. */
export function hasKnownTarget(event: ClassifiableEvent): boolean {
  return !isActivation(event) && (event.targetToken !== undefined || event.targetContact !== null);
}

/**
 * Exactly one class per record. The order matters: an activation is never a
 * press, and an emergency hold is never a tap attempt.
 */
export function classifyEvent(event: ClassifiableEvent): ActivityRecordClass {
  if (isActivation(event)) return 'activation';
  if (isEmergencyOutcome(event.outcome) || intendedToken(event) === 'emergency') return 'emergency';
  return hasKnownTarget(event) ? 'attempt' : 'untargeted';
}

/**
 * Whether this record belongs in a command accuracy denominator. The only
 * definition: use it everywhere a rate is worked out.
 */
export function isAccuracyAttempt(event: ClassifiableEvent): boolean {
  return classifyEvent(event) === 'attempt';
}

/** True when an accuracy attempt gave the answer that was asked for. */
export function isAccuracySuccess(event: ClassifiableEvent): boolean {
  return isAccuracyAttempt(event) && event.outcome === 'recognised';
}

/** True when the press was dropped rather than read as a command. */
export function isDropped(event: Pick<GestureEvent, 'outcome'>): boolean {
  return DROPPED_OUTCOMES.includes(event.outcome);
}
