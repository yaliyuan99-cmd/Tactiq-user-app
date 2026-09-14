import { type ReactNode } from 'react';
import { EvidenceLabel, ProgressBar } from '@/components';
import { getContact } from '@/domain/contacts';
import type { CalibrationProfile } from '@/domain/models';
import { formatDateTime } from '@/lib/time';
import { CalibrationPanel } from './CalibrationPanel';
import { acceptedTotal, remainingPoints, requiredTotal } from './calibrationFlow';
import { joinWithAnd, progressText } from './calibrationWording';

export const LAST_CALIBRATION_HEADING_ID = 'calibrate-last-heading';

function statusWords(profile: CalibrationProfile): string {
  if (profile.status === 'complete') return 'Complete';
  return profile.completedAt ? 'Incomplete' : 'Paused';
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** The stored profile in words: progress, status, points to repeat, hand, when, and its evidence label. */
export function LastCalibrationPanel({ profile }: { profile: CalibrationProfile }) {
  const remaining = remainingPoints(profile);
  const when = profile.completedAt ?? profile.startedAt;
  return (
    <CalibrationPanel
      headingId={LAST_CALIBRATION_HEADING_ID}
      heading="Last calibration"
      aside={<EvidenceLabel kind={profile.evidence} />}
    >
      <ProgressBar
        label="Calibration progress"
        value={acceptedTotal(profile)}
        max={requiredTotal(profile)}
        valueText={progressText(profile)}
        className="mb-5"
      />
      <dl className="grid gap-3">
        <Row term="Status">{statusWords(profile)}</Row>
        <Row term="Points to repeat">
          {remaining.length === 0 ? 'None' : joinWithAnd(remaining.map((contact) => getContact(contact).label))}
        </Row>
        <Row term="Hand">{profile.hand === 'left' ? 'Left hand' : 'Right hand'}</Row>
        <Row term={profile.completedAt ? 'Last performed' : 'Started'}>
          <time dateTime={when}>{formatDateTime(when)}</time>
        </Row>
      </dl>
      {profile.status === 'complete' && (
        <p className="mt-4 text-sm text-muted-foreground">Starting calibration again replaces this one.</p>
      )}
    </CalibrationPanel>
  );
}
