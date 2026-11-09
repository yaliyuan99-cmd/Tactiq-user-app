import { useState } from 'react';
import { Button, Callout, ConfirmDialog } from '@/components';
import { evidenceSentence, type EvidenceInView } from './evidenceInView';
import { EvidenceTag } from './EvidenceTag';
import { plural } from './wording';

export interface EvidenceBannerProps {
  /** The evidence of the records in view, from the summary. */
  readonly evidence: EvidenceInView;
  /** True when every record in view is a Demo Mode sample. */
  readonly allSamples: boolean;
  /** Sample records anywhere in history (not only in the current filter). */
  readonly sampleCount: number;
  readonly onRemoveSamples: () => void;
}

export const SAMPLE_RECORDS_NOTICE =
  'Includes sample records created for Demo Mode so this page is not empty. They are marked Sample.';

/**
 * States where the figures in view came from, and offers to remove Demo Mode
 * samples. The tag is derived from the records on screen, never assumed: with a
 * bench ring connected these records are Measured.
 */
export function EvidenceBanner({ evidence, allSamples, sampleCount, onRemoveSamples }: EvidenceBannerProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <EvidenceTag evidence={evidence} allSamples={allSamples} />
        <span className="text-sm text-muted-foreground">{evidenceSentence(evidence, allSamples)}</span>
      </p>
      {sampleCount > 0 && (
        <Callout kind="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 basis-64">{SAMPLE_RECORDS_NOTICE}</p>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
              Remove sample records
            </Button>
          </div>
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
