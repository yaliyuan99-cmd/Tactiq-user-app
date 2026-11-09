/**
 * /dashboard/calibrate — the calibration routine for all eight contact points.
 *
 * Start → a run of prompts (three accepted taps per point) → results. Pause
 * returns to the start screen with Resume; Stop keeps the taps and leaves.
 *
 * What it does: it names a point, records which point the tap landed on, and
 * repeats. It does not teach or tune a ring, and it sends nothing to firmware
 * — domain/protocol.ts defines only PING, phone to ring.
 */
import { EvidenceLabel, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  CALIBRATE_LEDE,
  CALIBRATE_WHAT_IT_DOES,
  DEMO_EVIDENCE_DETAIL,
  MEASURED_EVIDENCE_DETAIL,
  UNAVAILABLE_EVIDENCE_DETAIL,
} from './calibrationCopy';
import { evidenceView } from './calibrationScreenState';
import { ResultsView } from './ResultsView';
import { RunningView } from './RunningView';
import { StartView } from './StartView';
import { useCalibrationSession } from './useCalibrationSession';

const EVIDENCE_LABELS = {
  simulated: { kind: 'simulated', detail: DEMO_EVIDENCE_DETAIL },
  measured: { kind: 'measured', detail: MEASURED_EVIDENCE_DETAIL },
  unavailable: { kind: 'not_available', detail: UNAVAILABLE_EVIDENCE_DETAIL },
} as const;

export default function CalibratePage() {
  usePageTitle('Calibrate');
  const session = useCalibrationSession();
  const evidence = EVIDENCE_LABELS[evidenceView({ isDemo: session.ring.isDemo, canReceive: session.ring.canReceive })];

  return (
    <>
      <PageHeader
        title="Calibrate"
        lede={
          <>
            {/* Read once, before starting. During a run the prompt and the hand need the room. */}
            {session.phase === 'start' && (
              <>
                <p>{CALIBRATE_LEDE}</p>
                <p className="mt-2">{CALIBRATE_WHAT_IT_DOES}</p>
              </>
            )}
            <p className={session.phase === 'start' ? 'mt-2' : undefined}>
              <EvidenceLabel kind={evidence.kind} detail={evidence.detail} />
            </p>
          </>
        }
      />
      {session.phase === 'start' && <StartView session={session} />}
      {session.phase === 'running' && <RunningView session={session} />}
      {session.phase === 'results' && <ResultsView session={session} />}
    </>
  );
}
