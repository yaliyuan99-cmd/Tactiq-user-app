/**
 * Command labels that include the user's shortcut choices, e.g.
 * "Shortcut 1: Play or pause media". Re-renders when the mapping changes.
 */
import { useCallback, useMemo } from 'react';
import {
  commandLabelWithShortcut,
  getCommand,
  resolveCommand,
  type CommandToken,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import { useCommandMapping } from '@/services/ServicesProvider';

export interface ShortcutLabels {
  /** The user's current shortcut assignments. */
  readonly mapping: ShortcutMapping;
  /** The tap command on a contact, with its shortcut, e.g. "Confirm" or "Shortcut 2: Announce the time". */
  readonly labelFor: (contact: ContactKey) => string;
  /** The label for a token, with its shortcut. */
  readonly labelForToken: (token: CommandToken) => string;
}

export function useShortcutLabels(): ShortcutLabels {
  const { shortcuts } = useCommandMapping().get();
  const first = shortcuts.quick_action_1;
  const second = shortcuts.quick_action_2;
  const mapping = useMemo<ShortcutMapping>(() => ({ quick_action_1: first, quick_action_2: second }), [first, second]);

  const labelForToken = useCallback(
    (token: CommandToken) => commandLabelWithShortcut(getCommand(token), mapping),
    [mapping],
  );
  const labelFor = useCallback(
    (contact: ContactKey) => {
      const command = resolveCommand(contact, 'tap');
      return command ? commandLabelWithShortcut(command, mapping) : getContact(contact).label;
    },
    [mapping],
  );

  return { mapping, labelFor, labelForToken };
}
