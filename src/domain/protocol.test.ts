import {
  BATTERY_UNAVAILABLE_NOTE,
  FIRMWARE_BATTERY_IS_STUB,
  LineAssembler,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
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

  it('drops a runaway partial line that exceeds the maximum length', () => {
    const assembler = new LineAssembler(16);
    expect(assembler.push('x'.repeat(20))).toEqual([]);
    // The overflowed fragment is gone, so the next line arrives clean.
    expect(assembler.push('STA,pong\n')).toEqual(['STA,pong']);
  });

  it('keeps a partial line within the maximum length', () => {
    const assembler = new LineAssembler(16);
    expect(assembler.push('STA,')).toEqual([]);
    expect(assembler.push('pong\n')).toEqual(['STA,pong']);
  });

  it('reset discards a buffered partial line', () => {
    const assembler = new LineAssembler();
    assembler.push('TOK,conf');
    assembler.reset();
    expect(assembler.push('STA,pong\n')).toEqual(['STA,pong']);
  });
});
