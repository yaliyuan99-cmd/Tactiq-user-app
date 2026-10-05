import { EvidenceLabel, VisuallyHidden } from '@/components';
import type { HistoryEvidence } from '@/features/practice';
import { formatPercent } from '@/lib/time';
import type { RunTotals } from './lessonRun';

export interface RunStatsProps {
  readonly totals: RunTotals;
  /**
   * Where this run's attempts came from: Simulated in Demo Mode, Measured when
   * the taps arrived from a connected bench ring.
   */
  readonly evidence: HistoryEvidence;
}

function Separator() {
  return <span aria-hidden="true"> · </span>;
}

/** "Attempts: 6 · Correct: 5 · Accuracy: 83%" for the current run, labelled with where it came from. */
export function RunStats({ totals, evidence }: RunStatsProps) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="tabular-nums">
        Attempts: {totals.attempts}
        <Separator />
        Correct: {totals.correct}
        <Separator />
        Accuracy:{' '}
        {totals.accuracy === null ? (
          <>
            <span aria-hidden="true">—</span>
            <VisuallyHidden>not available until you make an attempt</VisuallyHidden>
          </>
        ) : (
          formatPercent(totals.accuracy)
        )}
      </span>
      <EvidenceLabel kind={evidence} />
    </p>
  );
}
