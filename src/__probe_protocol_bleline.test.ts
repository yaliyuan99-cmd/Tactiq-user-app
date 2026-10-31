/* THROWAWAY PROBE — delete after running. */
import {
  LineAssembler,
  MAX_DEVICE_UPTIME_MS,
  MAX_PRESS_DURATION_MS,
  MAX_RING_LINE_LENGTH,
  parseRingLine,
  type RingLine,
} from '@/domain/protocol';
import { RingLineReader } from '@/services/device/ringLineEvents';
import type { DeviceEvent, DeviceState } from '@/services/device/types';
import { ringResultFromEvent } from '@/features/practice/ringResults';
import { attemptFromResult } from '@/features/calibrate/calibrationFlow';
import { judgeCalibrationSample, isPossiblePressDuration } from '@/services/calibration/calibrationRules';
import { LocalCalibrationService } from '@/services/calibration/LocalCalibrationService';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { TAP_MAX_MS } from '@/domain/timing';

function show(label: string, value: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`PROBE ${label} => ${JSON.stringify(value)}`);
}

describe('PROBE 1+2+3: parseRingLine on TOK lines', () => {
  it('reports what the real parser returns for each input', () => {
    const inputs: string[] = [
      // (1) token-negative
      'TOK,confirm,index_tip,-1,-25',
      'TOK,confirm,index_tip,100,-25',
      'TOK,confirm,index_tip,-1,25',
      // (2) token-blank
      'TOK,confirm,index_tip,,',
      'TOK,confirm,index_tip,100,',
      'TOK,confirm,index_tip,,25',
      'TOK,confirm,index_tip,   ,   ',
      // (3) token-nonfinite / out of range / odd numeric spellings
      'TOK,confirm,index_tip,NaN,NaN',
      'TOK,confirm,index_tip,Infinity,Infinity',
      'TOK,confirm,index_tip,-Infinity,-Infinity',
      'TOK,confirm,index_tip,1e3,1e3',
      'TOK,confirm,index_tip,0x64,0x19',
      'TOK,confirm,index_tip,+100,+25',
      'TOK,confirm,index_tip,100.5,25.5',
      'TOK,confirm,index_tip,1_000,25',
      'TOK,confirm,index_tip,100,1e309', // Number() -> Infinity
      'TOK,confirm,index_tip,100,99999999999999999999',
      `TOK,confirm,index_tip,100,${MAX_PRESS_DURATION_MS}`,
      `TOK,confirm,index_tip,100,${MAX_PRESS_DURATION_MS + 1}`,
      `TOK,confirm,index_tip,${MAX_DEVICE_UPTIME_MS},25`,
      `TOK,confirm,index_tip,${MAX_DEVICE_UPTIME_MS + 1},25`,
      'TOK,confirm,index_tip,9999999999,25', // 10 digits, > uptime max
      'TOK,confirm,index_tip,00100,0025', // leading zeros
      'TOK,confirm,index_tip, 100 , 25 ', // surrounding spaces
      'TOK,confirm,index_tip,\t100\t,\t25\t',
      'TOK,confirm,index_tip,١٠٠,٢٥', // Arabic-Indic digits
      'TOK,confirm,index_tip,100,25,extra', // extra field
      'TOK,confirm,index_tip,100', // missing field
      'TOK,CONFIRM,index_tip,100,25',
      'TOK,confirm,INDEX_TIP,100,25',
      // control
      'TOK,confirm,index_tip,100,25',
      'TOK,confirm,index_tip,0,0',
      // GATE / STA for completeness
      'GATE,armed,-5',
      'GATE,armed,',
      'STA,battery,-1',
      'STA,battery,',
      'STA,battery,101',
    ];
    const results: Array<{ input: string; out: RingLine }> = [];
    for (const input of inputs) {
      let out: RingLine;
      try {
        out = parseRingLine(input);
      } catch (error) {
        out = { kind: 'unknown', raw: `THREW: ${String(error)}` };
      }
      results.push({ input, out });
      show(`parse(${JSON.stringify(input)})`, out);
    }
    const accepted = results.filter((r) => r.out.kind !== 'unknown');
    show('ACCEPTED-AS-NON-UNKNOWN', accepted);
    expect(accepted.length).toBeGreaterThanOrEqual(0);
  });
});

