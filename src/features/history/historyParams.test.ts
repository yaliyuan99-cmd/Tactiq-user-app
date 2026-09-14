import {
  COMMAND_OPTIONS,
  DEFAULT_HISTORY_FILTERS,
  RANGE_OPTIONS,
  SOURCE_OPTIONS,
  describeFilters,
  hasNarrowingFilters,
  parseHistoryParams,
  rangeLabel,
  sourceLabel,
  toServiceFilter,
  widerRanges,
  writeHistoryParams,
} from './historyParams';

describe('parseHistoryParams', () => {
  it('defaults to the last 7 days, all commands and all sources', () => {
    expect(parseHistoryParams(new URLSearchParams(''))).toEqual({ range: '7d', command: 'all', source: 'all' });
    expect(DEFAULT_HISTORY_FILTERS).toEqual({ range: '7d', command: 'all', source: 'all' });
  });

  it('reads valid values', () => {
    expect(parseHistoryParams(new URLSearchParams('range=all&command=quick_action_2&source=training'))).toEqual({
      range: 'all',
      command: 'quick_action_2',
      source: 'training',
    });
    expect(parseHistoryParams(new URLSearchParams('range=today&command=emergency&source=device'))).toEqual({
      range: 'today',
      command: 'emergency',
      source: 'device',
    });
  });

  it('ignores unknown values one param at a time', () => {
    expect(parseHistoryParams(new URLSearchParams('range=year&command=wave&source=calibration'))).toEqual({
      range: '7d',
      command: 'all',
      source: 'calibration',
    });
    expect(parseHistoryParams(new URLSearchParams('range=&command=ALL&source=Simulator'))).toEqual(DEFAULT_HISTORY_FILTERS);
  });
});

describe('writeHistoryParams', () => {
  it('sets all three params and keeps unrelated ones', () => {
    const next = writeHistoryParams(new URLSearchParams('tab=2&range=today'), { range: 'all', command: 'next', source: 'all' });
    expect(next.get('tab')).toBe('2');
    expect(next.get('range')).toBe('all');
    expect(next.get('command')).toBe('next');
    expect(next.get('source')).toBe('all');
  });

  it('does not change the params it was given', () => {
    const current = new URLSearchParams('range=today');
    writeHistoryParams(current, { range: 'all', command: 'all', source: 'all' });
    expect(current.toString()).toBe('range=today');
  });

  it('round-trips through parse', () => {
    const filters = { range: 'today', command: 'undo', source: 'simulator' } as const;
    expect(parseHistoryParams(writeHistoryParams(new URLSearchParams(), filters))).toEqual(filters);
  });
});

describe('options and labels', () => {
  it('offers three ranges, all commands plus nine, and all sources plus four', () => {
    expect(RANGE_OPTIONS.map((o) => o.label)).toEqual(['Today', 'Last 7 days', 'All time']);
    expect(COMMAND_OPTIONS).toHaveLength(10);
    expect(COMMAND_OPTIONS[0]).toEqual({ value: 'all', label: 'All commands' });
    expect(COMMAND_OPTIONS.map((o) => o.label)).toContain('Emergency');
    expect(SOURCE_OPTIONS.map((o) => o.label)).toEqual(['All sources', 'Simulator', 'Lessons', 'Calibration', 'Ring']);
  });

  it('names sources and ranges in words', () => {
    expect(sourceLabel('training')).toBe('Lessons');
    expect(sourceLabel('device')).toBe('Ring');
    expect(rangeLabel('7d')).toBe('Last 7 days');
  });
});

describe('helpers', () => {
  it('maps filter state to the service filter', () => {
    expect(toServiceFilter({ range: 'today', command: 'read', source: 'device' })).toEqual({
      range: 'today',
      token: 'read',
      source: 'device',
    });
  });

  it('knows when command or source narrows the view', () => {
    expect(hasNarrowingFilters(DEFAULT_HISTORY_FILTERS)).toBe(false);
    expect(hasNarrowingFilters({ ...DEFAULT_HISTORY_FILTERS, command: 'next' })).toBe(true);
    expect(hasNarrowingFilters({ ...DEFAULT_HISTORY_FILTERS, source: 'training' })).toBe(true);
  });

  it('describes the active filters in words', () => {
    expect(describeFilters(DEFAULT_HISTORY_FILTERS)).toBe('Range: last 7 days. Command: all commands. Source: all sources.');
    expect(describeFilters({ range: 'today', command: 'quick_action_1', source: 'training' })).toBe(
      'Range: today. Command: Shortcut 1. Source: Lessons.',
    );
  });

  it('lists wider ranges', () => {
    expect(widerRanges('today')).toEqual(['7d', 'all']);
    expect(widerRanges('7d')).toEqual(['all']);
    expect(widerRanges('all')).toEqual([]);
  });
});
