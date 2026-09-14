import { DataTable, EvidenceLabel, VisuallyHidden, type DataTableColumn } from '@/components';
import { getCommand } from '@/domain/commands';
import type { CommandPerformance } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/time';
import { HISTORY_HEADING_IDS } from './historyIds';
import type { CommandFilter } from './historyParams';
import { barWidthPercent, performanceSentence, rateWithCounts } from './performance';
import { plural, type EmergencyCounts } from './wording';

export interface CommandPerformanceSectionProps {
  /** Rows to show, already narrowed to the command filter (see performanceRows). */
  readonly rows: readonly CommandPerformance[];
  readonly command: CommandFilter;
  readonly emergency: EmergencyCounts;
}

const COLUMNS: readonly DataTableColumn<CommandPerformance>[] = [
  { key: 'command', header: 'Command', rowHeader: true, cell: (row) => getCommand(row.token).label },
  { key: 'attempts', header: 'Attempts', align: 'end', cell: (row) => row.attempts },
  { key: 'recognised', header: 'Recognised', align: 'end', cell: (row) => row.successes },
  {
    key: 'rate',
    header: 'Rate',
    align: 'end',
    cell: (row) =>
      row.rate === null ? (
        <>
          <span aria-hidden="true">—</span>
          <VisuallyHidden>No attempts</VisuallyHidden>
        </>
      ) : (
        formatPercent(row.rate)
      ),
  },
];

function PerformanceBar({ row }: { row: CommandPerformance }) {
  const empty = row.attempts === 0;
  return (
    <li className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_minmax(7.5rem,auto)] sm:items-center">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:contents">
        <span className="font-medium sm:order-1">{getCommand(row.token).label}</span>
        <span className={cn('tabular-nums sm:order-3 sm:text-right', empty && 'text-muted-foreground')}>
          {rateWithCounts(row)}
        </span>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          'block h-3 overflow-hidden rounded-sm border border-border-strong bg-background sm:order-2',
          empty && 'border-dashed',
        )}
      >
        <span className="block h-full bg-status-simulation" style={{ width: `${barWidthPercent(row.successes, row.attempts)}%` }} />
      </span>
    </li>
  );
}

export function CommandPerformanceSection({ rows, command, emergency }: CommandPerformanceSectionProps) {
  return (
    <section aria-labelledby={HISTORY_HEADING_IDS.byCommand}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={HISTORY_HEADING_IDS.byCommand}>By command</h2>
        <EvidenceLabel kind="simulated" />
      </div>

      {command === 'emergency' ? (
        <p className="mt-2 max-w-prose">
          Emergency holds are not scored per command, because a hold is never a recognised tap. In this view:{' '}
          {plural(emergency.completed, 'completed hold')}, {plural(emergency.cancelled, 'cancelled hold')}. See the summary
          above.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-prose">{performanceSentence(rows)}</p>
          <ul
            aria-label="Recognition by command"
            className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-4 shadow-card sm:gap-3 sm:p-5"
          >
            {rows.map((row) => (
              <PerformanceBar key={row.token} row={row} />
            ))}
          </ul>
          <DataTable
            caption="Performance by command"
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.token}
            emptyMessage="No commands to show."
            dense
            className="mt-4"
          />
          {command === 'all' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Emergency holds are not scored per command; they are counted in the summary.
            </p>
          )}
        </>
      )}
    </section>
  );
}
