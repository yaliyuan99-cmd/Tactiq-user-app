/**
 * What the public command explorer shows, resolved from the real command map.
 *
 * Nothing here is written by hand: the contacts come from
 * `@/domain/contacts`, the commands from `@/domain/commands` and the
 * durations from `@/domain/timing`. One contact — the pinky fingertip —
 * carries two commands, told apart by how long the press lasts, so an entry
 * holds a tap and an optional five-second hold rather than a single command.
 *
 * Accessible names never use the paper's two-letter abbreviations (IT, IB,
 * MT…): every control is named in full, for example "Index fingertip —
 * Confirm".
 */
import {
  commandsForContact,
  type CommandDefinition,
  type CommandKind,
  type Interaction,
} from '@/domain/commands';
import { CONTACT_POINTS, type ContactKey, type ContactPoint } from '@/domain/contacts';
import { EMERGENCY_HOLD_MS, TAP_MAX_MS, formatMs } from '@/domain/timing';

export const INTERACTION_LABELS: Readonly<Record<Interaction, string>> = {
  tap: 'Brief tap',
  hold_5s: 'Five-second hold',
};

export const INTERACTION_DETAILS: Readonly<Record<Interaction, string>> = {
  tap: `A press of up to ${formatMs(TAP_MAX_MS)} counts as a tap.`,
  hold_5s: `Hold for the full ${formatMs(EMERGENCY_HOLD_MS)}. Letting go earlier cancels it.`,
};

export const KIND_LABELS: Readonly<Record<CommandKind, string>> = {
  fixed: 'Fixed command',
  shortcut: 'Shortcut you choose',
  emergency: 'Fixed — never remappable',
};

export interface ContactEntry {
  readonly contact: ContactPoint;
  /** Every contact answers a brief tap. */
  readonly tap: CommandDefinition;
  /** Only the pinky fingertip answers a five-second hold. */
  readonly hold: CommandDefinition | null;
  readonly commands: readonly CommandDefinition[];
  /** Short visible text, e.g. "Confirm". Never an abbreviation. */
  readonly summary: string;
  /** Said aloud: no slashes, and the hold spelled out where there is one. */
  readonly spokenSummary: string;
  /** "Index fingertip — Confirm". */
  readonly accessibleName: string;
}

function buildEntry(contact: ContactPoint): ContactEntry {
  const commands = commandsForContact(contact.key);
  const tap = commands.find((command) => command.interaction === 'tap');
  if (!tap) throw new Error(`No tap command on ${contact.key}`);
  const hold = commands.find((command) => command.interaction === 'hold_5s') ?? null;
  const spokenSummary = hold
    ? `${tap.spokenLabel}, or ${hold.spokenLabel} on a five-second hold`
    : tap.spokenLabel;
  return {
    contact,
    tap,
    hold,
    commands,
    summary: tap.label,
    spokenSummary,
    accessibleName: `${contact.label} — ${spokenSummary}`,
  };
}

/** Anatomical order: index to pinky, fingertip before finger base. */
export const CONTACT_ENTRIES: readonly ContactEntry[] = CONTACT_POINTS.map(buildEntry);

const BY_KEY = new Map(CONTACT_ENTRIES.map((entry) => [entry.contact.key, entry] as const));

export function contactEntry(key: ContactKey): ContactEntry {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Unknown contact point: ${key}`);
  return found;
}

/** What the phone would do, with the honest qualifier the paper attaches. */
export function platformRouteText(command: CommandDefinition): string {
  return command.guaranteed
    ? `On a phone it is designed to use the screen reader's own route: ${command.platformRoute.toLowerCase()}.`
    : `On a phone it would depend on the platform: ${command.platformRoute.toLowerCase()}. Not promised.`;
}
