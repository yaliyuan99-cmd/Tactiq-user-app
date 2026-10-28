/**
 * Reads the protocol lines a hardware ring writes and turns them into device
 * events and the resulting state.
 *
 * Everything here treats the ring as untrusted. A line only becomes an event
 * when it parses completely (see `parseRingLine`), and the Emergency outcome
 * — the one outcome that matters most and the one this app can never verify —
 * is only accepted when the app's own record of the command window makes a
 * five-second hold possible. A firmware bug, a retransmit loop or a hostile
 * device therefore cannot announce an emergency that nobody performed.
 *
 * What is dropped is counted, never hidden: `diagnostics()` carries bounded
 * counts for the bench log, and every raw line is still emitted as a `line`
 * event, so nothing disappears from the connection log.
 */
import { LineAssembler, countOnce, parseRingLine } from '@/domain/protocol';
import { EMERGENCY_HOLD_MS } from '@/domain/timing';
import type { DeviceEvent, DeviceState } from './types';

export interface InterpretedLine {
  readonly state: DeviceState;
  /** In emission order: the raw line first, then what it means. */
  readonly events: readonly DeviceEvent[];
}

/**
 * Two genuine emergencies cannot be closer together than one five-second
 * hold, so an identical emergency line repeated inside this window is a
 * retransmission of the same hold, not a second one. Judgement, not a
 * research constant: it is derived from EMERGENCY_HOLD_MS rather than chosen,
 * and it only ever discards a line that is byte-for-byte the same as the one
 * just accepted (same device uptime), which a real second hold never is.
 */
export const EMERGENCY_DEDUPE_MS = EMERGENCY_HOLD_MS;

/** Bounded counts of what the ring sent that could not be believed. */
export interface RingLineDiagnostics {
  /** Lines dropped by the assembler for being longer than a protocol line. */
  readonly droppedLines: number;
  /** Lines that reached the parser and did not parse. */
  readonly invalidLines: number;
  /** Emergency tokens refused because the gate and the reported hold did not make one possible. */
  readonly refusedEmergencies: number;
  /** Emergency tokens dropped as repeats of the one just accepted. */
  readonly duplicateEmergencies: number;
}

const NO_DIAGNOSTICS: RingLineDiagnostics = {
  droppedLines: 0,
  invalidLines: 0,
  refusedEmergencies: 0,
  duplicateEmergencies: 0,
};

/**
 * One reader per connection. It holds the notification buffer and what the
 * app has seen of the gate, which is what makes the emergency check possible.
 */
export class RingLineReader {
  private readonly assembler: LineAssembler;
  /** When this app saw the window open, by its own clock, or null when closed. */
  private armedAt: number | null = null;
  /** The ring's uptime in that same gate line, for a check BLE latency cannot distort. */
  private armedUptimeMs: number | null = null;
  private lastEmergency: { raw: string; at: number } | null = null;
  private invalid = 0;
  private refused = 0;
  private duplicates = 0;

  constructor(maxLineLength?: number) {
    this.assembler = maxLineLength === undefined ? new LineAssembler() : new LineAssembler(maxLineLength);
  }

  /** Complete lines from one notification chunk; a chunk may hold none, one or several. */
  push(chunk: string): readonly string[] {
    return this.assembler.push(chunk);
  }

  diagnostics(): RingLineDiagnostics {
    return {
      droppedLines: this.assembler.droppedLines,
      invalidLines: this.invalid,
      refusedEmergencies: this.refused,
      duplicateEmergencies: this.duplicates,
    };
  }

  /** New connection: the buffer and the gate memory start again. Counts are kept for the session. */
  reset(): void {
    this.assembler.reset();
    this.armedAt = null;
    this.armedUptimeMs = null;
    this.lastEmergency = null;
  }

  interpret(raw: string, state: DeviceState, at: number): InterpretedLine {
    const events: DeviceEvent[] = [{ type: 'line', raw, at }];
    const parsed = parseRingLine(raw);
    switch (parsed.kind) {
      case 'token': {
        if (parsed.token === 'emergency' && !this.acceptEmergency(raw, parsed.durationMs, parsed.deviceUptimeMs, state, at)) {
          // The raw line stays in the log; it just never becomes an Emergency outcome.
          return { state, events };
        }
        events.push({ type: 'token', token: parsed.token, contact: parsed.contact, durationMs: parsed.durationMs, at });
        return { state, events };
      }
      case 'gate': {
        const armed = parsed.state === 'armed';
        this.armedAt = armed ? at : null;
        this.armedUptimeMs = armed ? parsed.deviceUptimeMs : null;
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
      case 'unknown':
        this.invalid = countOnce(this.invalid);
        return { state, events };
      default:
        return { state, events };
    }
  }

  /**
   * Whether a hardware emergency token can be believed. All four must hold:
   * the window is open as far as this app knows; the app saw it open at least
   * a five-second hold ago; the ring's own uptime puts the start of the hold
   * no earlier than that same gate line; and the reported hold is at least
   * EMERGENCY_HOLD_MS. Accepting one consumes the arming, so the next
   * emergency needs a fresh squeeze — no retransmit loop can repeat it.
   *
   * Nothing is sent anywhere when an emergency is accepted (this app only
   * reports and records), so refusing a doubtful one withholds a message, not
   * help. The uptime check is refused once per `millis()` wrap (about every
   * 49.7 days of ring uptime); the cost is one more squeeze and hold.
   */
  private acceptEmergency(raw: string, durationMs: number, deviceUptimeMs: number, state: DeviceState, at: number): boolean {
    const previous = this.lastEmergency;
    if (previous && previous.raw === raw && at - previous.at < EMERGENCY_DEDUPE_MS) {
      this.duplicates = countOnce(this.duplicates);
      return false;
    }
    const armedAt = this.armedAt;
    const armedUptimeMs = this.armedUptimeMs;
    const plausible =
      state.gate.armed &&
      armedAt !== null &&
      armedUptimeMs !== null &&
      durationMs >= EMERGENCY_HOLD_MS &&
      at - armedAt >= EMERGENCY_HOLD_MS &&
      deviceUptimeMs - durationMs >= armedUptimeMs;
    if (!plausible) {
      this.refused = countOnce(this.refused);
      return false;
    }
    this.lastEmergency = { raw, at };
    this.armedAt = null;
    this.armedUptimeMs = null;
    return true;
  }
}

/** Empty counts, for a device that has no line reader (the simulated ring). */
export function noRingLineDiagnostics(): RingLineDiagnostics {
  return NO_DIAGNOSTICS;
}
