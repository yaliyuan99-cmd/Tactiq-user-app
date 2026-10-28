/**
 * Turns a ring result into the activity-history record for it. Pure: the
 * caller decides the source, mode, target and evidence.
 *
 * Two kinds of record come out of here. A press aimed at a command is a
 * command record. The deliberate squeeze that opens the command window is an
 * activation record (`squeezeGestureEvent`), which carries no contact and no
 * command and is never a command attempt. Whether a record is scored at all is
 * decided by `services/history/classify.ts`, from the target the caller passed:
 * free practice sets no target, so it is recorded and never counted as a right
 * answer to a question nobody asked.
 */
import type { CommandToken } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';
import type { LessonId } from '@/domain/lessons';
import type { GestureEventMode, GestureEventSource, GestureOutcome } from '@/domain/models';
import type { DeviceState } from '@/services/device/types';
import type { NewGestureEvent } from '@/services/history/types';
import type { RingResult } from './ringResults';

export type HistoryEvidence = 'simulated' | 'measured';

export interface GestureEventContext {
  readonly source: GestureEventSource;
  readonly mode: GestureEventMode;
  /** The contact the user was asked to use (guided, lesson and calibration modes). Null or omitted in free practice. */
  readonly targetContact?: ContactKey | null;
  /**
   * The command the user was asked for, when the exercise knows it (guided
   * practice and lessons). Null or omitted when there is none: free practice,
   * squeeze steps and calibration, which prompts a contact rather than a
   * command. It matters on the pinky fingertip, which carries two commands: a
   * brief tap there while Emergency was asked for is a mismatch, not a
   * recognised attempt. Leaving both targets out is what marks a record as
   * unscored practice, so pass them whenever the exercise knows them.
   */
  readonly targetToken?: CommandToken | null;
  readonly lessonId?: LessonId;
  readonly evidence: HistoryEvidence;
}

/** Context without evidence (`targetContact`, `targetToken`, `lessonId` as above): `useRecordResult` fills evidence in from the device. */
export type RecordContext = Omit<GestureEventContext, 'evidence'>;

/**
 * A command is recognised when it matches everything the exercise asked for:
 * the target command (when given) and the target contact (when given). With
 * neither, as in free practice, every command is recognised.
 */
function outcomeFor(result: RingResult, targetContact: ContactKey | null, targetToken: CommandToken | null): GestureOutcome {
  switch (result.kind) {
    case 'command': {
      const contactMatches = targetContact === null || result.contact === targetContact;
      const tokenMatches = targetToken === null || result.token === targetToken;
      return contactMatches && tokenMatches ? 'recognised' : 'mismatch';
    }
    case 'emergency':
      return 'emergency';
    case 'emergency_cancelled':
      return 'emergency_cancelled';
    case 'rejected':
      switch (result.reason) {
        case 'indeterminate_duration':
          return 'rejected_duration';
        case 'hold_released_early':
          return 'emergency_cancelled';
        default:
          // 'not_armed', 'window_closed' and 'window_opening' all mean the
          // press met no open command window. History keeps one outcome for
          // that; which way the window was shut is the ring's wording, not a
          // figure. A reason added later lands here on purpose.
          return 'window_closed';
      }
  }
}

function durationFor(result: RingResult): number | null {
  return result.kind === 'emergency_cancelled' ? result.elapsedMs : result.durationMs;
}

function tokenFor(result: RingResult): NewGestureEvent['token'] {
  if (result.kind === 'command') return result.token;
  if (result.kind === 'emergency') return 'emergency';
  return null;
}

export function toGestureEvent(result: RingResult, context: GestureEventContext): NewGestureEvent {
  const targetContact = context.targetContact ?? null;
  const targetToken = context.targetToken ?? null;
  return {
    at: new Date(result.at).toISOString(),
    source: context.source,
    mode: context.mode,
    targetContact,
    detectedContact: result.contact,
    token: tokenFor(result),
    durationMs: durationFor(result),
    outcome: outcomeFor(result, targetContact, targetToken),
    evidence: context.evidence,
    ...(targetToken !== null ? { targetToken } : {}),
    ...(context.lessonId ? { lessonId: context.lessonId } : {}),
  };
}

/**
 * A deliberate squeeze that opened the command window, for lessons that
 * practise the squeeze itself. It is an activation record: `kind` says so, the
 * outcome says the squeeze was read, and there is no contact or command,
 * because none was given. Screens label it "Ring activated" (ACTIVATION_LABEL)
 * and it never counts as a command attempt or a success.
 */
export function squeezeGestureEvent(context: GestureEventContext, at: number = Date.now()): NewGestureEvent {
  return {
    at: new Date(at).toISOString(),
    kind: 'activation',
    source: context.source,
    mode: context.mode,
    targetContact: null,
    detectedContact: null,
    token: null,
    durationMs: null,
    outcome: 'recognised',
    evidence: context.evidence,
    ...(context.lessonId ? { lessonId: context.lessonId } : {}),
  };
}

/** Measured only when a hardware ring is connected; everything else in this app is simulated. */
export function evidenceForDevice(state: Pick<DeviceState, 'mode' | 'status'>): HistoryEvidence {
  return state.mode === 'hardware' && state.status === 'connected' ? 'measured' : 'simulated';
}
