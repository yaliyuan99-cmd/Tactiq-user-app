import { act, render, renderHook, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS, GATE_HOLD_MS } from '@/domain/timing';
import { DEFAULT_PREFERENCES } from '@/domain/models';
import { PreferencesProvider } from '@/services/preferences/PreferencesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { WEB_BLUETOOTH_UNAVAILABLE_REASON } from './capabilities';
import { DEVICE_EVENT_LOG_LIMIT, DeviceProvider, useDevice } from './DeviceProvider';
import { loadDeviceRecord } from './deviceStorage';
import { MockDeviceAdapter } from './MockDeviceAdapter';
import { FakeBluetooth, FakeBluetoothDevice } from './testing/fakeBluetooth';
import type { DeviceAdapter, DeviceEvent } from './types';
import { WebBluetoothDeviceAdapter } from './WebBluetoothDeviceAdapter';

function wrapper(storage: StorageAdapter, props: { adapter?: DeviceAdapter; strict?: boolean } = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const tree = (
      <PreferencesProvider storage={storage}>
        <DeviceProvider storage={storage} adapter={props.adapter}>
          {children}
        </DeviceProvider>
      </PreferencesProvider>
    );
    return props.strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
}

function renderDevice(options: { storage?: StorageAdapter; adapter?: DeviceAdapter; strict?: boolean } = {}) {
  const storage = options.storage ?? new MemoryStorageAdapter();
  const hook = renderHook(() => useDevice(), { wrapper: wrapper(storage, options) });
  return { storage, ...hook };
}

