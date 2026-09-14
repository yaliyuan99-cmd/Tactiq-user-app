import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import { CALIBRATION_SAMPLES_PER_CONTACT, TAP_MAX_MS } from '@/domain/timing';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { judgeCalibrationSample } from './calibrationRules';
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
    expect(judgeCalibrationSample({ contact: 'ring_tip', detectedContact: 'ring_tip', durationMs: Number.NaN })).toEqual({ accepted: false, reason: 'too_long' });
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
