/**
 * Evidence labels. Every number, status or behaviour in the app carries one,
 * because no wearable ring exists. The only hardware is an unvalidated bench
 * prototype, so even Measured records are early bench readings.
 */
import { CALIBRATION_TAPS_TOTAL } from './timing';

export type EvidenceSource = 'simulated' | 'measured' | 'design_target' | 'design_intent' | 'not_available';

export interface EvidenceLabelInfo {
  readonly label: string;
  readonly description: string;
}

export const EVIDENCE: Readonly<Record<EvidenceSource, EvidenceLabelInfo>> = {
  simulated: {
    label: 'Simulated',
    description: 'Produced by this app or a simulator, not by a ring. Reflects practice in the simulator, not device performance.',
  },
  measured: {
    label: 'Measured',
    description:
      'Recorded from a connected Tactiq bench prototype. The prototype has not been validated, so treat these as early bench readings, not proven performance.',
  },
  design_target: {
    label: 'Design target',
    description: 'A threshold fixed before testing. Not an achieved result.',
  },
  design_intent: {
    label: 'Design intent',
    description: 'How the ring is specified to behave. Not built or felt yet.',
  },
  not_available: {
    label: 'Not yet available',
    description: 'Needs hardware that does not exist yet.',
  },
};

export interface DesignTarget {
  readonly id: string;
  readonly label: string;
  readonly target: string;
  readonly source: string;
}

/**
 * The pre-registered acceptance thresholds, quoted from the research material.
 * Only thresholds fixed before testing belong here: a firmware placeholder or a
 * forecast of a future measurement is a timing fact (see TIMING_FACTS), not a
 * design target.
 */
export const DESIGN_TARGETS: readonly DesignTarget[] = [
  {
    id: 'per_contact_accuracy',
    label: 'Per-contact accuracy',
    target: 'At least 95% per contact under guided taps',
    source: 'AUSSEF paper, hypothesis H2; research pipeline acceptance target 0.95',
  },
  {
    id: 'false_activations',
    label: 'False activations',
    target: 'At most 1 per hour of ordinary wear',
    source: 'AUSSEF paper, success criterion (iv)',
  },
  {
    id: 'calibration_time',
    label: 'Guided calibration',
    target: `About 30 seconds per user. This app’s practice routine asks for ${CALIBRATION_TAPS_TOTAL} taps and takes longer than the target.`,
    source: 'AUSSEF paper, Algorithm 2',
  },
];

/** Standard sentence for the emergency simulation — must appear verbatim whenever the hold completes. */
export const EMERGENCY_SIMULATION_NOTICE = 'Simulation only — no emergency message was sent.';
