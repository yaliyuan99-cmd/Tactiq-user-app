/**
 * Pure filtering and summary arithmetic for activity history. Every figure
 * here describes practice in this app, never ring performance.
 */
import { COMMAND_TOKENS, resolveCommand, type CommandToken } from '@/domain/commands';
import type {
  ActivitySummary,
  CommandPerformance,
  GestureEvent,
  GestureOutcome,
  HistoryRange,
} from '@/domain/models';
import { startOfDay } from '@/lib/time';
import type { HistoryFilter } from './types';
import { eventTime } from './events';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Outcomes that are not practice attempts: the emergency hold is counted separately. */
const NON_ATTEMPT_OUTCOMES: readonly GestureOutcome[] = ['emergency', 'emergency_cancelled'];

export function isAttempt(event: Pick<GestureEvent, 'outcome'>): boolean {
  return !NON_ATTEMPT_OUTCOMES.includes(event.outcome);
}

/**
 * The command the user was aiming for.
 * - Emergency holds (token `emergency`, an emergency outcome, or a step of the
 *   emergency lesson on the pinky fingertip) → `emergency`.
 * - Otherwise, when a target contact was set, the tap command on that contact.
 * - Otherwise the token that was recognised (free practice), or null.
 */
export function intendedToken(
  event: Pick<GestureEvent, 'targetContact' | 'token' | 'outcome' | 'lessonId'>,
): CommandToken | null {
  const isHold =
    event.token === 'emergency' ||
    NON_ATTEMPT_OUTCOMES.includes(event.outcome) ||
    (event.lessonId === 'emergency_hold' && event.targetContact === 'pinky_tip');
  if (isHold) return 'emergency';
  if (event.targetContact) {
    return resolveCommand(event.targetContact, 'tap')?.token ?? event.token;
  }
  return event.token;
}

/** Earliest timestamp (ms) a range includes, inclusive; null for 'all'. */
export function rangeStart(range: HistoryRange, now: Date): number | null {
  if (range === 'today') return startOfDay(now).getTime();
  if (range === '7d') return now.getTime() - 7 * DAY_MS;
  return null;
}

/** Applies range, token (by intended command) and source filters. Keeps input order. */
export function filterEvents(
  events: readonly GestureEvent[],
  filter: HistoryFilter | undefined,
  now: Date,
): GestureEvent[] {
  if (!filter) return [...events];
  const since = rangeStart(filter.range, now);
  const token = filter.token && filter.token !== 'all' ? filter.token : null;
  const source = filter.source && filter.source !== 'all' ? filter.source : null;
  return events.filter(
    (event) =>
      (since === null || eventTime(event) >= since) &&
      (token === null || intendedToken(event) === token) &&
      (source === null || event.source === source),
  );
}

function evidenceOf(events: readonly GestureEvent[]): ActivitySummary['evidence'] {
  if (events.length === 0) return null;
  const simulated = events.some((e) => e.evidence === 'simulated');
  const measured = events.some((e) => e.evidence === 'measured');
  if (simulated && measured) return 'mixed';
  return measured ? 'measured' : 'simulated';
}

/** Summarises events that have already been filtered. Order of `events` does not matter. */
export function summariseEvents(events: readonly GestureEvent[], range: HistoryRange): ActivitySummary {
  const attemptsByToken = new Map<CommandToken, number>();
  const successesByToken = new Map<CommandToken, number>();
  let attempts = 0;
  let successes = 0;
  let misclassifications = 0;
  let rejected = 0;
  let emergencies = 0;
  let first: GestureEvent | null = null;
  let last: GestureEvent | null = null;

  for (const event of events) {
    if (!first || eventTime(event) < eventTime(first)) first = event;
    if (!last || eventTime(event) >= eventTime(last)) last = event;
    if (event.outcome === 'emergency') emergencies += 1;
    if (!isAttempt(event)) continue;

    attempts += 1;
    const recognised = event.outcome === 'recognised';
    if (recognised) successes += 1;
    if (event.outcome === 'mismatch') misclassifications += 1;
    if (event.outcome === 'rejected_duration' || event.outcome === 'window_closed') rejected += 1;

    const intended = intendedToken(event);
    if (intended) {
      attemptsByToken.set(intended, (attemptsByToken.get(intended) ?? 0) + 1);
      if (recognised) successesByToken.set(intended, (successesByToken.get(intended) ?? 0) + 1);
    }
  }

  const perCommand: CommandPerformance[] = COMMAND_TOKENS.map((token) => {
    const tokenAttempts = attemptsByToken.get(token) ?? 0;
    const tokenSuccesses = successesByToken.get(token) ?? 0;
    return {
      token,
      attempts: tokenAttempts,
      successes: tokenSuccesses,
      rate: tokenAttempts > 0 ? tokenSuccesses / tokenAttempts : null,
    };
  });

  // Ties go to the earlier command in COMMAND_TOKENS order.
  let mostPractised: ActivitySummary['mostPractised'] = null;
  for (const entry of perCommand) {
    if (entry.attempts > 0 && (!mostPractised || entry.attempts > mostPractised.count)) {
      mostPractised = { token: entry.token, count: entry.attempts };
    }
  }

  return {
    range,
    attempts,
    successes,
    misclassifications,
    rejected,
    emergencies,
    mostPractised,
    perCommand,
    firstAt: first?.at ?? null,
    lastAt: last?.at ?? null,
    includesSeeded: events.some((e) => e.seeded),
    evidence: evidenceOf(events),
  };
}
