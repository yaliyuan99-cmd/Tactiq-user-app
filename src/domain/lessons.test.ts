import { LESSONS, getLesson } from './lessons';
import { hapticPhrase } from './haptics';

describe('lesson copy', () => {
  it('leaves the command window length to the screen, which knows the window in force', () => {
    const lesson = getLesson('squeeze_to_activate');
    for (const paragraph of lesson.explanation) {
      expect(paragraph).not.toMatch(/\d/);
      expect(paragraph).not.toMatch(/three seconds|six seconds/i);
    }
    expect(lesson.explanation[0]).toBe(
      'The ring stays asleep until you squeeze its body. A short, deliberate squeeze opens a short command window.',
    );
  });

  it('describes the haptics with the shared wording for each haptic class', () => {
    expect(getLesson('squeeze_to_activate').explanation[1]).toContain(hapticPhrase('armed'));
    expect(getLesson('emergency_hold').explanation[1]).toContain(hapticPhrase('emergency'));
  });

  it('writes step instructions and explanations with spoken labels, never a slash', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        expect(step.instruction).not.toMatch(/[/]/);
      }
      for (const paragraph of lesson.explanation) {
        expect(paragraph).not.toMatch(/[/]/);
      }
    }
    const [confirmStep, dismissStep] = getLesson('confirm_and_back').steps;
    expect(confirmStep?.instruction).toBe('Squeeze, then tap the index fingertip for Confirm.');
    expect(dismissStep?.instruction).toBe('Squeeze, then tap the index finger base for Dismiss or Back.');
    expect(getLesson('next_previous_read').explanation[0]).toContain('Read or Repeat is the ring fingertip.');
  });
});
