/**
 * Removes the Demo Mode sample records and keeps everything the user did.
 *
 * The history service has no "remove seeded" call, so this reads every
 * record, clears the store and re-appends the non-sample records oldest
 * first, keeping each record's id, time and fields. The service's "already
 * seeded" flag is untouched, so sample records are not written again.
 */
import type { HistoryService } from '@/services/history/types';

export interface SampleRemovalResult {
  readonly removed: number;
  readonly kept: number;
}

export function countSampleRecords(history: Pick<HistoryService, 'list'>): number {
  return history.list({ range: 'all' }).filter((event) => event.seeded).length;
}

export function removeSampleRecords(history: Pick<HistoryService, 'list' | 'clear' | 'append'>): SampleRemovalResult {
  // list() is newest first; reversing gives the stored chronological order, ties included.
  const chronological = history.list({ range: 'all' }).reverse();
  const kept = chronological.filter((event) => !event.seeded);
  const removed = chronological.length - kept.length;
  if (removed === 0) return { removed: 0, kept: kept.length };

  history.clear();
  for (const event of kept) {
    history.append(event);
  }
  return { removed, kept: kept.length };
}
