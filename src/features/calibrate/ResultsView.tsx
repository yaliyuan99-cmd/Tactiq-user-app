import { useEffect, useRef } from 'react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, EvidenceLabel } from '@/components';
import { getContact } from '@/domain/contacts';
import { formatDateTime } from '@/lib/time';
import { useCalibration } from '@/services/ServicesProvider';
import { CalibrationPanel } from './CalibrationPanel';
import { remainingPoints } from './calibrationFlow';
import { evidenceSentence, resultsHeading, resultsSentence } from './calibrationWording';
import { SamplesTable } from './SamplesTable';
import type { CalibrationSession } from './calibrationSessionTypes';

export const RESULTS_HEADING_ID = 'calibrate-results-heading';

/** After a run: complete or incomplete, what to repeat, when, what the evidence means, and where to go next. */
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
        <p className="text-lg">{resultsSentence(profile)}</p>
        <p className="mt-1 text-muted-foreground">
          Last performed <time dateTime={when}>{formatDateTime(when)}</time>
        </p>

        {toRepeat.length > 0 && (
          <div className="mt-5 rounded-md border border-border bg-background p-4">
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

        <p className="mt-5">{evidenceSentence(profile.evidence)}</p>

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
