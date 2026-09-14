/**
 * Demo Mode's ring. It is the simulated ring itself: the RingStateMachine
 * runs the firmware's gate → window → tap/hold logic and this adapter
 * re-emits its events in the same stream a hardware ring feeds. Nothing it
 * reports is measured — the device is labelled simulated and its battery is
 * never reported.
 */
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { detectCapabilities } from './capabilities';
import { DeviceEventEmitter } from './DeviceEventEmitter';
import { RingStateMachine, type RingSnapshot, type RingStateMachineOptions } from './RingStateMachine';
import type { Clock, Scheduler } from './scheduler';
import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceEventListener,
  DeviceInfo,
  DeviceState,
  MockDeviceAdapter as MockDeviceAdapterContract,
  MockRingControls,
} from './types';

export const MOCK_DEVICE_ID = 'mock-ring';
export const MOCK_DEVICE_NAME = 'Tactiq Ring (simulated)';
export const MOCK_FIRMWARE_VERSION = 'fw0.2 (simulated)';

export interface MockDeviceAdapterOptions {
  readonly now?: Clock;
  readonly scheduler?: Scheduler;
  readonly commandWindowMs?: number;
  /** Test injection; defaults to the real browser capabilities. */
  readonly capabilities?: () => DeviceCapabilities;
}

export class MockDeviceAdapter implements MockDeviceAdapterContract {
  readonly kind = 'mock' as const;
  readonly controls: MockRingControls;

  private readonly machine: RingStateMachine;
  private readonly emitter = new DeviceEventEmitter();
  private readonly now: Clock;
  private readonly detect: () => DeviceCapabilities;
  private state: DeviceState;

  constructor(options: MockDeviceAdapterOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.detect = options.capabilities ?? (() => detectCapabilities());
    const machineOptions: RingStateMachineOptions = {
      now: this.now,
      scheduler: options.scheduler,
      commandWindowMs: options.commandWindowMs,
    };
    this.machine = new RingStateMachine(machineOptions);

    const device: DeviceInfo = {
      id: MOCK_DEVICE_ID,
      name: MOCK_DEVICE_NAME,
      firmwareVersion: MOCK_FIRMWARE_VERSION,
      battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
      lastConnectedAt: new Date(this.now()).toISOString(),
      evidence: 'simulated',
    };
    this.state = {
      mode: 'demo',
      status: 'ready',
      device,
      remembered: null,
      error: null,
      gate: { armed: false, closesAt: null },
      commandWindowMs: this.machine.getCommandWindowMs(),
    };

    // State is updated before the gate event goes out, so a listener reading getState() sees the new window.
    this.machine.subscribe((event) => {
      if (event.type !== 'gate') {
        this.emitter.emit(event);
        return;
      }
      this.state = { ...this.state, gate: { armed: event.armed, closesAt: event.closesAt } };
      this.emitter.emit(event);
      this.emitter.emit({ type: 'state', state: this.state, at: event.at });
    });

    const machine = this.machine;
    this.controls = {
      squeeze: () => machine.squeeze(),
      pressStart: (contact) => machine.pressStart(contact),
      pressEnd: (contact) => machine.pressEnd(contact),
      tap: (contact, durationMs) => machine.tap(contact, durationMs),
      cancel: () => machine.cancel(),
      closeWindow: () => machine.closeWindow(),
    };
  }

  capabilities(): DeviceCapabilities {
    return this.detect();
  }

  getState(): DeviceState {
    return this.state;
  }

  /** The simulated ring's internal state: the press in progress and whether an emergency hold completed. */
  getRingSnapshot(): RingSnapshot {
    return this.machine.getSnapshot();
  }

  subscribe(listener: DeviceEventListener): () => void {
    return this.emitter.subscribe(listener);
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  forget(): Promise<void> {
    return Promise.resolve();
  }

  /** The simulated ring answers at once; the reply appears in the diagnostic log. */
  ping(): Promise<void> {
    this.emitter.emit({ type: 'line', raw: 'STA,pong', at: this.now() });
    return Promise.resolve();
  }

  configure(options: { commandWindowMs?: number }): void {
    this.machine.configure(options);
    const commandWindowMs = this.machine.getCommandWindowMs();
    if (commandWindowMs !== this.state.commandWindowMs) this.setState({ commandWindowMs });
  }

  /** Clears timers and listeners. The adapter stays usable, so a StrictMode remount can subscribe again. */
  destroy(): void {
    this.machine.destroy();
    this.emitter.clear();
    if (this.state.gate.armed) this.state = { ...this.state, gate: { armed: false, closesAt: null } };
  }

  private setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    this.emitter.emit({ type: 'state', state: this.state, at: this.now() });
  }
}

export function createMockDeviceAdapter(options: MockDeviceAdapterOptions = {}): MockDeviceAdapter {
  return new MockDeviceAdapter(options);
}

export function isMockDeviceAdapter(adapter: DeviceAdapter): adapter is MockDeviceAdapterContract {
  return adapter.kind === 'mock' && 'controls' in adapter;
}
