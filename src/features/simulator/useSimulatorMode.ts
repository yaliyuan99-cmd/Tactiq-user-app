import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { SIMULATOR_MODE_PARAM, parseSimulatorMode, withSimulatorMode, type SimulatorMode } from './simulatorMode';

/** The practice mode, read from and written to the URL. Changing it replaces the history entry. */
export function useSimulatorMode(): readonly [SimulatorMode, (mode: SimulatorMode) => void] {
  const [params, setParams] = useSearchParams();
  const mode = parseSimulatorMode(params.get(SIMULATOR_MODE_PARAM));
  const setMode = useCallback(
    (next: SimulatorMode) => {
      setParams((previous) => withSimulatorMode(previous, next), { replace: true });
    },
    [setParams],
  );
  return [mode, setMode] as const;
}
