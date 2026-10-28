import { useState } from 'react';
import { FolderInput, Trash2 } from 'lucide-react';
import { Button, Callout, ConfirmDialog } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { useServices } from '@/services/ServicesProvider';
import { adoptLegacyData, detectLegacyData, discardLegacyData } from '@/services/storage/legacyMigration';

export const LEGACY_DATA_TITLE = 'Practice data saved before profiles existed';
export const LEGACY_DATA_KEPT = 'Kept in this profile.';
export const LEGACY_DATA_PARTLY_KEPT =
  'Some of it was left as it is, because this profile already has its own records of that kind or because this browser is not saving changes.';
export const LEGACY_DATA_DELETED = 'Deleted. Nothing of it is left in this browser.';

/**
 * The one decision a browser upgraded from a pre-profiles build needs.
 *
 * That build kept activity, calibration, lessons and shortcuts per browser, so
 * the app cannot tell whose they are. Nothing adopts them quietly: the choice
 * is made here, by the person signed in, and neither option can be taken
 * without them asking for it. Shows nothing when there is nothing to decide.
 */
export function LegacyDataControl() {
  const { deviceStorage } = useServices();
  const { user } = useAuth();
  const { announce } = useFeedback();
  const [report, setReport] = useState(() => detectLegacyData(deviceStorage));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  if (!report.hasData || !user) return null;

  const keep = () => {
    const result = adoptLegacyData(deviceStorage, user.id);
    const message = result.skipped.length > 0 ? `${LEGACY_DATA_KEPT} ${LEGACY_DATA_PARTLY_KEPT}` : LEGACY_DATA_KEPT;
    setReport(detectLegacyData(deviceStorage));
    setOutcome(message);
    announce(message);
  };

  const remove = () => {
    discardLegacyData(deviceStorage);
    setReport(detectLegacyData(deviceStorage));
    setConfirmingDelete(false);
    setOutcome(LEGACY_DATA_DELETED);
    announce(LEGACY_DATA_DELETED);
  };

  return (
    <div className="grid gap-3">
      <Callout kind="warning" title={LEGACY_DATA_TITLE}>
        <p className="max-w-prose">
          This browser holds practice data from before Tactiq had profiles, so there is no way to tell whose it is. Keep
          it in this profile, or delete it.
        </p>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          {report.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Callout>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" leadingIcon={<FolderInput className="h-4 w-4" />} onClick={keep}>
          Keep it in this profile
        </Button>
        <Button variant="secondary" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmingDelete(true)}>
          Delete it
        </Button>
      </div>
      {outcome && (
        <p role="status" className="max-w-prose text-sm font-medium">
          {outcome}
        </p>
      )}
      <ConfirmDialog
        open={confirmingDelete}
        destructive
        title="Delete the data saved before profiles existed?"
        description="This permanently removes those activity records, the calibration record, the lesson progress and the shortcut assignments from this browser. Your own profile's data is not touched. It cannot be undone."
        confirmLabel="Delete it"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
