/**
 * Pure filtering and summary arithmetic for activity history. Every figure
 * here describes practice in this app, never ring performance.
 *
 * The denominator rules are not repeated here: `classify.ts` owns them, and
 * this file counts what it is told. Three invariants hold for every summary,
 * and the tests check them:
 *
 *   counts.total        = activations + attempts + untargeted + emergency
 *   attempts            = successes + misclassifications + rejected
 *   commandAccuracy     = the sum of every perCommand row
 */
import { isActivation, type ClassifiableEvent } from './classify';
import { COMMAND_TOKENS, type CommandToken } from '@/domain/commands';
import type {
  ActivityCounts,
  ActivitySummary,
  AttemptRate,
  CommandPerformance,
  EmergencyPerformance,
  EvidenceBreakdown,
  GestureEvent,
  GestureOutcome,
  HistoryRange,
  RecordEvidence,
} from '@/domain/models';
import { startOfDay } from '@/lib/time';
import { classifyEvent, intendedToken, isDropped } from './classify';
import { eventTime } from './events';
import type { HistoryFilter } from './types';

/** Re-exported because screens have always imported it from here; the rules live in `classify.ts`. */
export { intendedToken } from './classify';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A press rather than a five-second hold or a squeeze. Used for counting rows
 * on screen, NOT for accuracy: see `isAccuracyAttempt` for the denominator.
 *
 * A squeeze is excluded because it is not something the user aimed at a
 * contact point: counting it made the page say "12 attempts" when the user had
 * made eight and opened the window four times.
 */
export function isAttempt(event: ClassifiableEvent): boolean {
  if (isActivation(event)) return false;
  return event.outcome !== 'emergency' && event.outcome !== 'emergency_cancelled';
}

/** Earliest timestamp (ms) a range includes, inclusive; null for 'all'. */
export function rangeStart(range: HistoryRange, now: Date): number | null {
  if (range === 'today') return startOfDay(now).getTime();
  if (range === '7d') return now.getTime() - 7 * DAY_MS;
  return null;
}

/** True when the filter leaves records out, so a summary or an export must say so. */
export function isNarrowingFilter(filter: HistoryFilter | undefined): boolean {
  if (!filter) return false;
  return (
    filter.range !== 'all' ||
    (filter.token !== undefined && filter.token !== 'all') ||
    (filter.source !== undefined && filter.source !== 'all') ||
    (filter.evidence !== undefined && filter.evidence !== 'all') ||
    (filter.samples !== undefined && filter.samples !== 'include')
  );
}

/** Applies range, command, source, evidence and sample filters. Keeps input order. */
export function filterEvents(
  events: readonly GestureEvent[],
  filter: HistoryFilter | undefined,
  now: Date,
): GestureEvent[] {
  if (!filter) return [...events];
  const since = rangeStart(filter.range, now);
  const token = filter.token && filter.token !== 'all' ? filter.token : null;
  const source = filter.source && filter.source !== 'all' ? filter.source : null;
  const evidence = filter.evidence && filter.evidence !== 'all' ? filter.evidence : null;
  const samples = filter.samples ?? 'include';
  return events.filter(
    (event) =>
      (since === null || eventTime(event) >= since) &&
      (token === null || intendedToken(event) === token) &&
      (source === null || event.source === source) &&
      (evidence === null || event.evidence === evidence) &&
      (samples === 'include' || (samples === 'only') === event.seeded),
  );
}

function rate(successes: number, attempts: number): number | null {
  return attempts > 0 ? successes / attempts : null;
}

function attemptRate(successes: number, attempts: number): AttemptRate {
  return { attempts, successes, rate: rate(successes, attempts) };
}

function emptyOutcomes(): Record<GestureOutcome, number> {
  return { recognised: 0, mismatch: 0, rejected_duration: 0, window_closed: 0, emergency: 0, emergency_cancelled: 0 };
}

function evidenceOf(events: readonly GestureEvent[]): ActivitySummary['evidence'] {
  if (events.length === 0) return null;
  const simulated = events.some((e) => e.evidence === 'simulated');
  const measured = events.some((e) => e.evidence === 'measured');
  if (simulated && measured) return 'mixed';
  return measured ? 'measured' : 'simulated';
}

/** Running totals for one slice of records, so the whole view and each evidence share one counter. */
class Tally {
  records = 0;
  attempts = 0;
  successes = 0;

  add(event: GestureEvent, counted: boolean): void {
    this.records += 1;
    if (!counted) return;
    this.attempts += 1;
    if (event.outcome === 'recognised') this.successes += 1;
  }

  get accuracy(): AttemptRate {
    return attemptRate(this.successes, this.attempts);
  }
}

