import { dashboardTitle, firstName, partOfDay } from './greeting';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 8, 15, hour, minute);
}

describe('partOfDay', () => {
  it.each([
    [5, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [17, 59, 'afternoon'],
    [18, 0, 'evening'],
    [23, 30, 'evening'],
    [0, 15, 'evening'],
    [4, 59, 'evening'],
  ] as const)('%i:%i is %s', (hour, minute, expected) => {
    expect(partOfDay(at(hour, minute))).toBe(expected);
  });
});

describe('firstName', () => {
  it('takes the first word of the display name', () => {
    expect(firstName('Alex Morgan')).toBe('Alex');
    expect(firstName('  Sam  ')).toBe('Sam');
  });

  it('returns null for a missing or blank name', () => {
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
    expect(firstName('   ')).toBeNull();
  });
});

describe('dashboardTitle', () => {
  it('greets by local time with the first name', () => {
    expect(dashboardTitle('Alex Morgan', at(9))).toBe('Good morning, Alex');
    expect(dashboardTitle('Alex', at(14))).toBe('Good afternoon, Alex');
    expect(dashboardTitle('Alex', at(20))).toBe('Good evening, Alex');
  });

  it('falls back to Overview when there is no user', () => {
    expect(dashboardTitle(null, at(9))).toBe('Overview');
    expect(dashboardTitle('', at(9))).toBe('Overview');
  });
});
