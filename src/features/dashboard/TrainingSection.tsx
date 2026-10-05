import { type ReactNode } from 'react';
import { ROUTES } from '@/app/routes';
import { Card, EvidenceLabel, ProgressBar, VisuallyHidden } from '@/components';
import { COMMAND_TOKENS } from '@/domain/commands';
import type { TrainingSummary } from '@/domain/models';
import { formatPercent } from '@/lib/time';
import { useHistory } from '@/services/ServicesProvider';
import { DashboardLink } from './DashboardLink';
import { trainingEvidenceNote } from './trainingEvidence';

export interface TrainingSectionProps {
  readonly summary: TrainingSummary;
  readonly className?: string;
}

function Stat({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-l-2 border-border-strong pl-3">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="text-xl font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** "Training": lessons completed, attempts, accuracy in simulated lessons, and commands learnt. */
export function TrainingSection({ summary, className }: TrainingSectionProps) {
  const note = trainingEvidenceNote(useHistory().summarise({ range: 'all', source: 'training' }).evidence);
  return (
    <Card heading="Training" className={className} actions={<DashboardLink to={ROUTES.train}>All lessons</DashboardLink>}>
      <div className="grid gap-4">
        <ProgressBar label="Lessons completed" value={summary.lessonsCompleted} max={summary.lessonsTotal} />
        <dl className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
          <Stat term="Attempts">{summary.attempts}</Stat>
          <Stat term="Accuracy">
            {summary.accuracy === null ? (
              <>
                <span aria-hidden="true">—</span>
                <VisuallyHidden>Not available until you make an attempt</VisuallyHidden>
              </>
            ) : (
              formatPercent(summary.accuracy)
            )}
          </Stat>
          <Stat term="Commands learnt">
            {summary.commandsLearnt.length} of {COMMAND_TOKENS.length}
          </Stat>
        </dl>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <EvidenceLabel kind={note.kind} />
          <span>{note.text}</span>
        </p>
      </div>
    </Card>
  );
}
