/**
 * Plain-language wording for activity records. Every string here describes
 * practice in this app; none of it claims ring performance.
 */
import { getCommand } from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { GestureEvent } from '@/domain/models';
import { formatTime } from '@/lib/time';
import { intendedToken, isAttempt } from '@/services/history/summarise';

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** The Result column: what happened to this press, in words. */
export function describeOutcome(event: Pick<GestureEvent, 'outcome' | 'token' | 'detectedContact'>): string {
  switch (event.outcome) {
    case 'recognised':
      return 'Recognised';
    case 'mismatch':
      if (event.token) return `Detected as ${getCommand(event.token).label}`;
      if (event.detectedContact) return `Detected as ${getContact(event.detectedContact).label}`;
      return 'Not the command asked for';
    case 'rejected_duration':
      return 'Too long — ignored';
    case 'window_closed':
      return 'Window closed';
    case 'emergency':
      return 'Emergency hold completed (simulated)';
    case 'emergency_cancelled':
      return 'Emergency hold cancelled';
  }
}

export type RecordLabel = 'Sample' | 'Simulated' | 'Measured';

/** The Label column: sample records first, then the record's evidence. */
export function recordLabel(event: Pick<GestureEvent, 'seeded' | 'evidence'>): RecordLabel {
  if (event.seeded) return 'Sample';
  return event.evidence === 'measured' ? 'Measured' : 'Simulated';
}

export function contactLabel(contact: ContactKey | null): string | null {
  return contact ? getContact(contact).label : null;
}

/**
 * The point column: the point asked for, and the point reported when it differs.
 * One column instead of two, because the two agree on most records and a narrow
 * screen stacks every column into its own line.
 */
export function pointSummary(event: Pick<GestureEvent, 'targetContact' | 'detectedContact'>): string | null {
  const target = contactLabel(event.targetContact);
  const detected = contactLabel(event.detectedContact);
  if (target === null) return detected === null ? null : `${detected} (no point asked for)`;
  if (detected === null || detected === target) return target;
  return `${target}, detected ${detected}`;
}

/**
 * What every record in view has in common, for the section lede, e.g.
 * "All 25 shown are Simulator records labelled Sample." Columns that repeat the
 * same value on every row say it once here instead.
 */
export function sharedRecordNote(
  events: readonly Pick<GestureEvent, 'source' | 'seeded' | 'evidence'>[],
  sourceName: (source: GestureEvent['source']) => string,
): string | null {
  if (events.length < 2) return null;
  const [first] = events;
  if (!first) return null;
  const sameSource = events.every((event) => event.source === first.source);
  const label = recordLabel(first);
  const sameLabel = events.every((event) => recordLabel(event) === label);
  if (!sameSource && !sameLabel) return null;
  const count = events.length;
  if (sameSource && sameLabel) return `All ${count} shown are ${sourceName(first.source)} records labelled ${label}.`;
  if (sameSource) return `All ${count} shown come from ${sourceName(first.source)}.`;
  return `All ${count} shown are labelled ${label}.`;
}

/**
 * The command the user was aiming for, as a label, or null when there was none.
 * A calibration run prompts a contact point rather than a command, so those
 * records have no command to name: the point column carries what was asked for.
 */
export function intendedCommandLabel(event: GestureEvent): string | null {
  if (event.source === 'calibration') return null;
  const token = intendedToken(event);
  return token ? getCommand(token).label : null;
}

const dayMonthFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** Day and time as separate strings, so a narrow table cell wraps between them and not inside either. */
export function eventTimeParts(iso: string): { readonly day: string; readonly time: string } {
  return { day: dayMonthFormatter.format(new Date(iso)), time: formatTime(iso) };
}

export const NO_MATCHING_ACTIVITY = 'No attempts in this range.';

/** The polite announcement after a filter changes, e.g. "Showing 24 attempts." */
export function resultCountMessage(events: readonly GestureEvent[]): string {
  if (events.length === 0) return NO_MATCHING_ACTIVITY;
  const attempts = events.filter(isAttempt).length;
  const holds = events.length - attempts;
  if (holds === 0) return `Showing ${plural(attempts, 'attempt')}.`;
  if (attempts === 0) return `Showing ${plural(holds, 'emergency hold')}.`;
  return `Showing ${plural(attempts, 'attempt')} and ${plural(holds, 'emergency hold')}.`;
}

export interface EmergencyCounts {
  readonly completed: number;
  readonly cancelled: number;
}

export function countEmergencyHolds(events: readonly Pick<GestureEvent, 'outcome'>[]): EmergencyCounts {
  let completed = 0;
  let cancelled = 0;
  for (const event of events) {
    if (event.outcome === 'emergency') completed += 1;
    if (event.outcome === 'emergency_cancelled') cancelled += 1;
  }
  return { completed, cancelled };
}

/** Joins names as "A", "A and B", or "A, B and C". */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
