/**
 * Activity per calendar day, for the "Day by day" chart. Pure. Only records in
 * a command accuracy denominator are scored here, the same rule the Summary
 * uses, so the chart and the figures above it can never disagree.
 */
import type { GestureEvent } from '@/domain/models';
import { isAccuracyAttempt, isAccuracySuccess } from '@/services/history/classify';
import { startOfDay } from '@/lib/time';
import type { HistoryRange } from '@/domain/models';

export interface DayBucket {
  /** Local calendar date, e.g. "2026-11-05". */
  readonly key: string;
  readonly date: Date;
  /** Scored attempts on this day. */
  readonly attempts: number;
  readonly correct: number;
  /** Every record on this day, scored or not. */
  readonly records: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The narrowest column that still gives a 44 px target. */
export const MIN_DAY_COLUMN_WIDTH = 44;

const MIN_DAYS = 7;

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole calendar days from `earlier` to `later`. Rounded, because a day with a clock change is not 24 hours. */
function daysBetween(earlier: Date, later: Date): number {
  return Math.round((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / DAY_MS);
}

/**
 * How many columns to draw. "Last 7 days" is a rolling 168 hours, so it can
 * touch an eighth calendar day. All time shows the latest days that fit.
 */
export function daysToShow(range: HistoryRange, events: readonly Pick<GestureEvent, 'at'>[], maxColumns: number, now: Date): number {
  const span = events.reduce((widest, event) => Math.max(widest, daysBetween(new Date(event.at), now) + 1), 1);
  if (range === '7d') return Math.max(MIN_DAYS, span);
  return Math.max(MIN_DAYS, Math.min(span, maxColumns));
}

/** One bucket per day, oldest first, ending today. Days with nothing on them are kept: a gap is information. */
export function dailyActivity(events: readonly GestureEvent[], days: number, now: Date): readonly DayBucket[] {
  const today = startOfDay(now);
  const buckets = new Map<string, { date: Date; attempts: number; correct: number; records: number }>();
  for (let back = days - 1; back >= 0; back -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    buckets.set(dayKey(date), { date, attempts: 0, correct: 0, records: 0 });
  }
  for (const event of events) {
    const bucket = buckets.get(dayKey(new Date(event.at)));
    if (!bucket) continue;
    bucket.records += 1;
    if (isAccuracyAttempt(event)) bucket.attempts += 1;
    if (isAccuracySuccess(event)) bucket.correct += 1;
  }
  return [...buckets].map(([key, bucket]) => ({ key, ...bucket }));
}

export function eventsOnDay<T extends Pick<GestureEvent, 'at'>>(events: readonly T[], key: string): readonly T[] {
  return events.filter((event) => dayKey(new Date(event.at)) === key);
}

/** "Thu 5 Nov" */
export function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Thu 5 Nov: 8 attempts, 5 correct", or how many unscored records the day has. */
export function daySentence(bucket: DayBucket): string {
  const label = dayLabel(bucket.date);
  if (bucket.attempts > 0) {
    return `${label}: ${bucket.attempts} ${bucket.attempts === 1 ? 'attempt' : 'attempts'}, ${bucket.correct} correct`;
  }
  if (bucket.records > 0) return `${label}: ${bucket.records} ${bucket.records === 1 ? 'record' : 'records'}, none scored`;
  return `${label}: no activity`;
}
