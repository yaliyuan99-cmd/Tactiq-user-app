/** A hardware-mode adapter whose state a test sets directly. Not used by the running app. */
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import type { DeviceAdapter, DeviceCapabilities, DeviceEventListener, DeviceState } from '@/services/device/types';

export class FakeRingAdapter implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;
  forgetCalls = 0;
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
    return { webBluetooth: true, secureContext: true, reason: null };
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

  private setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener({ type: 'state', state: this.state, at: Date.now() });
  }

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {
    this.setState({ status: 'disconnected', device: null });
  }

  async forget(): Promise<void> {
    this.forgetCalls += 1;
    this.setState({ status: 'disconnected', device: null, remembered: null });
  }

  async ping(): Promise<void> {}

  configure(options: { commandWindowMs?: number }): void {
    if (typeof options.commandWindowMs === 'number') this.state = { ...this.state, commandWindowMs: options.commandWindowMs };
  }

  destroy(): void {
    this.listeners.clear();
  }
}
