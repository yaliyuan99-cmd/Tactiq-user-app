/**
 * The app's single device stream. Demo Mode runs the simulated ring
 * (MockDeviceAdapter, always constructed); hardware mode lazily creates the
 * Web Bluetooth adapter for the bench firmware. Screens read `state` and
 * `events`, or `subscribe` for every event without re-rendering.
 *
 * The chosen mode is persisted under STORAGE_KEYS.device (see deviceStorage.ts).
 *
 * "Longer interaction time" lengthens the command window of the simulated
 * ring (Demo Mode) only. The Web Bluetooth adapter is always configured with
 * COMMAND_WINDOW_MS, because the bench firmware keeps its own 3-second
 * ARM_WINDOW_MS and the app cannot change it; a longer countdown would be wrong.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS } from '@/domain/timing';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { deviceError } from './deviceErrors';
import { loadDeviceRecord, saveDeviceRecord } from './deviceStorage';
import { MockDeviceAdapter, isMockDeviceAdapter } from './MockDeviceAdapter';
import { WebBluetoothDeviceAdapter } from './WebBluetoothDeviceAdapter';
import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceError,
  DeviceEvent,
  DeviceEventListener,
  DeviceMode,
  DeviceState,
  MockRingControls,
} from './types';

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

export interface DeviceProviderProps {
  readonly storage: StorageAdapter;
  readonly children: ReactNode;
  /**
   * Test injection. A mock adapter becomes the Demo Mode ring; any other
   * adapter is used for hardware mode (and hardware mode is then the default).
   * Injected adapters are configured but never destroyed by the provider.
   */
  readonly adapter?: DeviceAdapter;
  /** Overrides the stored mode for the first render. */
  readonly initialMode?: DeviceMode;
}

/** How many events `events` keeps. `state` events are not logged — `state` already carries them. */
export const DEVICE_EVENT_LOG_LIMIT = 100;

const DeviceContext = createContext<DeviceContextValue | null>(null);

function appendCapped(events: readonly DeviceEvent[], event: DeviceEvent): readonly DeviceEvent[] {
  const kept = events.length >= DEVICE_EVENT_LOG_LIMIT ? events.slice(events.length - DEVICE_EVENT_LOG_LIMIT + 1) : events;
  return [...kept, event];
}

export function DeviceProvider({ storage, children, adapter, initialMode }: DeviceProviderProps) {
  const { preferences } = usePreferences();
  /** Demo Mode only. The hardware adapter always gets COMMAND_WINDOW_MS (firmware ARM_WINDOW_MS). */
  const mockCommandWindowMs = preferences.longerInteractionTime ? COMMAND_WINDOW_LONG_MS : COMMAND_WINDOW_MS;

  const [initial] = useState(() => {
    const injectedHardware = adapter && adapter.kind !== 'mock' ? adapter : null;
    const mode: DeviceMode = initialMode ?? (injectedHardware ? 'hardware' : loadDeviceRecord(storage).mode);
    return { mode, injectedHardware };
  });
  const [mockAdapter] = useState<DeviceAdapter>(() =>
    adapter && adapter.kind === 'mock' ? adapter : new MockDeviceAdapter({ commandWindowMs: mockCommandWindowMs }),
  );
  const [hardwareAdapter, setHardwareAdapter] = useState<DeviceAdapter | null>(
    () =>
      initial.injectedHardware ??
      (initial.mode === 'hardware' ? new WebBluetoothDeviceAdapter(storage, { commandWindowMs: COMMAND_WINDOW_MS }) : null),
  );
  const [mode, setModeState] = useState<DeviceMode>(initial.mode);
  const [events, setEvents] = useState<readonly DeviceEvent[]>([]);
  const [actionError, setActionError] = useState<DeviceError | null>(null);
  const listeners = useRef(new Set<DeviceEventListener>());

  const active = mode === 'hardware' && hardwareAdapter ? hardwareAdapter : mockAdapter;

  const subscribeToState = useCallback(
    (onChange: () => void) =>
      active.subscribe((event) => {
        if (event.type === 'state' || event.type === 'gate') onChange();
      }),
    [active],
  );
  const adapterState = useSyncExternalStore(subscribeToState, () => active.getState());

  // Event log and raw fan-out.
  useEffect(
    () =>
      active.subscribe((event) => {
        if (event.type !== 'state') setEvents((prev) => appendCapped(prev, event));
        for (const listener of [...listeners.current]) {
          try {
            listener(event);
          } catch {}
        }
      }),
    [active],
  );

  // Preferences → command window. Only the simulated ring follows "Longer interaction time";
  // the bench firmware's window is fixed, so the hardware adapter is pinned to COMMAND_WINDOW_MS.
  useEffect(() => {
    mockAdapter.configure({ commandWindowMs: mockCommandWindowMs });
  }, [mockAdapter, mockCommandWindowMs]);
  useEffect(() => {
    hardwareAdapter?.configure({ commandWindowMs: COMMAND_WINDOW_MS });
  }, [hardwareAdapter]);

  // Owned adapters release their timers and connections on unmount.
  useEffect(() => {
    if (mockAdapter === adapter) return undefined;
    return () => mockAdapter.destroy();
  }, [mockAdapter, adapter]);
  useEffect(() => {
    if (!hardwareAdapter || hardwareAdapter === adapter) return undefined;
    return () => hardwareAdapter.destroy();
  }, [hardwareAdapter, adapter]);

  const setMode = useCallback(
    (next: DeviceMode) => {
      saveDeviceRecord(storage, { mode: next });
      setActionError(null);
      if (next === 'hardware') {
        if (isMockDeviceAdapter(mockAdapter)) mockAdapter.controls.closeWindow();
        if (!hardwareAdapter) {
          setHardwareAdapter(new WebBluetoothDeviceAdapter(storage, { commandWindowMs: COMMAND_WINDOW_MS }));
        }
      } else if (hardwareAdapter) {
        hardwareAdapter.disconnect().catch(() => undefined);
      }
      setModeState(next);
    },
    [storage, mockAdapter, hardwareAdapter],
  );

  const run = useCallback(
    async (action: (target: DeviceAdapter) => Promise<void>) => {
      setActionError(null);
      try {
        await action(active);
      } catch {
        setActionError(deviceError(active.kind === 'mock' ? 'unknown' : 'connection_failed'));
      }
    },
    [active],
  );
  const connect = useCallback(() => run((target) => target.connect()), [run]);
  const disconnect = useCallback(() => run((target) => target.disconnect()), [run]);
  const forget = useCallback(() => run((target) => target.forget()), [run]);
  const ping = useCallback(() => run((target) => target.ping()), [run]);
  const clearEvents = useCallback(() => setEvents([]), []);
  const subscribe = useCallback((listener: DeviceEventListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const state = useMemo<DeviceState>(
    () => (actionError ? { ...adapterState, error: actionError } : adapterState),
    [adapterState, actionError],
  );
  const capabilities = useMemo(() => active.capabilities(), [active]);
  const mock = mode === 'demo' && isMockDeviceAdapter(active) ? active.controls : null;

  const value = useMemo<DeviceContextValue>(
    () => ({
      state,
      capabilities,
      events,
      adapter: active,
      mock,
      setMode,
      connect,
      disconnect,
      forget,
      ping,
      clearEvents,
      subscribe,
    }),
    [state, capabilities, events, active, mock, setMode, connect, disconnect, forget, ping, clearEvents, subscribe],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used inside <DeviceProvider>');
  return ctx;
}
