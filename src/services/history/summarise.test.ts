import { COMMAND_TOKENS } from '@/domain/commands';
import { filterEvents, intendedToken, rangeStart, summariseEvents } from './summarise';
import { makeGestureEvent as ev } from './testing';

const NOW = new Date(2026, 8, 15, 14, 30, 0);
const DAY = 24 * 60 * 60 * 1000;

function at(ms: number): string {
  return new Date(ms).toISOString();
}

describe('intendedToken', () => {
  it('uses the tap command on the target contact when one was set', () => {
    expect(intendedToken(ev({ targetContact: 'index_tip', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }))).toBe('confirm');
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: 'quick_action_1' }))).toBe('quick_action_1');
  });

  it('treats a rejected press on a target as an attempt at that target', () => {
    expect(intendedToken(ev({ targetContact: 'ring_base', token: null, outcome: 'rejected_duration' }))).toBe('previous');
  });

  it('returns emergency for emergency holds, even on the pinky fingertip target', () => {
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: 'emergency', outcome: 'emergency' }))).toBe('emergency');
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: null, outcome: 'emergency_cancelled' }))).toBe('emergency');
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', token: null, outcome: 'rejected_duration', lessonId: 'emergency_hold' })),
    ).toBe('emergency');
  });

  it('prefers the stored target command over every other rule', () => {
    // A guided Emergency hold answered with a brief tap (Shortcut 1 on the same point).
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'mismatch' })),
    ).toBe('emergency');
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'recognised' })),
    ).toBe('emergency');
    // Asked for Shortcut 1, but the hold ran on: still an attempt at Shortcut 1.
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', targetToken: 'quick_action_1', token: null, outcome: 'emergency_cancelled' })),
    ).toBe('quick_action_1');
    expect(intendedToken(ev({ targetContact: null, detectedContact: 'index_tip', targetToken: 'next', token: 'confirm' }))).toBe('next');
  });

  it('keeps the contact rule for records without a target command', () => {
    const legacy = ev({ targetContact: 'pinky_tip', token: 'quick_action_1' });
    expect('targetToken' in legacy).toBe(false);
    expect(intendedToken(legacy)).toBe('quick_action_1');
  });

  it('falls back to the recognised token without a target, or null', () => {
    expect(intendedToken(ev({ targetContact: null, detectedContact: 'middle_base', token: 'next' }))).toBe('next');
    expect(intendedToken(ev({ targetContact: null, detectedContact: null, token: null, outcome: 'window_closed' }))).toBeNull();
  });
});

describe('rangeStart', () => {
  it('uses local midnight for today and 7 × 24 hours for 7d', () => {
    expect(rangeStart('today', NOW)).toBe(new Date(2026, 8, 15, 0, 0, 0, 0).getTime());
    expect(rangeStart('7d', NOW)).toBe(NOW.getTime() - 7 * DAY);
    expect(rangeStart('all', NOW)).toBeNull();
  });
});

describe('filterEvents', () => {
  const midnight = new Date(2026, 8, 15).getTime();
  const events = [
    ev({ id: 'old', at: at(NOW.getTime() - 7 * DAY - 1) }),
    ev({ id: 'week-edge', at: at(NOW.getTime() - 7 * DAY) }),
    ev({ id: 'before-midnight', at: at(midnight - 1), source: 'training', mode: 'lesson' }),
    ev({ id: 'midnight', at: at(midnight), targetContact: 'middle_base', token: 'next' }),
    ev({ id: 'mismatch', at: at(NOW.getTime() - 1000), targetContact: 'index_base', detectedContact: 'index_tip', token: 'confirm', outcome: 'mismatch' }),
  ];
  const ids = (list: { id: string }[]) => list.map((e) => e.id);

  it('returns everything without a filter or with range all', () => {
    expect(filterEvents(events, undefined, NOW)).toHaveLength(5);
    expect(filterEvents(events, { range: 'all' }, NOW)).toHaveLength(5);
  });

  it('includes the exact boundaries of today and 7d', () => {
    expect(ids(filterEvents(events, { range: 'today' }, NOW))).toEqual(['midnight', 'mismatch']);
    expect(ids(filterEvents(events, { range: '7d' }, NOW))).toEqual(['week-edge', 'before-midnight', 'midnight', 'mismatch']);
  });

  it('filters by intended command and by source, treating "all" as no filter', () => {
    expect(ids(filterEvents(events, { range: 'all', token: 'back' }, NOW))).toEqual(['mismatch']);
    expect(ids(filterEvents(events, { range: 'all', token: 'next' }, NOW))).toEqual(['midnight']);
    expect(filterEvents(events, { range: 'all', token: 'all', source: 'all' }, NOW)).toHaveLength(5);
    expect(ids(filterEvents(events, { range: 'all', source: 'training' }, NOW))).toEqual(['before-midnight']);
  });
});

