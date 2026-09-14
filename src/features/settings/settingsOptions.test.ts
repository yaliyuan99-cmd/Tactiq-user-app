import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS } from '@/domain/timing';
import {
  LONGER_TIME_DESCRIPTION,
  choiceAnnouncement,
  commandWindowMsFor,
  handPreviewCaption,
  longerTimeAnnouncement,
  plural,
  preferencesAfterReset,
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
    expect(LONGER_TIME_DESCRIPTION).toBe('Keeps the command window open for 6 seconds instead of 3.');
    expect(commandWindowMsFor(false)).toBe(COMMAND_WINDOW_MS);
    expect(commandWindowMsFor(true)).toBe(COMMAND_WINDOW_LONG_MS);
    expect(longerTimeAnnouncement(true)).toBe('Longer interaction time on. The command window stays open for 6 seconds.');
    expect(longerTimeAnnouncement(false)).toBe('Longer interaction time off. The command window stays open for 3 seconds.');
  });

  it('captions the hand preview and pluralises nouns', () => {
    expect(handPreviewCaption('left')).toBe('Preview: left hand, palm facing you.');
    expect(plural(1, 'point')).toBe('1 point');
    expect(plural(3, 'point')).toBe('3 points');
  });
});

describe('preferencesAfterReset', () => {
  it('restores every default but keeps onboarding progress', () => {
    const current: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      textSize: 'larger',
      contrast: 'high',
      reducedMotion: true,
      audioAnnouncements: true,
      visualConfirmation: false,
      hapticFeedback: false,
      longerInteractionTime: true,
      hand: 'left',
      onboardingCompleted: true,
      onboardingStep: 6,
    };
    expect(preferencesAfterReset(current)).toEqual({ ...DEFAULT_PREFERENCES, onboardingCompleted: true, onboardingStep: 6 });
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
