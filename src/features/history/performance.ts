/**
 * Per-command performance wording and the bar geometry. A rate is never
 * shown without the counts it came from.
 */
import { getCommand, type CommandToken } from '@/domain/commands';
import type { CommandPerformance } from '@/domain/models';
import { formatPercent } from '@/lib/time';
import type { CommandFilter } from './historyParams';
import { joinWithAnd, plural } from './wording';

/**
 * Commands scored per command. Emergency is left out: a hold is never a
 * "recognised" tap, so a per-command rate for it would always read 0%.
 */
export function performanceRows(perCommand: readonly CommandPerformance[], command: CommandFilter): CommandPerformance[] {
  if (command === 'emergency') return [];
  return perCommand.filter((row) => row.token !== 'emergency' && (command === 'all' || row.token === command));
}

/** Width of the filled part of a bar, 0–100, to one decimal place. */
export function barWidthPercent(successes: number, attempts: number): number {
  if (!Number.isFinite(successes) || !Number.isFinite(attempts) || attempts <= 0) return 0;
  const ratio = Math.min(Math.max(successes / attempts, 0), 1);
  return Math.round(ratio * 1000) / 10;
}

/** "11 of 12 (92%)", or "No attempts". */
export function rateWithCounts(row: Pick<CommandPerformance, 'attempts' | 'successes' | 'rate'>): string {
  if (row.attempts === 0) return 'No attempts';
  return `${row.successes} of ${row.attempts} (${formatPercent(row.rate)})`;
}

function label(token: CommandToken): string {
  return getCommand(token).label;
}

/**
 * The text summary that comes before the bars and table, e.g.
 * "Next was practised most, 12 attempts, 11 recognised. Undo has no attempts in this range."
 */
export function performanceSentence(rows: readonly CommandPerformance[]): string {
  const [first] = rows;
  if (!first) return '';
  if (rows.length === 1) {
    return first.attempts === 0
      ? `${label(first.token)} has no attempts in this range.`
      : `${label(first.token)}: ${plural(first.attempts, 'attempt')}, ${first.successes} recognised.`;
  }

  const practised = rows.filter((row) => row.attempts > 0);
  const unpractised = rows.filter((row) => row.attempts === 0).map((row) => label(row.token));

  if (practised.length === 0) return 'No command has attempts in this range.';

  const sentences: string[] = [];
  // Ties keep the earlier command in the list.
  const most = practised.reduce((best, row) => (row.attempts > best.attempts ? row : best));
  sentences.push(`${label(most.token)} was practised most, ${plural(most.attempts, 'attempt')}, ${most.successes} recognised.`);

  const rates = practised.map((row) => row.successes / row.attempts);
  const highest = Math.max(...rates);
  const lowest = practised.reduce((worst, row) =>
    row.successes / row.attempts < worst.successes / worst.attempts ? row : worst,
  );
  if (lowest.token !== most.token && lowest.successes / lowest.attempts < highest) {
    sentences.push(`${label(lowest.token)} was recognised least often, ${rateWithCounts(lowest)}.`);
  }

  if (unpractised.length > 0) {
    sentences.push(`${joinWithAnd(unpractised)} ${unpractised.length === 1 ? 'has' : 'have'} no attempts in this range.`);
  }
  return sentences.join(' ');
}
