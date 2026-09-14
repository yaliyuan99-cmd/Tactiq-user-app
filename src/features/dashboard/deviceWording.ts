/**
 * Words for the "Your ring" panel. Connection facts come from the device
 * state; nothing here invents a reading. Battery is only ever mentioned when
 * the device state says it was reported.
 */
import type { ConnectionStatusKind } from '@/components';
import { DEVICE_NAME } from '@/domain/protocol';
import { formatRelative } from '@/lib/time';
import type { DeviceState } from '@/services/device/types';

export function deviceModeText(state: Pick<DeviceState, 'mode'>): string {
  return state.mode === 'demo' ? 'Demo Mode (simulated ring)' : 'Bluetooth ring (bench prototype)';
}

/** The newest connection time the state knows about, or null. */
export function lastConnectedAt(state: Pick<DeviceState, 'device' | 'remembered'>): string | null {
  return state.device?.lastConnectedAt ?? state.remembered?.lastConnectedAt ?? null;
}

/** "5 minutes ago", "Never in this browser", or a note that Demo Mode needs no connection. */
export function lastConnectionText(state: Pick<DeviceState, 'mode' | 'device' | 'remembered'>, now: Date): string {
  if (state.mode === 'demo') return 'Not needed. The simulated ring is always ready.';
  const at = lastConnectedAt(state);
  return at ? formatRelative(at, now) : 'Never in this browser';
}

/** A battery percentage only when the ring actually reported one; null otherwise (always, on the bench firmware). */
export function reportedBatteryPercentage(state: Pick<DeviceState, 'device'>): number | null {
  const battery = state.device?.battery;
  return battery && battery.reported ? battery.percentage : null;
}

export const TROUBLESHOOTING_KINDS: readonly ConnectionStatusKind[] = [
  'disconnected',
  'unsupported',
  'permission_denied',
  'error',
];

/** Troubleshooting shows for a hardware ring that is disconnected, unsupported, blocked or failed. */
export function needsTroubleshooting(mode: DeviceState['mode'], kind: ConnectionStatusKind): boolean {
  return mode === 'hardware' && TROUBLESHOOTING_KINDS.includes(kind);
}

const TIPS: Readonly<Partial<Record<ConnectionStatusKind, readonly [string, string, string]>>> = {
  disconnected: [
    'Check the ring is switched on, close to this device and running the bench firmware.',
    `On the Connect page, choose “${DEVICE_NAME}” in the browser’s Bluetooth window.`,
    'Demo Mode keeps working while the ring is away.',
  ],
  unsupported: [
    'Use Chrome or Edge on a computer or an Android phone.',
    'Open Tactiq from its https address.',
    'Demo Mode works in any browser, without a ring.',
  ],
  permission_denied: [
    'Allow Bluetooth for this site in your browser’s site settings.',
    'Then go back to the Connect page and try again.',
    'Demo Mode works without Bluetooth permission.',
  ],
  error: [
    'Switch the ring off and on again.',
    'Move the ring closer to this device, then connect again from the Connect page.',
    'Demo Mode keeps working while you sort out the connection.',
  ],
};

/** Exactly three short tips for a troubleshooting status; an empty list for any other status. */
export function troubleshootingTips(kind: ConnectionStatusKind): readonly string[] {
  return TIPS[kind] ?? [];
}
