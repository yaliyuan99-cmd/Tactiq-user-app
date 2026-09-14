/**
 * Pure decisions for the Connect page: which panel a device state needs,
 * what to announce when the status changes, how ring messages read in the
 * connection log, and how to recognise the reply to a test ping.
 */
import { getCommand } from '@/domain/commands';
import { getContact } from '@/domain/contacts';
import { parseRingLine } from '@/domain/protocol';
import { describeDeviceState } from '@/lib/deviceStatus';
import { formatRelative } from '@/lib/time';
import type {
  DeviceCapabilities,
  DeviceEvent,
  DeviceMode,
  DeviceState,
  RememberedDevice,
} from '@/services/device/types';

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

export type ConnectPanel =
  | 'demo'
  | 'insecure_context'
  | 'unsupported'
  | 'ready'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'permission_denied'
  | 'error';

/** Panels that share one layout, so the connect button keeps focus while it turns busy. */
export type ConnectFlowPhase = Extract<ConnectPanel, 'ready' | 'scanning' | 'connecting'>;

/**
 * Chooses what the hardware area shows. The browser's capabilities are
 * checked first: an insecure page hides Web Bluetooth whatever the browser,
 * so it is the actionable reason there. A "disconnected" state that carries
 * an error other than a dropped link (for example nothing chosen in the
 * Bluetooth window) is shown as an error with a way to try again.
 */
export function panelFor(state: DeviceState, capabilities: DeviceCapabilities): ConnectPanel {
  if (state.mode === 'demo') return 'demo';
  if (!capabilities.secureContext || state.error?.code === 'insecure_context') return 'insecure_context';
  if (!capabilities.webBluetooth || state.status === 'unsupported') return 'unsupported';
  switch (state.status) {
    case 'scanning':
    case 'connecting':
    case 'connected':
    case 'reconnecting':
    case 'permission_denied':
    case 'error':
      return state.status;
    case 'ready':
    case 'disconnected':
    default:
      return state.error && state.error.code !== 'disconnected' ? 'error' : 'ready';
  }
}

/** Panels whose message is already carried by a role="alert" callout. */
const PANELS_WITH_ALERT: ReadonlySet<ConnectPanel> = new Set<ConnectPanel>(['error']);

/** Changes to this key are what the page announces. Gate changes do not alter it. */
export function statusKey(state: DeviceState): string {
  return `${state.mode}:${state.status}`;
}

/**
 * The polite announcement for a status change. When the panel shows the
 * error in an alert, only the short label is announced so the details are
 * not read twice.
 */
export function statusAnnouncement(state: DeviceState, panel: ConnectPanel): string {
  const view = describeDeviceState(state);
  // Labels such as "Searching…" already end in punctuation.
  const label = /[.…!?]$/.test(view.label) ? `Status: ${view.label}` : `Status: ${view.label}.`;
  if (PANELS_WITH_ALERT.has(panel)) return label;
  return `${label} ${view.description}`;
}

export function deviceSectionTitle(mode: DeviceMode): string {
  return mode === 'demo' ? 'Simulated ring' : 'Bench prototype ring';
}

/* ------------------------------------------------------------------ */
/* Remembered ring and battery                                         */
/* ------------------------------------------------------------------ */

export function lastConnectedText(remembered: RememberedDevice, now: Date = new Date()): string {
  if (!remembered.lastConnectedAt) return `Last connected: ${remembered.name}`;
  return `Last connected: ${remembered.name}, ${formatRelative(remembered.lastConnectedAt, now)}`;
}

export const BATTERY_NOT_REPORTED = 'Not reported';

/**
 * Splits the battery note into its lead ("Not reported") and the rest, so
 * the lead can be emphasised while the full note still reads as one sentence.
 */
export function splitBatteryNote(note: string): { readonly lead: string; readonly rest: string } {
  if (note.startsWith(BATTERY_NOT_REPORTED)) {
    return { lead: BATTERY_NOT_REPORTED, rest: note.slice(BATTERY_NOT_REPORTED.length) };
  }
  return { lead: BATTERY_NOT_REPORTED, rest: ` — ${note}` };
}

/* ------------------------------------------------------------------ */
/* Test ping                                                           */
/* ------------------------------------------------------------------ */

/** True for the ring's reply to PING (`STA,pong`). */
export function isPongLine(raw: string): boolean {
  return parseRingLine(raw).kind === 'pong';
}

export function isPongEvent(event: DeviceEvent): boolean {
  return event.type === 'line' && isPongLine(event.raw);
}

/* ------------------------------------------------------------------ */
/* Connection log                                                      */
/* ------------------------------------------------------------------ */

export const CONNECTION_LOG_LIMIT = 20;

export type LoggedDeviceEvent = Extract<DeviceEvent, { type: 'line' | 'hello' | 'gate' | 'token' | 'error' }>;

const LOGGED_TYPES: ReadonlySet<DeviceEvent['type']> = new Set(['line', 'hello', 'gate', 'token', 'error']);

export function isLoggedEvent(event: DeviceEvent): event is LoggedDeviceEvent {
  return LOGGED_TYPES.has(event.type);
}

export interface ConnectionLogRow {
  readonly id: string;
  readonly at: number;
  readonly type: string;
  readonly detail: string;
}

const LOG_TYPE_LABELS: Readonly<Record<LoggedDeviceEvent['type'], string>> = {
  line: 'Raw line',
  hello: 'Firmware',
  gate: 'Command window',
  token: 'Command',
  error: 'Error',
};

export const BATTERY_LINE_DETAIL = 'STA,battery — placeholder from the firmware stub; value not shown';

export function logDetail(event: LoggedDeviceEvent): string {
  switch (event.type) {
    case 'line':
      // The battery line carries a stub value; the app never shows it as a number.
      return parseRingLine(event.raw).kind === 'battery' ? BATTERY_LINE_DETAIL : event.raw;
    case 'hello':
      return `Ring reported firmware ${event.firmwareVersion}`;
    case 'gate':
      return event.armed ? 'Opened after a squeeze' : 'Closed';
    case 'token':
      return `${getCommand(event.token).label} from ${getContact(event.contact).label}, ${event.durationMs} ms press`;
    case 'error':
      return event.error.message;
  }
}

/** Event objects are stable references, so a weak map gives each one a stable row key. */
const eventIds = new WeakMap<DeviceEvent, string>();
let nextEventId = 0;

function idFor(event: DeviceEvent): string {
  const existing = eventIds.get(event);
  if (existing) return existing;
  nextEventId += 1;
  const id = `event-${nextEventId}`;
  eventIds.set(event, id);
  return id;
}

/** The most recent logged events, newest first. */
export function connectionLogRows(
  events: readonly DeviceEvent[],
  limit: number = CONNECTION_LOG_LIMIT,
): ConnectionLogRow[] {
  const logged = events.filter(isLoggedEvent);
  return logged
    .slice(Math.max(0, logged.length - limit))
    .reverse()
    .map((event) => ({ id: idFor(event), at: event.at, type: LOG_TYPE_LABELS[event.type], detail: logDetail(event) }));
}

const logTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function formatLogTime(at: number): string {
  return logTimeFormatter.format(new Date(at));
}
