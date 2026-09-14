/**
 * Turns a ring result into the activity-history record for it. Pure: the
 * caller decides the source, mode, target and evidence.
 */
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
  readonly lessonId?: LessonId;
  readonly evidence: HistoryEvidence;
}

/** Context without evidence: `useRecordResult` fills evidence in from the device. */
export type RecordContext = Omit<GestureEventContext, 'evidence'>;

function outcomeFor(result: RingResult, targetContact: ContactKey | null): GestureOutcome {
  switch (result.kind) {
    case 'command':
      return targetContact === null || result.contact === targetContact ? 'recognised' : 'mismatch';
    case 'emergency':
      return 'emergency';
    case 'emergency_cancelled':
      return 'emergency_cancelled';
    case 'rejected':
      if (result.reason === 'indeterminate_duration') return 'rejected_duration';
      if (result.reason === 'hold_released_early') return 'emergency_cancelled';
      return 'window_closed';
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
  return {
    at: new Date(result.at).toISOString(),
    source: context.source,
    mode: context.mode,
    targetContact,
    detectedContact: result.contact,
    token: tokenFor(result),
    durationMs: durationFor(result),
    outcome: outcomeFor(result, targetContact),
    evidence: context.evidence,
    ...(context.lessonId ? { lessonId: context.lessonId } : {}),
  };
}

/**
 * A deliberate squeeze that opened the command window, for lessons that
 * practise the squeeze itself. Recorded as recognised with no contact or token.
 */
export function squeezeGestureEvent(context: GestureEventContext, at: number = Date.now()): NewGestureEvent {
  return {
    at: new Date(at).toISOString(),
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
