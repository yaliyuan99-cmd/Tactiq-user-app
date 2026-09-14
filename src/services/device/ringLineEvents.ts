/**
 * Turns one protocol line from a hardware ring into device events and the
 * resulting state. Pure, so it is testable without Bluetooth.
 */
import { parseRingLine } from '@/domain/protocol';
import type { DeviceEvent, DeviceState } from './types';

export interface InterpretedLine {
  readonly state: DeviceState;
  /** In emission order: the raw line first, then what it means. */
  readonly events: readonly DeviceEvent[];
}

export function interpretRingLine(raw: string, state: DeviceState, at: number): InterpretedLine {
  const events: DeviceEvent[] = [{ type: 'line', raw, at }];
  const parsed = parseRingLine(raw);
  switch (parsed.kind) {
    case 'token':
      events.push({ type: 'token', token: parsed.token, contact: parsed.contact, durationMs: parsed.durationMs, at });
      return { state, events };
    case 'gate': {
      const armed = parsed.state === 'armed';
      // The ring reports only armed/idle; the closing time is the app's estimate from its own window length.
      const closesAt = armed ? at + state.commandWindowMs : null;
      const next: DeviceState = { ...state, gate: { armed, closesAt } };
      events.push({ type: 'gate', armed, closesAt, at }, { type: 'state', state: next, at });
      return { state: next, events };
    }
    case 'hello': {
      const next: DeviceState = state.device
        ? { ...state, device: { ...state.device, firmwareVersion: parsed.firmwareVersion } }
        : state;
      events.push({ type: 'hello', firmwareVersion: parsed.firmwareVersion, at }, { type: 'state', state: next, at });
      return { state: next, events };
    }
    case 'battery':
      // The bench firmware's value is a fixed stub: it goes to the log, never into device.battery.
      events.push({ type: 'battery', percentage: parsed.percentage, isStub: true, at });
      return { state, events };
    default:
      return { state, events };
  }
}
