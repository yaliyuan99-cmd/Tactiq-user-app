/**
 * Calibration rules, as pure functions: which point to prompt next, what is
 * left, whether a stored profile can be continued, and what a ring result
 * means for the prompted point. Words live in calibrationWording.ts and the
 * screen's states in calibrationScreenState.ts.
 *
 * Calibration here records prompted contacts and nothing else: it does not
 * adjust a ring, and nothing is sent to firmware.
 *
 * A run is one pass over some points (all eight, the points still needing
 * taps when resuming, or the points marked to repeat). Samples recorded
 * before the run started stay in the profile and still count towards each
 * point's accepted taps; only misses are counted per run, so a resumed or
 * repeated point always gets a fresh set of tries.
 */
import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, CalibrationSample, Hand } from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT, TAP_MAX_MS } from '@/domain/timing';
import type { RingResult } from '@/features/practice';

/** Taps that do not count on one point before the run moves on and marks the point to repeat. */
export const MAX_MISSES_PER_POINT = 3;

export interface CalibrationRun {
  /** The points this run covers, in anatomical order. */
  readonly points: readonly ContactKey[];
  /** Index into `profile.samples` where this run began. */
  readonly sampleOffset: number;
}

export function requiredPerPoint(profile: CalibrationProfile | null): number {
  return profile?.samplesRequiredPerContact ?? CALIBRATION_SAMPLES_PER_CONTACT;
}

export function acceptedFor(profile: CalibrationProfile | null, contact: ContactKey): number {
  if (!profile) return 0;
  return profile.samples.filter((s) => s.contact === contact && s.accepted).length;
}

/** Points with fewer accepted taps than required, in anatomical order. */
export function remainingPoints(profile: CalibrationProfile | null): ContactKey[] {
  const required = requiredPerPoint(profile);
  return CONTACT_KEYS.filter((contact) => acceptedFor(profile, contact) < required);
}

/** Accepted taps that count towards the total (extra taps on a finished point do not). */
export function acceptedTotal(profile: CalibrationProfile | null): number {
  const required = requiredPerPoint(profile);
  return CONTACT_KEYS.reduce((sum, contact) => sum + Math.min(acceptedFor(profile, contact), required), 0);
}

export function requiredTotal(profile: CalibrationProfile | null): number {
  return requiredPerPoint(profile) * CONTACT_KEYS.length;
}

/** A run over every point that still needs taps, starting after the samples already recorded. */
export function runForRemaining(profile: CalibrationProfile): CalibrationRun {
  return { points: remainingPoints(profile), sampleOffset: profile.samples.length };
}

function runSamples(profile: CalibrationProfile, run: CalibrationRun): readonly CalibrationSample[] {
  return profile.samples.slice(run.sampleOffset);
}

/** Taps on this point during the run that did not count. */
export function missesInRun(profile: CalibrationProfile, run: CalibrationRun, contact: ContactKey): number {
  return runSamples(profile, run).filter((s) => s.contact === contact && !s.accepted).length;
}

/** True when the point has enough accepted taps, or has used up its tries in this run. */
export function isPointSettled(profile: CalibrationProfile, run: CalibrationRun, contact: ContactKey): boolean {
  return (
    acceptedFor(profile, contact) >= requiredPerPoint(profile) || missesInRun(profile, run, contact) >= MAX_MISSES_PER_POINT
  );
}

/** The point to prompt now, or null when the run is over. */
export function nextPrompt(profile: CalibrationProfile, run: CalibrationRun): ContactKey | null {
  return run.points.find((contact) => !isPointSettled(profile, run, contact)) ?? null;
}

/** "Sample 2 of 3": the number of the tap the point is waiting for. */
export function sampleNumber(profile: CalibrationProfile, contact: ContactKey): number {
  return Math.min(acceptedFor(profile, contact) + 1, requiredPerPoint(profile));
}

/** Where the last tap for this prompt landed, when it landed on a different point. */
export function misreadContact(profile: CalibrationProfile, run: CalibrationRun, prompt: ContactKey): ContactKey | null {
  const samples = runSamples(profile, run);
  const last = samples[samples.length - 1];
  if (!last || last.contact !== prompt || last.reason !== 'wrong_contact') return null;
  return last.detectedContact;
}

