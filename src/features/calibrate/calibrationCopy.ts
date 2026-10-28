/**
 * Fixed wording for the calibration screens, in one place so the views and
 * their tests say exactly the same thing.
 *
 * Calibration in this app records prompted contacts and nothing else. It does
 * not teach a ring, tune a ring or adjust a sensor, and it sends nothing to
 * firmware (domain/protocol.ts defines only PING, phone to ring), so no string
 * here may say or imply that it does.
 */
import { CONTACT_KEYS } from '@/domain/contacts';
import { CALIBRATION_SAMPLES_PER_CONTACT, COMMAND_WINDOW_MS } from '@/domain/timing';
import { MAX_MISSES_PER_POINT } from './calibrationFlow';
import type { RunRingState, StartStateKind } from './calibrationScreenState';
import { numberWord } from './calibrationWording';

export const TAPS_PER_POINT = CALIBRATION_SAMPLES_PER_CONTACT;
export const TOTAL_TAPS = TAPS_PER_POINT * CONTACT_KEYS.length;

function timesWords(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${numberWord(n)} times`;
}

/* The page's opening claim about itself. */
export const CALIBRATE_LEDE = `A rehearsal of the calibration routine. Tactiq names one of the eight contact points, you tap it, and the app records which point the tap landed on — ${numberWord(
  TAPS_PER_POINT,
)} taps on each point, ${TOTAL_TAPS} in all, about a minute.`;

export const CALIBRATE_WHAT_IT_DOES =
  'Nothing is sent to a ring, and no sensor is adjusted. The record stays on this device, where the app uses it to check its own prompts and to show you which points still need repeating.';

/* Evidence details, one per state of the ring. */
export const DEMO_EVIDENCE_DETAIL =
  'the simulated ring reports whichever point you choose, so this rehearses the workflow';
export const MEASURED_EVIDENCE_DETAIL = 'unvalidated bench prototype, this session only';
export const UNAVAILABLE_EVIDENCE_DETAIL = 'no ring is connected, so nothing can be recorded';

/* One heading per state of the start screen. */
export const START_HEADINGS: Readonly<Record<StartStateKind, string>> = {
  ring_offline: 'No ring is connected',
  ready: 'Ready to rehearse the routine',
  resume: 'Pick up where you left off',
  restart: 'This calibration cannot be continued',
};

export const RING_OFFLINE_DESCRIPTION =
  'You chose a Bluetooth bench ring and it is not connected, so no tap can reach this page. Connect the ring, or switch to Demo Mode and rehearse the routine with the simulated ring.';
export const CONNECT_RING_LABEL = 'Connect a ring';
export const SWITCH_TO_DEMO_LABEL = 'Switch to Demo Mode';
export const SWITCHED_TO_DEMO =
  'Demo Mode is on. The simulated ring is ready, and anything recorded here is labelled Simulated.';

export const RESTART_DESCRIPTION_LEAD = 'Starting again replaces the unfinished calibration.';

export const WHAT_HAPPENS_HEADING = 'What happens';
export const WHAT_HAPPENS_STEPS: readonly string[] = [
  'We name a point and say how to find it.',
  `You tap it ${timesWords(TAPS_PER_POINT)}.`,
  `We record which point the tap landed on and move to the next point. If a point has not registered after ${numberWord(
    MAX_MISSES_PER_POINT,
  )} tries, we move on and mark it to repeat.`,
  'You can pause or stop at any time. Your taps are kept.',
];

/* One sentence per state of the ring during a run. */
export const RUN_RING_SENTENCES: Readonly<Record<RunRingState, string>> = {
  window_managed:
    'During calibration the command window opens for you, and it opens again whenever it closes, so there is no time limit.',
  ring_ready: `Squeeze, then tap. The bench ring closes its window after ${
    COMMAND_WINDOW_MS / 1000
  } seconds; if that happens, squeeze again. Calibration itself has no time limit.`,
  ring_offline:
    'The ring is no longer connected, so no tap can arrive. Pause to keep the taps you have, or stop and come back once the ring is connected.',
};

export const RUN_RING_OFFLINE_TITLE = 'The ring disconnected';

/* Results. */
export const RESULTS_WHAT_WAS_RECORDED =
  'What this records: which point each prompted tap landed on, kept on this device. It does not change how a ring senses your touch.';
