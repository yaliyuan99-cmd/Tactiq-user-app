import { COMMAND_WINDOW_MS, EMERGENCY_HOLD_MS } from '@/domain/timing';
import { EMERGENCY_DEDUPE_MS, RingLineReader, noRingLineDiagnostics } from './ringLineEvents';
import type { DeviceEvent, DeviceState } from './types';

const START = Date.UTC(2026, 8, 15, 12, 0);

const CONNECTED: DeviceState = {
  mode: 'hardware',
  status: 'connected',
  device: {
    id: 'bench-ring',
    name: 'Tactiq Ring',
    firmwareVersion: null,
    battery: { reported: false, note: 'Not reported' },
    lastConnectedAt: null,
    evidence: 'measured',
  },
  remembered: null,
  error: null,
  gate: { armed: false, closesAt: null },
  commandWindowMs: COMMAND_WINDOW_MS,
};

/** Feeds lines through one reader, keeping the state it returns, as the adapter does. */
function session(initial: DeviceState = CONNECTED) {
  const reader = new RingLineReader();
  let state = initial;
  let now = START;
  const events: DeviceEvent[] = [];
  return {
    reader,
    at: () => now,
    advance(ms: number) {
      now += ms;
    },
    /** One notification chunk, exactly as the adapter hands it over. */
    notify(chunk: string): void {
      for (const line of reader.push(chunk)) {
        const result = reader.interpret(line, state, now);
        state = result.state;
        events.push(...result.events);
      }
    },
    state: () => state,
    ofType: <T extends DeviceEvent['type']>(type: T) =>
      events.filter((e): e is Extract<DeviceEvent, { type: T }> => e.type === type),
    events,
  };
}

/** The ring's own uptime, kept in step with the host clock the test advances. */
function uptime(at: number): number {
  return at - START + 1000;
}

describe('RingLineReader lines', () => {
  it('turns each kind of line into its events and keeps the raw line', () => {
    const ring = session();
    ring.notify('STA,hello,fw0.2\nGATE,armed,1000\nTOK,confirm,index_tip,1100,160\nSTA,battery,100\nSTA,pong\n');
    expect(ring.ofType('line').map((e) => e.raw)).toEqual([
      'STA,hello,fw0.2',
      'GATE,armed,1000',
      'TOK,confirm,index_tip,1100,160',
      'STA,battery,100',
      'STA,pong',
    ]);
    expect(ring.ofType('hello')).toEqual([{ type: 'hello', firmwareVersion: 'fw0.2', at: START }]);
    expect(ring.ofType('token')).toEqual([
      { type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 160, at: START },
    ]);
    expect(ring.state().gate).toEqual({ armed: true, closesAt: START + COMMAND_WINDOW_MS });
    expect(ring.reader.diagnostics()).toMatchObject({ invalidLines: 0, droppedLines: 0 });
  });

  it('counts a line that does not parse, logs it and makes nothing of it', () => {
    const ring = session();
    ring.notify('TOK,confirm,index_tip,100,-160\nWHAT,is,this\n');
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.ofType('line')).toHaveLength(2);
    expect(ring.reader.diagnostics().invalidLines).toBe(2);
  });

  it('counts an over-long line as dropped and never parses it', () => {
    const ring = session();
    ring.notify(`TOK,confirm,index_tip,100,${'9'.repeat(600)}\nSTA,pong\n`);
    expect(ring.ofType('line').map((e) => e.raw)).toEqual(['STA,pong']);
    expect(ring.reader.diagnostics()).toMatchObject({ droppedLines: 1, invalidLines: 0 });
  });

  it('reads several lines coalesced into one notification, and lines split across chunks', () => {
    const ring = session();
    ring.notify('GATE,armed,1000\nTOK,next,middle_base,1100,120\nTOK,read,ring_');
    expect(ring.ofType('token')).toHaveLength(1);
    ring.notify('tip,1200,130\n');
    expect(ring.ofType('token').map((e) => e.token)).toEqual(['next', 'read']);
  });

  it('starts again on a new connection, keeping the counts for the session', () => {
    const ring = session();
    ring.notify('WHAT\n');
    ring.reader.reset();
    expect(ring.reader.diagnostics().invalidLines).toBe(1);
  });
});

