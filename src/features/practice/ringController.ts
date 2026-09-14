/** The contract of `useRing`: what a practice screen reads and the inputs it can drive. */
import type { ContactKey } from '@/domain/contacts';
import type { DeviceMode } from '@/services/device/types';
import type { RingResult } from './ringResults';

export interface UseRingOptions {
  /** Announce (and vibrate for) gate changes, results and the arming cue. Default true. */
  readonly announce?: boolean;
  /** Every result, as it happens: commands, dropped presses, emergency holds. */
  readonly onResult?: (result: RingResult) => void;
  /** The command window opened (true) or closed (false). Transitions only, not refreshes. */
  readonly onGate?: (armed: boolean) => void;
}

export interface RingController {
  readonly mode: DeviceMode;
  readonly isDemo: boolean;
  /** The simulated ring is present, so squeeze and press inputs do something. */
  readonly canOperate: boolean;
  /** Commands can reach the app: Demo Mode, or a connected hardware ring. */
  readonly canReceive: boolean;
  readonly armed: boolean;
  /** Date.now() timestamp the window closes at (an estimate for a hardware ring). */
  readonly closesAt: number | null;
  readonly windowMs: number;
  /** Time left in the window, updated every 100 ms while open; null when closed. */
  readonly remainingMs: number | null;
  /** The contact being pressed on the simulated ring. */
  readonly pressingContact: ContactKey | null;
  /** 0..1 progress of a hold on the pinky fingertip, or null. */
  readonly holdProgress: number | null;
  /** The two-second arming cue has been reached in the current hold. */
  readonly holdArmed: boolean;
  readonly lastResult: RingResult | null;
  /** The contact of the last recognised command, for 700 ms. Always null when visual confirmation is off. */
  readonly flashContact: ContactKey | null;
  readonly squeeze: () => void;
  readonly pressStart: (contact: ContactKey) => void;
  readonly pressEnd: (contact: ContactKey) => void;
  readonly cancel: () => void;
  readonly closeWindow: () => void;
}
