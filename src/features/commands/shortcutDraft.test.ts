import { DEFAULT_SHORTCUT_MAPPING, type ShortcutMapping } from '@/domain/commands';
import {
  NO_CHANGES_MESSAGE,
  SHORTCUT_LEGENDS,
  applyChoice,
  canRestoreDefaults,
  defaultsSummary,
  describeAssignment,
  describeChange,
  describeChangeSpoken,
  diffShortcuts,
  hasChanges,
  isSameMapping,
  mappingSummary,
  normaliseDraft,
  previewLines,
  resolveDraft,
} from './shortcutDraft';

const SAVED: ShortcutMapping = { quick_action_1: 'play_pause', quick_action_2: 'announce_time' };

describe('shortcutDraft', () => {
  it('uses the saved mapping when there is no draft', () => {
    expect(resolveDraft(SAVED, null)).toBe(SAVED);
    const draft = applyChoice(SAVED, 'quick_action_1', 'toggle_flashlight');
    expect(resolveDraft(SAVED, draft)).toBe(draft);
  });

  it('changes one slot without mutating the input', () => {
    const next = applyChoice(SAVED, 'quick_action_2', 'unassigned');
    expect(next).toEqual({ quick_action_1: 'play_pause', quick_action_2: 'unassigned' });
    expect(SAVED).toEqual({ quick_action_1: 'play_pause', quick_action_2: 'announce_time' });
  });

  it('finds no changes for a missing or identical draft', () => {
    expect(diffShortcuts(SAVED, null)).toEqual([]);
    expect(diffShortcuts(SAVED, { ...SAVED })).toEqual([]);
    expect(hasChanges(SAVED, { ...SAVED })).toBe(false);
    expect(previewLines(SAVED, null)).toEqual([]);
    expect(NO_CHANGES_MESSAGE).toBe('No changes yet.');
  });

  it('lists only the slots that differ, in slot order', () => {
    const draft: ShortcutMapping = { quick_action_1: 'announce_time', quick_action_2: 'announce_time' };
    expect(diffShortcuts(SAVED, draft)).toEqual([{ token: 'quick_action_1', from: 'play_pause', to: 'announce_time' }]);
    expect(hasChanges(SAVED, draft)).toBe(true);

    const both: ShortcutMapping = { quick_action_1: 'start_voice_memo', quick_action_2: 'unassigned' };
    expect(diffShortcuts(SAVED, both).map((c) => c.token)).toEqual(['quick_action_1', 'quick_action_2']);
  });

  it('writes preview lines with the arrow, and a spoken form without it', () => {
    const draft = applyChoice(SAVED, 'quick_action_1', 'announce_time');
    expect(previewLines(SAVED, draft)).toEqual(['Shortcut 1: Play or pause media → Announce the time']);
    const [change] = diffShortcuts(SAVED, draft);
    if (!change) throw new Error('expected a change');
    expect(describeChange(change)).toBe('Shortcut 1: Play or pause media → Announce the time');
    expect(describeChangeSpoken(change)).toBe('Shortcut 1 changes from Play or pause media to Announce the time.');

    const second = applyChoice(SAVED, 'quick_action_2', 'unassigned');
    expect(previewLines(SAVED, second)).toEqual(['Shortcut 2: Announce the time → Nothing assigned']);
  });

  it('drops a draft once it matches the saved mapping again', () => {
    const changed = applyChoice(SAVED, 'quick_action_1', 'open_assistant');
    expect(normaliseDraft(SAVED, changed)).toBe(changed);
    expect(normaliseDraft(SAVED, applyChoice(changed, 'quick_action_1', 'play_pause'))).toBeNull();
    expect(normaliseDraft(SAVED, null)).toBeNull();
  });

  it('compares mappings slot by slot', () => {
    expect(isSameMapping(SAVED, { ...SAVED })).toBe(true);
    expect(isSameMapping(SAVED, applyChoice(SAVED, 'quick_action_2', 'play_pause'))).toBe(false);
  });

  it('summarises assignments and the defaults', () => {
    expect(describeAssignment('quick_action_2', SAVED)).toBe('Shortcut 2: Announce the time');
    expect(mappingSummary({ quick_action_1: 'unassigned', quick_action_2: 'toggle_flashlight' })).toEqual([
      'Shortcut 1: Nothing assigned',
      'Shortcut 2: Turn the torch on or off',
    ]);
    expect(defaultsSummary()).toEqual(mappingSummary(DEFAULT_SHORTCUT_MAPPING));
  });

  it('offers Restore defaults only when it would change something', () => {
    expect(canRestoreDefaults(DEFAULT_SHORTCUT_MAPPING, null)).toBe(false);
    expect(canRestoreDefaults(DEFAULT_SHORTCUT_MAPPING, applyChoice(DEFAULT_SHORTCUT_MAPPING, 'quick_action_1', 'unassigned'))).toBe(
      true,
    );
    const custom = applyChoice(DEFAULT_SHORTCUT_MAPPING, 'quick_action_2', 'read_notifications');
    expect(canRestoreDefaults(custom, null)).toBe(true);
    expect(canRestoreDefaults(custom, { ...DEFAULT_SHORTCUT_MAPPING })).toBe(true);
  });

  it('names the two editors by point and touch', () => {
    expect(SHORTCUT_LEGENDS).toEqual({
      quick_action_1: 'Shortcut 1 — pinky fingertip, brief tap',
      quick_action_2: 'Shortcut 2 — pinky finger base',
    });
  });
});
