import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { RingResult } from '@/features/practice';
import * as calibrationCopy from './calibrationCopy';
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
  type ResumeContext,
} from './calibrationFlow';
import { startFreshLabel, startState } from './calibrationScreenState';
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
  /** Demo Mode: the simulated ring has no device id. */
  const demo: ResumeContext = { hand: 'right', evidence: 'simulated', deviceId: null };
  /** A connected bench ring, which does. */
  const ringA: ResumeContext = { hand: 'right', evidence: 'measured', deviceId: 'ring_a' };

  it('starts fresh with no profile, a complete one or one never begun', () => {
    expect(resumability(null, demo)).toEqual({ kind: 'fresh' });
    expect(resumability(profile(ALL_DONE, { status: 'complete' }), demo)).toEqual({ kind: 'fresh' });
    expect(resumability(profile([], { status: 'not_started' }), demo)).toEqual({ kind: 'fresh' });
  });

  it('resumes an unfinished profile with the points still needing taps', () => {
    const p = profile(times(3, ok('index_tip')), { status: 'incomplete' });
    expect(resumability(p, demo)).toEqual({ kind: 'resume', points: CONTACT_KEYS.slice(1) });
    expect(resumability({ ...p, status: 'in_progress' }, demo).kind).toBe('resume');
  });

  it('resumes a measured profile when the same ring is connected again', () => {
    const p = profile(times(3, ok('index_tip')), { status: 'incomplete', evidence: 'measured', deviceId: 'ring_a' });
    expect(resumability(p, ringA)).toEqual({ kind: 'resume', points: CONTACT_KEYS.slice(1) });
  });

  it('refuses to mix hands', () => {
    const p = profile([], { status: 'incomplete' });
    const otherHand = resumability(p, { ...demo, hand: 'left' });
    expect(otherHand).toEqual({
      kind: 'blocked',
      reason:
        'Your unfinished calibration is for your right hand, but Tactiq is now set to your left hand. Start again to record this hand.',
    });
  });

  it('refuses to mix a simulated ring with a connected one', () => {
    const p = profile([], { status: 'incomplete' });
    const hardware = resumability(p, ringA);
    expect(hardware.kind === 'blocked' && hardware.reason).toBe(
      'Your unfinished calibration used the simulated ring, so its taps cannot be added to taps from the connected ring. Start again to record with the connected ring.',
    );
    const toDemo = resumability({ ...p, evidence: 'measured', deviceId: 'ring_a' }, demo);
    expect(toDemo.kind === 'blocked' && toDemo.reason).toBe(
      'Your unfinished calibration used a connected ring, so its taps cannot be added to taps from the simulated ring. Start again to record in Demo Mode.',
    );
  });

  it('refuses a resume when the ring connected now is a different ring', () => {
    const p = profile(times(3, ok('index_tip')), { status: 'incomplete', evidence: 'measured', deviceId: 'ring_a' });
    const otherRing = resumability(p, { ...ringA, deviceId: 'ring_b' });
    expect(otherRing.kind === 'blocked' && otherRing.reason).toBe(
      'Your unfinished calibration came from a different ring. One calibration cannot hold taps from two rings and still say which ring they came from, so start again to record with the ring connected now.',
    );
  });

  it('refuses a resume when the unfinished taps do not say which ring recorded them', () => {
    const p = profile(times(3, ok('index_tip')), { status: 'incomplete', evidence: 'measured', deviceId: null });
    const unknownRing = resumability(p, ringA);
    expect(unknownRing.kind === 'blocked' && unknownRing.reason).toBe(
      'Your unfinished calibration did not record which ring it came from, so its taps cannot be added to taps from the ring connected now. Start again to record with this ring.',
    );
  });

  it('turns every refusal into one screen that offers to start again', () => {
    const unfinished = profile(times(3, ok('index_tip')), { status: 'incomplete', evidence: 'measured', deviceId: 'ring_a' });
    const refusals: readonly ResumeContext[] = [
      { ...ringA, hand: 'left' },
      { ...ringA, deviceId: 'ring_b' },
      demo,
    ];
    for (const context of refusals) {
      const refused = resumability(unfinished, context);
      expect(refused.kind).toBe('blocked');
      if (refused.kind !== 'blocked') continue;
      // The words name a way on, so the screen is never a dead end.
      expect(refused.reason).toMatch(/start again/i);
      expect(startState({ resumable: refused, ringOffline: false })).toEqual({ kind: 'restart', reason: refused.reason });
    }
    // The button says what starting again costs: the stored taps.
    expect(startFreshLabel(unfinished)).toBe('Start again');
    expect(startFreshLabel(null)).toBe('Start calibration');
    // A ring that cannot send anything is the one state that outranks the refusal.
    expect(startState({ resumable: resumability(unfinished, demo), ringOffline: true })).toEqual({ kind: 'ring_offline' });
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

/** Every string the calibration screens show, whatever shape the module holds it in. */
function strings(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item: unknown) => strings(item));
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap((item: unknown) => strings(item));
  return [];
}

describe('what the calibration copy claims', () => {
  const all = strings(calibrationCopy);

  it('says calibration records prompted taps, and says what it does not do', () => {
    expect(all.length).toBeGreaterThan(10);
    expect(calibrationCopy.CALIBRATE_LEDE).toContain('records which point the tap landed on');
    expect(calibrationCopy.CALIBRATE_WHAT_IT_DOES).toContain('Nothing is sent to a ring');
    expect(calibrationCopy.CALIBRATE_WHAT_IT_DOES).toContain('no sensor is adjusted');
    expect(calibrationCopy.RESULTS_WHAT_WAS_RECORDED).toContain('does not change how a ring senses your touch');
  });

  it('never claims the taps teach, train or tune the ring', () => {
    for (const text of all) {
      expect(text).not.toMatch(/\b(teach|teaches|teaching|taught|tune|tunes|tuning|tuned)\b/i);
      expect(text).not.toMatch(/train(s|ing)? (the|a|your) ring/i);
      expect(text).not.toMatch(/(improve|increase)[sd]? (the )?(accuracy|recognition)/i);
      expect(text).not.toMatch(/adjusts? (the|a|your) (ring|sensor)/i);
    }
  });
});
