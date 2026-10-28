import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS, EMERGENCY_HOLD_MS, GATE_HOLD_MS } from '@/domain/timing';
import { MockDeviceAdapter, isMockDeviceAdapter } from './MockDeviceAdapter';
import type { DeviceEvent } from './types';

const START = Date.UTC(2026, 8, 15, 9, 30);

function setup() {
  const adapter = new MockDeviceAdapter({
    capabilities: () => ({ webBluetooth: false, secureContext: true, reason: 'No Web Bluetooth here.' }),
  });
  const events: DeviceEvent[] = [];
  adapter.subscribe((event) => events.push(event));
  return { adapter, events, types: () => events.map((e) => e.type) };
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MockDeviceAdapter', () => {
  it('describes a simulated ring that never reports a battery level', () => {
    const { adapter } = setup();
    expect(adapter.kind).toBe('mock');
    expect(isMockDeviceAdapter(adapter)).toBe(true);
    expect(adapter.getState()).toEqual({
      mode: 'demo',
      status: 'ready',
      device: {
        id: 'mock-ring',
        name: 'Tactiq Ring (simulated)',
        firmwareVersion: 'fw0.2 (simulated)',
        battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
        lastConnectedAt: new Date(START).toISOString(),
        evidence: 'simulated',
      },
      remembered: null,
      error: null,
      gate: { armed: false, closesAt: null },
      commandWindowMs: COMMAND_WINDOW_MS,
    });
  });

  it('passes capabilities through', () => {
    const { adapter } = setup();
    expect(adapter.capabilities()).toEqual({ webBluetooth: false, secureContext: true, reason: 'No Web Bluetooth here.' });
  });

  it('re-emits ring events and mirrors the gate in state', () => {
    const { adapter, events, types } = setup();
    adapter.controls.squeeze();
    expect(types()).toEqual(['activating']);
    expect(events[0]).toMatchObject({ type: 'activating', active: true });
    vi.advanceTimersByTime(GATE_HOLD_MS);
    const closesAt = Date.now() + COMMAND_WINDOW_MS;
    // The activating phase ends as the window opens, before the gate event.
    expect(types()).toEqual(['activating', 'activating', 'gate', 'state']);
    expect(events[1]).toMatchObject({ type: 'activating', active: false });
    expect(adapter.getState().gate).toEqual({ armed: true, closesAt });
    expect(events[3]).toMatchObject({ type: 'state', state: { gate: { armed: true, closesAt } } });

    events.length = 0;
    adapter.controls.tap('index_base');
    expect(types()).toEqual(['press', 'token', 'gate', 'state']);
    expect(events[1]).toMatchObject({ type: 'token', token: 'back', contact: 'index_base' });

    events.length = 0;
    adapter.controls.pressStart('middle_tip');
    vi.advanceTimersByTime(800);
    adapter.controls.pressEnd('middle_tip');
    expect(types()).toEqual(['press', 'reject']);
  });

  it('reports a tap during the activating phase as the window still opening', () => {
    const { adapter, events } = setup();
    adapter.controls.squeeze();
    adapter.controls.tap('ring_tip');
    expect(events.filter((e) => e.type === 'reject')).toEqual([
      expect.objectContaining({ type: 'reject', reason: 'window_opening', contact: 'ring_tip' }),
    ]);
    expect(adapter.getRingSnapshot()).toMatchObject({ activating: true, armed: false });
  });

  it('updates state before the gate event reaches listeners', () => {
    const { adapter } = setup();
    const seen: boolean[] = [];
    adapter.subscribe((event) => {
      if (event.type === 'gate') seen.push(adapter.getState().gate.armed === event.armed);
    });
    adapter.controls.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS + COMMAND_WINDOW_MS);
    expect(seen).toEqual([true, true]);
  });

  it('streams emergency hold progress and the emergency token', () => {
    const { adapter, events } = setup();
    adapter.controls.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS);
    adapter.controls.pressStart('pinky_tip');
    vi.advanceTimersByTime(EMERGENCY_HOLD_MS);
    expect(events.filter((e) => e.type === 'hold_progress').length).toBeGreaterThan(40);
    expect(events.filter((e) => e.type === 'token')).toEqual([
      expect.objectContaining({ token: 'emergency', contact: 'pinky_tip' }),
    ]);
    expect(adapter.getState().gate.armed).toBe(false);
    expect(adapter.getRingSnapshot()).toMatchObject({ emergencyFired: true, pressing: { contact: 'pinky_tip' } });
  });

  it('rejects taps while the window is closed', () => {
    const { adapter, events } = setup();
    adapter.controls.tap('ring_tip');
    expect(events).toEqual([expect.objectContaining({ type: 'reject', reason: 'not_armed', contact: 'ring_tip' })]);
  });

  it('closeWindow closes the window through the controls', () => {
    const { adapter } = setup();
    adapter.controls.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS);
    adapter.controls.closeWindow();
    expect(adapter.getState().gate).toEqual({ armed: false, closesAt: null });
  });

  it('configure updates the command window and emits state', () => {
    const { adapter, types } = setup();
    adapter.configure({ commandWindowMs: COMMAND_WINDOW_LONG_MS });
    expect(adapter.getState().commandWindowMs).toBe(COMMAND_WINDOW_LONG_MS);
    expect(types()).toEqual(['state']);
    adapter.configure({ commandWindowMs: COMMAND_WINDOW_LONG_MS });
    expect(types()).toEqual(['state']);
  });

  it('resolves connection calls at once, and answers a ping in the log', async () => {
    const { adapter, events } = setup();
    await adapter.connect();
    await adapter.disconnect();
    await adapter.forget();
    await adapter.ping();
    expect(events).toEqual([{ type: 'line', raw: 'STA,pong', at: START }]);
    expect(adapter.getState().status).toBe('ready');
  });

  it('destroy stops timers and listeners but leaves the ring usable', () => {
    const { adapter, events } = setup();
    adapter.controls.squeeze();
    events.length = 0;
    adapter.destroy();
    vi.advanceTimersByTime(GATE_HOLD_MS);
    expect(events).toEqual([]);
    const again: DeviceEvent[] = [];
    adapter.subscribe((event) => again.push(event));
    adapter.controls.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS);
    expect(again.map((e) => e.type)).toEqual(['activating', 'activating', 'gate', 'state']);
  });
});
