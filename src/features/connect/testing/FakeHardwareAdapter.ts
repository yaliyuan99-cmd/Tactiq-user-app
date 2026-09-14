/**
 * A hardware adapter for tests whose state the test drives directly. It
 * reports kind "web_bluetooth" so DeviceProvider treats it as the hardware
 * ring, and it records every action the page asks for.
 */
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceEvent,
  DeviceEventListener,
  DeviceState,
} from '@/services/device/types';

export const SUPPORTED_CAPABILITIES: DeviceCapabilities = { webBluetooth: true, secureContext: true, reason: null };

export function hardwareState(patch: Partial<DeviceState> = {}): DeviceState {
  return {
    mode: 'hardware',
    status: 'disconnected',
    device: null,
    remembered: null,
    error: null,
    gate: { armed: false, closesAt: null },
    commandWindowMs: COMMAND_WINDOW_MS,
    ...patch,
  };
}

export interface FakeHardwareCalls {
  connect: number;
  disconnect: number;
  forget: number;
  ping: number;
}

export class FakeHardwareAdapter implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;
  readonly calls: FakeHardwareCalls = { connect: 0, disconnect: 0, forget: 0, ping: 0 };
  private state: DeviceState;
  private readonly listeners = new Set<DeviceEventListener>();

  constructor(
    initial: Partial<DeviceState> = {},
    private readonly caps: DeviceCapabilities = SUPPORTED_CAPABILITIES,
  ) {
    this.state = hardwareState(initial);
  }

  capabilities(): DeviceCapabilities {
    return this.caps;
  }

  getState(): DeviceState {
    return this.state;
  }

  subscribe(listener: DeviceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Changes the state and notifies, as a real adapter would. Wrap in act() in tests. */
  setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    this.emit({ type: 'state', state: this.state, at: Date.now() });
  }

  emit(event: DeviceEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  /** A raw protocol line from the ring. */
  sendLine(raw: string): void {
    this.emit({ type: 'line', raw, at: Date.now() });
  }

  async connect(): Promise<void> {
    this.calls.connect += 1;
  }

  async disconnect(): Promise<void> {
    this.calls.disconnect += 1;
    this.setState({ status: 'disconnected', device: null, error: null, gate: { armed: false, closesAt: null } });
  }

  async forget(): Promise<void> {
    this.calls.forget += 1;
    this.setState({ status: 'disconnected', device: null, error: null, remembered: null });
  }

  async ping(): Promise<void> {
    this.calls.ping += 1;
  }

  configure(options: { commandWindowMs?: number }): void {
    if (typeof options.commandWindowMs === 'number') this.state = { ...this.state, commandWindowMs: options.commandWindowMs };
  }

  destroy(): void {
    this.listeners.clear();
  }
}
