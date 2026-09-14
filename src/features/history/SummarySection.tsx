import { type ReactNode } from 'react';
import { EvidenceLabel } from '@/components';
import { getCommand } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { ActivitySummary } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/time';
import { HISTORY_HEADING_IDS } from './historyIds';
import { plural, type EmergencyCounts } from './wording';

export interface SummarySectionProps {
  readonly summary: ActivitySummary;
  readonly emergency: EmergencyCounts;
}

function SummaryItem({
  term,
  value,
  explanation,
  className,
}: {
  term: string;
  value: ReactNode;
  explanation: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card p-4 sm:p-5', className)}>
      <dt className="font-medium">{term}</dt>
      <dd className="mt-1 text-3xl font-semibold leading-tight tabular-nums">{value}</dd>
      <dd className="mt-1.5 text-sm text-muted-foreground">{explanation}</dd>
    </div>
  );
}

/** The evidence tag for the figures in view: simulated unless ring records are included. */
export function SummaryEvidence({ evidence }: { evidence: ActivitySummary['evidence'] }) {
  if (evidence === 'measured') return <EvidenceLabel kind="measured" />;
  if (evidence === 'mixed') return <EvidenceLabel kind="simulated" detail="includes some Measured ring records" />;
  return <EvidenceLabel kind="simulated" />;
}

export function SummarySection({ summary, emergency }: SummarySectionProps) {
  const { attempts, successes, misclassifications, rejected, mostPractised } = summary;
  return (
    <section aria-labelledby={HISTORY_HEADING_IDS.summary}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={HISTORY_HEADING_IDS.summary} tabIndex={-1}>
          Summary
        </h2>
        <SummaryEvidence evidence={summary.evidence} />
      </div>
      <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-2 lg:grid-cols-3">
        <SummaryItem
          term="Attempts"
          value={attempts}
          explanation="Taps and presses scored in this view. Emergency holds are counted separately."
        />
        <SummaryItem
          term="Successful detections"
          value={successes}
          explanation={
            attempts > 0
              ? `Recognised as the command you aimed for: ${successes} of ${attempts} (${formatPercent(successes / attempts)}).`
              : 'Recognised as the command you aimed for.'
          }
        />
        <SummaryItem
          term="Misclassifications"
          value={misclassifications}
          explanation="Recognised as a different command from the one asked for."
        />
        <SummaryItem
          term="Rejected presses"
          value={rejected}
          explanation="Dropped because the press was too long for a tap, or the command window had closed. Never guessed."
        />
        <SummaryItem
          term="Most-practised command"
          value={mostPractised ? getCommand(mostPractised.token).label : 'None yet'}
          explanation={
            mostPractised
              ? `${plural(mostPractised.count, 'attempt')} in this view.`
              : 'The command you practise most will appear here.'
          }
          className="sm:col-span-2"
        />
        <div className="bg-card p-4 sm:col-span-2 sm:p-5 lg:col-span-3">
          <dt className="font-medium">Emergency simulations</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {emergency.completed} completed, {emergency.cancelled} cancelled
          </dd>
          <dd className="mt-1.5 text-sm text-muted-foreground">
            Five-second holds on the pinky fingertip, counted apart from attempts.
          </dd>
          <dd className="mt-1 text-sm font-medium">{EMERGENCY_SIMULATION_NOTICE}</dd>
        </div>
      </dl>
    </section>
  );
}
