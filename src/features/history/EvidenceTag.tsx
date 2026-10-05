import { EvidenceLabel } from '@/components';
import { cn } from '@/lib/cn';
import { BENCH_DETAIL, type EvidenceInView } from './evidenceInView';

export interface EvidenceTagProps {
  readonly evidence: EvidenceInView;
  /** True when every record in view is a Demo Mode sample. */
  readonly allSamples?: boolean;
  readonly className?: string;
}

/** The chip used for sample records, matching the Label column. */
function SampleTag({ className }: { readonly className?: string }) {
  return (
    <span
      className={cn(
        'font-mono-label inline-flex rounded-sm border border-border-strong px-1.5 py-0.5 align-middle text-foreground',
        className,
      )}
      data-evidence="sample"
    >
      Sample
    </span>
  );
}

/**
 * The evidence tag for the figures in view, derived from the records themselves
 * so it always agrees with the labels on the rows below.
 */
export function EvidenceTag({ evidence, allSamples = false, className }: EvidenceTagProps) {
  if (allSamples) return <SampleTag className={className} />;
  if (evidence === 'measured') return <EvidenceLabel kind="measured" detail={BENCH_DETAIL} className={className} />;
  if (evidence === 'mixed') {
    return <EvidenceLabel kind="simulated" detail="includes some Measured ring records" className={className} />;
  }
  return <EvidenceLabel kind="simulated" className={className} />;
}
