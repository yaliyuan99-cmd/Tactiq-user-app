import { useId } from 'react';
import { ROUTES } from '@/app/routes';
import { EvidenceLabel } from '@/components';
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
  const headingId = useId();
  const events = useHistory().list({ range: 'all' }).slice(0, RECENT_ACTIVITY_LIMIT);
  const hasSamples = events.some((event) => event.seeded);

  return (
    <section aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={headingId}>Recent activity</h2>
        <DashboardLink to={ROUTES.history}>View all activity</DashboardLink>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3">
          <span>No activity yet.</span>
          <DashboardLink to={ROUTES.simulator}>Open the simulator</DashboardLink>
        </p>
      ) : (
        <>
          {hasSamples && (
            <p className="mt-2 max-w-prose text-muted-foreground">
              Records labelled Sample are simulated examples added for Demo Mode, not your own practice.
            </p>
          )}
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
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
    </section>
  );
}