describe('PROBE 4: can a negative duration become an accepted calibration sample?', () => {
  const baseState: DeviceState = {
    mode: 'hardware',
    status: 'connected',
    device: null,
    remembered: null,
    error: null,
    gate: { armed: true, closesAt: Date.now() + 3000 },
    commandWindowMs: 3000,
  } as DeviceState;

  it('walks the real chain: BLE chunk -> reader -> event -> RingResult -> attempt -> recordSample', () => {
    const reader = new RingLineReader();
    const chunk = 'TOK,confirm,index_tip,100,-25\n';
    const lines = reader.push(chunk);
    show('reader.push(TOK,confirm,index_tip,100,-25\\n)', lines);
    const interpreted = reader.interpret(lines[0] ?? '', baseState, Date.now());
    show('reader.interpret events', interpreted.events.map((e) => e.type));
    show('reader.diagnostics', reader.diagnostics());

    const tokenEvents = interpreted.events.filter((e) => e.type === 'token');
    show('token events from a negative-duration line', tokenEvents);
    expect(Array.isArray(tokenEvents)).toBe(true);
  });

  it('forces a negative duration past the parser into the real calibration service', () => {
    // Synthesise the DeviceEvent a token line would have produced, with a
    // negative duration, and run the rest of the real chain on it.
    const event: DeviceEvent = {
      type: 'token',
      token: 'confirm',
      contact: 'index_tip',
      durationMs: -25,
      at: Date.now(),
    } as DeviceEvent;
    const result = ringResultFromEvent(event, 'probe-1');
    show('ringResultFromEvent(token durationMs:-25)', result);
    const attempt = result ? attemptFromResult(result) : null;
    show('attemptFromResult', attempt);

    show('isPossiblePressDuration(-25)', isPossiblePressDuration(-25));
    show('judge(-25)', judgeCalibrationSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: -25 }));
    show('judge(NaN)', judgeCalibrationSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: Number.NaN }));
    show('judge(Infinity)', judgeCalibrationSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: Number.POSITIVE_INFINITY }));
    show('judge(TAP_MAX_MS)', judgeCalibrationSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs: TAP_MAX_MS }));

    const storage = new MemoryStorageAdapter();
    const calibration = new LocalCalibrationService(storage);
    calibration.start({ hand: 'right', evidence: 'measured', deviceId: 'probe-ring' });
    const durations = [-25, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, 120];
    for (const durationMs of durations) {
      const outcome = calibration.recordSample({ contact: 'index_tip', detectedContact: 'index_tip', durationMs });
      show(`recordSample(durationMs=${String(durationMs)})`, {
        accepted: outcome.accepted,
        reason: outcome.reason,
        samplesStored: outcome.profile.samples.length,
        storedDurations: outcome.profile.samples.map((s) => s.durationMs),
      });
    }
    const finalProfile = calibration.get();
    show('final stored samples', finalProfile?.samples);
    show('raw storage', storage.get(STORAGE_KEYS.calibration));
    expect(finalProfile).not.toBeNull();
  });
});

describe('PROBE 5: LineAssembler length cap', () => {
  it('oversized COMPLETE line that ends in a newline, in one notification', () => {
    const assembler = new LineAssembler(16);
    const long = 'A'.repeat(40);
    const out = assembler.push(`${long}\n`);
    show('push(40 chars + \\n) with maxLength=16', { out, dropped: assembler.droppedLines });
    expect(Array.isArray(out)).toBe(true);
  });

  it('oversized complete line at the default cap', () => {
    const assembler = new LineAssembler();
    const long = 'B'.repeat(MAX_RING_LINE_LENGTH + 1);
    const out = assembler.push(`${long}\n`);
    show(`push(${MAX_RING_LINE_LENGTH + 1} chars + \\n) default cap`, { outLengths: out.map((l) => l.length), dropped: assembler.droppedLines });
    expect(Array.isArray(out)).toBe(true);
  });

  it('exactly at the cap is kept; one over is dropped', () => {
    const a = new LineAssembler(16);
    show('push(16 chars + \\n)', { out: a.push(`${'C'.repeat(16)}\n`), dropped: a.droppedLines });
    const b = new LineAssembler(16);
    show('push(17 chars + \\n)', { out: b.push(`${'D'.repeat(17)}\n`), dropped: b.droppedLines });
    expect(true).toBe(true);
  });

  it('fragmented notifications building one oversized line', () => {
    const assembler = new LineAssembler(16);
    const frags = ['E'.repeat(10), 'F'.repeat(10), 'G'.repeat(10), 'TOK,confirm,index_tip,100,25\n'];
    const collected: string[][] = [];
    for (const f of frags) collected.push(assembler.push(f));
    show('fragmented oversized then a good line', { collected, dropped: assembler.droppedLines });
    // Then a clean line after the overflow:
    const after = assembler.push('STA,pong\n');
    show('clean line after overflow', { after, dropped: assembler.droppedLines });
    expect(true).toBe(true);
  });

  it('several lines coalesced into one notification, one of them oversized', () => {
    const assembler = new LineAssembler(16);
    const chunk = `STA,pong\n${'H'.repeat(40)}\nGATE,idle,5\n`;
    const out = assembler.push(chunk);
    show('coalesced: pong + oversized + gate', { out, dropped: assembler.droppedLines });
    expect(true).toBe(true);
  });

  it('a very long complete line that would truncate into a valid shorter line', () => {
    const assembler = new LineAssembler(16);
    const chunk = `TOK,confirm,index_tip,100,25${'Z'.repeat(60)}\n`;
    const out = assembler.push(chunk);
    show('oversized line whose prefix is a valid TOK', { out, dropped: assembler.droppedLines });
    const parsedEach = out.map((l) => parseRingLine(l));
    show('parsed each emitted line', parsedEach);
    expect(true).toBe(true);
  });

  it('oversized complete line also goes through parseRingLine directly', () => {
    const long = `TOK,confirm,index_tip,100,25${'Y'.repeat(MAX_RING_LINE_LENGTH)}`;
    show(`parseRingLine(len=${long.length})`, parseRingLine(long));
    expect(true).toBe(true);
  });

  it('overflow spanning several notifications: the tail must not arrive as its own line', () => {
    const assembler = new LineAssembler(16);
    show('p1', { out: assembler.push('I'.repeat(20)), dropped: assembler.droppedLines });
    show('p2 tail+newline is a would-be valid line', { out: assembler.push('STA,pong\n'), dropped: assembler.droppedLines });
    show('p3 next real line', { out: assembler.push('STA,pong\n'), dropped: assembler.droppedLines });
    expect(true).toBe(true);
  });

  it('RingLineReader surfaces the same cap and counts drops', () => {
    const reader = new RingLineReader(16);
    const out = reader.push(`${'J'.repeat(40)}\nSTA,pong\n`);
    show('RingLineReader(16).push', { out, diagnostics: reader.diagnostics() });
    expect(true).toBe(true);
  });
});
