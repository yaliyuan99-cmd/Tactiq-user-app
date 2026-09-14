/**
 * The nine interactions as compact "point → command" rows, in the command
 * map's order, with the saved shortcut actions filled in.
 */
import {
  COMMANDS,
  commandLabelWithShortcut,
  commandsForContact,
  type CommandKind,
  type CommandToken,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';

export interface CommandRow {
  readonly token: CommandToken;
  readonly contact: ContactKey;
  /** Two letters drawn on the hand map, e.g. "IT". */
  readonly abbreviation: string;
  /** "Index fingertip", or "Pinky fingertip, brief tap" where one point carries two commands. */
  readonly point: string;
  /** "Confirm", "Shortcut 1: Play or pause media", "Emergency". */
  readonly command: string;
  readonly kind: CommandKind;
}

export function commandRows(mapping: ShortcutMapping): CommandRow[] {
  return COMMANDS.map((command) => {
    const contact = getContact(command.contact);
    const shared = commandsForContact(command.contact).length > 1;
    const touch = command.interaction === 'hold_5s' ? 'held 5 seconds' : 'brief tap';
    return {
      token: command.token,
      contact: command.contact,
      abbreviation: contact.abbreviation,
      point: shared ? `${contact.label}, ${touch}` : contact.label,
      command: commandLabelWithShortcut(command, mapping),
      kind: command.kind,
    };
  });
}
