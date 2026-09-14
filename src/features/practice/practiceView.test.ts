import {
  DEFAULT_PRACTICE_VIEW,
  NARROW_VIEWPORT_QUERY,
  PRACTICE_VIEW_STORAGE_KEY,
  initialPracticeView,
  isPracticeView,
  readStoredPracticeView,
  resultContact,
  storePracticeView,
} from './practiceView';

describe('practice view storage', () => {
  it('defaults to the hand view', () => {
    expect(DEFAULT_PRACTICE_VIEW).toBe('hand');
    expect(readStoredPracticeView()).toBeNull();
    expect(initialPracticeView()).toBe('hand');
  });

  it('starts with the list on a narrow screen unless the user chose otherwise', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: query === NARROW_VIEWPORT_QUERY, media: query }) as MediaQueryList,
    );
    expect(initialPracticeView()).toBe('list');
    storePracticeView('hand');
    expect(initialPracticeView()).toBe('hand');
    matchMedia.mockRestore();
  });

  it('remembers the choice in session storage', () => {
    storePracticeView('list');
    expect(window.sessionStorage.getItem(PRACTICE_VIEW_STORAGE_KEY)).toBe('list');
    expect(readStoredPracticeView()).toBe('list');
    expect(initialPracticeView()).toBe('list');
  });

  it('ignores an unknown stored value', () => {
    window.sessionStorage.setItem(PRACTICE_VIEW_STORAGE_KEY, 'grid');
    expect(readStoredPracticeView()).toBeNull();
    expect(initialPracticeView()).toBe('hand');
  });

  it('falls back quietly when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storePracticeView('list')).not.toThrow();
    expect(readStoredPracticeView()).toBeNull();
    expect(initialPracticeView()).toBe('hand');
  });

  it('recognises valid views only', () => {
    expect(isPracticeView('hand')).toBe(true);
    expect(isPracticeView('list')).toBe(true);
    expect(isPracticeView('map')).toBe(false);
    expect(isPracticeView(null)).toBe(false);
  });
});

describe('resultContact', () => {
  it('returns the contact of a result, or null', () => {
    expect(resultContact(null)).toBeNull();
    expect(resultContact({ id: 'r', at: 0, kind: 'command', token: 'next', contact: 'middle_base', durationMs: 90 })).toBe('middle_base');
    expect(resultContact({ id: 'r', at: 0, kind: 'rejected', reason: 'window_closed', contact: null, durationMs: null })).toBeNull();
  });
});
