import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { RingResult } from '@/features/practice';
import {
  MAX_MISSES_PER_POINT,
  acceptedFor,
  acceptedTotal,
  attemptFromResult,
  isPointSettled,
  misreadContact,
  missesInRun,
  nextPrompt,
  remainingPoints,
  requiredTotal,
  resumability,
  runForRemaining,
  sampleNumber,
  type CalibrationRun,
} from './calibrationFlow';
import { ALL_DONE, ok, profile, times, tooLong, wrong } from './testing/profiles';

describe('coverage', () => {
  it('counts accepted taps, remaining points and the capped total', () => {
    const p = profile([...times(4, ok('index_tip')), ok('index_base'), wrong('middle_tip', 'middle_base')]);
    expect(acceptedFor(p, 'index_tip')).toBe(4);
    expect(acceptedFor(null, 'index_tip')).toBe(0);
    expect(remainingPoints(p)).toEqual(CONTACT_KEYS.filter((c) => c !== 'index_tip'));
    expect(remainingPoints(null)).toEqual([...CONTACT_KEYS]);
    expect(acceptedTotal(p)).toBe(4);
    expect(requiredTotal(p)).toBe(24);
    expect(requiredTotal(null)).toBe(24);
  });

  it('numbers the next sample for a point, never beyond the number needed', () => {
    const p = profile([ok('ring_tip'), ...times(3, ok('ring_base'))]);
    expect(sampleNumber(p, 'ring_tip')).toBe(2);
    expect(sampleNumber(p, 'ring_base')).toBe(3);
    expect(sampleNumber(p, 'pinky_tip')).toBe(1);
  });
});

describe('runs and prompts', () => {
  it('prompts every point in anatomical order, three accepted taps each', () => {
    let p = profile([]);
    const run = runForRemaining(p);
    expect(run).toEqual({ points: [...CONTACT_KEYS], sampleOffset: 0 });
    const prompts: ContactKey[] = [];
    for (let guard = 0; guard < 30; guard += 1) {
      const next = nextPrompt(p, run);
      if (!next) break;
      prompts.push(next);
      p = profile([...p.samples, ok(next)]);
    }
    expect(prompts).toEqual(CONTACT_KEYS.flatMap((c) => [c, c, c]));
  });

  it('does not count a wrong or too-long tap, and moves on after three misses on one point', () => {
    const run: CalibrationRun = { points: [...CONTACT_KEYS], sampleOffset: 0 };
    let p = profile([ok('index_tip'), wrong('index_tip', 'index_base'), tooLong('index_tip')]);
    expect(nextPrompt(p, run)).toBe('index_tip');
    expect(missesInRun(p, run, 'index_tip')).toBe(2);
    expect(isPointSettled(p, run, 'index_tip')).toBe(false);
    p = profile([...p.samples, wrong('index_tip', 'middle_tip')]);
    expect(missesInRun(p, run, 'index_tip')).toBe(MAX_MISSES_PER_POINT);
    expect(isPointSettled(p, run, 'index_tip')).toBe(true);
    expect(nextPrompt(p, run)).toBe('index_base');
    expect(remainingPoints(p)).toContain('index_tip');
  });

  it('gives a resumed run fresh tries and only the points still needing taps', () => {
    const earlier = [...times(3, ok('index_tip')), ...times(3, wrong('index_base', 'index_tip')), ok('middle_tip')];
    const p = profile(earlier, { status: 'incomplete' });
    const run = runForRemaining(p);
    expect(run.sampleOffset).toBe(earlier.length);
    expect(run.points).not.toContain('index_tip');
    expect(nextPrompt(p, run)).toBe('index_base');
    expect(missesInRun(p, run, 'index_base')).toBe(0);
  });

  it('ends when every point in the run is settled', () => {
    const p = profile(ALL_DONE);
    expect(nextPrompt(p, runForRemaining(p))).toBeNull();
    expect(nextPrompt(p, { points: ['ring_tip'], sampleOffset: 0 })).toBeNull();
  });

  it('reports where the last tap landed only when it missed the current prompt', () => {
    const run: CalibrationRun = { points: [...CONTACT_KEYS], sampleOffset: 0 };
    expect(misreadContact(profile([wrong('index_tip', 'index_base')]), run, 'index_tip')).toBe('index_base');
    expect(misreadContact(profile([wrong('index_tip', 'index_base'), ok('index_tip')]), run, 'index_tip')).toBeNull();
    expect(misreadContact(profile([tooLong('index_tip')]), run, 'index_tip')).toBeNull();
    expect(misreadContact(profile([wrong('index_tip', 'index_base')]), { points: run.points, sampleOffset: 1 }, 'index_tip')).toBeNull();
    expect(misreadContact(profile([]), run, 'index_tip')).toBeNull();
  });
});

