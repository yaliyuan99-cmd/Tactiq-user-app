import { EvidenceLabel, VisuallyHidden } from '@/components';
import { formatPercent } from '@/lib/time';
import type { RunTotals } from './lessonRun';

export interface RunStatsProps {
  readonly totals: RunTotals;
}

function Separator() {
  return <span aria-hidden="true"> · </span>;
}

/** "Attempts: 6 · Correct: 5 · Accuracy: 83%" for the current run, labelled Simulated. */
export function RunStats({ totals }: RunStatsProps) {
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
      <EvidenceLabel kind="simulated" />
    </p>
  );
}
