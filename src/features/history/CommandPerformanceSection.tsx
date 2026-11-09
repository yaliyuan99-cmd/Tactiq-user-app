import { getCommand, type CommandToken } from '@/domain/commands';
import type { CommandPerformance } from '@/domain/models';
import { cn } from '@/lib/cn';
import { type EvidenceInView } from './evidenceInView';
import { EvidenceTag } from './EvidenceTag';
import { HISTORY_HEADING_IDS } from './historyIds';
import type { CommandFilter } from './historyParams';
import { barWidthPercent, performanceSentence, rateWithCounts } from './performance';
import { plural, type EmergencyCounts } from './wording';

export interface CommandPerformanceSectionProps {
  /** Rows to show, already narrowed to the command filter (see performanceRows). */
  readonly rows: readonly CommandPerformance[];
  readonly command: CommandFilter;
  readonly emergency: EmergencyCounts;
  /** The evidence of the records these rows were counted from. */
  readonly evidence: EvidenceInView;
  /** True when every record in view is a Demo Mode sample. */
  readonly allSamples?: boolean;
  /** Narrows the page to one command, or back to all when it is the one chosen already. */
  readonly onSelectCommand?: (token: CommandToken) => void;
}

function PerformanceBar({ row, pressed, onSelect }: { row: CommandPerformance; pressed: boolean; onSelect: () => void }) {
  const empty = row.attempts === 0;
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        disabled={empty && !pressed}
        onClick={onSelect}
        className={cn(
          'target-44 grid w-full gap-x-4 gap-y-1.5 rounded-md px-2 py-2 text-left transition-colors duration-[var(--dur-tap)] sm:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_minmax(7.5rem,auto)] sm:items-center',
          'enabled:cursor-pointer enabled:hover:bg-muted',
          pressed && 'bg-secondary enabled:hover:bg-secondary',
        )}
      >
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 sm:contents">
          <span className="font-medium sm:order-1">{getCommand(row.token).label}</span>
          <span className={cn('tabular-nums sm:order-3 sm:text-right', empty && 'text-muted-foreground')}>
            {rateWithCounts(row)}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'block h-2.5 overflow-hidden rounded-full border border-border-strong bg-muted sm:order-2',
            empty && 'border-dashed',
          )}
        >
          <span className="block h-full rounded-full bg-primary" style={{ width: `${barWidthPercent(row.successes, row.attempts)}%` }} />
        </span>
      </button>
    </li>
  );
}

export function CommandPerformanceSection({
  rows,
  command,
  emergency,
  evidence,
  allSamples = false,
  onSelectCommand,
}: CommandPerformanceSectionProps) {
  return (
    <section aria-labelledby={HISTORY_HEADING_IDS.byCommand}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={HISTORY_HEADING_IDS.byCommand}>By command</h2>
        <EvidenceTag evidence={evidence} allSamples={allSamples} />
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
            aria-label="Recognised attempts by command, with counts and rate"
            className="mt-4 grid gap-1 rounded-lg border-[1.5px] border-foreground bg-card p-2 shadow-card sm:p-3"
          >
            {rows.map((row) => (
              <PerformanceBar
                key={row.token}
                row={row}
                pressed={command === row.token}
                onSelect={() => onSelectCommand?.(row.token)}
              />
            ))}
          </ul>
          {command === 'all' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Press a command to see only its records. Emergency holds are not scored per command; they are counted in the
              summary.
            </p>
          )}
        </>
      )}
    </section>
  );
}
