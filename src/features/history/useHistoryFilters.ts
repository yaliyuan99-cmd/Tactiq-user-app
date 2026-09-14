import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { parseHistoryParams, writeHistoryParams, type HistoryFilterState } from './historyParams';

export interface HistoryFiltersControls {
  readonly filters: HistoryFilterState;
  /** Writes the filters to the URL, replacing the current history entry. */
  readonly setFilters: (next: HistoryFilterState) => void;
  /** The search string ("?range=…") that shows `next`, for links. */
  readonly searchFor: (next: HistoryFilterState) => string;
}

/** The Activity filters, read from and written to the URL search params. */
export function useHistoryFilters(): HistoryFiltersControls {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseHistoryParams(searchParams);

  const setFilters = useCallback(
    (next: HistoryFilterState) => {
      setSearchParams((current) => writeHistoryParams(current, next), { replace: true });
    },
    [setSearchParams],
  );

  const searchFor = useCallback(
    (next: HistoryFilterState) => `?${writeHistoryParams(searchParams, next).toString()}`,
    [searchParams],
  );

  return { filters, setFilters, searchFor };
}
