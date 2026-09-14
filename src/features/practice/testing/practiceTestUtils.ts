/**
 * Test helpers for the practice core: a scriptable hardware ring and a
 * speech-synthesis spy that records every announcement in order.
 */
import { act } from '@testing-library/react';
import type { DeviceAdapter, DeviceEvent, DeviceEventListener, DeviceState } from '@/services/device/types';

type RingOutput = Extract<DeviceEvent, { type: 'gate' | 'token' | 'reject' }>;
type WithoutTime<T> = T extends unknown ? Omit<T, 'at'> : never;

/** A connected hardware ring whose protocol events are pushed by the test. */
export class FakeHardwareRing implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;
  private readonly listeners = new Set<DeviceEventListener>();
  private state: DeviceState;

  constructor(status: DeviceState['status'] = 'connected') {
    this.state = {
      mode: 'hardware',
      status,
      device:
        status === 'connected'
          ? {
              id: 'bench-ring',
              name: 'Tactiq Ring',
              firmwareVersion: 'fw0.2',
              battery: { reported: false, note: 'Not reported' },
              lastConnectedAt: null,
              evidence: 'measured',
            }
          : null,
      remembered: null,
      error: null,
      gate: { armed: false, closesAt: null },
      commandWindowMs: 3000,
    };
  }

  capabilities() {
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
  connect(): Promise<void> {
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  forget(): Promise<void> {
    return Promise.resolve();
  }
  ping(): Promise<void> {
    return Promise.resolve();
  }
  configure(): void {}
  destroy(): void {}

  /** Sends one event as the ring would; gate events also update the state. */
  send(event: WithoutTime<RingOutput>): void {
    const at = Date.now();
    const full = { ...event, at } as RingOutput;
    if (full.type === 'gate') {
      this.state = { ...this.state, gate: { armed: full.armed, closesAt: full.closesAt } };
    }
    this.emit(full);
    if (full.type === 'gate') this.emit({ type: 'state', state: this.state, at });
  }

  private emit(event: DeviceEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}

class FakeUtterance {
  rate = 1;
  lang = '';
  constructor(readonly text: string) {}
}

export interface SpeechSpy {
  /** Every message spoken, in order. */
  messages(): string[];
  restore(): void;
}

/**
 * Installs a fake speechSynthesis. With audio announcements on, every
 * announce() speaks once, so the list of spoken messages is an exact log of
 * announcements. Install it before rendering.
 */
export function installSpeechSpy(): SpeechSpy {
  const speak = vi.fn();
  const synth = { speak, cancel: vi.fn() };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  return {
    messages: () => speak.mock.calls.map((call) => (call[0] as FakeUtterance).text),
    restore: () => {
      Reflect.deleteProperty(window, 'speechSynthesis');
      Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
    },
  };
}

/**
 * Lets the provider stack finish its asynchronous start-up (the auth session
 * check) inside act, so synchronous tests end without act warnings.
 */
export async function settleProviders(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
