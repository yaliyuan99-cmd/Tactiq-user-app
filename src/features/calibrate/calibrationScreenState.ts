/**
 * The calibration screen as an explicit state machine, so every state has one
 * true description and one next action. Pure: no React, no services.
 *
 * Before this existed the start screen could show two contradictory things at
 * once — "no ring is connected" beside "start again to record with the
 * connected ring" — and a hardware user with no ring had nowhere to go from
 * the page. Each state below is exclusive, and each one names what the user
 * can do next.
 */
import type { ContactKey } from '@/domain/contacts';
import type { CalibrationProfile } from '@/domain/models';
import type { Resumability } from './calibrationFlow';

export type StartStateKind = 'ring_offline' | 'ready' | 'resume' | 'restart';

export type StartState =
  /**
   * A Bluetooth ring is chosen and not reachable, so no tap can arrive here.
   * Nothing is said about the stored profile in this state: what to do with it
   * cannot be known until a ring is back.
   */
  | { readonly kind: 'ring_offline' }
  /** Nothing to continue: a fresh run over all eight points. */
  | { readonly kind: 'ready' }
  /** An unfinished run this hand and this ring can carry on. */
  | { readonly kind: 'resume'; readonly points: readonly ContactKey[] }
  /** An unfinished run that cannot be carried on. `reason` says why, in plain words. */
  | { readonly kind: 'restart'; readonly reason: string };

export interface StartStateInput {
  readonly resumable: Resumability;
  /** True when a Bluetooth ring is chosen but cannot send anything (not connected). */
  readonly ringOffline: boolean;
}

/** Exactly one state for the screen before a run. */
export function startState({ resumable, ringOffline }: StartStateInput): StartState {
  if (ringOffline) return { kind: 'ring_offline' };
  if (resumable.kind === 'blocked') return { kind: 'restart', reason: resumable.reason };
  if (resumable.kind === 'resume') return { kind: 'resume', points: resumable.points };
  return { kind: 'ready' };
}

/**
 * The primary action's words. 'Start again' whenever a new run replaces taps
 * that are already stored, so the button never looks like a first run.
 */
export function startFreshLabel(profile: CalibrationProfile | null): string {
  return replacesStoredTaps(profile) ? 'Start again' : 'Start calibration';
}

/** True when starting a new run would discard an unfinished profile's taps. */
export function replacesStoredTaps(profile: CalibrationProfile | null): boolean {
  return profile !== null && profile.status !== 'complete' && profile.samples.length > 0;
}

export type RunRingState =
  /** Demo Mode: the page holds the command window open, so there is no time limit. */
  | 'window_managed'
  /** A connected ring: the user squeezes it, and it closes its own window. */
  | 'ring_ready'
  /** The ring went away mid-run. No tap can arrive, so the only moves are pause and stop. */
  | 'ring_offline';

export interface RunRingStateInput {
  readonly isDemo: boolean;
  /** RingController.canReceive: Demo Mode, or a connected ring. */
  readonly canReceive: boolean;
}

/** Exactly one state for the ring while a run is showing. */
export function runRingState({ isDemo, canReceive }: RunRingStateInput): RunRingState {
  if (isDemo) return 'window_managed';
  return canReceive ? 'ring_ready' : 'ring_offline';
}

export type EvidenceView = 'simulated' | 'measured' | 'unavailable';

/**
 * What the page may claim about its own records. With a Bluetooth ring chosen
 * and nothing connected it may claim neither: a "Measured" label there would
 * promise readings that cannot arrive.
 */
export function evidenceView({ isDemo, canReceive }: RunRingStateInput): EvidenceView {
  if (isDemo) return 'simulated';
  return canReceive ? 'measured' : 'unavailable';
}
