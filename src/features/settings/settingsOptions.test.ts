import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS } from '@/domain/timing';
import {
  LONGER_TIME_DESCRIPTION,
  choiceAnnouncement,
  commandWindowExplanation,
  commandWindowMsFor,
  handPreviewCaption,
  longerTimeAnnouncement,
  plural,
  switchAnnouncement,
} from './settingsOptions';
import { SETTINGS_SECTIONS, settingsHeadingId, settingsSectionTitle } from './settingsSections';

describe('settings wording', () => {
  it('announces choices and switches briefly', () => {
    expect(choiceAnnouncement('Theme', 'Dark')).toBe('Theme set to Dark.');
    expect(switchAnnouncement('Reduce motion', true)).toBe('Reduce motion on.');
    expect(switchAnnouncement('Haptic feedback', false)).toBe('Haptic feedback off.');
  });

  it('derives the command window wording from the timing constants', () => {
    expect(COMMAND_WINDOW_MS).toBe(3000);
    expect(COMMAND_WINDOW_LONG_MS).toBe(6000);
    expect(LONGER_TIME_DESCRIPTION).toBe('Keeps the simulated ring’s command window open for 6 seconds instead of 3.');
    expect(commandWindowMsFor(false)).toBe(COMMAND_WINDOW_MS);
    expect(commandWindowMsFor(true)).toBe(COMMAND_WINDOW_LONG_MS);
    expect(longerTimeAnnouncement(true)).toBe(
      'Longer interaction time on. The simulated ring’s command window stays open for 6 seconds.',
    );
    expect(longerTimeAnnouncement(false)).toBe(
      'Longer interaction time off. The simulated ring’s command window stays open for 3 seconds.',
    );
  });

  it('says which ring the active command window belongs to', () => {
    expect(commandWindowExplanation('demo')).toBe(
      'This is the simulated ring’s window. A connected bench ring keeps its firmware’s 3 s window, which this setting does not change.',
    );
    expect(commandWindowExplanation('hardware')).toBe(
      'You are set to use a Bluetooth bench ring, and its firmware fixes the window at 3 s. Longer interaction time changes only the simulated ring in Demo Mode.',
    );
  });

  it('captions the hand preview and pluralises nouns', () => {
    expect(handPreviewCaption('left')).toBe('Preview: left hand, palm facing you.');
    expect(plural(1, 'point')).toBe('1 point');
    expect(plural(3, 'point')).toBe('3 points');
  });
});

describe('settings sections', () => {
  it('lists the nine sections in page order with stable heading ids', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'appearance',
      'feedback',
      'timing',
      'hand',
      'device',
      'calibration',
      'privacy',
      'account',
      'about',
    ]);
    expect(settingsSectionTitle('privacy')).toBe('Privacy and your data');
    expect(settingsHeadingId('hand')).toBe('settings-hand-heading');
  });
});
