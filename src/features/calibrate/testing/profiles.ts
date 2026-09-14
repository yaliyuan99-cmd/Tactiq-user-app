/** Calibration profile fixtures for the pure-logic tests. */
import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, CalibrationSample } from '@/domain/models';

const AT = '2026-09-15T04:30:00.000Z';

export function ok(contact: ContactKey): CalibrationSample {
  return { contact, recordedAt: AT, durationMs: 180, detectedContact: contact, accepted: true };
}

export function wrong(contact: ContactKey, detected: ContactKey): CalibrationSample {
  return { contact, recordedAt: AT, durationMs: 180, detectedContact: detected, accepted: false, reason: 'wrong_contact' };
}

export function tooLong(contact: ContactKey): CalibrationSample {
  return { contact, recordedAt: AT, durationMs: 1200, detectedContact: contact, accepted: false, reason: 'too_long' };
}

export function profile(samples: CalibrationSample[], patch: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return {
    id: 'cal_test',
    hand: 'right',
    status: 'in_progress',
    startedAt: AT,
    completedAt: null,
    samplesRequiredPerContact: 3,
    samples,
    evidence: 'simulated',
    deviceId: null,
    ...patch,
  };
}

export function times(n: number, sample: CalibrationSample): CalibrationSample[] {
  return Array.from({ length: n }, () => sample);
}

export const ALL_DONE = CONTACT_KEYS.flatMap((contact) => times(3, ok(contact)));
