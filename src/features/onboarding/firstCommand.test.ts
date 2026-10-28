import { DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { RingResult } from '@/features/practice';
import { firstCommandOutcome } from './firstCommand';

const base = { id: 'r1', at: 0 } as const;
const mapping = DEFAULT_SHORTCUT_MAPPING;

const TRY_AGAIN = 'Try again: squeeze, then tap the index fingertip.';

describe('judging the one command setup asks for', () => {
  it('accepts Confirm on the index fingertip', () => {
    const outcome = firstCommandOutcome(
      { ...base, kind: 'command', token: 'confirm', contact: 'index_tip', durationMs: 120 },
      mapping,
    );
    expect(outcome.verdict).toBe('correct');
    expect(outcome.message).toBe('Confirm on the index fingertip. That is the command.');
    expect(outcome.announcement).toBe(outcome.message);
    expect(outcome.feedbackKind).toBe('confirm');
    expect(outcome.detectedContact).toBeNull();
  });

  it('names another command and where it landed, and asks for the one wanted', () => {
    const outcome = firstCommandOutcome(
      { ...base, kind: 'command', token: 'back', contact: 'index_base', durationMs: 120 },
      mapping,
    );
    expect(outcome.verdict).toBe('other_command');
    expect(outcome.message).toBe(`That was Dismiss / Back, on the index finger base. ${TRY_AGAIN}`);
    // Announced without the slash, which a screen reader would read out.
    expect(outcome.announcement).toBe(`That was Dismiss or Back, on the index finger base. ${TRY_AGAIN}`);
    expect(outcome.detectedContact).toBe('index_base');
  });

  it('says the emergency hold sent nothing, and still asks for the command', () => {
    const outcome = firstCommandOutcome({ ...base, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }, mapping);
    expect(outcome.verdict).toBe('other_command');
    expect(outcome.message).toContain(EMERGENCY_SIMULATION_NOTICE);
    expect(outcome.message).toContain(TRY_AGAIN);
    expect(outcome.feedbackKind).toBe('emergency');
  });

  it('leaves a press the ring already explained to the ring’s own announcement', () => {
    const closed: RingResult = { ...base, kind: 'rejected', reason: 'window_closed', contact: null, durationMs: null };
    const outcome = firstCommandOutcome(closed, mapping);
    expect(outcome.verdict).toBe('not_recognised');
    expect(outcome.announcement).toBeNull();
    expect(outcome.message).toBe(`The command window closed. Squeeze again, then tap. ${TRY_AGAIN}`);
  });

  it('explains a press that was neither a tap nor a hold', () => {
    const outcome = firstCommandOutcome(
      { ...base, kind: 'rejected', reason: 'indeterminate_duration', contact: 'index_tip', durationMs: 1200 },
      mapping,
    );
    expect(outcome.verdict).toBe('not_recognised');
    expect(outcome.message).toContain('longer than a tap');
    expect(outcome.message).toContain(TRY_AGAIN);
  });
});
