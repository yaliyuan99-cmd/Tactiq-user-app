/**
 * Pure logic for the shortcut editor: the draft the user is building is kept
 * apart from the saved mapping, and everything shown in the preview is
 * derived by comparing the two. Only Shortcut 1 and Shortcut 2 exist here —
 * fixed commands and Emergency have no place in a draft.
 */
import {
  DEFAULT_SHORTCUT_MAPPING,
  SHORTCUT_TOKENS,
  getCommand,
  getShortcutAction,
  type ShortcutActionId,
  type ShortcutMapping,
  type ShortcutToken,
} from '@/domain/commands';

export const NO_CHANGES_MESSAGE = 'No changes yet.';
export const SAVED_ANNOUNCEMENT = 'Shortcuts saved.';
export const DISCARDED_ANNOUNCEMENT = 'Changes discarded.';
export const RESTORED_ANNOUNCEMENT = 'Default shortcuts restored.';
export const NOTHING_TO_SAVE_ANNOUNCEMENT = 'Nothing to save. Choose a different action for a shortcut first.';

/** Fieldset legends for the two editors. */
export const SHORTCUT_LEGENDS: Readonly<Record<ShortcutToken, string>> = {
  quick_action_1: 'Shortcut 1 — pinky fingertip, brief tap',
  quick_action_2: 'Shortcut 2 — pinky finger base',
};

export interface ShortcutChange {
  readonly token: ShortcutToken;
  readonly from: ShortcutActionId;
  readonly to: ShortcutActionId;
}

export function isSameMapping(a: ShortcutMapping, b: ShortcutMapping): boolean {
  return SHORTCUT_TOKENS.every((token) => a[token] === b[token]);
}

/** The mapping the editor shows: the draft when there is one, otherwise what is saved. */
export function resolveDraft(saved: ShortcutMapping, draft: ShortcutMapping | null): ShortcutMapping {
  return draft ?? saved;
}

/** Drops a draft that no longer differs from the saved mapping, so the editor follows later saves. */
export function normaliseDraft(saved: ShortcutMapping, draft: ShortcutMapping | null): ShortcutMapping | null {
  if (draft === null || isSameMapping(saved, draft)) return null;
  return draft;
}

/** A new mapping with one slot changed. Never mutates the input. */
export function applyChoice(mapping: ShortcutMapping, token: ShortcutToken, action: ShortcutActionId): ShortcutMapping {
  return { ...mapping, [token]: action };
}

/** Every slot whose draft action differs from the saved one, in slot order. */
export function diffShortcuts(saved: ShortcutMapping, draft: ShortcutMapping | null): ShortcutChange[] {
  const next = resolveDraft(saved, draft);
  return SHORTCUT_TOKENS.filter((token) => saved[token] !== next[token]).map((token) => ({
    token,
    from: saved[token],
    to: next[token],
  }));
}

export function hasChanges(saved: ShortcutMapping, draft: ShortcutMapping | null): boolean {
  return diffShortcuts(saved, draft).length > 0;
}

function shortcutName(token: ShortcutToken): string {
  return getCommand(token).label;
}

/** "Shortcut 1: Play or pause media → Announce the time" */
export function describeChange(change: ShortcutChange): string {
  return `${shortcutName(change.token)}: ${getShortcutAction(change.from).label} → ${getShortcutAction(change.to).label}`;
}

/** The same change in words a screen reader reads naturally, without the arrow. */
export function describeChangeSpoken(change: ShortcutChange): string {
  return `${shortcutName(change.token)} changes from ${getShortcutAction(change.from).label} to ${getShortcutAction(change.to).label}.`;
}

/** Preview lines, or an empty list when nothing changed (show NO_CHANGES_MESSAGE then). */
export function previewLines(saved: ShortcutMapping, draft: ShortcutMapping | null): string[] {
  return diffShortcuts(saved, draft).map(describeChange);
}

/** "Shortcut 1: Play or pause media" */
export function describeAssignment(token: ShortcutToken, mapping: ShortcutMapping): string {
  return `${shortcutName(token)}: ${getShortcutAction(mapping[token]).label}`;
}

/** One line per shortcut slot, e.g. for the saved confirmation and the restore dialog. */
export function mappingSummary(mapping: ShortcutMapping): string[] {
  return SHORTCUT_TOKENS.map((token) => describeAssignment(token, mapping));
}

export function defaultsSummary(): string[] {
  return mappingSummary(DEFAULT_SHORTCUT_MAPPING);
}

/** Whether "Restore defaults" would change anything: the saved mapping or the draft is not the default. */
export function canRestoreDefaults(saved: ShortcutMapping, draft: ShortcutMapping | null): boolean {
  return !isSameMapping(saved, DEFAULT_SHORTCUT_MAPPING) || !isSameMapping(resolveDraft(saved, draft), DEFAULT_SHORTCUT_MAPPING);
}