/* ------------------------------------------------------------------ */
/* Resuming                                                             */
/* ------------------------------------------------------------------ */

export type Resumability =
  | { readonly kind: 'fresh' }
  | { readonly kind: 'resume'; readonly points: readonly ContactKey[] }
  | { readonly kind: 'blocked'; readonly reason: string };

export interface ResumeContext {
  readonly hand: Hand;
  readonly evidence: 'simulated' | 'measured';
  /** The ring recording now: a connected ring's device id, or null in Demo Mode. */
  readonly deviceId: string | null;
}

/**
 * Whether the stored profile can be continued. A finished profile starts
 * fresh. A profile for the other hand, for the other kind of ring, or
 * recorded by a different ring cannot be continued: one profile must not hold
 * taps from two rings and still carry one evidence label, so the only way on
 * is a new profile.
 */
export function resumability(profile: CalibrationProfile | null, context: ResumeContext): Resumability {
  if (!profile || profile.status === 'complete' || profile.status === 'not_started') return { kind: 'fresh' };
  if (profile.hand !== context.hand) {
    return {
      kind: 'blocked',
      reason: `Your unfinished calibration is for your ${profile.hand} hand, but Tactiq is now set to your ${context.hand} hand. Start again to record this hand.`,
    };
  }
  if (profile.evidence !== context.evidence) {
    return {
      kind: 'blocked',
      reason:
        profile.evidence === 'simulated'
          ? 'Your unfinished calibration used the simulated ring, so its taps cannot be added to taps from the connected ring. Start again to record with the connected ring.'
          : 'Your unfinished calibration used a connected ring, so its taps cannot be added to taps from the simulated ring. Start again to record in Demo Mode.',
    };
  }
  const recordedBy = profile.deviceId ?? null;
  if (recordedBy !== context.deviceId) {
    return {
      kind: 'blocked',
      reason:
        recordedBy === null
          ? 'Your unfinished calibration did not record which ring it came from, so its taps cannot be added to taps from the ring connected now. Start again to record with this ring.'
          : 'Your unfinished calibration came from a different ring. One calibration cannot hold taps from two rings and still say which ring they came from, so start again to record with the ring connected now.',
    };
  }
  return { kind: 'resume', points: remainingPoints(profile) };
}

/* ------------------------------------------------------------------ */
/* Turning ring results into calibration attempts                       */
/* ------------------------------------------------------------------ */

export type CalibrationAttempt =
  /** A tap or press that is judged against the prompt and recorded. */
  | {
      readonly kind: 'sample';
      readonly detectedContact: ContactKey;
      readonly durationMs: number;
      /** The press was on the emergency point and ended before five seconds. */
      readonly emergencyCancelled: boolean;
    }
  /** Nothing was detected because the command window was closed. Not a sample. */
  | { readonly kind: 'squeeze_first' }
  /** Not a calibration tap (for example a completed emergency hold): say what the ring did instead. */
  | { readonly kind: 'ring_message' };

export function attemptFromResult(result: RingResult): CalibrationAttempt {
  switch (result.kind) {
    case 'command':
      return { kind: 'sample', detectedContact: result.contact, durationMs: result.durationMs, emergencyCancelled: false };
    case 'emergency_cancelled':
      // A press on the pinky fingertip longer than a tap is cancelled as an emergency hold; for calibration it was too long.
      return result.elapsedMs > TAP_MAX_MS
        ? { kind: 'sample', detectedContact: result.contact, durationMs: result.elapsedMs, emergencyCancelled: true }
        : { kind: 'ring_message' };
    case 'emergency':
      return { kind: 'ring_message' };
    case 'rejected':
      if (result.reason === 'not_armed' || result.reason === 'window_closed' || result.contact === null) {
        return { kind: 'squeeze_first' };
      }
      if (result.reason === 'indeterminate_duration' && result.durationMs !== null) {
        return { kind: 'sample', detectedContact: result.contact, durationMs: result.durationMs, emergencyCancelled: false };
      }
      return { kind: 'ring_message' };
  }
}
