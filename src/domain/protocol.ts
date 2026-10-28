/**
 * The ring's Bluetooth protocol, as documented in `docs/PROTOCOL.md` of the
 * research repo. These are the standard Nordic UART Service (NUS) UUIDs the
 * bench firmware advertises — nothing here is invented.
 *
 * Everything a ring writes is untrusted input. A line is only turned into a
 * value when every field is in range and makes physical sense; anything else
 * becomes `unknown`, so a firmware bug or a hostile device cannot put an
 * impossible number into the app and have it stored as measured evidence.
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

/* ------------------------------------------------------------------ */
/* Field bounds                                                        */
/* ------------------------------------------------------------------ */

/**
 * Longest line accepted from the ring. The bench firmware's longest line is
 * well under 64 characters; a BLE notification cannot exceed the negotiated
 * MTU, so anything longer than this is not a protocol line.
 */
export const MAX_RING_LINE_LENGTH = 512;

/**
 * The firmware's uptime field is Arduino `millis()`: an unsigned 32-bit
 * counter that wraps after about 49.7 days. Nothing outside 0 … 2^32−1 can be
 * an uptime, and a negative one cannot exist at all.
 */
export const MAX_DEVICE_UPTIME_MS = 4_294_967_295;

/**
 * Longest press length accepted from the ring. A press is a human contact
 * between thumb and finger: a minute is already far beyond the five-second
 * emergency hold, so a larger value is a fault, not a measurement.
 */
export const MAX_PRESS_DURATION_MS = 60_000;

/** Longest firmware version string kept. The bench firmware sends "fw0.2". */
export const MAX_FIRMWARE_VERSION_LENGTH = 32;

/** Battery percentages are whole numbers in this range, or they are not percentages. */
export const MAX_BATTERY_PERCENTAGE = 100;

/** Diagnostic counters stop here rather than growing without end. */
export const DIAGNOSTIC_COUNTER_MAX = 9_999;

/** Adds one to a diagnostic count, saturating at DIAGNOSTIC_COUNTER_MAX. */
export function countOnce(count: number): number {
  return count >= DIAGNOSTIC_COUNTER_MAX ? DIAGNOSTIC_COUNTER_MAX : count + 1;
}

/** Digits only: no sign, no decimal point, no exponent, no hex, and never empty. */
const WHOLE_NUMBER = /^\d{1,10}$/;

/** Printable ASCII, which is all the firmware's identifiers use. */
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;

/**
 * One non-negative whole number, or null when the field is missing, is not a
 * plain number, or is above `max`. `Number()` alone is not enough: it reads
 * '' as 0, '-5' as a finite negative and '1e9' as a billion.
 */
function wholeNumber(field: string | undefined, max: number): number | null {
  if (field === undefined) return null;
  const text = field.trim();
  if (!WHOLE_NUMBER.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value <= max ? value : null;
}

/**
 * The firmware version as the ring sent it, or null when the field is
 * missing, longer than the bound or carries anything but printable ASCII. It
 * is never trimmed down to something shorter and shown as the real version:
 * an unreadable version string means "unknown", not a guess.
 */
export function firmwareVersionFrom(field: string | undefined): string | null {
  if (field === undefined) return null;
  const text = field.trim();
  if (text.length === 0 || text.length > MAX_FIRMWARE_VERSION_LENGTH) return null;
  return PRINTABLE_ASCII.test(text) ? text : null;
}

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
 *
 * Each format takes exactly the fields it names: a line with extra fields is
 * not one of these lines and is reported as unknown rather than read in part.
 */
export function parseRingLine(rawLine: string): RingLine {
  const raw = rawLine.replace(/\r$/, '').trim();
  if (raw.length > MAX_RING_LINE_LENGTH) return { kind: 'unknown', raw: raw.slice(0, MAX_RING_LINE_LENGTH) };
  const parts = raw.split(',');
  const head = parts[0];
  if (head === 'TOK') {
    const token = parts[1];
    const contact = parts[2];
    const deviceUptimeMs = wholeNumber(parts[3], MAX_DEVICE_UPTIME_MS);
    const durationMs = wholeNumber(parts[4], MAX_PRESS_DURATION_MS);
    if (parts.length === 5 && isCommandToken(token) && isContactKey(contact) && deviceUptimeMs !== null && durationMs !== null) {
      return { kind: 'token', token, contact, deviceUptimeMs, durationMs };
    }
    return { kind: 'unknown', raw };
  }
  if (head === 'GATE') {
    const state = parts[1];
    const deviceUptimeMs = wholeNumber(parts[2], MAX_DEVICE_UPTIME_MS);
    if (parts.length === 3 && (state === 'armed' || state === 'idle') && deviceUptimeMs !== null) {
      return { kind: 'gate', state, deviceUptimeMs };
    }
    return { kind: 'unknown', raw };
  }
  if (head === 'STA') {
    if (parts[1] === 'hello' && parts.length === 3) {
      const firmwareVersion = firmwareVersionFrom(parts[2]);
      if (firmwareVersion !== null) return { kind: 'hello', firmwareVersion };
    }
    if (parts[1] === 'battery' && parts.length === 3) {
      const percentage = wholeNumber(parts[2], MAX_BATTERY_PERCENTAGE);
      if (percentage !== null) return { kind: 'battery', percentage, isStub: true };
    }
    if (parts[1] === 'pong' && parts.length === 2) return { kind: 'pong' };
  }
  return { kind: 'unknown', raw };
}

/**
 * Reassembles complete lines from arbitrary BLE notification chunks, which may
 * split one line across chunks or carry several lines coalesced into one.
 *
 * Both the trailing fragment and a complete line are bounded. An over-long
 * line is dropped whole, never cut down to its first `maxLength` characters:
 * a truncated line can look like a valid shorter one, which is exactly how
 * malformed input turns into accepted data. Everything up to the next newline
 * after an overflow is dropped with it, so the tail of a runaway line cannot
 * arrive as a line of its own.
 */
export class LineAssembler {
  private buffer = '';
  /** Inside a line that already overflowed: discard the rest of it. */
  private discarding = false;
  private dropped = 0;

  constructor(private readonly maxLength = MAX_RING_LINE_LENGTH) {}

  /** How many lines have been dropped for being over-long. Saturates; survives `reset`. */
  get droppedLines(): number {
    return this.dropped;
  }

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];
    let start = 0;
    let idx = this.buffer.indexOf('\n');
    while (idx >= 0) {
      const candidate = this.buffer.slice(start, idx);
      start = idx + 1;
      idx = this.buffer.indexOf('\n', start);
      if (this.discarding) {
        // The rest of a line that was already counted as dropped.
        this.discarding = false;
        continue;
      }
      if (candidate.length > this.maxLength) {
        this.dropped = countOnce(this.dropped);
        continue;
      }
      const line = candidate.trim();
      if (line) lines.push(line);
    }
    this.buffer = this.buffer.slice(start);
    if (this.buffer.length > this.maxLength) {
      this.buffer = '';
      this.discarding = true;
      this.dropped = countOnce(this.dropped);
    }
    return lines;
  }

  reset(): void {
    this.buffer = '';
    this.discarding = false;
  }
}
