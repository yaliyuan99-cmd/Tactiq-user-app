import { useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Callout, ConfirmDialog, EvidenceLabel } from '@/components';
import { formatRelative } from '@/lib/time';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCalibration } from '@/services/ServicesProvider';
import { SettingsSection } from '../SettingsSection';
import { calibratedForOtherHand, calibrationActionLabel, calibrationStatusText } from '../calibrationStatus';
import { HAND_LABELS } from '../settingsOptions';
import { useHeadingFocusRequest } from '../useHeadingFocusRequest';

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <dt className="font-mono-label min-w-32 text-muted-foreground">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function CalibrationSection() {
  const calibration = useCalibration();
  const { preferences } = usePreferences();
  const { announce } = useFeedback();
  const [confirming, setConfirming] = useState(false);
  const focusHeading = useHeadingFocusRequest('calibration');
  const summary = calibration.summary();
  const hasProfile = summary.status !== 'not_started';

  // The intro says what is recorded, not what the ring is told. Nothing but
  // PING is ever written to a ring, so "teach the ring where your contact
  // points are" was a claim the protocol cannot support — in Demo Mode or with
  // a bench prototype connected, which is why the old wording's "simulated
  // ring" hedge did not save it.
  return (
    <SettingsSection
      id="calibration"
      intro="Calibration records which of your eight contact points each prompted tap landed on, and keeps that record on this device. Nothing is sent to a ring and no sensor is adjusted."
    >
      <dl className="grid gap-2">
        <DetailRow term="Status">{calibrationStatusText(summary)}</DetailRow>
        {summary.lastPerformedAt && (
          <DetailRow term="Last performed">
            <time dateTime={summary.lastPerformedAt}>{formatRelative(summary.lastPerformedAt)}</time>
          </DetailRow>
        )}
        {summary.hand && <DetailRow term="Hand">{HAND_LABELS[summary.hand]} hand</DetailRow>}
        {summary.evidence && (
          <DetailRow term="Evidence">
            <EvidenceLabel kind={summary.evidence} />
          </DetailRow>
        )}
      </dl>

      {calibratedForOtherHand(summary, preferences.hand) && summary.hand && (
        <Callout kind="warning">
          This calibration was made for your {HAND_LABELS[summary.hand].toLowerCase()} hand, but Settings is set to your{' '}
          {HAND_LABELS[preferences.hand].toLowerCase()} hand. Recalibrate so the points match.
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <ButtonLink to={ROUTES.calibrate} variant={hasProfile ? 'secondary' : 'primary'}>
          {calibrationActionLabel(summary.status)}
        </ButtonLink>
        {hasProfile && (
          <Button variant="ghost" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirming(true)}>
            Delete calibration
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        destructive
        title="Delete calibration?"
        description="This removes your calibration from this browser. You can calibrate again at any time."
        confirmLabel="Delete calibration"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          calibration.reset();
          announce('Calibration deleted.');
          focusHeading();
        }}
      />
    </SettingsSection>
  );
}
