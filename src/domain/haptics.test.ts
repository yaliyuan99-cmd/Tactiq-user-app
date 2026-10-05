import { HAPTIC_CLASSES, HAPTIC_CLASS_INFO, HAPTIC_CLASS_LIST, hapticPhrase, hapticSentence } from './haptics';

describe('haptic classes', () => {
  it('describes the four firmware classes in firmware order', () => {
    expect(HAPTIC_CLASS_LIST.map((info) => info.id)).toEqual([...HAPTIC_CLASSES]);
    expect(HAPTIC_CLASS_LIST.map((info) => info.name)).toEqual(['Window open', 'Confirm', 'Reject', 'Emergency']);
  });

  it('builds each description from the phrase and the moment it is given', () => {
    expect(hapticSentence('armed')).toBe('One short tick when a squeeze opens the command window.');
    expect(hapticSentence('confirm')).toBe('One firm click when a command is accepted.');
    expect(hapticSentence('reject')).toBe('A double click when a press is not recognised.');
    expect(hapticSentence('emergency')).toBe('A long alert when a five-second emergency hold completes.');
    expect(hapticPhrase('confirm')).toBe('one firm click');
    expect(HAPTIC_CLASS_INFO.emergency.description).toBe(hapticSentence('emergency'));
  });

  it('gives no duration for any class, because none is specified', () => {
    for (const info of HAPTIC_CLASS_LIST) {
      expect(info.description).not.toMatch(/\d/);
      expect(info.phrase).not.toMatch(/ms|millisecond/);
    }
  });
});
