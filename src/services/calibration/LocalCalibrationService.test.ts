import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { CalibrationSample } from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT, TAP_MAX_MS } from '@/domain/timing';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import {
  MAX_STORED_SAMPLES,
  calibrationCoverage,
  capSamples,
  judgeCalibrationSample,
  sampleLimit,
} from './calibrationRules';
import { LocalCalibrationService } from './LocalCalibrationService';

const NOW = new Date('2026-09-15T04:30:00.000Z');

describe('judgeCalibrationSample', () => {
  it('accepts the right contact at or under the tap limit', () => {
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: TAP_MAX_MS })).toEqual({ accepted: true });
  });

  it('gives a reason for each rejection', () => {
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: null, durationMs: 200 })).toEqual({ accepted: false, reason: 'no_contact' });
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_base', durationMs: 200 })).toEqual({ accepted: false, reason: 'wrong_contact' });
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: TAP_MAX_MS + 1 })).toEqual({ accepted: false, reason: 'too_long' });
  });

  it('accepts a tap of no measurable length and the tap limit exactly', () => {
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: 0 })).toEqual({ accepted: true });
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: TAP_MAX_MS })).toEqual({ accepted: true });
  });

  it.each([
    ['negative', -1],
    ['far below zero', -5000],
    ['not a number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['negatively infinite', Number.NEGATIVE_INFINITY],
  ])('refuses a %s duration with its own reason, never as an accepted tap', (_label, durationMs) => {
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs })).toEqual({
      accepted: false,
      reason: 'impossible_duration',
    });
  });

  it('calls a press far longer than a tap too long, which is something a person can do', () => {
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: 120_000 })).toEqual({
      accepted: false,
      reason: 'too_long',
    });
  });
});

describe('capSamples', () => {
  const sample = (contact: ContactKey, accepted: boolean, recordedAt: string): CalibrationSample => ({
    contact,
    recordedAt,
    durationMs: 200,
    detectedContact: accepted ? contact : null,
    accepted,
    ...(accepted ? {} : { reason: 'no_contact' as const }),
  });

  it('leaves a list within the limit untouched', () => {
    const samples = [sample('index_tip', true, '1'), sample('index_tip', false, '2')];
    expect(capSamples(samples, 3)).toBe(samples);
  });

  it('keeps the limit, the newest samples and chronological order', () => {
    const samples = Array.from({ length: MAX_STORED_SAMPLES + 50 }, (_unused, i) => sample('index_tip', false, String(i)));
    const capped = capSamples(samples, 3);
    expect(capped).toHaveLength(MAX_STORED_SAMPLES);
    expect(capped[0]?.recordedAt).toBe('50');
    expect(capped.at(-1)?.recordedAt).toBe(String(MAX_STORED_SAMPLES + 49));
  });

  it('keeps coverage exactly right, however old the accepted taps are', () => {
    const accepted = CONTACT_KEYS.flatMap((contact) =>
      Array.from({ length: 3 }, (_unused, i) => sample(contact, true, `old-${contact}-${i}`)),
    );
    const misses = Array.from({ length: 200 }, (_unused, i) => sample('index_tip', false, `miss-${i}`));
    const samples = [...accepted, ...misses];
    const before = calibrationCoverage(profileWith(samples, 3));
    const capped = capSamples(samples, 3);
    expect(capped).toHaveLength(MAX_STORED_SAMPLES);
    expect(calibrationCoverage(profileWith(capped, 3))).toEqual(before);
    expect(capped.filter((s) => s.accepted)).toHaveLength(24);
  });

  it('never trims below what coverage needs, however many taps per point were asked for', () => {
    expect(sampleLimit(3)).toBe(MAX_STORED_SAMPLES);
    expect(sampleLimit(50)).toBe(400);
    const accepted = CONTACT_KEYS.flatMap((contact) =>
      Array.from({ length: 50 }, (_unused, i) => sample(contact, true, `${contact}-${i}`)),
    );
    expect(capSamples(accepted, 50)).toHaveLength(400);
  });
});

