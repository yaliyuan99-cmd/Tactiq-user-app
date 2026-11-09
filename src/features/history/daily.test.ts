import { describe, expect, it } from 'vitest';
import type { GestureEvent } from '@/domain/models';
import { dailyActivity, dayKey, daySentence, daysToShow, eventsOnDay } from './daily';

const NOW = new Date(2026, 10, 5, 12, 0, 0);

function event(at: Date, patch: Partial<GestureEvent> = {}): GestureEvent {
  return {
    id: at.toISOString(),
    at: at.toISOString(),
    source: 'simulator',
    mode: 'guided',
    targetContact: 'index_tip',
    detectedContact: 'index_tip',
    token: 'confirm',
    durationMs: 120,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
    ...patch,
  } as GestureEvent;
}

describe('dailyActivity', () => {
  it('keeps empty days and ends today, oldest first', () => {
    const buckets = dailyActivity([], 7, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[0]?.key).toBe('2026-10-30');
    expect(buckets[6]?.key).toBe('2026-11-05');
    expect(buckets.every((bucket) => bucket.records === 0)).toBe(true);
  });

  it('scores only attempts at a known target, and still counts every record', () => {
    const day = new Date(2026, 10, 4, 9);
    const buckets = dailyActivity(
      [
        event(day),
        event(day, { outcome: 'mismatch', detectedContact: 'middle_tip', token: 'back' }),
        event(day, { mode: 'free', targetContact: null }),
        event(day, { kind: 'activation', targetContact: null, detectedContact: null, token: null, durationMs: null }),
      ],
      7,
      NOW,
    );
    expect(buckets[5]).toMatchObject({ key: '2026-11-04', attempts: 2, correct: 1, records: 4 });
  });

  it('ignores records older than the days shown', () => {
    const buckets = dailyActivity([event(new Date(2026, 8, 1))], 7, NOW);
    expect(buckets.every((bucket) => bucket.records === 0)).toBe(true);
  });
});

describe('daysToShow', () => {
  it('gives the last 7 days an eighth column only when a record falls on it', () => {
    expect(daysToShow('7d', [], 20, NOW)).toBe(7);
    expect(daysToShow('7d', [event(new Date(2026, 9, 29, 18))], 20, NOW)).toBe(8);
  });

  it('shows all time up to what fits, and never fewer than a week', () => {
    expect(daysToShow('all', [event(new Date(2026, 10, 4))], 20, NOW)).toBe(7);
    expect(daysToShow('all', [event(new Date(2026, 9, 25))], 20, NOW)).toBe(12);
    expect(daysToShow('all', [event(new Date(2026, 0, 1))], 20, NOW)).toBe(20);
  });
});

describe('day helpers', () => {
  it('finds the records on one local day', () => {
    const records = [event(new Date(2026, 10, 4, 23, 59)), event(new Date(2026, 10, 5, 0, 1))];
    expect(eventsOnDay(records, dayKey(new Date(2026, 10, 5)))).toHaveLength(1);
  });

  it('describes a day in words, whatever is on it', () => {
    const base = { key: 'k', date: new Date(2026, 10, 5) };
    expect(daySentence({ ...base, attempts: 1, correct: 1, records: 2 })).toMatch(/: 1 attempt, 1 correct$/);
    expect(daySentence({ ...base, attempts: 8, correct: 5, records: 9 })).toMatch(/: 8 attempts, 5 correct$/);
    expect(daySentence({ ...base, attempts: 0, correct: 0, records: 3 })).toMatch(/: 3 records, none scored$/);
    expect(daySentence({ ...base, attempts: 0, correct: 0, records: 0 })).toMatch(/: no activity$/);
  });
});