describe('resumability', () => {
  const context = { hand: 'right', evidence: 'simulated' } as const;

  it('starts fresh with no profile or a complete one', () => {
    expect(resumability(null, context)).toEqual({ kind: 'fresh' });
    expect(resumability(profile(ALL_DONE, { status: 'complete' }), context)).toEqual({ kind: 'fresh' });
  });

  it('resumes an unfinished profile with the points still needing taps', () => {
    const p = profile(times(3, ok('index_tip')), { status: 'incomplete' });
    expect(resumability(p, context)).toEqual({ kind: 'resume', points: CONTACT_KEYS.slice(1) });
    expect(resumability({ ...p, status: 'in_progress' }, context).kind).toBe('resume');
  });

  it('refuses to mix hands or rings', () => {
    const p = profile([], { status: 'incomplete' });
    const otherHand = resumability(p, { ...context, hand: 'left' });
    expect(otherHand).toMatchObject({ kind: 'blocked' });
    expect(otherHand.kind === 'blocked' && otherHand.reason).toContain('right hand');
    const hardware = resumability(p, { ...context, evidence: 'measured' });
    expect(hardware.kind === 'blocked' && hardware.reason).toBe(
      'Your unfinished calibration used the simulated ring. Start again to calibrate with the connected ring.',
    );
    const demo = resumability({ ...p, evidence: 'measured' }, context);
    expect(demo.kind === 'blocked' && demo.reason).toBe(
      'Your unfinished calibration used a connected ring. Start again to calibrate in Demo Mode.',
    );
  });
});

describe('attemptFromResult', () => {
  const base = { id: 'r', at: 0 };

  it('treats commands and too-long presses as samples', () => {
    expect(attemptFromResult({ ...base, kind: 'command', token: 'confirm', contact: 'index_tip', durationMs: 120 })).toEqual({
      kind: 'sample',
      detectedContact: 'index_tip',
      durationMs: 120,
      emergencyCancelled: false,
    });
    expect(
      attemptFromResult({ ...base, kind: 'rejected', reason: 'indeterminate_duration', contact: 'ring_base', durationMs: 900 }),
    ).toEqual({ kind: 'sample', detectedContact: 'ring_base', durationMs: 900, emergencyCancelled: false });
  });

  it('counts a long press on the pinky fingertip as a too-long sample, but not an interrupted one', () => {
    expect(attemptFromResult({ ...base, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 1500 })).toEqual({
      kind: 'sample',
      detectedContact: 'pinky_tip',
      durationMs: 1500,
      emergencyCancelled: true,
    });
    expect(attemptFromResult({ ...base, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 80 })).toEqual({
      kind: 'ring_message',
    });
  });

  it('asks for a squeeze when nothing could be detected', () => {
    const asleep: RingResult = { ...base, kind: 'rejected', reason: 'not_armed', contact: 'index_tip', durationMs: null };
    const closed: RingResult = { ...base, kind: 'rejected', reason: 'window_closed', contact: null, durationMs: null };
    expect(attemptFromResult(asleep)).toEqual({ kind: 'squeeze_first' });
    expect(attemptFromResult(closed)).toEqual({ kind: 'squeeze_first' });
  });

  it('leaves emergency holds and unmeasured presses to the ring’s own words', () => {
    expect(attemptFromResult({ ...base, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 })).toEqual({ kind: 'ring_message' });
    expect(
      attemptFromResult({ ...base, kind: 'rejected', reason: 'indeterminate_duration', contact: 'ring_base', durationMs: null }),
    ).toEqual({ kind: 'ring_message' });
  });
});
