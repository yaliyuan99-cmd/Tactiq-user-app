import { useState } from 'react';
import { Button, Callout, ConfirmDialog, EvidenceLabel } from '@/components';
import { plural } from './wording';

export interface EvidenceBannerProps {
  /** Sample records anywhere in history (not only in the current filter). */
  readonly sampleCount: number;
  readonly onRemoveSamples: () => void;
}

export const SAMPLE_RECORDS_NOTICE =
  'Includes sample records created for Demo Mode so this page is not empty. They are marked Sample.';

/** States where every figure comes from, and offers to remove Demo Mode samples. */
export function EvidenceBanner({ sampleCount, onRemoveSamples }: EvidenceBannerProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <EvidenceLabel kind="simulated" />
        <span className="text-sm text-muted-foreground">Every figure here comes from practice in this app.</span>
      </p>
      {sampleCount > 0 && (
        <Callout kind="info">
          <p>{SAMPLE_RECORDS_NOTICE}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setConfirming(true)}>
            Remove sample records
          </Button>
        </Callout>
      )}
      <ConfirmDialog
        open={confirming}
        title="Remove sample records?"
        description={`This deletes the ${plural(sampleCount, 'sample record')} created for Demo Mode. Your own practice stays.`}
        confirmLabel="Remove samples"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onRemoveSamples();
        }}
      />
    </div>
  );
}
