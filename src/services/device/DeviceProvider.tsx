/* STUB — replaced by the device implementation. */
import { type ReactNode } from 'react';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import type { DeviceAdapter, DeviceCapabilities, DeviceEvent, DeviceEventListener, DeviceMode, DeviceState, MockRingControls } from './types';

export interface DeviceContextValue {
  readonly state: DeviceState;
  readonly capabilities: DeviceCapabilities;
  /** The most recent events (newest last), capped. */
  readonly events: readonly DeviceEvent[];
  readonly adapter: DeviceAdapter;
  /** Present in Demo Mode; null when a hardware adapter is active. */
  readonly mock: MockRingControls | null;
  readonly setMode: (mode: DeviceMode) => void;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly forget: () => Promise<void>;
  readonly ping: () => Promise<void>;
  readonly clearEvents: () => void;
  /** Listen without re-rendering on every event. */
  readonly subscribe: (listener: DeviceEventListener) => () => void;
}

export function DeviceProvider(_props: { storage: StorageAdapter; children: ReactNode; adapter?: DeviceAdapter }): JSX.Element {
  throw new Error('DeviceProvider is not implemented yet');
}

export function useDevice(): DeviceContextValue {
  throw new Error('useDevice is not implemented yet');
}
