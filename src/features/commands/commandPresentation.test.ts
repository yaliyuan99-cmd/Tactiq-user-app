import { COMMANDS, DEFAULT_SHORTCUT_MAPPING, getCommand } from '@/domain/commands';
import { CONTACT_KEYS } from '@/domain/contacts';
import {
  commandWhereAndHow,
  commandWindowNote,
  contactCommandLabel,
  mapCaption,
  statusLabel,
  touchLabel,
} from './commandPresentation';

describe('commandPresentation', () => {
  it('names the two touches', () => {
    expect(touchLabel('tap')).toBe('Brief tap');
    expect(touchLabel('hold_5s')).toBe('Hold 5 seconds');
  });

  it('labels six fixed commands, two customisable shortcuts and a locked Emergency', () => {
    const labels = COMMANDS.map((command) => statusLabel(command.kind));
    expect(labels.filter((l) => l === 'Fixed')).toHaveLength(6);
    expect(labels.filter((l) => l === 'Customisable')).toHaveLength(2);
    expect(labels.filter((l) => l === 'Fixed — cannot be changed')).toHaveLength(1);
    expect(statusLabel(getCommand('emergency').kind)).toBe('Fixed — cannot be changed');
  });

  it('describes where and how each command is made', () => {
    expect(commandWhereAndHow(getCommand('confirm'))).toBe('Index fingertip, brief tap');
    expect(commandWhereAndHow(getCommand('emergency'))).toBe('Pinky fingertip, hold 5 seconds');
  });

  it('labels contact points with the saved shortcut, and both commands on the pinky fingertip', () => {
    expect(contactCommandLabel('index_tip', DEFAULT_SHORTCUT_MAPPING)).toBe('Confirm');
    expect(contactCommandLabel('pinky_tip', DEFAULT_SHORTCUT_MAPPING)).toBe(
      'Shortcut 1: Play or pause media; hold 5 seconds for Emergency',
    );
    expect(contactCommandLabel('pinky_base', { quick_action_1: 'play_pause', quick_action_2: 'unassigned' })).toBe(
      'Shortcut 2 (nothing assigned)',
    );
    CONTACT_KEYS.forEach((key) => expect(contactCommandLabel(key, DEFAULT_SHORTCUT_MAPPING)).not.toBe(''));
  });

  it('describes the command window for the mode the app is actually in', () => {
    // Demo Mode: the preference decides, and the tip is worth offering.
    expect(commandWindowNote({ mode: 'demo', windowMs: 3000, longerInteractionTime: false })).toEqual({
      lead: 'Your window is',
      value: '3 s',
      tail: '. Switch on Longer interaction time for 6 s.',
    });
    expect(commandWindowNote({ mode: 'demo', windowMs: 6000, longerInteractionTime: true })).toEqual({
      lead: 'Your window is',
      value: '6 s',
      tail: ' because Longer interaction time is on.',
    });

    // Hardware: the firmware fixes the window, so the tip would mislead.
    const hardware = commandWindowNote({ mode: 'hardware', windowMs: 3000, longerInteractionTime: true });
    expect(hardware.value).toBe('3 s');
    expect(hardware.lead).toBe('Your bench ring’s window is');
    expect(hardware.tail).toMatch(/fixed by its firmware/);
    expect(hardware.tail).not.toMatch(/Switch on/);
  });

  it('captions the map for either hand', () => {
    expect(mapCaption('right')).toMatch(/^Right hand, palm facing you\./);
    expect(mapCaption('left')).toMatch(/^Left hand, palm facing you\./);
  });
});