describe('RingLineReader emergency gate', () => {
  /** Opens the window, waits out a five-second hold and reports it, which is the believable sequence. */
  function heldFiveSeconds(ring: ReturnType<typeof session>): void {
    ring.notify(`GATE,armed,${uptime(ring.at())}\n`);
    ring.advance(EMERGENCY_HOLD_MS);
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`);
  }

  it('accepts an emergency token when the gate and the reported hold account for it', () => {
    const ring = session();
    heldFiveSeconds(ring);
    expect(ring.ofType('token')).toEqual([
      { type: 'token', token: 'emergency', contact: 'pinky_tip', durationMs: EMERGENCY_HOLD_MS, at: START + EMERGENCY_HOLD_MS },
    ]);
    expect(ring.reader.diagnostics()).toMatchObject({ refusedEmergencies: 0, duplicateEmergencies: 0 });
  });

  it('refuses an emergency token that arrives with no command window open', () => {
    const ring = session();
    ring.advance(EMERGENCY_HOLD_MS);
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`);
    expect(ring.ofType('token')).toEqual([]);
    // The line is still in the log; it just never becomes an outcome.
    expect(ring.ofType('line')).toHaveLength(1);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);
  });

  it('refuses an emergency token the moment the window opens, when no hold could have happened', () => {
    const ring = session();
    ring.notify(`GATE,armed,${uptime(ring.at())}\nTOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`);
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);
  });

  it('refuses an emergency token whose reported hold is shorter than five seconds', () => {
    const ring = session();
    ring.notify(`GATE,armed,${uptime(ring.at())}\n`);
    ring.advance(EMERGENCY_HOLD_MS);
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS - 1}\n`);
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);
  });

  it('refuses an emergency token whose own uptime puts the hold before the window opened', () => {
    const ring = session();
    ring.notify(`GATE,armed,${uptime(ring.at())}\n`);
    ring.advance(EMERGENCY_HOLD_MS * 2);
    // Enough host time has passed and the hold is long enough, but by the ring's own
    // clock it began one millisecond before the window opened.
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS * 2 + 1}\n`);
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);
  });

  it('drops a retransmitted copy of the emergency it just accepted', () => {
    const ring = session();
    heldFiveSeconds(ring);
    const line = `TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`;
    ring.notify(line);
    ring.notify(line);
    ring.advance(EMERGENCY_DEDUPE_MS - 1);
    ring.notify(line);
    expect(ring.ofType('token')).toHaveLength(1);
    expect(ring.reader.diagnostics().duplicateEmergencies).toBe(3);
  });

  it('requires a fresh squeeze and hold before a second emergency', () => {
    const ring = session();
    heldFiveSeconds(ring);
    ring.advance(EMERGENCY_DEDUPE_MS + 1000);
    // A different line (new uptime) past the dedupe window: still refused, because
    // accepting the first consumed the arming.
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`);
    expect(ring.ofType('token')).toHaveLength(1);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);

    heldFiveSeconds(ring);
    expect(ring.ofType('token')).toHaveLength(2);
  });

  it('refuses an emergency once the ring has reported the window idle', () => {
    const ring = session();
    ring.notify(`GATE,armed,${uptime(ring.at())}\n`);
    ring.advance(EMERGENCY_HOLD_MS);
    ring.notify(`GATE,idle,${uptime(ring.at())}\n`);
    ring.notify(`TOK,emergency,pinky_tip,${uptime(ring.at())},${EMERGENCY_HOLD_MS}\n`);
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(1);
  });

  it('never bars an ordinary command token, which carries no such claim', () => {
    const ring = session();
    ring.notify('TOK,confirm,index_tip,1000,160\n');
    expect(ring.ofType('token')).toHaveLength(1);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(0);
  });

  it('counts refusals without letting the count run away', () => {
    const ring = session();
    for (let i = 0; i < 10_050; i += 1) ring.notify(`TOK,emergency,pinky_tip,${1000 + i},${EMERGENCY_HOLD_MS}\n`);
    expect(ring.ofType('token')).toEqual([]);
    expect(ring.reader.diagnostics().refusedEmergencies).toBe(9_999);
  });
});

describe('noRingLineDiagnostics', () => {
  it('is all zeroes, for a device with no line reader', () => {
    expect(noRingLineDiagnostics()).toEqual({
      droppedLines: 0,
      invalidLines: 0,
      refusedEmergencies: 0,
      duplicateEmergencies: 0,
    });
  });
});
