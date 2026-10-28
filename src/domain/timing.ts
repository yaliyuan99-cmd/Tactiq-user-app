/**
 * Timing constants. Each value names where it comes from. None of them has
 * been measured on a wearable — every one is a design value from the bench
 * firmware, the research grammar or the paper.
 */
import { CONTACT_KEYS } from './contacts';

/** A press up to this long is a brief tap. `grammar.py` TAP_MAX_MS; firmware TAP_MAX_MS. */
export const TAP_MAX_MS = 500;

/** A hold on the pinky fingertip this long is Emergency. `grammar.py` EMERGENCY_MIN_MS; Table 3. */
export const EMERGENCY_HOLD_MS = 5000;

/** The paper (Algorithm 3) specifies a distinct arming haptic two seconds into the hold. */
export const EMERGENCY_ARMING_CUE_MS = 2000;

/**
 * Squeeze held this long before the command window opens. Firmware
 * GATE_TAU_MS — a placeholder pending the bench sweep, which is expected to
 * settle it between 200 and 350 ms. That range is a forecast, not a
 * measurement and not a threshold fixed before testing.
 *
 * The value is a research constant and is not tuned to make the interface
 * feel better. A tap inside this window is still dropped; the app's answer is
 * to report the phase honestly ("still opening the command window") rather
 * than to shorten the wait — see the `activating` phase in RingStateMachine.
 */
export const GATE_HOLD_MS = 150;

/** How long the command window stays open after a squeeze. Firmware ARM_WINDOW_MS. */
export const COMMAND_WINDOW_MS = 3000;

/** The window when "Longer interaction time" is switched on in this app. App preference, not firmware. */
export const COMMAND_WINDOW_LONG_MS = 6000;

/** Presses between a tap and a full emergency hold are dropped, never guessed (principle P7). */
export const INDETERMINATE_MIN_MS = TAP_MAX_MS + 1;

/** Number of taps the research calibration tool asks for per contact (`calibrate.py --reps`). */
export const CALIBRATION_SAMPLES_PER_CONTACT = 3;

/** Taps the app's guided calibration asks for in all: every contact, three times. */
export const CALIBRATION_TAPS_TOTAL = CALIBRATION_SAMPLES_PER_CONTACT * CONTACT_KEYS.length;

export interface TimingFact {
  readonly id: string;
  readonly label: string;
  readonly valueMs: number;
  readonly source: string;
  readonly status: 'design_value' | 'placeholder';
}

export const TIMING_FACTS: readonly TimingFact[] = [
  {
    id: 'tap_max',
    label: 'Longest press that counts as a tap',
    valueMs: TAP_MAX_MS,
    source: 'Research grammar (grammar.py) and bench firmware',
    status: 'design_value',
  },
  {
    id: 'emergency_hold',
    label: 'Emergency hold',
    valueMs: EMERGENCY_HOLD_MS,
    source: 'AUSSEF paper Table 3; research grammar',
    status: 'design_value',
  },
  {
    id: 'emergency_arming',
    label: 'Emergency arming cue',
    valueMs: EMERGENCY_ARMING_CUE_MS,
    source: 'AUSSEF paper, Algorithm 3',
    status: 'design_value',
  },
  {
    id: 'gate_hold',
    label: 'Squeeze hold before the window opens',
    valueMs: GATE_HOLD_MS,
    source:
      'Bench firmware GATE_TAU_MS — placeholder until the bench sweep measures it. Expected to settle between 200 and 350 ms; expected, not measured.',
    status: 'placeholder',
  },
  {
    id: 'command_window',
    label: 'Command window after a squeeze',
    valueMs: COMMAND_WINDOW_MS,
    source: 'Bench firmware ARM_WINDOW_MS',
    status: 'design_value',
  },
];

export function formatMs(ms: number): string {
  if (ms >= 1000) {
    const s = ms / 1000;
    return `${Number.isInteger(s) ? s : s.toFixed(1)} s`;
  }
  return `${ms} ms`;
}
