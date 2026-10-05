/**
 * One place that builds the local services on a shared storage adapter and
 * hands them to screens. Screens use the hooks below; tests pass their own
 * `services` or a MemoryStorageAdapter.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { LocalStorageAdapter, type StorageAdapter } from './storage/StorageAdapter';
import type { HistoryService } from './history/types';
import type { CalibrationService } from './calibration/types';
import type { TrainingService } from './training/types';
import type { CommandMappingService } from './commands/types';
import { LocalHistoryService } from './history/LocalHistoryService';
import { LocalCalibrationService } from './calibration/LocalCalibrationService';
import { LocalTrainingService } from './training/LocalTrainingService';
import { LocalCommandMappingService } from './commands/LocalCommandMappingService';
import { useSubscription, type SubscribeFn } from './useSubscription';

export interface AppServices {
  readonly storage: StorageAdapter;
  readonly history: HistoryService;
  readonly calibration: CalibrationService;
  readonly training: TrainingService;
  readonly commands: CommandMappingService;
}

export function createServices(storage: StorageAdapter): AppServices {
  return {
    storage,
    history: new LocalHistoryService(storage),
    calibration: new LocalCalibrationService(storage),
    training: new LocalTrainingService(storage),
    commands: new LocalCommandMappingService(storage),
  };
}

const ServicesContext = createContext<AppServices | null>(null);

export interface ServicesProviderProps {
  /** Ready-made services (tests, or an app that builds them itself). Wins over `storage`. */
  readonly services?: AppServices;
  /** Storage to build the local services on. Defaults to the browser's localStorage. */
  readonly storage?: StorageAdapter;
  readonly children: ReactNode;
}

export function ServicesProvider({ services, storage, children }: ServicesProviderProps): JSX.Element {
  const value = useMemo(
    () => services ?? createServices(storage ?? new LocalStorageAdapter()),
    [services, storage],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside <ServicesProvider>.');
  return ctx;
}

/**
 * Whether the browser is still letting Tactiq save changes. Reads keep working
 * when this is false, so a session in that state is degraded rather than
 * empty: show `WRITES_BLOCKED_NOTE` once in the shell. Re-renders when the
 * answer flips.
 */
export function useCanPersist(): boolean {
  const { storage } = useServices();
  const subscribe = useCallback<SubscribeFn>((listener) => storage.subscribe(listener), [storage]);
  useSubscription(subscribe);
  return storage.canPersist;
}

/** Re-renders the caller whenever `service` notifies, and returns it unchanged. */
function useWatchedService<T extends { subscribe: SubscribeFn }>(service: T): T {
  const subscribe = useCallback<SubscribeFn>((listener) => service.subscribe(listener), [service]);
  useSubscription(subscribe);
  return service;
}

/**
 * The services below return the same object on every render; read from them
 * during render (not inside a memo keyed only on the service) to see changes.
 */
export function useHistory(): HistoryService {
  return useWatchedService(useServices().history);
}

export function useCalibration(): CalibrationService {
  return useWatchedService(useServices().calibration);
}

export function useTraining(): TrainingService {
  return useWatchedService(useServices().training);
}

export function useCommandMapping(): CommandMappingService {
  return useWatchedService(useServices().commands);
}
