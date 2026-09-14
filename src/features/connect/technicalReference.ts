/**
 * The protocol facts shown under "Technical details". Every identifier comes
 * from src/domain/protocol.ts; the line formats restate the grammar that
 * `parseRingLine` accepts (checked by technicalReference.test.ts).
 */
import {
  BATTERY_UNAVAILABLE_NOTE,
  DEVICE_NAME,
  FIRMWARE_BATTERY_IS_STUB,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
  PING_COMMAND,
} from '@/domain/protocol';

export interface ReferenceItem {
  readonly term: string;
  readonly value: string;
  readonly note?: string;
}

export const BLUETOOTH_REFERENCE: readonly ReferenceItem[] = [
  { term: 'Device name', value: DEVICE_NAME },
  { term: 'Service (Nordic UART Service)', value: NUS_SERVICE_UUID },
  { term: 'TX characteristic', value: NUS_TX_CHARACTERISTIC_UUID, note: 'Ring to phone, notify.' },
  { term: 'RX characteristic', value: NUS_RX_CHARACTERISTIC_UUID, note: `Phone to ring, write. Only ${PING_COMMAND} is defined.` },
];

export interface LineFormat {
  readonly format: string;
  readonly meaning: string;
}

export const RING_LINE_FORMATS: readonly LineFormat[] = [
  {
    format: 'TOK,<token>,<contact_key>,<t_ms>,<dur_ms>',
    meaning: 'A command the ring recognised: the command token, the contact point, the ring’s uptime and the press length, in milliseconds.',
  },
  { format: 'GATE,armed|idle,<t_ms>', meaning: 'The command window opened after a squeeze, or closed.' },
  { format: 'STA,hello,<fw>', meaning: 'The firmware version, sent by the ring.' },
  {
    format: 'STA,battery,<pct>',
    meaning: FIRMWARE_BATTERY_IS_STUB
      ? 'A fixed placeholder from a firmware stub, not a battery reading. This app never shows it as a percentage.'
      : 'Battery level reported by the ring.',
  },
  { format: 'STA,pong', meaning: `The ring’s reply to ${PING_COMMAND}.` },
];

export const BATTERY_REFERENCE_NOTE = BATTERY_UNAVAILABLE_NOTE;
