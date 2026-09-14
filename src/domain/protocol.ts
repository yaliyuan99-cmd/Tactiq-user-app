/**
 * The ring's Bluetooth protocol, as documented in `docs/PROTOCOL.md` of the
 * research repo. These are the standard Nordic UART Service (NUS) UUIDs the
 * bench firmware advertises — nothing here is invented.
 */
import { type ContactKey, isContactKey } from './contacts';
import { type CommandToken, isCommandToken } from './commands';

export const DEVICE_NAME = 'Tactiq Ring';
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
/** Ring → phone, notify. */
export const NUS_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
/** Phone → ring, write. Only `PING` is defined. */
export const NUS_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const PING_COMMAND = 'PING';

/**
 * The bench firmware sends `STA,battery,100` every 30 s from a stub — there is
 * no fuel gauge on the bench build. The app therefore never shows a battery
 * percentage from the ring.
 */
export const FIRMWARE_BATTERY_IS_STUB = true;
export const BATTERY_UNAVAILABLE_NOTE = 'Not reported — the bench firmware sends a fixed placeholder, not a reading.';

export type RingLine =
  | { kind: 'token'; token: CommandToken; contact: ContactKey; deviceUptimeMs: number; durationMs: number }
  | { kind: 'gate'; state: 'armed' | 'idle'; deviceUptimeMs: number }
  | { kind: 'hello'; firmwareVersion: string }
  | { kind: 'battery'; percentage: number; isStub: true }
  | { kind: 'pong' }
  | { kind: 'unknown'; raw: string };

/**
 * Parse one newline-terminated line from the ring.
 *   TOK,<token>,<contact_key>,<t_ms>,<dur_ms>
 *   GATE,armed|idle,<t_ms>
 *   STA,hello,<fw>   STA,battery,<pct>   STA,pong
 */
export function parseRingLine(rawLine: string): RingLine {
  const raw = rawLine.replace(/\r$/, '').trim();
  const parts = raw.split(',');
  const head = parts[0];
  if (head === 'TOK' && parts.length >= 5) {
    const token = parts[1];
    const contact = parts[2];
    const t = Number(parts[3]);
    const dur = Number(parts[4]);
    if (isCommandToken(token) && isContactKey(contact) && Number.isFinite(t) && Number.isFinite(dur)) {
      return { kind: 'token', token, contact, deviceUptimeMs: t, durationMs: dur };
    }
    return { kind: 'unknown', raw };
  }
  if (head === 'GATE' && parts.length >= 3) {
    const state = parts[1];
    const t = Number(parts[2]);
    if ((state === 'armed' || state === 'idle') && Number.isFinite(t)) {
      return { kind: 'gate', state, deviceUptimeMs: t };
    }
    return { kind: 'unknown', raw };
  }
  if (head === 'STA') {
    if (parts[1] === 'hello' && parts[2]) return { kind: 'hello', firmwareVersion: parts[2] };
    if (parts[1] === 'battery') {
      const pct = Number(parts[2]);
      if (Number.isFinite(pct)) return { kind: 'battery', percentage: pct, isStub: true };
    }
    if (parts[1] === 'pong') return { kind: 'pong' };
  }
  return { kind: 'unknown', raw };
}

/** Reassembles complete lines from arbitrary BLE notification chunks. */
export class LineAssembler {
  private buffer = '';
  constructor(private readonly maxLength = 512) {}

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];
    let idx = this.buffer.indexOf('\n');
    while (idx >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line) lines.push(line);
      idx = this.buffer.indexOf('\n');
    }
    if (this.buffer.length > this.maxLength) this.buffer = '';
    return lines;
  }

  reset(): void {
    this.buffer = '';
  }
}
