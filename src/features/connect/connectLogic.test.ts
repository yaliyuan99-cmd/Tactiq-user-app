import { BATTERY_UNAVAILABLE_NOTE, parseRingLine } from '@/domain/protocol';
import { deviceError } from '@/services/device/deviceErrors';
import type { DeviceCapabilities, DeviceEvent, DeviceState } from '@/services/device/types';
import {
  BATTERY_LINE_DETAIL,
  CONNECTION_LOG_LIMIT,
  connectionLogRows,
  deviceSectionTitle,
  isLoggedEvent,
  isPongEvent,
  isPongLine,
  lastConnectedText,
  panelFor,
  splitBatteryNote,
  statusAnnouncement,
  statusKey,
} from './connectLogic';
import { RING_LINE_FORMATS } from './technicalReference';
import { SUPPORTED_CAPABILITIES, hardwareState } from './testing/FakeHardwareAdapter';

const demoState: DeviceState = { ...hardwareState({ status: 'ready' }), mode: 'demo' };
const insecure: DeviceCapabilities = { webBluetooth: false, secureContext: false, reason: 'Web Bluetooth needs a secure (https) page.' };
const noBluetooth: DeviceCapabilities = { webBluetooth: false, secureContext: true, reason: 'No Web Bluetooth.' };

describe('panelFor', () => {
  it('shows the demo panel in Demo Mode whatever the browser can do', () => {
    expect(panelFor(demoState, insecure)).toBe('demo');
  });

  it('checks the page and browser before the connection status', () => {
    expect(panelFor(hardwareState({ status: 'connected' }), insecure)).toBe('insecure_context');
    expect(panelFor(hardwareState({ status: 'disconnected' }), noBluetooth)).toBe('unsupported');
    expect(
      panelFor(hardwareState({ status: 'unsupported', error: deviceError('insecure_context') }), SUPPORTED_CAPABILITIES),
    ).toBe('insecure_context');
    expect(
      panelFor(hardwareState({ status: 'unsupported', error: deviceError('unsupported') }), SUPPORTED_CAPABILITIES),
    ).toBe('unsupported');
  });

  it.each([
    ['scanning', 'scanning'],
    ['connecting', 'connecting'],
    ['connected', 'connected'],
    ['reconnecting', 'reconnecting'],
    ['permission_denied', 'permission_denied'],
    ['error', 'error'],
    ['ready', 'ready'],
    ['disconnected', 'ready'],
  ] as const)('maps status %s to the %s panel', (status, panel) => {
    expect(panelFor(hardwareState({ status }), SUPPORTED_CAPABILITIES)).toBe(panel);
  });

  it('treats "nothing chosen" as an error but a dropped link as ready to reconnect', () => {
    expect(panelFor(hardwareState({ status: 'disconnected', error: deviceError('not_found') }), SUPPORTED_CAPABILITIES)).toBe(
      'error',
    );
    expect(
      panelFor(hardwareState({ status: 'disconnected', error: deviceError('disconnected') }), SUPPORTED_CAPABILITIES),
    ).toBe('ready');
  });
});

describe('status announcements', () => {
  it('keys on mode and status only, so gate changes are silent', () => {
    const closed = hardwareState({ status: 'connected' });
    const armed = hardwareState({ status: 'connected', gate: { armed: true, closesAt: 1 } });
    expect(statusKey(closed)).toBe(statusKey(armed));
    expect(statusKey(demoState)).not.toBe(statusKey(hardwareState({ status: 'ready' })));
  });

  it('announces the label and description', () => {
    const state = hardwareState({ status: 'scanning' });
    expect(statusAnnouncement(state, 'scanning')).toBe('Status: Searching… Choose the ring in your browser’s Bluetooth window.');
  });

  it('announces only the label when an alert already carries the error', () => {
    const state = hardwareState({ status: 'error', error: deviceError('connection_failed') });
    expect(statusAnnouncement(state, 'error')).toBe('Status: Error.');
  });

  it('titles the device section by mode', () => {
    expect(deviceSectionTitle('demo')).toBe('Simulated ring');
    expect(deviceSectionTitle('hardware')).toBe('Bench prototype ring');
  });
});

