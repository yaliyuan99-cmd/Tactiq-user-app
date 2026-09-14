/**
 * The practice mode lives in the URL (?mode=free), so a link or a refresh
 * keeps it. Guided practice is the default and has no parameter.
 */
export type SimulatorMode = 'guided' | 'free';

export const SIMULATOR_MODE_PARAM = 'mode';

export interface SimulatorModeOption {
  readonly value: SimulatorMode;
  readonly label: string;
  readonly description: string;
}

export const SIMULATOR_MODE_OPTIONS: readonly SimulatorModeOption[] = [
  { value: 'guided', label: 'Guided practice', description: 'We ask for a command; you find the point.' },
  { value: 'free', label: 'Free practice', description: 'Tap any point and hear what it does.' },
];

/** Anything other than "free" (including a missing or unknown value) is guided practice. */
export function parseSimulatorMode(value: string | null): SimulatorMode {
  return value === 'free' ? 'free' : 'guided';
}

/** A copy of the params with the mode applied; other params are kept. */
export function withSimulatorMode(params: URLSearchParams, mode: SimulatorMode): URLSearchParams {
  const next = new URLSearchParams(params);
  if (mode === 'free') next.set(SIMULATOR_MODE_PARAM, 'free');
  else next.delete(SIMULATOR_MODE_PARAM);
  return next;
}
