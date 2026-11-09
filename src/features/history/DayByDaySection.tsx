import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components';
import type { GestureEvent } from '@/domain/models';
import { cn } from '@/lib/cn';
import { useElementWidth } from '@/lib/useElementWidth';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import type { HistoryRange } from '@/domain/models';
import { MIN_DAY_COLUMN_WIDTH, dailyActivity, dayLabel, daySentence, daysToShow, eventsOnDay, type DayBucket } from './daily';
import { type EvidenceInView } from './evidenceInView';
import { EvidenceTag } from './EvidenceTag';
import { HISTORY_HEADING_IDS } from './historyIds';
import { RecentAttemptsSection } from './RecentAttemptsSection';
import { plural } from './wording';

export interface DayByDaySectionProps {
  /** Matching events, newest first. */
  readonly events: readonly GestureEvent[];
  readonly range: HistoryRange;
  readonly evidence: EvidenceInView;
  readonly allSamples: boolean;
}

/** Used until the chart has been measured. */
const DEFAULT_COLUMNS = 14;

function DayColumn({
  bucket,
  tallest,
  selected,
  align,
  compact,
  onSelect,
}: {
  bucket: DayBucket;
  tallest: number;
  selected: boolean;
  align: 'start' | 'center' | 'end';
  compact: boolean;
  onSelect: () => void;
}) {
  const sentence = daySentence(bucket);
  const missed = bucket.attempts - bucket.correct;
  return (
    <button
      type="button"
      aria-label={sentence}
      aria-pressed={selected}
      disabled={bucket.records === 0}
      onClick={onSelect}
      className={cn(
        'group relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-md pt-6 transition-colors duration-[var(--dur-tap)]',
        'enabled:cursor-pointer enabled:hover:bg-muted',
        selected && 'bg-secondary enabled:hover:bg-secondary',
      )}
    >
      {/* Repeats the button's name for people pointing at it. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none invisible absolute bottom-full z-20 mb-1 w-max max-w-56 rounded-md bg-foreground px-2.5 py-1.5 text-left text-sm text-background shadow-card',
          'group-enabled:group-hover:visible group-enabled:group-focus-visible:visible',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
        )}
      >
        {sentence}
      </span>
      <span aria-hidden="true" className="flex h-36 w-full flex-col items-center justify-end">
        {bucket.attempts > 0 && <span className="pb-1 text-sm font-medium tabular-nums">{bucket.attempts}</span>}
        {/* A 2px gap, in the surface colour, keeps the two parts apart whatever their colours. */}
        <span
          className="flex w-full max-w-6 flex-col gap-0.5"
          style={{ height: `${(bucket.attempts / tallest) * 100}%`, maxHeight: 'calc(100% - 1.5rem)' }}
        >
          {missed > 0 && (
            <span className="min-h-1 rounded-t-[4px] bg-status-target" style={{ flex: `${missed} ${missed} 0` }} />
          )}
          {bucket.correct > 0 && (
            <span
              className={cn('min-h-1 bg-primary', missed === 0 && 'rounded-t-[4px]')}
              style={{ flex: `${bucket.correct} ${bucket.correct} 0` }}
            />
          )}
        </span>
      </span>
      <span aria-hidden="true" className="w-full border-t border-border-strong pb-1.5 pt-1.5 text-center text-sm leading-tight">
        <span className={cn('block', bucket.records === 0 && 'text-muted-foreground', selected && 'font-semibold')}>
          {compact
            ? bucket.date.toLocaleDateString(undefined, { day: 'numeric' })
            : bucket.date.toLocaleDateString(undefined, { weekday: 'short' })}
        </span>
      </span>
    </button>
  );
}

/**
 * Scored attempts per day, and the table of records underneath it. They share
 * the choice of day, so pressing a column narrows the table to that day. Remount
 * (key) it when the filters change: the choice belongs to the view it was made in.
 */
export function DayByDaySection({ events, range, evidence, allSamples }: DayByDaySectionProps) {
  const { announce } = useFeedback();
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const now = new Date();
  const maxColumns = chartWidth === null ? DEFAULT_COLUMNS : Math.floor(chartWidth / MIN_DAY_COLUMN_WIDTH);
  const days = daysToShow(range, events, maxColumns, now);
  const buckets = dailyActivity(events, days, now);
  const tallest = Math.max(1, ...buckets.map((bucket) => bucket.attempts));
  const selectedBucket = buckets.find((bucket) => bucket.key === selected) ?? null;
  const shown = selectedBucket ? eventsOnDay(events, selectedBucket.key) : events;

  const choose = (bucket: DayBucket) => {
    const next = bucket.key === selected ? null : bucket.key;
    setSelected(next);
    announce(
      next === null
        ? `Showing all ${plural(events.length, 'record')} in this view.`
        : `Showing ${plural(eventsOnDay(events, next).length, 'record')} from ${dayLabel(bucket.date)}.`,
    );
  };

  const showAll = () => {
    // The button goes away with the choice, so focus moves to the section heading.
    headingRef.current?.focus();
    setSelected(null);
    announce(`Showing all ${plural(events.length, 'record')} in this view.`);
  };

  return (
    <>
      {range !== 'today' && (
        <section aria-labelledby={HISTORY_HEADING_IDS.byDay}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={HISTORY_HEADING_IDS.byDay} ref={headingRef} tabIndex={-1}>
              Day by day
            </h2>
            <EvidenceTag evidence={evidence} allSamples={allSamples} />
          </div>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Scored attempts each day. Press a day to see only its records in the table below.
          </p>
          <div className="mt-4 rounded-lg border-[1.5px] border-foreground bg-card p-3 shadow-card sm:p-4">
            <ul aria-hidden="true" className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <li className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-primary" />
                Correct
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-status-target" />
                Wrong point or dropped
              </li>
            </ul>
            <div ref={chartRef} role="group" aria-label="Scored attempts per day" className="flex items-stretch gap-0.5">
              {buckets.map((bucket, index) => (
                <DayColumn
                  key={bucket.key}
                  bucket={bucket}
                  tallest={tallest}
                  selected={bucket.key === selected}
                  align={index < 2 ? 'start' : index >= buckets.length - 2 ? 'end' : 'center'}
                  compact={buckets.length > 8}
                  onSelect={() => choose(bucket)}
                />
              ))}
            </div>
            {selectedBucket && (
              <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary px-3 py-2">
                <span className="font-medium">{daySentence(selectedBucket)}</span>
                <Button variant="secondary" size="sm" leadingIcon={<X className="h-4 w-4" />} onClick={showAll}>
                  Show all days
                </Button>
              </p>
            )}
          </div>
        </section>
      )}
      <RecentAttemptsSection key={selected ?? 'all'} events={shown} />
    </>
  );
}