describe('LocalCalibrationService', () => {
  let storage: MemoryStorageAdapter;
  let calibration: LocalCalibrationService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    storage = new MemoryStorageAdapter();
    calibration = new LocalCalibrationService(storage);
  });

  afterEach(() => {
    calibration.dispose();
    vi.useRealTimers();
  });

  function tapAll(times: number, skip: readonly ContactKey[] = []): void {
    for (const contact of CONTACT_KEYS) {
      if (skip.includes(contact)) continue;
      for (let i = 0; i < times; i += 1) {
        calibration.recordSample({ contact, detectedContact: contact, durationMs: 220 });
      }
    }
  }

  it('summarises an empty state before anything starts', () => {
    expect(calibration.get()).toBeNull();
    const summary = calibration.summary();
    expect(summary.status).toBe('not_started');
    expect(summary.coverage).toHaveLength(8);
    expect(summary.coverage.map((c) => c.contact)).toEqual([...CONTACT_KEYS]);
    expect(summary.coverage.every((c) => c.accepted === 0 && c.required === CALIBRATION_SAMPLES_PER_CONTACT && c.needsRepeat)).toBe(true);
    expect(summary.pointsNeedingRepeat).toEqual([...CONTACT_KEYS]);
    expect(summary).toMatchObject({ lastPerformedAt: null, evidence: null, hand: null });
  });

  it('starts a simulated profile with defaults and persists it', () => {
    const profile = calibration.start({ hand: 'left' });
    expect(profile).toMatchObject({
      hand: 'left',
      status: 'in_progress',
      startedAt: NOW.toISOString(),
      completedAt: null,
      samplesRequiredPerContact: CALIBRATION_SAMPLES_PER_CONTACT,
      samples: [],
      evidence: 'simulated',
      deviceId: null,
    });
    expect(profile.id).toMatch(/^cal_/);
    expect(storage.get(STORAGE_KEYS.calibration)).toEqual(profile);
    expect(calibration.lastWriteSucceeded()).toBe(true);
  });

  it('accepts custom options and replaces an existing profile', () => {
    const first = calibration.start({ hand: 'right' });
    const second = calibration.start({ hand: 'left', samplesPerContact: 1, deviceId: 'ring-1', evidence: 'measured' });
    expect(second.id).not.toBe(first.id);
    expect(calibration.get()).toMatchObject({ samplesRequiredPerContact: 1, deviceId: 'ring-1', evidence: 'measured' });
  });

  it('refuses an invalid number of taps per contact', () => {
    expect(() => calibration.start({ hand: 'right', samplesPerContact: 0 })).toThrow('whole number');
    expect(() => calibration.start({ hand: 'right', samplesPerContact: 1.5 })).toThrow('whole number');
  });

  it('throws when recording without a profile in progress', () => {
    expect(() => calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 })).toThrow(
      'Start calibration before recording taps.',
    );
    calibration.start({ hand: 'right', samplesPerContact: 1 });
    tapAll(1);
    calibration.complete();
    expect(() => calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 })).toThrow();
  });

  it('records accepted and rejected samples with reasons', () => {
    calibration.start({ hand: 'right' });
    const ok = calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 180, at: '2026-09-15T04:31:00.000Z' });
    expect(ok.accepted).toBe(true);
    expect(ok.reason).toBeUndefined();
    expect(ok.profile.samples[0]).toEqual({
      contact: 'index_tip',
      recordedAt: '2026-09-15T04:31:00.000Z',
      durationMs: 180,
      detectedContact: 'index_tip',
      accepted: true,
    });
    const wrong = calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_base', durationMs: 180 });
    expect(wrong).toMatchObject({ accepted: false, reason: 'wrong_contact' });
    expect(wrong.profile.samples[1]).toMatchObject({ recordedAt: NOW.toISOString(), reason: 'wrong_contact' });
    expect(calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 900 })).toMatchObject({ accepted: false, reason: 'too_long' });
    expect(calibration.recordSample({ contact: 'index_tip', detectedContact: null, durationMs: 100 })).toMatchObject({ accepted: false, reason: 'no_contact' });
    const summary = calibration.summary();
    expect(summary.coverage[0]).toEqual({ contact: 'index_tip', accepted: 1, required: 3, needsRepeat: true });
  });

  it('completes when every contact has enough accepted taps', () => {
    calibration.start({ hand: 'right' });
    tapAll(CALIBRATION_SAMPLES_PER_CONTACT);
    vi.setSystemTime(new Date(NOW.getTime() + 30_000));
    const done = calibration.complete();
    expect(done.status).toBe('complete');
    expect(done.completedAt).toBe(new Date(NOW.getTime() + 30_000).toISOString());
    const summary = calibration.summary();
    expect(summary.status).toBe('complete');
    expect(summary.pointsNeedingRepeat).toEqual([]);
    expect(summary.lastPerformedAt).toBe(done.completedAt);
    expect(summary).toMatchObject({ evidence: 'simulated', hand: 'right' });
  });

  it('is incomplete when any contact falls short, and can be resumed to fill the gap', () => {
    calibration.start({ hand: 'right' });
    tapAll(CALIBRATION_SAMPLES_PER_CONTACT, ['pinky_base']);
    calibration.recordSample({ contact: 'pinky_base', detectedContact: 'pinky_tip', durationMs: 200 });
    expect(calibration.complete().status).toBe('incomplete');
    expect(calibration.summary().pointsNeedingRepeat).toEqual(['pinky_base']);

    const resumed = calibration.recordSample({ contact: 'pinky_base', detectedContact: 'pinky_base', durationMs: 200 });
    expect(resumed.profile.status).toBe('in_progress');
    calibration.recordSample({ contact: 'pinky_base', detectedContact: 'pinky_base', durationMs: 200 });
    calibration.recordSample({ contact: 'pinky_base', detectedContact: 'pinky_base', durationMs: 200 });
    expect(calibration.complete().status).toBe('complete');
  });

  it('throws when completing with no profile', () => {
    expect(() => calibration.complete()).toThrow('There is no calibration to finish.');
  });

  it('pauses an in-progress profile as incomplete and leaves others alone', () => {
    expect(calibration.pause()).toBeNull();
    calibration.start({ hand: 'right' });
    const paused = calibration.pause();
    expect(paused?.status).toBe('incomplete');
    expect(paused?.completedAt).toBeNull();
    expect(calibration.summary().lastPerformedAt).toBe(NOW.toISOString());
    calibration.start({ hand: 'right', samplesPerContact: 1 });
    tapAll(1);
    calibration.complete();
    expect(calibration.pause()?.status).toBe('complete');
  });

  it('resets by removing the stored profile', () => {
    calibration.start({ hand: 'right' });
    calibration.reset();
    expect(calibration.get()).toBeNull();
    expect(storage.get(STORAGE_KEYS.calibration)).toBeNull();
    expect(calibration.summary().status).toBe('not_started');
  });

  it('ignores a malformed stored profile', () => {
    storage.set(STORAGE_KEYS.calibration, { id: 'x', hand: 'both' });
    expect(calibration.get()).toBeNull();
  });

  it('ignores a stored profile carrying a sample whose duration could not have happened', () => {
    const profile = calibration.start({ hand: 'right' });
    calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 });
    const stored = calibration.get();
    storage.set(STORAGE_KEYS.calibration, {
      ...profile,
      samples: [{ ...stored?.samples[0], durationMs: -200 }],
    });
    expect(calibration.get()).toBeNull();
  });

  it('refuses a tap whose reported length is impossible instead of recording it', () => {
    calibration.start({ hand: 'right' });
    calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 });
    const refused = calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: -1 });
    expect(refused.accepted).toBe(false);
    expect(refused.reason).toBeUndefined();
    // Not stored at all: an impossible length is not evidence of anything.
    expect(refused.profile.samples).toHaveLength(1);
    expect(calibration.get()?.samples).toHaveLength(1);
    expect(calibration.summary().coverage[0]).toMatchObject({ contact: 'index_tip', accepted: 1 });
    expect(calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: Number.NaN }).accepted).toBe(
      false,
    );
    expect(calibration.get()?.samples).toHaveLength(1);
  });

  it('caps the stored samples when a run ends, keeping coverage and completeness', () => {
    calibration.start({ hand: 'right' });
    tapAll(CALIBRATION_SAMPLES_PER_CONTACT);
    // Many more misses than the cap, as repeated runs on one point would make.
    for (let i = 0; i < MAX_STORED_SAMPLES + 40; i += 1) {
      calibration.recordSample({ contact: 'index_tip', detectedContact: null, durationMs: 200 });
    }
    const beforeCap = calibration.get()?.samples.length ?? 0;
    expect(beforeCap).toBeGreaterThan(MAX_STORED_SAMPLES);
    const done = calibration.complete();
    expect(done.status).toBe('complete');
    expect(done.samples).toHaveLength(MAX_STORED_SAMPLES);
    expect(calibration.summary().pointsNeedingRepeat).toEqual([]);
    expect(calibration.summary().coverage.every((c) => c.accepted >= CALIBRATION_SAMPLES_PER_CONTACT)).toBe(true);
    const stored = storage.get<{ samples: unknown[] }>(STORAGE_KEYS.calibration);
    expect(stored?.samples).toHaveLength(MAX_STORED_SAMPLES);
  });

  it('caps the stored samples when a run is paused', () => {
    calibration.start({ hand: 'right' });
    tapAll(CALIBRATION_SAMPLES_PER_CONTACT);
    for (let i = 0; i < MAX_STORED_SAMPLES; i += 1) {
      calibration.recordSample({ contact: 'middle_tip', detectedContact: null, durationMs: 200 });
    }
    expect(calibration.pause()?.samples).toHaveLength(MAX_STORED_SAMPLES);
  });

  it('trims a stored list that is already over the cap when it is loaded', () => {
    const profile = calibration.start({ hand: 'right' });
    const samples = Array.from({ length: 1000 }, (_unused, i) => ({
      contact: 'index_tip' as const,
      recordedAt: `2026-09-15T04:3${i % 10}:00.000Z`,
      durationMs: 200,
      detectedContact: 'index_tip' as const,
      accepted: true,
    }));
    storage.set(STORAGE_KEYS.calibration, { ...profile, samples });
    expect(calibration.get()?.samples).toHaveLength(MAX_STORED_SAMPLES);
  });

  it('holds a hard cap even if taps keep arriving without the run ending', () => {
    calibration.start({ hand: 'right' });
    for (let i = 0; i < 1000; i += 1) {
      calibration.recordSample({ contact: 'index_tip', detectedContact: null, durationMs: 200 });
    }
    const samples = calibration.get()?.samples ?? [];
    expect(samples.length).toBeLessThanOrEqual(MAX_STORED_SAMPLES + 80);
    expect(samples.length).toBeGreaterThan(MAX_STORED_SAMPLES);
  });

  it('notifies on its own changes and on outside changes to its key', () => {
    const listener = vi.fn();
    const unsubscribe = calibration.subscribe(listener);
    const profile = calibration.start({ hand: 'right' });
    calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 });
    calibration.pause();
    calibration.reset();
    expect(listener).toHaveBeenCalledTimes(4);
    storage.set(STORAGE_KEYS.calibration, { ...profile, hand: 'left' });
    expect(listener).toHaveBeenCalledTimes(5);
    expect(calibration.get()?.hand).toBe('left');
    storage.set(STORAGE_KEYS.history, []);
    expect(listener).toHaveBeenCalledTimes(5);
    unsubscribe();
    calibration.reset();
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it('keeps working in memory when storage refuses writes', () => {
    vi.spyOn(storage, 'set').mockReturnValue(false);
    calibration.start({ hand: 'right' });
    expect(calibration.lastWriteSucceeded()).toBe(false);
    expect(calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: 200 }).accepted).toBe(true);
  });
});

function profileWith(samples: readonly CalibrationSample[], samplesRequiredPerContact: number) {
  return {
    id: 'cal_test',
    hand: 'right' as const,
    status: 'in_progress' as const,
    startedAt: NOW.toISOString(),
    completedAt: null,
    samplesRequiredPerContact,
    samples,
    evidence: 'simulated' as const,
    deviceId: null,
  };
}
