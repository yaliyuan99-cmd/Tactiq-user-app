/**
 * Pure calibration rules: which taps count, how coverage is worked out, how
 * many samples a profile keeps, and how a stored profile is checked.
 * Calibration here is a guided practice routine; with the mock ring it is
 * simulated and says so.
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

/**
 * Why a prompted tap did not count. The first three are things a person can
 * do and are stored on the sample. 'impossible_duration' is not: it means the
 * reported press length could not have come from a press at all (negative,
 * not a number, or longer than any press), which only a faulty or hostile
 * device produces. Such a tap is refused outright rather than recorded, so it
 * can never be part of the evidence a profile shows.
 */
export type SampleProblem = NonNullable<CalibrationSample['reason']> | 'impossible_duration';

export interface SampleJudgement {
  readonly accepted: boolean;
  readonly reason?: SampleProblem;
}

/**
 * True when a reported press length could have come from a real press. There
 * is no upper bound here: a press far longer than a tap is a real thing
 * someone can do, and it is reported as 'too_long'. Only a length that cannot
 * exist — below zero, or not a number — is impossible.
 */
export function isPossiblePressDuration(durationMs: number): boolean {
  return Number.isFinite(durationMs) && durationMs >= 0;
}

/** A judgement whose sample may be stored: 'impossible_duration' is never kept. */
export function storableReason(reason: SampleProblem | undefined): CalibrationSample['reason'] {
  return reason === undefined || reason === 'impossible_duration' ? undefined : reason;
}

/**
 * Accepted only when the right contact was detected and the press was a brief
 * tap. The duration is checked for both ends: a negative or non-numeric
 * duration passes `durationMs <= TAP_MAX_MS` and must not be allowed to
 * become an accepted tap.
 */
export function judgeCalibrationSample(
  input: Pick<CalibrationSampleInput, 'contact' | 'detectedContact' | 'durationMs'>,
): SampleJudgement {
  if (input.detectedContact === null) return { accepted: false, reason: 'no_contact' };
  if (input.detectedContact !== input.contact) return { accepted: false, reason: 'wrong_contact' };
  if (!isPossiblePressDuration(input.durationMs)) return { accepted: false, reason: 'impossible_duration' };
  if (input.durationMs > TAP_MAX_MS) return { accepted: false, reason: 'too_long' };
  return { accepted: true };
}

/* ------------------------------------------------------------------ */
/* How many samples a profile keeps                                    */
/* ------------------------------------------------------------------ */

/**
 * Samples kept in a stored profile. Coverage needs only the accepted taps
 * each point requires (eight points × three taps = 24 by default); the rest
 * is recent history, so repeated runs cannot grow storage without end.
 */
export const MAX_STORED_SAMPLES = 120;

/** Never below what coverage needs, however many taps per point were asked for. */
export function sampleLimit(samplesRequiredPerContact: number, max: number = MAX_STORED_SAMPLES): number {
  return Math.max(max, samplesRequiredPerContact * CONTACT_KEYS.length);
}

/**
 * Trims a samples list to the limit, keeping chronological order.
 *
 * Coverage is counted from accepted samples, so the most recent accepted taps
 * each point still needs are kept whatever their age; everything else is kept
 * newest first until the limit is reached. Coverage, and therefore a
 * profile's completeness, is the same before and after.
 */
export function capSamples(
  samples: readonly CalibrationSample[],
  samplesRequiredPerContact: number,
  max: number = MAX_STORED_SAMPLES,
): readonly CalibrationSample[] {
  const limit = sampleLimit(samplesRequiredPerContact, max);
  if (samples.length <= limit) return samples;
  const stillNeeded = new Map<string, number>(CONTACT_KEYS.map((contact) => [contact, samplesRequiredPerContact]));
  const keep = new Set<number>();
  // Newest first: the accepted taps coverage needs are reserved before anything else.
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const sample = samples[i];
    if (!sample?.accepted) continue;
    const needed = stillNeeded.get(sample.contact) ?? 0;
    if (needed <= 0) continue;
    stillNeeded.set(sample.contact, needed - 1);
    keep.add(i);
  }
  for (let i = samples.length - 1; i >= 0 && keep.size < limit; i -= 1) {
    keep.add(i);
  }
  return samples.filter((_sample, index) => keep.has(index));
}

/* ------------------------------------------------------------------ */
/* Coverage                                                            */
/* ------------------------------------------------------------------ */

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
    deviceId: profile?.deviceId ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Checking a stored profile                                           */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSample(value: unknown): value is CalibrationSample {
  if (!isRecord(value)) return false;
  return (
    isContactKey(value.contact) &&
    typeof value.recordedAt === 'string' &&
    typeof value.durationMs === 'number' &&
    // A stored duration that could not have come from a press is a corrupt record, not evidence.
    isPossiblePressDuration(value.durationMs) &&
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
