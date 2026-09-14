/**
 * The Activity filters as URL search params, so a view can be shared and
 * survives a refresh. Unknown or missing values fall back to the defaults
 * rather than showing an error.
 */
import { COMMANDS, isCommandToken, type CommandToken } from '@/domain/commands';
import type { GestureEventSource, HistoryRange } from '@/domain/models';
import { GESTURE_EVENT_SOURCES } from '@/services/history/events';
import type { HistoryFilter } from '@/services/history/types';

export type CommandFilter = CommandToken | 'all';
export type SourceFilter = GestureEventSource | 'all';

export interface HistoryFilterState {
  readonly range: HistoryRange;
  readonly command: CommandFilter;
  readonly source: SourceFilter;
}

export const HISTORY_PARAM_KEYS = { range: 'range', command: 'command', source: 'source' } as const;

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = { range: '7d', command: 'all', source: 'all' };

export interface FilterOption<V extends string> {
  readonly value: V;
  readonly label: string;
}

export const RANGE_OPTIONS: readonly FilterOption<HistoryRange>[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];

export const COMMAND_OPTIONS: readonly FilterOption<CommandFilter>[] = [
  { value: 'all', label: 'All commands' },
  ...COMMANDS.map((command) => ({ value: command.token, label: command.label })),
];

const SOURCE_LABELS: Readonly<Record<GestureEventSource, string>> = {
  simulator: 'Simulator',
  training: 'Lessons',
  calibration: 'Calibration',
  device: 'Ring',
};

export const SOURCE_OPTIONS: readonly FilterOption<SourceFilter>[] = [
  { value: 'all', label: 'All sources' },
  ...GESTURE_EVENT_SOURCES.map((source) => ({ value: source, label: SOURCE_LABELS[source] })),
];

export function sourceLabel(source: GestureEventSource): string {
  return SOURCE_LABELS[source];
}

export function rangeLabel(range: HistoryRange): string {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label ?? range;
}

export function isHistoryRange(value: unknown): value is HistoryRange {
  return value === 'today' || value === '7d' || value === 'all';
}

export function isCommandFilter(value: unknown): value is CommandFilter {
  return value === 'all' || isCommandToken(value);
}

export function isSourceFilter(value: unknown): value is SourceFilter {
  return value === 'all' || (typeof value === 'string' && (GESTURE_EVENT_SOURCES as readonly string[]).includes(value));
}

export function parseHistoryParams(params: URLSearchParams): HistoryFilterState {
  const range = params.get(HISTORY_PARAM_KEYS.range);
  const command = params.get(HISTORY_PARAM_KEYS.command);
  const source = params.get(HISTORY_PARAM_KEYS.source);
  return {
    range: isHistoryRange(range) ? range : DEFAULT_HISTORY_FILTERS.range,
    command: isCommandFilter(command) ? command : DEFAULT_HISTORY_FILTERS.command,
    source: isSourceFilter(source) ? source : DEFAULT_HISTORY_FILTERS.source,
  };
}

/** A copy of `current` with the three filter params set; any other params are kept. */
export function writeHistoryParams(current: URLSearchParams, filters: HistoryFilterState): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set(HISTORY_PARAM_KEYS.range, filters.range);
  next.set(HISTORY_PARAM_KEYS.command, filters.command);
  next.set(HISTORY_PARAM_KEYS.source, filters.source);
  return next;
}

export function toServiceFilter(filters: HistoryFilterState): HistoryFilter {
  return { range: filters.range, token: filters.command, source: filters.source };
}

/** True when the command or source filter narrows the view. */
export function hasNarrowingFilters(filters: HistoryFilterState): boolean {
  return filters.command !== 'all' || filters.source !== 'all';
}

/** The next wider ranges than `range`, narrowest first ("Today" → Last 7 days, All time). */
export function widerRanges(range: HistoryRange): HistoryRange[] {
  const order: readonly HistoryRange[] = ['today', '7d', 'all'];
  return order.slice(order.indexOf(range) + 1);
}

/** "Range: last 7 days. Command: Next. Source: all sources." */
export function describeFilters(filters: HistoryFilterState): string {
  const command = COMMAND_OPTIONS.find((option) => option.value === filters.command)?.label ?? filters.command;
  const source = SOURCE_OPTIONS.find((option) => option.value === filters.source)?.label ?? filters.source;
  const lower = (text: string) => text.charAt(0).toLocaleLowerCase() + text.slice(1);
  return [
    `Range: ${lower(rangeLabel(filters.range))}.`,
    `Command: ${filters.command === 'all' ? lower(command) : command}.`,
    `Source: ${filters.source === 'all' ? lower(source) : source}.`,
  ].join(' ');
}
