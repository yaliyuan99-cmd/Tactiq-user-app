import { COMMAND_TOKENS, type CommandToken } from '@/domain/commands';
import type { CommandPerformance } from '@/domain/models';
import { barWidthPercent, performanceRows, performanceSentence, rateWithCounts } from './performance';

function row(token: CommandToken, attempts = 0, successes = 0): CommandPerformance {
  return { token, attempts, successes, rate: attempts > 0 ? successes / attempts : null };
}

function perCommand(overrides: Partial<Record<CommandToken, [number, number]>> = {}): CommandPerformance[] {
  return COMMAND_TOKENS.map((token) => {
    const counts = overrides[token];
    return counts ? row(token, counts[0], counts[1]) : row(token);
  });
}

describe('performanceRows', () => {
  it('lists the eight tap commands for all commands, leaving Emergency out', () => {
    const rows = performanceRows(perCommand(), 'all');
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.token)).not.toContain('emergency');
  });

  it('keeps only the chosen command', () => {
    expect(performanceRows(perCommand({ next: [3, 2] }), 'next')).toEqual([row('next', 3, 2)]);
  });

  it('has no rows for Emergency', () => {
    expect(performanceRows(perCommand({ emergency: [2, 0] }), 'emergency')).toEqual([]);
  });
});

describe('barWidthPercent', () => {
  it('is the success rate as a percentage to one decimal place', () => {
    expect(barWidthPercent(11, 12)).toBe(91.7);
    expect(barWidthPercent(12, 12)).toBe(100);
    expect(barWidthPercent(0, 5)).toBe(0);
    expect(barWidthPercent(1, 3)).toBe(33.3);
  });

  it('is zero without attempts and clamps impossible values', () => {
    expect(barWidthPercent(0, 0)).toBe(0);
    expect(barWidthPercent(5, 0)).toBe(0);
    expect(barWidthPercent(-1, 4)).toBe(0);
    expect(barWidthPercent(9, 4)).toBe(100);
    expect(barWidthPercent(Number.NaN, 4)).toBe(0);
  });
});

describe('rateWithCounts', () => {
  it('always pairs the rate with its counts', () => {
    expect(rateWithCounts(row('next', 12, 11))).toBe('11 of 12 (92%)');
    expect(rateWithCounts(row('next', 4, 0))).toBe('0 of 4 (0%)');
  });

  it('says No attempts instead of a rate', () => {
    expect(rateWithCounts(row('undo'))).toBe('No attempts');
  });
});

describe('performanceSentence', () => {
  it('names the most practised command and the commands with no attempts', () => {
    const rows = [row('next', 12, 11), row('undo')];
    expect(performanceSentence(rows)).toBe('Next was practised most, 12 attempts, 11 recognised. Undo has no attempts in this range.');
  });

  it('adds the least recognised command when rates differ, and lists several unpractised commands', () => {
    const rows = performanceRows(
      perCommand({ confirm: [5, 5], next: [12, 11], previous: [7, 4], read: [1, 1], back: [2, 2], quick_action_1: [3, 3] }),
      'all',
    );
    expect(performanceSentence(rows)).toBe(
      'Next was practised most, 12 attempts, 11 recognised. ' +
        'Previous was recognised least often, 4 of 7 (57%). ' +
        'Undo and Shortcut 2 have no attempts in this range.',
    );
  });

  it('breaks ties in list order and skips the least-recognised sentence when every rate is equal', () => {
    const rows = [row('confirm', 3, 3), row('back', 3, 3), row('undo', 1, 1)];
    expect(performanceSentence(rows)).toBe('Confirm was practised most, 3 attempts, 3 recognised.');
  });

  it('uses singular wording and does not repeat the most practised command as the least recognised', () => {
    expect(performanceSentence([row('read', 1, 0), row('undo', 1, 1)])).toBe(
      'Read / Repeat was practised most, 1 attempt, 0 recognised.',
    );
  });

  it('handles no attempts at all', () => {
    expect(performanceSentence(performanceRows(perCommand(), 'all'))).toBe('No command has attempts in this range.');
  });

  it('describes a single chosen command', () => {
    expect(performanceSentence([row('next', 12, 11)])).toBe('Next: 12 attempts, 11 recognised.');
    expect(performanceSentence([row('undo')])).toBe('Undo has no attempts in this range.');
  });

  it('is empty without rows', () => {
    expect(performanceSentence([])).toBe('');
  });
});