function squeezeAndArm(controls: { squeeze(): void }) {
  act(() => {
    controls.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 8, 15, 11, 0) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DeviceProvider', () => {
  it('renders children and starts in Demo Mode with mock controls', () => {
    function Status() {
      const { state, mock } = useDevice();
      return (
        <p>
          {state.status} / {state.device?.name} / {mock ? 'controls' : 'no controls'}
        </p>
      );
    }
    const storage = new MemoryStorageAdapter();
    render(<Status />, { wrapper: wrapper(storage) });
    expect(screen.getByText('ready / Tactiq Ring (simulated) / controls')).toBeInTheDocument();
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useDevice())).toThrow(/inside <DeviceProvider>/);
  });

  it('delivers a squeeze then a tap as a token through subscribe and events', () => {
    const { result } = renderDevice();
    const received: DeviceEvent[] = [];
    act(() => {
      result.current.subscribe((event) => received.push(event));
    });
    const mock = result.current.mock;
    expect(mock).not.toBeNull();
    if (!mock) return;

    squeezeAndArm(mock);
    expect(result.current.state.gate.armed).toBe(true);

    act(() => mock.tap('ring_base'));
    const token = { type: 'token', token: 'previous', contact: 'ring_base', durationMs: 160 };
    expect(received).toContainEqual(expect.objectContaining(token));
    expect(result.current.events.at(-2)).toMatchObject(token);
    expect(result.current.events.at(-1)).toMatchObject({ type: 'gate', armed: true });
    expect(result.current.events.some((e) => e.type === 'state')).toBe(false);

    act(() => result.current.clearEvents());
    expect(result.current.events).toEqual([]);
  });

  it('still receives events under StrictMode double effects', () => {
    const { result } = renderDevice({ strict: true });
    const mock = result.current.mock;
    if (!mock) throw new Error('Expected mock controls');
    squeezeAndArm(mock);
    act(() => mock.tap('index_tip'));
    expect(result.current.events.filter((e) => e.type === 'token')).toHaveLength(1);
    expect(result.current.state.gate.armed).toBe(true);
  });

  it('keeps only the most recent events', () => {
    const { result } = renderDevice();
    act(() => {
      for (let i = 0; i < DEVICE_EVENT_LOG_LIMIT + 20; i += 1) void result.current.ping();
    });
    expect(result.current.events).toHaveLength(DEVICE_EVENT_LOG_LIMIT);
  });

  it('applies the longer interaction time preference to the command window', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: true });
    const { result } = renderDevice({ storage });
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_LONG_MS);
    act(() => {
      storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: false });
    });
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_MS);
  });

  it('gives the hardware adapter the firmware window even with longer interaction time on; the mock gets the longer window', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: true });
    // Constructed with the long window, to prove the provider pins it back to the firmware's.
    const hardware = new WebBluetoothDeviceAdapter(storage, {
      navigator: { bluetooth: new FakeBluetooth(new FakeBluetoothDevice()) },
      window: { isSecureContext: true },
      commandWindowMs: COMMAND_WINDOW_LONG_MS,
    });
    const hardwareConfigure = vi.spyOn(hardware, 'configure');
    const mockConfigure = vi.spyOn(MockDeviceAdapter.prototype, 'configure');

    const { result } = renderDevice({ storage, adapter: hardware });
    expect(result.current.adapter).toBe(hardware);
    expect(hardwareConfigure).toHaveBeenCalledWith({ commandWindowMs: COMMAND_WINDOW_MS });
    expect(hardwareConfigure).not.toHaveBeenCalledWith({ commandWindowMs: COMMAND_WINDOW_LONG_MS });
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_MS);
    expect(COMMAND_WINDOW_MS).toBe(3000);
    expect(mockConfigure).toHaveBeenCalledWith({ commandWindowMs: COMMAND_WINDOW_LONG_MS });
    expect(mockConfigure).not.toHaveBeenCalledWith({ commandWindowMs: COMMAND_WINDOW_MS });
    expect(COMMAND_WINDOW_LONG_MS).toBe(6000);

    // Toggling the preference while on hardware never changes the hardware window.
    act(() => {
      storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: false });
    });
    act(() => {
      storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: true });
    });
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_MS);
    expect(hardwareConfigure.mock.calls.every(([options]) => options.commandWindowMs === COMMAND_WINDOW_MS)).toBe(true);

    act(() => result.current.setMode('demo'));
    expect(result.current.adapter.kind).toBe('mock');
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_LONG_MS);
  });

  it('creates the Web Bluetooth adapter with the firmware window when switching to hardware with longer interaction time on', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, longerInteractionTime: true });
    const hardwareConfigure = vi.spyOn(WebBluetoothDeviceAdapter.prototype, 'configure');
    const { result } = renderDevice({ storage });
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_LONG_MS);

    act(() => result.current.setMode('hardware'));
    expect(result.current.adapter.kind).toBe('web_bluetooth');
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_MS);
    expect(hardwareConfigure).toHaveBeenCalled();
    expect(hardwareConfigure.mock.calls.every(([options]) => options.commandWindowMs === COMMAND_WINDOW_MS)).toBe(true);

    act(() => result.current.setMode('demo'));
    expect(result.current.state.commandWindowMs).toBe(COMMAND_WINDOW_LONG_MS);
  });

  it('switching to hardware without Web Bluetooth reports unsupported with a reason', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    try {
      const { result, storage } = renderDevice();
      act(() => result.current.setMode('hardware'));
      expect(result.current.adapter.kind).toBe('web_bluetooth');
      expect(result.current.mock).toBeNull();
      expect(result.current.state).toMatchObject({ mode: 'hardware', status: 'unsupported', error: { code: 'unsupported' } });
      expect(result.current.capabilities).toEqual({
        webBluetooth: false,
        secureContext: true,
        reason: WEB_BLUETOOTH_UNAVAILABLE_REASON,
      });
      expect(loadDeviceRecord(storage).mode).toBe('hardware');

      await act(() => result.current.connect());
      expect(result.current.state.status).toBe('unsupported');

      act(() => result.current.setMode('demo'));
      expect(result.current.state).toMatchObject({ mode: 'demo', status: 'ready' });
      expect(result.current.mock).not.toBeNull();
    } finally {
      if (original) Object.defineProperty(window, 'isSecureContext', original);
      else Reflect.deleteProperty(window, 'isSecureContext');
    }
  });

  it('restores the stored mode', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.device, { version: 1, mode: 'hardware', remembered: null });
    const { result } = renderDevice({ storage });
    expect(result.current.state.mode).toBe('hardware');
    expect(result.current.mock).toBeNull();
  });

  it('uses an injected hardware adapter and reflects its connection', async () => {
    const storage = new MemoryStorageAdapter();
    const device = new FakeBluetoothDevice();
    const adapter = new WebBluetoothDeviceAdapter(storage, {
      navigator: { bluetooth: new FakeBluetooth(device) },
      window: { isSecureContext: true },
    });
    const { result } = renderDevice({ storage, adapter });
    expect(result.current.state).toMatchObject({ mode: 'hardware', status: 'disconnected' });

    await act(() => result.current.connect());
    expect(result.current.state.status).toBe('connected');

    act(() => device.tx.notify('TOK,undo,middle_tip,10,140\n'));
    expect(result.current.events).toContainEqual(
      expect.objectContaining({ type: 'token', token: 'undo', contact: 'middle_tip' }),
    );

    await act(() => result.current.disconnect());
    expect(result.current.state.status).toBe('disconnected');
  });

  it('captures a throwing adapter action into state instead of throwing', async () => {
    const adapter = new MockDeviceAdapter();
    vi.spyOn(adapter, 'connect').mockRejectedValue(new Error('boom'));
    const { result } = renderDevice({ adapter });
    await act(() => result.current.connect());
    expect(result.current.state.error).toMatchObject({ code: 'unknown' });
  });
});
