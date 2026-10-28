import { COMMAND_TOKENS } from '@/domain/commands';
import type { GestureEvent } from '@/domain/models';
import { filterEvents, intendedToken, isNarrowingFilter, rangeStart, summariseEvents } from './summarise';
import {
  makeActivationEvent,
  makeCalibrationEvent,
  makeEmergencyEvent,
  makeFreePracticeEvent,
  makeGestureEvent as ev,
  makeLegacyActivationEvent,
} from './testing';

const NOW = new Date(2026, 8, 15, 14, 30, 0);
const DAY = 24 * 60 * 60 * 1000;

function at(ms: number): string {
  return new Date(ms).toISOString();
}

describe('rangeStart', () => {
  it('uses local midnight for today and 7 × 24 hours for 7d', () => {
    expect(rangeStart('today', NOW)).toBe(new Date(2026, 8, 15, 0, 0, 0, 0).getTime());
    expect(rangeStart('7d', NOW)).toBe(NOW.getTime() - 7 * DAY);
    expect(rangeStart('all', NOW)).toBeNull();
  });
});

describe('isNarrowingFilter', () => {
  it('is false only when nothing is left out', () => {
    expect(isNarrowingFilter(undefined)).toBe(false);
    expect(isNarrowingFilter({ range: 'all' })).toBe(false);
    expect(isNarrowingFilter({ range: 'all', token: 'all', source: 'all', evidence: 'all', samples: 'include' })).toBe(false);
  });

  it('is true for every filter that leaves records out', () => {
    expect(isNarrowingFilter({ range: '7d' })).toBe(true);
    expect(isNarrowingFilter({ range: 'today' })).toBe(true);
    expect(isNarrowingFilter({ range: 'all', token: 'next' })).toBe(true);
    expect(isNarrowingFilter({ range: 'all', source: 'training' })).toBe(true);
    expect(isNarrowingFilter({ range: 'all', evidence: 'measured' })).toBe(true);
    expect(isNarrowingFilter({ range: 'all', samples: 'exclude' })).toBe(true);
    expect(isNarrowingFilter({ range: 'all', samples: 'only' })).toBe(true);
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

  it('never matches a calibration record by command, because it asked for a point', () => {
    const withCalibration = [...events, makeCalibrationEvent({ id: 'calibration' })];
    expect(ids(filterEvents(withCalibration, { range: 'all', source: 'calibration' }, NOW))).toEqual(['calibration']);
    expect(filterEvents(withCalibration, { range: 'all', token: 'read' }, NOW)).toEqual([]);
  });

  it('filters by evidence', () => {
    const mixed = [ev({ id: 'sim' }), ev({ id: 'bench', evidence: 'measured' })];
    expect(ids(filterEvents(mixed, { range: 'all', evidence: 'measured' }, NOW))).toEqual(['bench']);
    expect(ids(filterEvents(mixed, { range: 'all', evidence: 'simulated' }, NOW))).toEqual(['sim']);
    expect(filterEvents(mixed, { range: 'all', evidence: 'all' }, NOW)).toHaveLength(2);
  });

  it('separates sample records from the user’s own', () => {
    const mixed = [ev({ id: 'sample', seeded: true }), ev({ id: 'mine' })];
    expect(ids(filterEvents(mixed, { range: 'all' }, NOW))).toEqual(['sample', 'mine']);
    expect(ids(filterEvents(mixed, { range: 'all', samples: 'exclude' }, NOW))).toEqual(['mine']);
    expect(ids(filterEvents(mixed, { range: 'all', samples: 'only' }, NOW))).toEqual(['sample']);
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
      filtered: false,
    });
    expect(summary.accuracy).toEqual({ attempts: 0, successes: 0, rate: null });
    expect(summary.counts).toEqual({
      total: 0,
      activations: 0,
      attempts: 0,
      commandAttempts: 0,
      contactAttempts: 0,
      untargeted: 0,
      emergency: 0,
      seeded: 0,
      own: 0,
    });
    expect(summary.emergency).toEqual({ attempts: 0, completed: 0, cancelled: 0, notHeld: 0, rate: null });
    expect(summary.perCommand.map((c) => c.token)).toEqual([...COMMAND_TOKENS]);
    expect(summary.perCommand.every((c) => c.attempts === 0 && c.rate === null)).toBe(true);
  });

  /**
   * One worked example with every kind of record in it, so the denominator
   * rules are checked as numbers rather than as prose. Fourteen records:
   * seven answered a question, and seven did not.
   */
  describe('a worked example of the denominator', () => {
    let minute = 0;
    const next = (event: GestureEvent): GestureEvent => {
      minute += 1;
      return { ...event, at: `2026-09-15T01:${String(minute).padStart(2, '0')}:00.000Z` };
    };
    const events: readonly GestureEvent[] = [
      /* 1 */ next(ev({ id: 'guided-ok' })),
      /* 2 */ next(ev({ id: 'guided-miss', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' })),
      /* 3 */ next(ev({ id: 'guided-next-ok', targetContact: 'middle_base', detectedContact: 'middle_base', token: 'next' })),
      /* 4 */ next(ev({ id: 'guided-too-long', targetContact: 'middle_base', token: null, durationMs: 900, outcome: 'rejected_duration' })),
      /* 5 */ next(ev({ id: 'guided-window-shut', targetContact: 'ring_base', detectedContact: 'ring_base', token: null, durationMs: null, outcome: 'window_closed' })),
      /* 6 */ next(makeFreePracticeEvent({ id: 'free-ok' })),
      /* 7 */ next(makeFreePracticeEvent({ id: 'free-too-long', token: null, durationMs: 900, outcome: 'rejected_duration' })),
      /* 8 */ next(makeActivationEvent({ id: 'squeeze' })),
      /* 9 */ next(makeLegacyActivationEvent({ id: 'squeeze-legacy' })),
      /* 10 */ next(makeCalibrationEvent({ id: 'calibration-ok' })),
      /* 11 */ next(makeCalibrationEvent({ id: 'calibration-miss', detectedContact: 'ring_base', token: 'previous', outcome: 'mismatch' })),
      /* 12 */ next(makeEmergencyEvent({ id: 'hold-done' })),
      /* 13 */ next(makeEmergencyEvent({ id: 'hold-cancelled', token: null, durationMs: 2100, outcome: 'emergency_cancelled' })),
      /* 14 */ next(ev({ id: 'emergency-tapped', targetContact: 'pinky_tip', targetToken: 'emergency', detectedContact: 'pinky_tip', token: 'quick_action_1', durationMs: 180, outcome: 'mismatch' })),
    ];
    const summary = summariseEvents(events, 'all');
    const byToken = Object.fromEntries(summary.perCommand.map((c) => [c.token, c]));

    it('counts fourteen records in exactly four classes', () => {
      expect(summary.counts).toEqual({
        total: 14,
        activations: 2,
        attempts: 7,
        commandAttempts: 5,
        contactAttempts: 2,
        untargeted: 2,
        emergency: 3,
        seeded: 0,
        own: 14,
      });
      const { activations, attempts, untargeted, emergency, total } = summary.counts;
      expect(activations + attempts + untargeted + emergency).toBe(total);
    });

    it('divides by the seven attempts at a known target, not by all fourteen records', () => {
      expect(summary.accuracy).toEqual({ attempts: 7, successes: 3, rate: 3 / 7 });
      expect(summary.attempts).toBe(7);
      expect(summary.successes).toBe(3);
      // A denominator of every record bar the two emergency holds would be 12,
      // with six of them saved as recognised: 50% instead of 43%.
      const loose = events.filter((e) => e.outcome !== 'emergency' && e.outcome !== 'emergency_cancelled');
      expect(loose).toHaveLength(12);
      expect(loose.filter((e) => e.outcome === 'recognised')).toHaveLength(6);
      expect(3 / 7).toBeLessThan(6 / 12);
    });

    it('decomposes the attempts exactly: successes, mismatches and dropped presses', () => {
      expect(summary.misclassifications).toBe(2);
      expect(summary.rejected).toBe(2);
      expect(summary.successes + summary.misclassifications + summary.rejected).toBe(summary.attempts);
    });

    it('leaves the two activations and the two free-practice records out of the figure', () => {
      expect(summary.counts.activations).toBe(2);
      expect(summary.counts.untargeted).toBe(2);
      // Both free-practice records and both squeezes were saved as recognised…
      expect(summary.outcomes.recognised).toBe(6);
      // …and only three of those recognised records were answers to a question.
      expect(summary.successes).toBe(3);
    });

    it('keeps every outcome visible, so nothing is silently dropped', () => {
      expect(summary.outcomes).toEqual({
        recognised: 6,
        mismatch: 3,
        rejected_duration: 2,
        window_closed: 1,
        emergency: 1,
        emergency_cancelled: 1,
      });
      expect(Object.values(summary.outcomes).reduce((a, b) => a + b, 0)).toBe(14);
    });

    it('attributes calibration prompts to no command, and counts them as point attempts', () => {
      expect(summary.contactAccuracy).toEqual({ attempts: 2, successes: 1, rate: 0.5 });
      expect(byToken.read?.attempts).toBe(0);
      expect(byToken.previous?.attempts).toBe(1); // only the guided window_closed on the ring base
      expect(summary.commandAccuracy.attempts + summary.contactAccuracy.attempts).toBe(summary.attempts);
      expect(summary.commandAccuracy.successes + summary.contactAccuracy.successes).toBe(summary.successes);
    });

    it('reconciles the per-command rows with the summary totals', () => {
      expect(byToken.confirm).toEqual({ token: 'confirm', attempts: 2, successes: 1, rate: 0.5 });
      expect(byToken.next).toEqual({ token: 'next', attempts: 2, successes: 1, rate: 0.5 });
      expect(byToken.previous).toEqual({ token: 'previous', attempts: 1, successes: 0, rate: 0 });
      expect(byToken.undo).toEqual({ token: 'undo', attempts: 0, successes: 0, rate: null });
      const rowAttempts = summary.perCommand.reduce((sum, row) => sum + row.attempts, 0);
      const rowSuccesses = summary.perCommand.reduce((sum, row) => sum + row.successes, 0);
      expect(rowAttempts).toBe(summary.counts.commandAttempts);
      expect(summary.commandAccuracy).toEqual({ attempts: rowAttempts, successes: rowSuccesses, rate: rowSuccesses / rowAttempts });
      expect(summary.commandAccuracy).toEqual({ attempts: 5, successes: 2, rate: 0.4 });
      expect(summary.mostPractised).toEqual({ token: 'confirm', count: 2 });
    });

    it('scores the emergency hold apart from the taps, and never as a command row', () => {
      expect(byToken.emergency).toEqual({ token: 'emergency', attempts: 0, successes: 0, rate: null });
      expect(summary.emergency).toEqual({ attempts: 3, completed: 1, cancelled: 1, notHeld: 1, rate: 1 / 3 });
      expect(summary.emergencies).toBe(summary.emergency.completed);
      // The brief tap on the Emergency prompt is the record the per-command table cannot show.
      expect(summary.emergency.notHeld).toBe(1);
    });

    it('reports the first and last record and the evidence', () => {
      expect(summary.firstAt).toBe('2026-09-15T01:01:00.000Z');
      expect(summary.lastAt).toBe('2026-09-15T01:14:00.000Z');
      expect(summary.evidence).toBe('simulated');
      expect(summary.includesSeeded).toBe(false);
    });
  });

  it('re-exports the command attribution used by the screens', () => {
    expect(intendedToken(ev({ targetContact: 'ring_tip', token: 'previous', outcome: 'mismatch' }))).toBe('read');
  });

  it('breaks most-practised ties by command order and reports mixed evidence', () => {
    const events = [
      ev({ targetContact: 'middle_base', detectedContact: 'middle_base', token: 'next', evidence: 'measured' }),
      ev({ targetContact: 'index_base', detectedContact: 'index_base', token: 'back' }),
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

  it('says when the summary came through a narrowing filter', () => {
    expect(summariseEvents([ev()], 'today', true).filtered).toBe(true);
    expect(summariseEvents([ev()], 'all').filtered).toBe(false);
  });

  describe('evidence breakdown', () => {
    it('keeps simulated practice and bench readings apart instead of blending one figure', () => {
      const events = [
        ev({ id: 's1' }),
        ev({ id: 's2', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }),
        ev({ id: 's3', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }),
        ev({ id: 'm1', evidence: 'measured' }),
        ev({ id: 'm2', evidence: 'measured' }),
        makeFreePracticeEvent({ id: 'm3', evidence: 'measured' }),
      ];
      const summary = summariseEvents(events, 'all');
      expect(summary.evidence).toBe('mixed');
      // One blended figure would read 3 of 5; the two kinds of record say different things.
      expect(summary.accuracy).toEqual({ attempts: 5, successes: 3, rate: 3 / 5 });
      expect(summary.byEvidence.simulated).toEqual({ records: 3, accuracy: { attempts: 3, successes: 1, rate: 1 / 3 } });
      expect(summary.byEvidence.measured).toEqual({ records: 3, accuracy: { attempts: 2, successes: 2, rate: 1 } });
      expect(summary.byEvidence.simulated.records + summary.byEvidence.measured.records).toBe(summary.counts.total);
      expect(summary.byEvidence.simulated.accuracy.attempts + summary.byEvidence.measured.accuracy.attempts).toBe(summary.attempts);
    });

    it('leaves the other evidence empty when there is only one kind', () => {
      const summary = summariseEvents([ev()], 'all');
      expect(summary.byEvidence.measured).toEqual({ records: 0, accuracy: { attempts: 0, successes: 0, rate: null } });
      expect(summary.byEvidence.simulated.records).toBe(1);
    });
  });

  describe('sample records', () => {
    it('counts samples apart from the user’s own records', () => {
      const events = [
        ev({ id: 'sample-ok', seeded: true }),
        ev({ id: 'sample-miss', seeded: true, detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }),
        ev({ id: 'mine', targetContact: 'middle_base', detectedContact: 'middle_base', token: 'next' }),
      ];
      const summary = summariseEvents(events, 'all');
      expect(summary.includesSeeded).toBe(true);
      expect(summary.counts.seeded).toBe(2);
      expect(summary.counts.own).toBe(1);
      expect(summary.accuracy).toEqual({ attempts: 3, successes: 2, rate: 2 / 3 });

      // The same arithmetic with the samples left out, which the filter can do.
      const own = summariseEvents(filterEvents(events, { range: 'all', samples: 'exclude' }, NOW), 'all', true);
      expect(own.counts).toMatchObject({ total: 1, seeded: 0, own: 1 });
      expect(own.includesSeeded).toBe(false);
      expect(own.accuracy).toEqual({ attempts: 1, successes: 1, rate: 1 });
      expect(own.filtered).toBe(true);
    });
  });
});
