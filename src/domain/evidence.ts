/**
 * Evidence labels. Every number, status or behaviour in the app carries one,
 * because no wearable ring exists and nothing has been physically measured.
 */

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
    description: 'Recorded from physical hardware. Nothing currently holds this status.',
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

/** The pre-registered acceptance thresholds, quoted from the research material. */
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
    target: 'About 30 seconds per user',
    source: 'AUSSEF paper, Algorithm 2',
  },
  {
    id: 'gate_hold',
    label: 'Squeeze hold before the window opens',
    target: '150 ms placeholder now; expected to settle between 200 and 350 ms after bench measurement',
    source: 'AUSSEF paper §6.9; bench firmware GATE_TAU_MS',
  },
];

/** Standard sentence for the emergency simulation — must appear verbatim whenever the hold completes. */
export const EMERGENCY_SIMULATION_NOTICE = 'Simulation only — no emergency message was sent.';