describe('lastConnectedText', () => {
  const now = new Date('2026-09-15T11:00:00.000Z');

  it('names the ring and how long ago', () => {
    expect(lastConnectedText({ id: 'a', name: 'Tactiq Ring', lastConnectedAt: '2026-09-15T10:55:00.000Z' }, now)).toBe(
      'Last connected: Tactiq Ring, 5 minutes ago',
    );
  });

  it('leaves the time out when it was never recorded', () => {
    expect(lastConnectedText({ id: 'a', name: 'Tactiq Ring', lastConnectedAt: null }, now)).toBe('Last connected: Tactiq Ring');
  });
});

describe('splitBatteryNote', () => {
  it('keeps the full note when joined', () => {
    const { lead, rest } = splitBatteryNote(BATTERY_UNAVAILABLE_NOTE);
    expect(lead).toBe('Not reported');
    expect(`${lead}${rest}`).toBe(BATTERY_UNAVAILABLE_NOTE);
  });

  it('prefixes a note that does not start with the lead', () => {
    expect(splitBatteryNote('No reading.')).toEqual({ lead: 'Not reported', rest: ' — No reading.' });
  });
});

describe('pong detection', () => {
  it('recognises the ring’s reply to PING', () => {
    expect(isPongLine('STA,pong')).toBe(true);
    expect(isPongLine('STA,pong\r')).toBe(true);
    expect(isPongLine('STA,hello,fw')).toBe(false);
    expect(isPongLine('PING')).toBe(false);
  });

  it('only counts raw line events', () => {
    expect(isPongEvent({ type: 'line', raw: 'STA,pong', at: 1 })).toBe(true);
    expect(isPongEvent({ type: 'hello', firmwareVersion: 'pong', at: 1 })).toBe(false);
  });
});

describe('connectionLogRows', () => {
  const at = Date.UTC(2026, 8, 15, 11, 0, 0);

  it('keeps line, hello, gate, token and error events, newest first', () => {
    const events: DeviceEvent[] = [
      { type: 'line', raw: 'GATE,armed,100', at },
      { type: 'gate', armed: true, closesAt: at + 3000, at },
      { type: 'battery', percentage: 100, isStub: true, at },
      { type: 'state', state: hardwareState(), at },
      { type: 'hello', firmwareVersion: 'bench-1', at: at + 1 },
      { type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 120, at: at + 2 },
      { type: 'error', error: deviceError('disconnected'), at: at + 3 },
    ];
    const rows = connectionLogRows(events);
    expect(rows.map((row) => [row.type, row.detail])).toEqual([
      ['Error', 'The ring disconnected.'],
      ['Command', 'Confirm from Index fingertip, 120 ms press'],
      ['Firmware', 'Ring reported firmware bench-1'],
      ['Command window', 'Opened after a squeeze'],
      ['Raw line', 'GATE,armed,100'],
    ]);
    expect(isLoggedEvent({ type: 'battery', percentage: 100, isStub: true, at })).toBe(false);
  });

  it('never shows the battery stub value from a raw line', () => {
    const rows = connectionLogRows([{ type: 'line', raw: 'STA,battery,100', at }]);
    expect(rows[0]?.detail).toBe(BATTERY_LINE_DETAIL);
    expect(rows[0]?.detail).not.toMatch(/\d/);
  });

  it('keeps only the last 20 and gives each event a stable id', () => {
    const events: DeviceEvent[] = Array.from({ length: 25 }, (_, i) => ({ type: 'line', raw: `line ${i}`, at: at + i }));
    const first = connectionLogRows(events);
    expect(first).toHaveLength(CONNECTION_LOG_LIMIT);
    expect(first[0]?.detail).toBe('line 24');
    expect(first[CONNECTION_LOG_LIMIT - 1]?.detail).toBe('line 5');
    const again = connectionLogRows(events);
    expect(again.map((row) => row.id)).toEqual(first.map((row) => row.id));
    expect(new Set(first.map((row) => row.id)).size).toBe(CONNECTION_LOG_LIMIT);
  });
});

describe('RING_LINE_FORMATS', () => {
  const samples: Record<string, string> = {
    '<token>': 'confirm',
    '<contact_key>': 'index_tip',
    '<t_ms>': '1200',
    '<dur_ms>': '90',
    'armed|idle': 'armed',
    '<fw>': 'bench',
    '<pct>': '100',
  };

  it('describes lines the protocol parser accepts', () => {
    const kinds = RING_LINE_FORMATS.map(({ format }) => {
      const line = Object.entries(samples).reduce((text, [placeholder, value]) => text.replace(placeholder, value), format);
      return parseRingLine(line).kind;
    });
    expect(kinds).toEqual(['token', 'gate', 'hello', 'battery', 'pong']);
  });
});
