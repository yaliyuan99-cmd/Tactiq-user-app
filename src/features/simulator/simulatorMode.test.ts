import { SIMULATOR_MODE_OPTIONS, parseSimulatorMode, withSimulatorMode } from './simulatorMode';

describe('simulator mode in the URL', () => {
  it('defaults to guided practice', () => {
    expect(parseSimulatorMode(null)).toBe('guided');
    expect(parseSimulatorMode('guided')).toBe('guided');
    expect(parseSimulatorMode('FREE')).toBe('guided');
    expect(parseSimulatorMode('free')).toBe('free');
  });

  it('writes free practice as ?mode=free and removes the param for guided, keeping other params', () => {
    const free = withSimulatorMode(new URLSearchParams('from=dashboard'), 'free');
    expect(free.toString()).toBe('from=dashboard&mode=free');
    expect(withSimulatorMode(free, 'guided').toString()).toBe('from=dashboard');
  });

  it('describes both modes', () => {
    expect(SIMULATOR_MODE_OPTIONS).toEqual([
      { value: 'guided', label: 'Guided practice', description: 'We ask for a command; you find the point.' },
      { value: 'free', label: 'Free practice', description: 'Tap any point and hear what it does.' },
    ]);
  });
});
