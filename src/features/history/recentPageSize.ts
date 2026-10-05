/**
 * How many recent attempts to show at first. Below sm the table stacks every
 * column into its own labelled line, so a full page of 25 runs to several
 * screens; a narrow screen starts with fewer and "Show more" adds the same
 * number again.
 */
export const RECENT_PAGE_SIZE = 25;
export const RECENT_PAGE_SIZE_NARROW = 10;
export const STACKED_ROWS_QUERY = '(max-width: 639px)';

/** The first page size for this screen width. Read once: "Show more" does the rest. */
export function initialRecentPageSize(): number {
  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia(STACKED_ROWS_QUERY).matches) {
      return RECENT_PAGE_SIZE_NARROW;
    }
  } catch {}
  return RECENT_PAGE_SIZE;
}
