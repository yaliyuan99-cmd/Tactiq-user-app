import { useEffect, useRef } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, EvidenceLabel } from '@/components';
import { getContact } from '@/domain/contacts';
import { formatDateTime } from '@/lib/time';
import { useCalibration } from '@/services/ServicesProvider';
import { CalibrationPanel } from './CalibrationPanel';
import { RESULTS_WHAT_WAS_RECORDED } from './calibrationCopy';
import { remainingPoints } from './calibrationFlow';
import { evidenceSentence, resultsHeading, resultsSentence } from './calibrationWording';
import { PointCoverage } from './PointCoverage';
import { SamplesTable } from './SamplesTable';
import type { CalibrationSession } from './calibrationSessionTypes';

export const RESULTS_HEADING_ID = 'calibrate-results-heading';

/**
 * After a run: complete or incomplete, what to repeat, when, what was in fact
 * recorded, what the evidence label means, and where to go next. "Complete"
 * here means every point has its accepted taps — never that a ring has been
 * adjusted.
 */
export function ResultsView({ session }: { session: CalibrationSession }) {
  const calibration = useCalibration();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { profile } = session;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (!profile) return null;

  const complete = profile.status === 'complete';
  const toRepeat = remainingPoints(profile);
  const when = profile.completedAt ?? profile.startedAt;

  return (
    <div className="grid grid-cols-1 gap-6">
      <CalibrationPanel
        ref={headingRef}
        headingId={RESULTS_HEADING_ID}
        heading={resultsHeading(complete)}
        aside={<EvidenceLabel kind={profile.evidence} />}
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className={
                complete
                  ? 'settle-in grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'
                  : 'settle-in grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-status-target text-status-target'
              }
            >
              {complete ? <Check className="h-7 w-7" /> : <CircleAlert className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="text-lg text-pretty">{resultsSentence(profile)}</p>
              <p className="mt-1 text-muted-foreground">
                Last performed <time dateTime={when}>{formatDateTime(when)}</time>
              </p>
            </div>
          </div>
          <PointCoverage profile={profile} hand={profile.hand} />
        </div>

        {toRepeat.length > 0 && (
          <div className="mt-5 rounded-lg bg-muted p-4">
            <h3>Points to repeat</h3>
            <ul className="mt-2 grid list-disc gap-1 pl-6">
              {toRepeat.map((contact) => (
                <li key={contact}>{getContact(contact).label}</li>
              ))}
            </ul>
            <Button className="mt-4" onClick={session.repeatPoints}>
              Repeat these points
            </Button>
          </div>
        )}

        <p className="mt-5 max-w-prose text-pretty">{RESULTS_WHAT_WAS_RECORDED}</p>
        <p className="mt-2 max-w-prose text-pretty text-muted-foreground">{evidenceSentence(profile.evidence)}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to={ROUTES.simulator} variant={complete ? 'primary' : 'secondary'}>
            Practise in the simulator
          </ButtonLink>
          <ButtonLink to={ROUTES.dashboard} variant="secondary">
            Back to the dashboard
          </ButtonLink>
        </div>
      </CalibrationPanel>

      <SamplesTable coverage={calibration.summary().coverage} />
    </div>
  );
}
