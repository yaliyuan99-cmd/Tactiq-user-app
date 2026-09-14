/**
 * A hardware adapter for tests in a browser that can use Web Bluetooth.
 * connect() walks through scanning to connected, as a successful chooser would.
 */
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import type { DeviceAdapter, DeviceCapabilities, DeviceEventListener, DeviceState } from '@/services/device/types';

export class FakeBluetoothRing implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;
  connectCalls = 0;
  private state: DeviceState = {
    mode: 'hardware',
    status: 'disconnected',
    device: null,
    remembered: null,
    error: null,
    gate: { armed: false, closesAt: null },
    commandWindowMs: COMMAND_WINDOW_MS,
  };
  private readonly listeners = new Set<DeviceEventListener>();

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

  setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener({ type: 'state', state: this.state, at: Date.now() });
  }

  async connect(): Promise<void> {
    this.connectCalls += 1;
    this.setState({ status: 'scanning' });
    await Promise.resolve();
    this.setState({
      status: 'connected',
      device: {
        id: 'bench-ring',
        name: 'Tactiq Ring',
        firmwareVersion: null,
        battery: { reported: false, note: 'Not reported' },
        lastConnectedAt: null,
        evidence: 'measured',
      },
    });
  }

  async disconnect(): Promise<void> {
    this.setState({ status: 'disconnected', device: null });
  }

  async forget(): Promise<void> {
    this.setState({ status: 'disconnected', device: null, remembered: null });
  }

  async ping(): Promise<void> {}

  configure(): void {}

  destroy(): void {}
}
