/**
 * /dashboard/calibrate — guided calibration for all eight contact points.
 *
 * Start → a run of prompts (three accepted taps per point) → results. Pause
 * returns to the start screen with Resume; Stop keeps the taps and leaves.
 * With the simulated ring this practises the routine; nothing is tuned.
 */
import { EvidenceLabel, PageHeader } from '@/components';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';
import { usePageTitle } from '@/lib/usePageTitle';
import { numberWord } from './calibrationWording';
import { ResultsView } from './ResultsView';
import { RunningView } from './RunningView';
import { StartView } from './StartView';
import { useCalibrationSession } from './useCalibrationSession';

export const DEMO_EVIDENCE_DETAIL =
  'the simulated ring always detects the point you choose, so this practises the routine rather than tuning a sensor';

export default function CalibratePage() {
  usePageTitle('Calibrate');
  const session = useCalibrationSession();
  const taps = numberWord(CALIBRATION_SAMPLES_PER_CONTACT);

  return (
    <>
      <PageHeader
        title="Calibrate"
        lede={
          <>
            <p>
              Teach Tactiq how you touch each point. It takes about a minute: {taps} taps on each of the eight points.
            </p>
            <p className="mt-2">
              {session.ring.isDemo ? (
                <EvidenceLabel kind="simulated" detail={DEMO_EVIDENCE_DETAIL} />
              ) : (
                <EvidenceLabel kind="measured" detail="bench prototype" />
              )}
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
