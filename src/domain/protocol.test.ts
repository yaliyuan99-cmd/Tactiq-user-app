import {
  BATTERY_UNAVAILABLE_NOTE,
  DIAGNOSTIC_COUNTER_MAX,
  FIRMWARE_BATTERY_IS_STUB,
  LineAssembler,
  MAX_DEVICE_UPTIME_MS,
  MAX_FIRMWARE_VERSION_LENGTH,
  MAX_PRESS_DURATION_MS,
  MAX_RING_LINE_LENGTH,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
  countOnce,
  firmwareVersionFrom,
  parseRingLine,
} from './protocol';

describe('protocol constants', () => {
  it('uses the standard Nordic UART Service UUIDs', () => {
    expect(NUS_SERVICE_UUID).toBe('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
    expect(NUS_RX_CHARACTERISTIC_UUID).toBe('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
    expect(NUS_TX_CHARACTERISTIC_UUID).toBe('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  });

  it('treats the firmware battery value as a stub', () => {
    expect(FIRMWARE_BATTERY_IS_STUB).toBe(true);
    expect(BATTERY_UNAVAILABLE_NOTE).toMatch(/not reported/i);
  });

  it('bounds the uptime field to the firmware’s 32-bit millisecond counter', () => {
    expect(MAX_DEVICE_UPTIME_MS).toBe(4_294_967_295);
  });
});

describe('countOnce', () => {
  it('counts up and then stops, so a counter cannot run away', () => {
    expect(countOnce(0)).toBe(1);
    expect(countOnce(DIAGNOSTIC_COUNTER_MAX - 1)).toBe(DIAGNOSTIC_COUNTER_MAX);
    expect(countOnce(DIAGNOSTIC_COUNTER_MAX)).toBe(DIAGNOSTIC_COUNTER_MAX);
  });
});

describe('parseRingLine', () => {
  it('parses a token line', () => {
    expect(parseRingLine('TOK,confirm,index_tip,183422,161')).toEqual({
      kind: 'token',
      token: 'confirm',
      contact: 'index_tip',
      deviceUptimeMs: 183422,
      durationMs: 161,
    });
  });

  it('parses the emergency token on the pinky fingertip', () => {
    expect(parseRingLine('TOK,emergency,pinky_tip,9000,5000')).toMatchObject({
      kind: 'token',
      token: 'emergency',
      contact: 'pinky_tip',
      durationMs: 5000,
    });
  });

  it('parses gate lines in both states', () => {
    expect(parseRingLine('GATE,armed,100')).toEqual({ kind: 'gate', state: 'armed', deviceUptimeMs: 100 });
    expect(parseRingLine('GATE,idle,3100')).toEqual({ kind: 'gate', state: 'idle', deviceUptimeMs: 3100 });
  });

  it('parses hello, battery and pong status lines', () => {
    expect(parseRingLine('STA,hello,fw0.2')).toEqual({ kind: 'hello', firmwareVersion: 'fw0.2' });
    expect(parseRingLine('STA,battery,100')).toEqual({ kind: 'battery', percentage: 100, isStub: true });
    expect(parseRingLine('STA,pong')).toEqual({ kind: 'pong' });
  });

  it('accepts the bounds of each numeric field', () => {
    expect(parseRingLine(`TOK,next,middle_base,${MAX_DEVICE_UPTIME_MS},${MAX_PRESS_DURATION_MS}`)).toMatchObject({
      kind: 'token',
      deviceUptimeMs: MAX_DEVICE_UPTIME_MS,
      durationMs: MAX_PRESS_DURATION_MS,
    });
    expect(parseRingLine('TOK,next,middle_base,0,0')).toMatchObject({ kind: 'token', deviceUptimeMs: 0, durationMs: 0 });
    expect(parseRingLine('GATE,armed,0')).toMatchObject({ kind: 'gate', deviceUptimeMs: 0 });
    expect(parseRingLine('STA,battery,0')).toMatchObject({ kind: 'battery', percentage: 0 });
  });

  it('strips a trailing carriage return and surrounding whitespace', () => {
    expect(parseRingLine('STA,pong\r')).toEqual({ kind: 'pong' });
    expect(parseRingLine('  GATE,armed,5 ')).toEqual({ kind: 'gate', state: 'armed', deviceUptimeMs: 5 });
  });

  it.each([
    ['unknown token', 'TOK,launch,index_tip,1,2'],
    ['unknown contact', 'TOK,confirm,thumb_tip,1,2'],
    ['non-numeric time', 'TOK,confirm,index_tip,soon,2'],
    ['non-numeric duration', 'TOK,confirm,index_tip,1,long'],
    ['too few token fields', 'TOK,confirm,index_tip'],
    ['unknown gate state', 'GATE,open,100'],
    ['non-numeric gate time', 'GATE,armed,later'],
    ['too few gate fields', 'GATE,armed'],
    ['hello without a version', 'STA,hello'],
    ['non-numeric battery', 'STA,battery,full'],
    ['unknown status', 'STA,reboot'],
    ['unknown head', 'HELLO,world'],
    ['empty line', ''],
  ])('returns unknown for %s', (_label, line) => {
    expect(parseRingLine(line)).toEqual({ kind: 'unknown', raw: line.trim() });
  });

  it.each([
    ['negative uptime', 'TOK,confirm,index_tip,-1,160'],
    ['negative duration', 'TOK,confirm,index_tip,100,-160'],
    ['negative zero duration', 'TOK,confirm,index_tip,100,-0'],
    ['fractional uptime', 'TOK,confirm,index_tip,100.5,160'],
    ['fractional duration', 'TOK,confirm,index_tip,100,160.5'],
    ['exponent duration', 'TOK,confirm,index_tip,100,1e3'],
    ['hexadecimal duration', 'TOK,confirm,index_tip,100,0x10'],
    ['empty uptime', 'TOK,confirm,index_tip,,160'],
    ['empty duration', 'TOK,confirm,index_tip,100,'],
    ['infinite duration', 'TOK,confirm,index_tip,100,Infinity'],
    ['NaN duration', 'TOK,confirm,index_tip,100,NaN'],
    ['uptime past the 32-bit counter', `TOK,confirm,index_tip,${MAX_DEVICE_UPTIME_MS + 1},160`],
    ['duration longer than any press', `TOK,confirm,index_tip,100,${MAX_PRESS_DURATION_MS + 1}`],
    ['absurd duration', 'TOK,confirm,index_tip,100,9999999999'],
    ['an extra field', 'TOK,confirm,index_tip,100,160,extra'],
  ])('refuses a token line with a %s', (_label, line) => {
    expect(parseRingLine(line)).toEqual({ kind: 'unknown', raw: line });
  });

  it.each([
    ['negative gate time', 'GATE,armed,-1'],
    ['fractional gate time', 'GATE,armed,1.5'],
    ['empty gate time', 'GATE,armed,'],
    ['gate time past the counter', `GATE,idle,${MAX_DEVICE_UPTIME_MS + 1}`],
    ['an extra field', 'GATE,armed,100,extra'],
  ])('refuses a gate line with a %s', (_label, line) => {
    expect(parseRingLine(line)).toEqual({ kind: 'unknown', raw: line });
  });

  it.each([
    ['above 100 per cent', 'STA,battery,101'],
    ['negative', 'STA,battery,-5'],
    ['fractional', 'STA,battery,99.5'],
    ['empty', 'STA,battery,'],
    ['with an extra field', 'STA,battery,100,extra'],
  ])('refuses a battery line that is %s', (_label, line) => {
    expect(parseRingLine(line)).toEqual({ kind: 'unknown', raw: line });
  });

  it('refuses a pong line with anything after it', () => {
    expect(parseRingLine('STA,pong,now')).toEqual({ kind: 'unknown', raw: 'STA,pong,now' });
  });

  it('bounds the whole line, keeping no more than one line’s worth of it', () => {
    const line = `TOK,confirm,index_tip,100,${'1'.repeat(MAX_RING_LINE_LENGTH)}`;
    const parsed = parseRingLine(line);
    expect(parsed.kind).toBe('unknown');
    expect(parsed.kind === 'unknown' && parsed.raw.length).toBe(MAX_RING_LINE_LENGTH);
  });
});

describe('firmwareVersionFrom', () => {
  it('keeps a plain printable version, trimmed', () => {
    expect(firmwareVersionFrom('fw0.2')).toBe('fw0.2');
    expect(firmwareVersionFrom(' bench-fw ')).toBe('bench-fw');
    expect(firmwareVersionFrom('x'.repeat(MAX_FIRMWARE_VERSION_LENGTH))).toHaveLength(MAX_FIRMWARE_VERSION_LENGTH);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['only spaces', '   '],
    ['carrying a control character', 'fw0.2\u0007'],
    ['carrying a newline', 'fw\u00000.2'],
    ['not ASCII', 'fw0.2é'],
    ['emoji', 'fw0.2🔥'],
  ])('refuses a version that is %s', (_label, field) => {
    expect(firmwareVersionFrom(field)).toBeNull();
  });

  it('refuses a version longer than the bound rather than cutting it down to look real', () => {
    const long = 'v'.repeat(MAX_FIRMWARE_VERSION_LENGTH + 1);
    expect(firmwareVersionFrom(long)).toBeNull();
    expect(parseRingLine(`STA,hello,${long}`)).toMatchObject({ kind: 'unknown' });
    expect(parseRingLine(`STA,hello,${'k'.repeat(4000)}`)).toMatchObject({ kind: 'unknown' });
  });

  it('refuses a hello line whose version is control characters', () => {
    expect(parseRingLine('STA,hello,\u0001\u0002')).toMatchObject({ kind: 'unknown' });
  });
});

describe('LineAssembler', () => {
  it('returns complete lines only', () => {
    const assembler = new LineAssembler();
    expect(assembler.push('TOK,confirm,ind')).toEqual([]);
    expect(assembler.push('ex_tip,183422,161\nGATE,ar')).toEqual(['TOK,confirm,index_tip,183422,161']);
    expect(assembler.push('med,100\n')).toEqual(['GATE,armed,100']);
  });

  it('splits several lines in one chunk and skips blank lines', () => {
    const assembler = new LineAssembler();
    expect(assembler.push('STA,hello,fw0.2\n\nSTA,battery,100\r\nSTA,pong\n')).toEqual([
      'STA,hello,fw0.2',
      'STA,battery,100',
      'STA,pong',
    ]);
  });

  it('survives a coalesced notification carrying many lines at once', () => {
    const assembler = new LineAssembler();
    const chunk = Array.from({ length: 40 }, (_unused, i) => `GATE,idle,${i}`).join('\n');
    const lines = assembler.push(`${chunk}\nSTA,po`);
    expect(lines).toHaveLength(40);
    expect(lines[0]).toBe('GATE,idle,0');
    expect(lines[39]).toBe('GATE,idle,39');
    expect(assembler.push('ng\n')).toEqual(['STA,pong']);
    expect(assembler.droppedLines).toBe(0);
  });

  it('drops a complete line that is longer than the bound instead of cutting it short', () => {
    const assembler = new LineAssembler(16);
    // Ends in a newline, so it is a complete line — and still too long to be one.
    expect(assembler.push(`TOK,confirm,index_tip,${'9'.repeat(40)}\nSTA,pong\n`)).toEqual(['STA,pong']);
    expect(assembler.droppedLines).toBe(1);
  });

  it('drops a runaway partial line and the rest of that same line with it', () => {
    const assembler = new LineAssembler(16);
    expect(assembler.push('x'.repeat(20))).toEqual([]);
    expect(assembler.droppedLines).toBe(1);
    // 'STA,pong' here is the tail of the runaway line, not a line of its own: a
    // truncated line must never arrive looking valid.
    expect(assembler.push('STA,pong\n')).toEqual([]);
    expect(assembler.droppedLines).toBe(1);
    // The next line, after that newline, is clean.
    expect(assembler.push('STA,pong\n')).toEqual(['STA,pong']);
  });

  it('keeps a partial line within the maximum length', () => {
    const assembler = new LineAssembler(16);
    expect(assembler.push('STA,')).toEqual([]);
    expect(assembler.push('pong\n')).toEqual(['STA,pong']);
    expect(assembler.droppedLines).toBe(0);
  });

  it('counts dropped lines without letting the count run away', () => {
    const assembler = new LineAssembler(4);
    for (let i = 0; i < DIAGNOSTIC_COUNTER_MAX + 5; i += 1) assembler.push('far too long\n');
    expect(assembler.droppedLines).toBe(DIAGNOSTIC_COUNTER_MAX);
  });

  it('reset discards a buffered partial line and keeps the dropped count', () => {
    const assembler = new LineAssembler(8);
    assembler.push('a much longer fragment than the bound');
    expect(assembler.droppedLines).toBe(1);
    assembler.reset();
    expect(assembler.push('STA,pong\n')).toEqual(['STA,pong']);
    expect(assembler.droppedLines).toBe(1);
  });
});
