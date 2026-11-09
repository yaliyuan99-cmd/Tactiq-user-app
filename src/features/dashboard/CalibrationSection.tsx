import { ROUTES } from '@/app/routes';
import { Card, EvidenceLabel } from '@/components';
import type { CalibrationSummary } from '@/domain/models';
import { cn } from '@/lib/cn';
import { calibrationLastPerformedText, calibrationLinkText, calibrationStatusText } from './calibrationWording';
import { DashboardLink } from './DashboardLink';

export interface CalibrationSectionProps {
  readonly summary: CalibrationSummary;
  readonly now: Date;
  readonly className?: string;
}

/** "Calibration": status in words, when it was last done, and whether it was simulated. */
export function CalibrationSection({ summary, now, className }: CalibrationSectionProps) {
  return (
    <Card
      heading="Calibration"
      className={cn('lift', className)}
      actions={<DashboardLink to={ROUTES.calibrate} stretched>{calibrationLinkText(summary)}</DashboardLink>}
    >
      <dl className="grid gap-3">
        <div>
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="text-lg font-semibold">{calibrationStatusText(summary)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Last performed</dt>
          <dd className="font-medium">{calibrationLastPerformedText(summary, now)}</dd>
        </div>
        {summary.evidence && (
          <div>
            <dt className="text-sm text-muted-foreground">Evidence</dt>
            <dd>
              <EvidenceLabel kind={summary.evidence} />
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