describe('summariseEvents', () => {
  it('returns an empty summary with every command listed', () => {
    const summary = summariseEvents([], 'today');
    expect(summary).toMatchObject({
      range: 'today',
      attempts: 0,
      successes: 0,
      misclassifications: 0,
      rejected: 0,
      emergencies: 0,
      mostPractised: null,
      firstAt: null,
      lastAt: null,
      includesSeeded: false,
      evidence: null,
    });
    expect(summary.perCommand.map((c) => c.token)).toEqual([...COMMAND_TOKENS]);
    expect(summary.perCommand.every((c) => c.attempts === 0 && c.rate === null)).toBe(true);
  });

  it('counts attempts, outcomes and per-command rates', () => {
    const events = [
      ev({ at: '2026-09-15T01:00:00.000Z' }),
      ev({ at: '2026-09-15T01:01:00.000Z' }),
      ev({ at: '2026-09-15T01:02:00.000Z', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }),
      ev({ at: '2026-09-15T01:03:00.000Z', targetContact: 'middle_base', token: 'next' }),
      ev({ at: '2026-09-15T01:04:00.000Z', targetContact: 'middle_base', token: null, durationMs: 900, outcome: 'rejected_duration' }),
      ev({ at: '2026-09-15T01:05:00.000Z', targetContact: null, detectedContact: null, token: null, outcome: 'window_closed' }),
      ev({ at: '2026-09-15T01:06:00.000Z', targetContact: 'pinky_tip', token: 'emergency', durationMs: 5000, outcome: 'emergency' }),
      ev({ at: '2026-09-15T01:07:00.000Z', targetContact: 'pinky_tip', token: null, durationMs: 2100, outcome: 'emergency_cancelled', seeded: true }),
    ];
    const summary = summariseEvents(events, 'all');
    expect(summary.attempts).toBe(6);
    expect(summary.successes).toBe(3);
    expect(summary.misclassifications).toBe(1);
    expect(summary.rejected).toBe(2);
    expect(summary.emergencies).toBe(1);
    expect(summary.mostPractised).toEqual({ token: 'confirm', count: 3 });
    const byToken = Object.fromEntries(summary.perCommand.map((c) => [c.token, c]));
    expect(byToken.confirm).toEqual({ token: 'confirm', attempts: 3, successes: 2, rate: 2 / 3 });
    expect(byToken.next).toEqual({ token: 'next', attempts: 2, successes: 1, rate: 0.5 });
    expect(byToken.back).toEqual({ token: 'back', attempts: 0, successes: 0, rate: null });
    expect(byToken.emergency?.attempts).toBe(0);
    expect(summary.firstAt).toBe('2026-09-15T01:00:00.000Z');
    expect(summary.lastAt).toBe('2026-09-15T01:07:00.000Z');
    expect(summary.includesSeeded).toBe(true);
    expect(summary.evidence).toBe('simulated');
  });

  it('counts a tap on an Emergency target against Emergency, not Shortcut 1', () => {
    const events = [
      ev({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', durationMs: 180, outcome: 'mismatch' }),
      ev({ targetContact: 'pinky_tip', targetToken: 'quick_action_1', token: 'quick_action_1', durationMs: 180 }),
    ];
    const byToken = Object.fromEntries(summariseEvents(events, 'all').perCommand.map((c) => [c.token, c]));
    expect(byToken.emergency).toEqual({ token: 'emergency', attempts: 1, successes: 0, rate: 0 });
    expect(byToken.quick_action_1).toEqual({ token: 'quick_action_1', attempts: 1, successes: 1, rate: 1 });
    expect(filterEvents(events, { range: 'all', token: 'emergency' }, NOW)).toEqual([events[0]]);
  });

  it('breaks most-practised ties by command order and reports mixed evidence', () => {
    const events = [
      ev({ targetContact: 'middle_base', token: 'next', evidence: 'measured' }),
      ev({ targetContact: 'index_base', token: 'back' }),
    ];
    const summary = summariseEvents(events, '7d');
    expect(summary.mostPractised).toEqual({ token: 'back', count: 1 });
    expect(summary.evidence).toBe('mixed');
    expect(summariseEvents([events[0]!], '7d').evidence).toBe('measured');
  });

  it('finds first and last regardless of input order', () => {
    const summary = summariseEvents(
      [ev({ at: '2026-09-15T05:00:00.000Z' }), ev({ at: '2026-09-14T05:00:00.000Z' }), ev({ at: '2026-09-15T03:00:00.000Z' })],
      'all',
    );
    expect(summary.firstAt).toBe('2026-09-14T05:00:00.000Z');
    expect(summary.lastAt).toBe('2026-09-15T05:00:00.000Z');
  });
});
