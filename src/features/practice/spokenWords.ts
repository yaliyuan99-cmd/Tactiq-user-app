/**
 * Labels for strings that are announced or spoken aloud.
 *
 * Two command labels carry a slash — "Dismiss / Back" and "Read / Repeat" —
 * and a screen reader reads that as "Dismiss slash Back". Every announced or
 * spoken string uses `CommandDefinition.spokenLabel` instead; the screen keeps
 * the display label. Pure: no React, no services.
 */
import {
  getCommand,
  getShortcutAction,
  isShortcutToken,
  type CommandDefinition,
  type CommandToken,
  type ShortcutMapping,
} from '@/domain/commands';

/** `commandLabelWithShortcut`, worded for speech: "Dismiss or Back", "Shortcut 1: Play or pause media". */
export function spokenCommandLabel(command: CommandDefinition, mapping: ShortcutMapping): string {
  if (!isShortcutToken(command.token)) return command.spokenLabel;
  const action = getShortcutAction(mapping[command.token]);
  return action.id === 'unassigned'
    ? `${command.spokenLabel} (nothing assigned)`
    : `${command.spokenLabel}: ${action.label}`;
}

/** The same, from a token. */
export function spokenLabelForToken(token: CommandToken, mapping: ShortcutMapping): string {
  return spokenCommandLabel(getCommand(token), mapping);
}
