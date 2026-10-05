/**
 * What the ring (simulated or real) produced, in the vocabulary screens need,
 * and the calm words the app says about it. Pure: no React, no services.
 *
 * Device events carry the raw protocol shape (`token`, `reject`); a
 * RingResult separates the four things a user can actually experience:
 * a recognised command, a dropped press, a completed emergency hold and a
 * cancelled emergency hold.
 */
import {
  commandLabelWithShortcut,
  getCommand,
  getShortcutAction,
  isShortcutToken,
  type CommandToken,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { EMERGENCY_HOLD_MS } from '@/domain/timing';
import { createId } from '@/lib/ids';
import type { DeviceEvent, RejectReason } from '@/services/device/types';
import type { FeedbackKind } from '@/services/feedback/types';

/** `at` is a Date.now() timestamp, the same clock device events use. */
export type RingResult =
  | {
      readonly id: string;
      readonly at: number;
      readonly kind: 'command';
      readonly token: CommandToken;
      readonly contact: ContactKey;
      readonly durationMs: number;
    }
  | {
      readonly id: string;
      readonly at: number;
      readonly kind: 'rejected';
      readonly reason: RejectReason;
      readonly contact: ContactKey | null;
      readonly durationMs: number | null;
    }
  | {
      readonly id: string;
      readonly at: number;
      readonly kind: 'emergency';
      readonly contact: 'pinky_tip';
      readonly durationMs: number;
    }
  | {
      readonly id: string;
      readonly at: number;
      readonly kind: 'emergency_cancelled';
      readonly contact: 'pinky_tip';
      readonly elapsedMs: number;
    };

export type RingResultKind = RingResult['kind'];

/** Announced once per hold, when the two-second arming cue is reached. */
export const EMERGENCY_ARMING_MESSAGE =
  'Emergency hold is being counted. Keep holding for five seconds, or let go to cancel.';

/**
 * Turns one device event into a result. Returns null for every event that is
 * not an outcome (gate, press, hold progress, status lines).
 */
export function ringResultFromEvent(event: DeviceEvent, id: string = createId('ring')): RingResult | null {
  if (event.type === 'token') {
    if (event.token === 'emergency') {
      return { id, at: event.at, kind: 'emergency', contact: 'pinky_tip', durationMs: event.durationMs };
    }
    return {
      id,
      at: event.at,
      kind: 'command',
      token: event.token,
      contact: event.contact,
      durationMs: event.durationMs,
    };
  }
  if (event.type === 'reject') {
    if (event.reason === 'hold_released_early') {
      return { id, at: event.at, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: event.durationMs ?? 0 };
    }
    return {
      id,
      at: event.at,
      kind: 'rejected',
      reason: event.reason,
      contact: event.contact,
      durationMs: event.durationMs,
    };
  }
  return null;
}

/** "1.3" — one decimal place, for spoken and visible durations. */
export function formatSeconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1);
}

export interface RingResultDescription {
  /**
   * What is announced (live region, and speech when audio announcements are
   * on). Fixed commands use their feedback words, e.g. "Back." for Dismiss / Back.
   */
  readonly message: string;
  /**
   * What is shown on screen. Always the same words as `message`: a shortcut's
   * mock outcome is labelled "Simulated:" in both, because a screen-reader
   * user hears the announcement and never sees the label.
   */
  readonly visibleMessage: string;
  readonly feedbackKind: FeedbackKind;
  /** A few words for a result line, e.g. "Confirm" or "Not recognised: press too long". */
  readonly shortLabel: string;
}

function same(message: string, feedbackKind: FeedbackKind, shortLabel: string): RingResultDescription {
  return { message, visibleMessage: message, feedbackKind, shortLabel };
}

/**
 * A fixed command is announced in its own feedback words ("Back.", "Read
 * again."), not its display label: a screen reader would read "Dismiss / Back"
 * as "Dismiss slash Back". The label stays in `shortLabel` for the screen.
 */
function describeCommand(token: CommandToken, mapping: ShortcutMapping): RingResultDescription {
  const command = getCommand(token);
  const shortLabel = commandLabelWithShortcut(command, mapping);
  if (command.kind === 'fixed') return same(command.feedback.text, 'confirm', shortLabel);
  if (!isShortcutToken(token)) return same(`${command.spokenLabel}.`, 'confirm', shortLabel);
  const action = getShortcutAction(mapping[token]);
  if (action.id === 'unassigned') return same(`${command.spokenLabel}: nothing assigned.`, 'confirm', shortLabel);
  // Nothing on a phone ran: the outcome is a mock, so "Simulated:" belongs in the
  // announcement as well as on screen — a screen-reader user hears only this.
  return same(`${command.spokenLabel}: ${action.label}. Simulated: ${action.simulatedOutcome}`, 'confirm', shortLabel);
}

function describeTooLong(contact: ContactKey | null, durationMs: number | null): RingResultDescription {
  const shortLabel = 'Not recognised: press too long';
  if (durationMs === null) {
    return same(
      'Not recognised. That press was longer than a tap, so nothing happened.',
      'reject',
      shortLabel,
    );
  }
  const seconds = formatSeconds(durationMs);
  if (durationMs >= EMERGENCY_HOLD_MS && contact !== 'pinky_tip') {
    const where = contact ? ` on the ${getContact(contact).label.toLowerCase()}` : '';
    return same(
      `Not recognised. That press lasted ${seconds} seconds. Only a brief tap counts${where}, so nothing happened.`,
      'reject',
      shortLabel,
    );
  }
  return same(
    `Not recognised. That press lasted ${seconds} seconds — longer than a tap and shorter than the emergency hold, so nothing happened.`,
    'reject',
    shortLabel,
  );
}

/** Calm, specific words for a result. `mapping` supplies the user's shortcut choices. */
export function describeRingResult(result: RingResult, mapping: ShortcutMapping): RingResultDescription {
  switch (result.kind) {
    case 'command':
      return describeCommand(result.token, mapping);
    case 'emergency':
      return same(`Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`, 'emergency', 'Emergency hold complete (simulation only)');
    case 'emergency_cancelled':
      return same(
        `Emergency hold cancelled after ${formatSeconds(result.elapsedMs)} seconds. Nothing was sent.`,
        'emergency_cancelled',
        'Emergency hold cancelled',
      );
    case 'rejected':
      switch (result.reason) {
        case 'not_armed':
          return same('The ring is asleep. Squeeze first, then tap.', 'reject', 'Not recognised: ring asleep');
        case 'indeterminate_duration':
          return describeTooLong(result.contact, result.durationMs);
        case 'window_closed':
          return same('The command window closed. Squeeze again, then tap.', 'reject', 'Not recognised: window closed');
        case 'hold_released_early':
          return same('Emergency hold cancelled. Nothing was sent.', 'emergency_cancelled', 'Emergency hold cancelled');
      }
  }
}

/** "3", or "2.5" when the window is not a whole number of seconds. */
export function windowSeconds(windowMs: number): string {
  const seconds = Math.max(0, windowMs) / 1000;
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);
}

/** The words for a command window change. */
export function describeGate(armed: boolean, windowMs: number): string {
  return armed ? `Command window open for ${windowSeconds(windowMs)} seconds.` : 'Command window closed.';
}
