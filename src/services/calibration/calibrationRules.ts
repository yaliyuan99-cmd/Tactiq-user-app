/**
 * Pure calibration rules: which taps count, how coverage is worked out, and
 * how a stored profile is checked. Calibration here is a guided practice
 * routine; with the mock ring it is simulated and says so.
 */
import { CONTACT_KEYS, isContactKey } from '@/domain/contacts';
import type {
  CalibrationCoverage,
  CalibrationProfile,
  CalibrationSample,
  CalibrationStatus,
  CalibrationSummary,
} from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT, TAP_MAX_MS } from '@/domain/timing';
import type { CalibrationSampleInput } from './types';

const STATUSES: readonly CalibrationStatus[] = ['not_started', 'in_progress', 'complete', 'incomplete'];

export interface SampleJudgement {
  readonly accepted: boolean;
  readonly reason?: CalibrationSample['reason'];
}

/** Accepted only when the right contact was detected and the press was a brief tap. */
export function judgeCalibrationSample(input: Pick<CalibrationSampleInput, 'contact' | 'detectedContact' | 'durationMs'>): SampleJudgement {
  if (input.detectedContact === null) return { accepted: false, reason: 'no_contact' };
  if (input.detectedContact !== input.contact) return { accepted: false, reason: 'wrong_contact' };
  if (!(input.durationMs <= TAP_MAX_MS)) return { accepted: false, reason: 'too_long' };
  return { accepted: true };
}

export function calibrationCoverage(profile: CalibrationProfile | null): CalibrationCoverage[] {
  const required = profile?.samplesRequiredPerContact ?? CALIBRATION_SAMPLES_PER_CONTACT;
  return CONTACT_KEYS.map((contact) => {
    const accepted = profile ? profile.samples.filter((s) => s.contact === contact && s.accepted).length : 0;
    return { contact, accepted, required, needsRepeat: accepted < required };
  });
}

export function summariseCalibration(profile: CalibrationProfile | null): CalibrationSummary {
  const coverage = calibrationCoverage(profile);
  return {
    status: profile?.status ?? 'not_started',
    coverage,
    pointsNeedingRepeat: coverage.filter((c) => c.needsRepeat).map((c) => c.contact),
    lastPerformedAt: profile ? (profile.completedAt ?? profile.startedAt) : null,
    evidence: profile?.evidence ?? null,
    hand: profile?.hand ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSample(value: unknown): value is CalibrationSample {
  if (!isRecord(value)) return false;
  return (
    isContactKey(value.contact) &&
    typeof value.recordedAt === 'string' &&
    typeof value.durationMs === 'number' &&
    (value.detectedContact === null || isContactKey(value.detectedContact)) &&
    typeof value.accepted === 'boolean' &&
    (value.reason === undefined ||
      value.reason === 'wrong_contact' ||
      value.reason === 'too_long' ||
      value.reason === 'no_contact')
  );
}

export function isCalibrationProfile(value: unknown): value is CalibrationProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    (value.hand === 'left' || value.hand === 'right') &&
    typeof value.status === 'string' &&
    (STATUSES as readonly string[]).includes(value.status) &&
    typeof value.startedAt === 'string' &&
    (value.completedAt === null || typeof value.completedAt === 'string') &&
    typeof value.samplesRequiredPerContact === 'number' &&
    Number.isInteger(value.samplesRequiredPerContact) &&
    value.samplesRequiredPerContact >= 1 &&
    Array.isArray(value.samples) &&
    value.samples.every(isSample) &&
    (value.evidence === 'simulated' || value.evidence === 'measured') &&
    (value.deviceId === null || typeof value.deviceId === 'string')
  );
}
