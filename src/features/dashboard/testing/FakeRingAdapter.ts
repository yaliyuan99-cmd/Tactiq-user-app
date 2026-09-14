/**
 * A hardware adapter for dashboard tests. It reports kind "web_bluetooth" so
 * DeviceProvider treats it as the Bluetooth ring; the test sets its state.
 */
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceEventListener,
  DeviceState,
} from '@/services/device/types';

const CAPABILITIES: DeviceCapabilities = { webBluetooth: true, secureContext: true, reason: null };

export class FakeRingAdapter implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;
  private state: DeviceState;
  private readonly listeners = new Set<DeviceEventListener>();

  constructor(initial: Partial<DeviceState> = {}) {
    this.state = {
      mode: 'hardware',
      status: 'disconnected',
      device: null,
      remembered: null,
      error: null,
      gate: { armed: false, closesAt: null },
      commandWindowMs: COMMAND_WINDOW_MS,
      ...initial,
    };
  }

  capabilities(): DeviceCapabilities {
    return CAPABILITIES;
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

  /** Wrap in act() in tests. */
  setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener({ type: 'state', state: this.state, at: Date.now() });
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async forget(): Promise<void> {}
  async ping(): Promise<void> {}
  configure(): void {}
  destroy(): void {
    this.listeners.clear();
  }
}
