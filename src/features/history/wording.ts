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

/** The command the user was aiming for, as a label, or null when there was none. */
export function intendedCommandLabel(event: GestureEvent): string | null {
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
