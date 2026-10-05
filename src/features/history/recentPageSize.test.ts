import { RECENT_PAGE_SIZE, RECENT_PAGE_SIZE_NARROW, STACKED_ROWS_QUERY, initialRecentPageSize } from './recentPageSize';

describe('initialRecentPageSize', () => {
  it('starts with fewer records where the table stacks into labelled lines', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query === STACKED_ROWS_QUERY }) as MediaQueryList);
    vi.spyOn(window, 'matchMedia').mockImplementation(matchMedia);
    expect(initialRecentPageSize()).toBe(RECENT_PAGE_SIZE_NARROW);
    expect(RECENT_PAGE_SIZE_NARROW).toBeLessThan(RECENT_PAGE_SIZE);
  });

  it('shows a full page at table width', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as MediaQueryList);
    expect(initialRecentPageSize()).toBe(RECENT_PAGE_SIZE);
  });

  it('falls back to a full page when matchMedia is unavailable or throws', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(initialRecentPageSize()).toBe(RECENT_PAGE_SIZE);
  });
});
