/**
 * The words for the free-practice "What would happen" panel, taken from the
 * command definitions. Every shortcut outcome is a simulation.
 */
import {
  commandLabelWithShortcut,
  getCommand,
  getShortcutAction,
  isShortcutToken,
  type CommandToken,
  type ShortcutMapping,
} from '@/domain/commands';

export interface ShortcutOutcomeView {
  readonly actionLabel: string;
  readonly actionDescription: string;
  readonly simulatedOutcome: string;
  readonly assigned: boolean;
}

export interface WhatWouldHappenView {
  readonly token: CommandToken;
  /** "Confirm", or "Shortcut 1: Play or pause media". */
  readonly title: string;
  readonly description: string;
  readonly platformRoute: string;
  readonly shortcut: ShortcutOutcomeView | null;
  readonly isEmergency: boolean;
}

/** The platform route, saying "not guaranteed" once when the design does not promise it everywhere. */
export function platformRouteText(token: CommandToken): string {
  const command = getCommand(token);
  if (command.guaranteed || /not guaranteed/i.test(command.platformRoute)) return command.platformRoute;
  return `${command.platformRoute}; not guaranteed`;
}

export function whatWouldHappen(token: CommandToken, mapping: ShortcutMapping): WhatWouldHappenView {
  const command = getCommand(token);
  let shortcut: ShortcutOutcomeView | null = null;
  if (isShortcutToken(token)) {
    const action = getShortcutAction(mapping[token]);
    shortcut = {
      actionLabel: action.label,
      actionDescription: action.description,
      simulatedOutcome: action.simulatedOutcome,
      assigned: action.id !== 'unassigned',
    };
  }
  return {
    token,
    title: commandLabelWithShortcut(command, mapping),
    description: command.description,
    platformRoute: platformRouteText(token),
    shortcut,
    isEmergency: command.kind === 'emergency',
  };
}
