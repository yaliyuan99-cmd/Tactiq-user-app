import { DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import { platformRouteText, whatWouldHappen } from './whatWouldHappen';

describe('whatWouldHappen', () => {
  it('uses the command definition for a fixed command', () => {
    expect(whatWouldHappen('confirm', DEFAULT_SHORTCUT_MAPPING)).toEqual({
      token: 'confirm',
      title: 'Confirm',
      description: 'Select the item your screen reader is focused on.',
      platformRoute: 'Screen-reader activate',
      shortcut: null,
      isEmergency: false,
    });
  });

  it('adds the assigned shortcut and its simulated outcome', () => {
    const view = whatWouldHappen('quick_action_2', DEFAULT_SHORTCUT_MAPPING);
    expect(view.title).toBe('Shortcut 2: Announce the time');
    expect(view.platformRoute).toBe('Platform automation; not guaranteed');
    expect(view.shortcut).toEqual({
      actionLabel: 'Announce the time',
      actionDescription: 'Would have the screen reader speak the current time.',
      simulatedOutcome: 'It is a quarter past two.',
      assigned: true,
    });
  });

  it('says when a shortcut has nothing assigned', () => {
    const view = whatWouldHappen('quick_action_1', { ...DEFAULT_SHORTCUT_MAPPING, quick_action_1: 'unassigned' });
    expect(view.title).toBe('Shortcut 1 (nothing assigned)');
    expect(view.shortcut?.assigned).toBe(false);
  });

  it('marks Emergency and never repeats "not guaranteed"', () => {
    const view = whatWouldHappen('emergency', DEFAULT_SHORTCUT_MAPPING);
    expect(view.isEmergency).toBe(true);
    expect(view.platformRoute).toBe('Platform SOS pathway; not guaranteed');
    expect(platformRouteText('undo')).toBe('App-dependent; not guaranteed');
  });
});
