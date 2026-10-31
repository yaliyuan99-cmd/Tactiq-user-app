import { CONTACT_KEYS } from '@/domain/contacts';
import type { CalibrationSummary } from '@/domain/models';
import { calibratedOnOtherRing, calibratedForOtherHand, calibrationActionLabel, calibrationStatusText } from './calibrationStatus';

function summary(patch: Partial<CalibrationSummary> & { readonly done?: number } = {}): CalibrationSummary {
  const { done = 0, ...rest } = patch;
  const coverage = CONTACT_KEYS.map((contact, index) => ({
    contact,
    accepted: index < done ? 3 : 0,
    required: 3,
    needsRepeat: index >= done,
  }));
  return {
    status: 'not_started',
    coverage,
    pointsNeedingRepeat: coverage.filter((c) => c.needsRepeat).map((c) => c.contact),
    lastPerformedAt: null,
    evidence: null,
    deviceId: null,
    hand: null,
    ...rest,
  };
}

describe('calibrationStatusText', () => {
  it('describes each status in plain words', () => {
    expect(calibrationStatusText(summary())).toBe('Not calibrated yet');
    expect(calibrationStatusText(summary({ status: 'in_progress', done: 3 }))).toBe('In progress: 3 of 8 points done');
    expect(calibrationStatusText(summary({ status: 'complete', done: 8 }))).toBe('Complete');
    expect(calibrationStatusText(summary({ status: 'incomplete', done: 7 }))).toBe('Incomplete: 1 point needs repeating');
    expect(calibrationStatusText(summary({ status: 'incomplete', done: 5 }))).toBe('Incomplete: 3 points need repeating');
  });
});

describe('calibrationActionLabel', () => {
  it('offers to calibrate first, then to recalibrate', () => {
    expect(calibrationActionLabel('not_started')).toBe('Calibrate now');
    expect(calibrationActionLabel('in_progress')).toBe('Recalibrate');
    expect(calibrationActionLabel('complete')).toBe('Recalibrate');
    expect(calibrationActionLabel('incomplete')).toBe('Recalibrate');
  });
});

describe('calibratedForOtherHand', () => {
  it('is true only when a stored calibration names the other hand', () => {
    expect(calibratedForOtherHand(summary(), 'left')).toBe(false);
    expect(calibratedForOtherHand(summary({ hand: 'right' }), 'right')).toBe(false);
    expect(calibratedForOtherHand(summary({ hand: 'right' }), 'left')).toBe(true);
  });
});

describe('calibratedOnOtherRing', () => {
  const measured = (deviceId: string | null) => summary({ status: 'complete', evidence: 'measured', deviceId, done: 8 });

  it('flags a finished calibration recorded on a different ring', () => {
    // It still reads "Complete", which is true and misleading together: it was
    // not measured on the ring in front of you.
    expect(calibratedOnOtherRing(measured('bench-a'), 'bench-b')).toBe(true);
  });

  it('says nothing when it is the same ring', () => {
    expect(calibratedOnOtherRing(measured('bench-a'), 'bench-a')).toBe(false);
  });

  it('says nothing when no ring is connected to compare against', () => {
    expect(calibratedOnOtherRing(measured('bench-a'), null)).toBe(false);
  });

  it('never nags a Demo Mode user, whose calibration has no ring at all', () => {
    expect(calibratedOnOtherRing(summary({ status: 'complete', evidence: 'simulated', deviceId: null, done: 8 }), 'bench-b')).toBe(
      false,
    );
  });
});
