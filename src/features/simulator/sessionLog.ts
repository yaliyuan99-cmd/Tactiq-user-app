/**
 * The simulator's own short log of this visit's attempts. It is separate from
 * activity history: clearing it removes nothing that was saved.
 */
import { getCommand, type CommandToken, type ShortcutMapping } from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { GestureEvent } from '@/domain/models';
import { describeRingResult, type RingResult } from '@/features/practice/ringResults';

export const SESSION_LOG_LIMIT = 8;

export const SESSION_LOG_CAPTION = 'Latest attempts in this session';
export const SESSION_LOG_EMPTY = 'No attempts yet. Squeeze, then tap a point.';
export const SESSION_LOG_CLEARED = 'Session log cleared. Your activity history keeps every attempt.';

export interface SessionLogEntry {
  /** The id of the saved history event. */
  readonly id: string;
  readonly at: string;
  /** The command asked for in guided practice; null in free practice. */
  readonly target: CommandToken | null;
  readonly detectedContact: ContactKey | null;
  readonly resultWords: string;
  readonly evidence: GestureEvent['evidence'];
}

/** Newest first, never longer than the limit. */
export function addLogEntry(
  log: readonly SessionLogEntry[],
  entry: SessionLogEntry,
  limit: number = SESSION_LOG_LIMIT,
): readonly SessionLogEntry[] {
  return [entry, ...log].slice(0, Math.max(0, limit));
}

export function logEntryFor(saved: GestureEvent, target: CommandToken | null, resultWords: string): SessionLogEntry {
  return {
    id: saved.id,
    at: saved.at,
    target,
    detectedContact: saved.detectedContact,
    resultWords,
    evidence: saved.evidence,
  };
}

/** The Result column in free practice, e.g. "Recognised: Confirm". */
export function freeResultWords(result: RingResult, mapping: ShortcutMapping): string {
  const { shortLabel } = describeRingResult(result, mapping);
  return result.kind === 'command' ? `Recognised: ${shortLabel}` : shortLabel;
}

export function targetCellText(target: CommandToken | null): string {
  return target ? getCommand(target).label : 'None (free practice)';
}

export function detectedCellText(contact: ContactKey | null): string {
  return contact ? getContact(contact).label : 'None';
}

export function evidenceCellText(evidence: GestureEvent['evidence']): 'Simulated' | 'Measured' {
  return evidence === 'measured' ? 'Measured' : 'Simulated';
}

const logTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** Attempts are seconds apart, so the log shows seconds. */
export function formatLogTime(iso: string): string {
  return logTimeFormatter.format(new Date(iso));
}
