import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CircleSlash, CircleX, Hand, ShieldAlert, type LucideIcon } from 'lucide-react';
import { Button, DataTable, EvidenceLabel, VisuallyHidden, type DataTableColumn } from '@/components';
import type { GestureEvent } from '@/domain/models';
import { cn } from '@/lib/cn';
import { HISTORY_HEADING_IDS } from './historyIds';
import { initialRecentPageSize } from './recentPageSize';
import { sourceLabel } from './historyParams';
import { ACTIVATION_LABEL, isActivation } from '@/services/history/classify';
import { describeOutcome, eventTimeParts, intendedCommandLabel, pointSummary, recordLabel, sharedRecordNote } from './wording';

export interface RecentAttemptsSectionProps {
  /** Matching events, newest first. */
  readonly events: readonly GestureEvent[];
}

interface Row {
  readonly event: GestureEvent;
  readonly index: number;
}

/**
 * A cell that has nothing to show because the record has no such thing — a
 * squeeze has no contact point and no command. Distinct from `OrNone`, which
 * means the value is missing from a record that should have had one.
 */
function NotApplicable() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <VisuallyHidden>Not applicable</VisuallyHidden>
    </>
  );
}

function OrNone({ value }: { value: string | null }) {
  if (value !== null) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <VisuallyHidden>None</VisuallyHidden>
    </>
  );
}

const OUTCOME_ICONS: Readonly<Record<GestureEvent['outcome'], { Icon: LucideIcon; tone: string }>> = {
  recognised: { Icon: CircleCheck, tone: 'text-status-confirmed' },
  mismatch: { Icon: CircleX, tone: 'text-destructive' },
  rejected_duration: { Icon: CircleAlert, tone: 'text-status-target' },
  window_closed: { Icon: CircleAlert, tone: 'text-status-target' },
  emergency: { Icon: ShieldAlert, tone: 'text-foreground' },
  emergency_cancelled: { Icon: CircleSlash, tone: 'text-muted-foreground' },
};

function ResultCell({ event }: { event: GestureEvent }) {
  const activation = isActivation(event);
  const { Icon, tone } = activation ? { Icon: Hand, tone: 'text-muted-foreground' } : OUTCOME_ICONS[event.outcome];
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <span>{activation ? ACTIVATION_LABEL : describeOutcome(event)}</span>
    </span>
  );
}

function LabelCell({ event }: { event: GestureEvent }) {
  const label = recordLabel(event);
  if (label === 'Sample') {
    return (
      <span className="font-mono-label inline-flex rounded-sm border border-border-strong px-1.5 py-0.5 text-foreground">
        Sample
      </span>
    );
  }
  return <EvidenceLabel kind={label === 'Measured' ? 'measured' : 'simulated'} />;
}

const COLUMNS: readonly DataTableColumn<Row>[] = [
  {
    key: 'time',
    header: 'Time',
    rowHeader: true,
    cell: ({ event, index }) => {
      const { day, time } = eventTimeParts(event.at);
      return (
        <time dateTime={event.at} tabIndex={-1} data-row-focus={index}>
          <span className="whitespace-nowrap">{day},</span> <span className="whitespace-nowrap">{time}</span>
        </time>
      );
    },
  },
  // Source and Label repeat on most rows, and the lede says so when they are
  // the same throughout, so neither needs a label of its own when stacked.
  { key: 'source', header: 'Source', mobileLabel: '', cell: ({ event }) => sourceLabel(event.source) },
  // A squeeze touches no contact point and carries no command, so its Point
  // and Command cells are blank by nature rather than missing. Showing "None"
  // in both and then "Recognised" in Result read as a command that succeeded
  // while doing nothing; the Result cell names the thing that happened instead.
  { key: 'point', header: 'Point', cell: ({ event }) => (isActivation(event) ? <NotApplicable /> : <OrNone value={pointSummary(event)} />) },
  {
    key: 'command',
    header: 'Command',
    cell: ({ event }) => (isActivation(event) ? <NotApplicable /> : <OrNone value={intendedCommandLabel(event)} />),
  },
  { key: 'result', header: 'Result', cell: ({ event }) => <ResultCell event={event} /> },
  { key: 'label', header: 'Label', mobileLabel: '', cell: ({ event }) => <LabelCell event={event} /> },
];

/** The newest matching events, 25 at a time. Remount (key) it when the filters change. */
export function RecentAttemptsSection({ events }: RecentAttemptsSectionProps) {
  const [visible, setVisible] = useState(initialRecentPageSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null) return;
    focusIndexRef.current = null;
    containerRef.current?.querySelector<HTMLElement>(`[data-row-focus="${index}"]`)?.focus();
  }, [visible]);

  const shown = events.slice(0, visible);
  const rows = shown.map((event, index) => ({ event, index }));
  const remaining = events.length - shown.length;
  const pageSize = initialRecentPageSize();
  const shared = sharedRecordNote(shown, sourceLabel);

  return (
    <section aria-labelledby={HISTORY_HEADING_IDS.recent}>
      <h2 id={HISTORY_HEADING_IDS.recent}>Recent attempts</h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Point is the contact point you were asked for, and the point that was reported when it differed. Command is the
        command you were aiming for.{shared ? ` ${shared}` : ''}
      </p>
      <div ref={containerRef} className="mt-4">
        <DataTable
          caption={`Newest first, showing ${shown.length} of ${events.length}`}
          columns={COLUMNS}
          rows={rows}
          rowKey={({ event }) => event.id}
          emptyMessage="No attempts in this range."
          dense
        />
      </div>
      {remaining > 0 && (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            focusIndexRef.current = shown.length;
            setVisible((count) => count + pageSize);
          }}
        >
          Show {Math.min(pageSize, remaining)} more
        </Button>
      )}
    </section>
  );
}
