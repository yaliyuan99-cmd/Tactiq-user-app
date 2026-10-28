/**
 * Validation and ordering for stored gesture events. Stored data is treated
 * as untrusted: anything that does not look like a `GestureEvent` is dropped
 * on read rather than crashing a screen.
 */
import { isCommandToken } from '@/domain/commands';
import { isContactKey } from '@/domain/contacts';
import { isLessonId } from '@/domain/lessons';
import {
  GESTURE_EVENT_KINDS,
  type GestureEvent,
  type GestureEventMode,
  type GestureEventSource,
  type GestureOutcome,
} from '@/domain/models';

/** Most events kept in local history; the oldest are dropped first. */
export const HISTORY_CAP = 5000;

export const GESTURE_EVENT_SOURCES: readonly GestureEventSource[] = ['simulator', 'training', 'calibration', 'device'];
export const GESTURE_EVENT_MODES: readonly GestureEventMode[] = ['guided', 'free', 'lesson', 'calibration', 'device'];
export const GESTURE_OUTCOMES: readonly GestureOutcome[] = [
  'recognised',
  'mismatch',
  'rejected_duration',
  'window_closed',
  'emergency',
  'emergency_cancelled',
];

function oneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isGestureEvent(value: unknown): value is GestureEvent {
  if (!isRecord(value)) return false;
  const e = value;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.at === 'string' &&
    Number.isFinite(Date.parse(e.at)) &&
    oneOf(GESTURE_EVENT_SOURCES, e.source) &&
    oneOf(GESTURE_EVENT_MODES, e.mode) &&
    (e.targetContact === null || isContactKey(e.targetContact)) &&
    (e.targetToken === undefined || isCommandToken(e.targetToken)) &&
    (e.detectedContact === null || isContactKey(e.detectedContact)) &&
    (e.token === null || isCommandToken(e.token)) &&
    (e.durationMs === null || (typeof e.durationMs === 'number' && Number.isFinite(e.durationMs))) &&
    oneOf(GESTURE_OUTCOMES, e.outcome) &&
    (e.evidence === 'simulated' || e.evidence === 'measured') &&
    typeof e.seeded === 'boolean' &&
    (e.lessonId === undefined || isLessonId(e.lessonId)) &&
    // Absent on every record saved before the field existed; `eventKind()` reads those.
    (e.kind === undefined || oneOf(GESTURE_EVENT_KINDS, e.kind))
  );
}

export function eventTime(event: GestureEvent): number {
  return Date.parse(event.at);
}

/** Oldest first. Stable, so events sharing a timestamp keep insertion order. */
export function sortChronologically(events: readonly GestureEvent[]): GestureEvent[] {
  return [...events].sort((a, b) => eventTime(a) - eventTime(b));
}

/** Keeps the newest `cap` events of a chronologically sorted list. */
export function capHistory(events: readonly GestureEvent[], cap: number = HISTORY_CAP): GestureEvent[] {
  return events.length > cap ? events.slice(events.length - cap) : [...events];
}
