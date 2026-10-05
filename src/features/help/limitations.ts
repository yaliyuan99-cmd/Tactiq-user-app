/**
 * What Tactiq can and cannot do yet, stated plainly. Every sentence is either
 * a present fact or phrased as design intent.
 */
import type { EvidenceSource } from '@/domain/evidence';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';

export interface Limitation {
  readonly id: string;
  /** The limitation in one short sentence. */
  readonly title: string;
  readonly detail: string;
  /** Fixed wording the app uses, quoted verbatim. */
  readonly quote?: string;
  /** A sentence after the quote. */
  readonly after?: string;
  readonly evidence?: EvidenceSource;
}

export const LIMITATIONS: readonly Limitation[] = [
  {
    id: 'no-ring',
    title: 'No finished wearable ring exists.',
    detail: 'Tactiq is designed around a ring that has not been built yet. Everything in this app works without one.',
  },
  {
    id: 'bench-firmware',
    title: 'The bench firmware has never run on a finished ring.',
    detail:
      'The firmware runs on an unvalidated bench prototype, which this app can connect to over Bluetooth. No wearable ring exists to run it on.',
  },
  {
    id: 'not-validated',
    title: 'No physical performance has been validated.',
    detail:
      'There are no measured results for accuracy, false activations, comfort, range or battery life, and no participant data exists.',
  },
  {
    id: 'simulated',
    title: 'No result in this app shows how a finished ring would perform.',
    detail:
      'Scores, activity and calibration come either from the simulated ring, labelled Simulated, or from an unvalidated bench prototype, labelled Measured. Both show how you practised on what exists today, not how a finished ring performs.',
    evidence: 'simulated',
  },
  {
    id: 'design-targets',
    title: 'Design targets are not achievements.',
    detail:
      'They are thresholds fixed before any testing, so that future results can be judged against them. None has been tested.',
    evidence: 'design_target',
  },
  {
    id: 'battery',
    title: 'The app never shows a ring battery level.',
    detail: 'The bench build has no battery gauge. Wherever a battery level would appear, the app says:',
    quote: BATTERY_UNAVAILABLE_NOTE,
  },
  {
    id: 'phone-dependent',
    title: 'Shortcuts and Undo depend on the phone.',
    detail:
      'Undo only works where the app in use allows it, and shortcuts would rely on the phone’s own automation. Neither is guaranteed.',
  },
  {
    id: 'emergency',
    title: 'The Emergency command in this app never contacts anyone.',
    detail: 'Whenever an emergency hold completes, the app shows and announces:',
    quote: EMERGENCY_SIMULATION_NOTICE,
    after:
      'On a phone, the command is designed to hand over to the platform’s own emergency pathway, and that handover is not guaranteed either. In an emergency, contact your local emergency number directly.',
  },
  {
    id: 'iphone',
    title: 'An iPhone route would be limited.',
    detail:
      'iOS offers no accessibility API to third-party apps. The design intent is for an iPhone to see the ring as a Bluetooth keyboard, which would carry the fixed commands only.',
    evidence: 'design_intent',
  },
];