/** Summarises events that have already been filtered. Order of `events` does not matter. */
export function summariseEvents(
  events: readonly GestureEvent[],
  range: HistoryRange,
  filtered = false,
): ActivitySummary {
  const attemptsByToken = new Map<CommandToken, number>();
  const successesByToken = new Map<CommandToken, number>();
  const outcomes = emptyOutcomes();
  const whole = new Tally();
  const byEvidenceTally: Record<RecordEvidence, Tally> = { simulated: new Tally(), measured: new Tally() };

  let misclassifications = 0;
  let rejected = 0;
  let activations = 0;
  let untargeted = 0;
  let contactAttempts = 0;
  let commandAttempts = 0;
  let commandSuccesses = 0;
  let emergencyAttempts = 0;
  let emergencyCompleted = 0;
  let emergencyCancelled = 0;
  let seeded = 0;
  let first: GestureEvent | null = null;
  let last: GestureEvent | null = null;

  for (const event of events) {
    if (!first || eventTime(event) < eventTime(first)) first = event;
    if (!last || eventTime(event) >= eventTime(last)) last = event;
    outcomes[event.outcome] += 1;
    if (event.seeded) seeded += 1;

    const recordClass = classifyEvent(event);
    const counted = recordClass === 'attempt';
    whole.add(event, counted);
    byEvidenceTally[event.evidence].add(event, counted);

    if (recordClass === 'activation') activations += 1;
    if (recordClass === 'untargeted') untargeted += 1;
    if (recordClass === 'emergency') {
      emergencyAttempts += 1;
      if (event.outcome === 'emergency') emergencyCompleted += 1;
      else if (event.outcome === 'emergency_cancelled') emergencyCancelled += 1;
    }
    if (!counted) continue;

    const recognised = event.outcome === 'recognised';
    if (event.outcome === 'mismatch') misclassifications += 1;
    if (isDropped(event)) rejected += 1;

    const intended = intendedToken(event);
    if (intended === null) {
      // A calibration prompt: an attempt at a point, attributed to no command.
      contactAttempts += 1;
      continue;
    }
    commandAttempts += 1;
    if (recognised) commandSuccesses += 1;
    attemptsByToken.set(intended, (attemptsByToken.get(intended) ?? 0) + 1);
    if (recognised) successesByToken.set(intended, (successesByToken.get(intended) ?? 0) + 1);
  }

  const perCommand: CommandPerformance[] = COMMAND_TOKENS.map((token) => {
    const tokenAttempts = attemptsByToken.get(token) ?? 0;
    const tokenSuccesses = successesByToken.get(token) ?? 0;
    return { token, attempts: tokenAttempts, successes: tokenSuccesses, rate: rate(tokenSuccesses, tokenAttempts) };
  });

  // Ties go to the earlier command in COMMAND_TOKENS order.
  let mostPractised: ActivitySummary['mostPractised'] = null;
  for (const entry of perCommand) {
    if (entry.attempts > 0 && (!mostPractised || entry.attempts > mostPractised.count)) {
      mostPractised = { token: entry.token, count: entry.attempts };
    }
  }

  const counts: ActivityCounts = {
    total: events.length,
    activations,
    attempts: whole.attempts,
    commandAttempts,
    contactAttempts,
    untargeted,
    emergency: emergencyAttempts,
    seeded,
    own: events.length - seeded,
  };
  const emergency: EmergencyPerformance = {
    attempts: emergencyAttempts,
    completed: emergencyCompleted,
    cancelled: emergencyCancelled,
    notHeld: emergencyAttempts - emergencyCompleted - emergencyCancelled,
    rate: rate(emergencyCompleted, emergencyAttempts),
  };
  const byEvidence: EvidenceBreakdown = {
    simulated: { records: byEvidenceTally.simulated.records, accuracy: byEvidenceTally.simulated.accuracy },
    measured: { records: byEvidenceTally.measured.records, accuracy: byEvidenceTally.measured.accuracy },
  };

  return {
    range,
    attempts: whole.attempts,
    successes: whole.successes,
    misclassifications,
    rejected,
    emergencies: emergencyCompleted,
    mostPractised,
    perCommand,
    firstAt: first?.at ?? null,
    lastAt: last?.at ?? null,
    includesSeeded: seeded > 0,
    evidence: evidenceOf(events),
    accuracy: whole.accuracy,
    commandAccuracy: attemptRate(commandSuccesses, commandAttempts),
    contactAccuracy: attemptRate(whole.successes - commandSuccesses, contactAttempts),
    emergency,
    counts,
    outcomes,
    byEvidence,
    filtered,
  };
}
