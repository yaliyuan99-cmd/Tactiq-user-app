/**
 * Words the command map uses for each command: the touch it needs, whether it
 * can be changed, and the label a contact point carries on the hand map.
 */
import {
  commandLabelWithShortcut,
  commandsForContact,
  type CommandDefinition,
  type CommandKind,
  type Interaction,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { Hand } from '@/domain/models';

export const TOUCH_LABELS: Readonly<Record<Interaction, string>> = {
  tap: 'Brief tap',
  hold_5s: 'Hold 5 seconds',
};

export const STATUS_LABELS: Readonly<Record<CommandKind, string>> = {
  fixed: 'Fixed',
  shortcut: 'Customisable',
  emergency: 'Fixed — cannot be changed',
};

export const NOT_GUARANTEED_TEXT = 'Not guaranteed on every phone';

export function touchLabel(interaction: Interaction): string {
  return TOUCH_LABELS[interaction];
}

export function statusLabel(kind: CommandKind): string {
  return STATUS_LABELS[kind];
}

/** "Index fingertip, brief tap" */
export function commandWhereAndHow(command: CommandDefinition): string {
  return `${getContact(command.contact).label}, ${touchLabel(command.interaction).toLocaleLowerCase()}`;
}

/**
 * What a contact point carries, with the saved shortcut where relevant.
 * The pinky fingertip carries two commands: "Shortcut 1: Play or pause media; hold 5 seconds for Emergency".
 */
export function contactCommandLabel(contact: ContactKey, mapping: ShortcutMapping): string {
  const commands = commandsForContact(contact);
  const taps = commands.filter((c) => c.interaction === 'tap').map((c) => commandLabelWithShortcut(c, mapping));
  const holds = commands
    .filter((c) => c.interaction === 'hold_5s')
    .map((c) => `${touchLabel(c.interaction).toLocaleLowerCase()} for ${c.label}`);
  return [...taps, ...holds].join('; ');
}

/** Caption under the hand map; explains the two-letter point names drawn on it. */
export function mapCaption(hand: Hand): string {
  const name = hand === 'left' ? 'Left' : 'Right';
  return `${name} hand, palm facing you. Letters name each point: IT is the index fingertip, IB the index finger base, and so on.`;
}
