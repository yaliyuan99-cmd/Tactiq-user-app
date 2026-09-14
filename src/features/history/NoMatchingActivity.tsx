import { ButtonLink } from '@/components';
import { ROUTES } from '@/app/routes';
import {
  describeFilters,
  hasNarrowingFilters,
  rangeLabel,
  widerRanges,
  type HistoryFilterState,
} from './historyParams';
import { NO_MATCHING_ACTIVITY } from './wording';

export interface NoMatchingActivityProps {
  readonly filters: HistoryFilterState;
  /** The search string for a filter state, e.g. "?range=all&command=all&source=all". */
  readonly searchFor: (next: HistoryFilterState) => string;
  /** Called when one of the filter links is followed. */
  readonly onFollowFilterLink: (next: HistoryFilterState) => void;
}

/** Shown when there is activity, but none matches the filters. */
export function NoMatchingActivity({ filters, searchFor, onFollowFilterLink }: NoMatchingActivityProps) {
  const options: { key: string; label: string; next: HistoryFilterState }[] = widerRanges(filters.range).map((range) => ({
    key: range,
    label: `Show ${rangeLabel(range).toLocaleLowerCase()}`,
    next: { ...filters, range },
  }));
  if (hasNarrowingFilters(filters)) {
    options.push({ key: 'everything', label: 'Show all commands and sources', next: { ...filters, command: 'all', source: 'all' } });
  }

  return (
    <div className="rounded-lg border border-dashed border-border-strong px-5 py-8 text-center sm:px-8">
      <p className="text-lg font-semibold">{NO_MATCHING_ACTIVITY}</p>
      <p className="mx-auto mt-1 max-w-prose text-muted-foreground">{describeFilters(filters)}</p>
      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {options.map((option) => (
          <li key={option.key}>
            <ButtonLink
              variant="secondary"
              size="sm"
              to={{ search: searchFor(option.next) }}
              replace
              onClick={() => onFollowFilterLink(option.next)}
            >
              {option.label}
            </ButtonLink>
          </li>
        ))}
        <li>
          <ButtonLink to={ROUTES.simulator} size="sm">
            Open the simulator
          </ButtonLink>
        </li>
      </ul>
    </div>
  );
}
