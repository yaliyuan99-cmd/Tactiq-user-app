import { ROUTES } from '@/app/routes';
import { Card, EvidenceLabel } from '@/components';
import type { GestureEvent } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/time';
import { useHistory } from '@/services/ServicesProvider';
import { activityLabel, activitySourceText, describeActivity, RECENT_ACTIVITY_LIMIT } from './activityWording';
import { DashboardLink } from './DashboardLink';

export interface RecentActivitySectionProps {
  readonly now: Date;
  readonly className?: string;
}

function RecordLabel({ event }: { event: GestureEvent }) {
  const label = activityLabel(event);
  if (label === 'Sample') {
    return (
      <span className="font-mono-label inline-flex rounded-sm border border-border-strong px-1.5 py-0.5 text-foreground">
        Sample
      </span>
    );
  }
  return <EvidenceLabel kind={label === 'Measured' ? 'measured' : 'simulated'} />;
}

/** "Recent activity": the newest five records, each with its time, what happened and its label. */
export function RecentActivitySection({ now, className }: RecentActivitySectionProps) {
  const events = useHistory().list({ range: 'all' }).slice(0, RECENT_ACTIVITY_LIMIT);
  const hasSamples = events.some((event) => event.seeded);

  // A card, like every other section on the dashboard: as a bare section its
  // heading and rows sat 24px further left than the cards above, with no surface.
  return (
    <Card
      heading="Recent activity"
      className={cn('min-w-0', className)}
      actions={<DashboardLink to={ROUTES.history}>View all activity</DashboardLink>}
    >
      {events.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-3">
          <span>No activity yet.</span>
          <DashboardLink to={ROUTES.simulator}>Open the simulator</DashboardLink>
        </p>
      ) : (
        <>
          {hasSamples && (
            <p className="mb-3 max-w-prose text-muted-foreground">
              Records labelled Sample are simulated examples added for Demo Mode, not your own practice.
            </p>
          )}
          {/* The card already draws a border, so the list only needs dividers between rows. */}
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{describeActivity(event)}</p>
                  <p className="text-sm text-muted-foreground">
                    <time dateTime={event.at} title={formatDateTime(event.at)}>
                      {formatRelative(event.at, now)}
                    </time>
                    <span aria-hidden="true"> · </span>
                    <span className="sr-only">, </span>
                    {activitySourceText(event)}
                  </p>
                </div>
                <RecordLabel event={event} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
