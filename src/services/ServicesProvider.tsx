/* STUB — replaced by the services implementation. */
import { type ReactNode } from 'react';
import type { StorageAdapter } from './storage/StorageAdapter';
import type { HistoryService } from './history/types';
import type { CalibrationService } from './calibration/types';
import type { TrainingService } from './training/types';
import type { CommandMappingService } from './commands/types';

export interface AppServices {
  readonly storage: StorageAdapter;
  readonly history: HistoryService;
  readonly calibration: CalibrationService;
  readonly training: TrainingService;
  readonly commands: CommandMappingService;
}

export function createServices(_storage: StorageAdapter): AppServices {
  throw new Error('createServices is not implemented yet');
}

export function ServicesProvider(_props: { services?: AppServices; storage?: StorageAdapter; children: ReactNode }): JSX.Element {
  throw new Error('ServicesProvider is not implemented yet');
}

export function useServices(): AppServices {
  throw new Error('useServices is not implemented yet');
}
