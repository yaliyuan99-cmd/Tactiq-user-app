/**
 * One mapping from device state to what the user sees, so the header, the
 * dashboard and the Connect page never disagree.
 */
import type { ConnectionStatusKind } from '@/components/StatusPill';
import type { DeviceState } from '@/services/device/types';

export interface DeviceStatusView {
  readonly kind: ConnectionStatusKind;
  /** Short label, e.g. "Demo Mode". */
  readonly label: string;
  /** One plain sentence about what this means for the user. */
  readonly description: string;
  /** True when commands can reach the app (demo ring, or a connected hardware ring). */
  readonly canReceiveCommands: boolean;
}

export function describeDeviceState(state: DeviceState): DeviceStatusView {
  if (state.mode === 'demo') {
    return {
      kind: 'demo',
      label: 'Demo Mode',
      description: 'You are using the simulated ring. Everything works without hardware, and every result is labelled Simulated.',
      canReceiveCommands: true,
    };
  }
  switch (state.status) {
    case 'connected':
      return {
        kind: 'connected',
        label: 'Connected',
        description: `${state.device?.name ?? 'The ring'} is connected over Bluetooth.`,
        canReceiveCommands: true,
      };
    case 'scanning':
      return { kind: 'scanning', label: 'Searching…', description: 'Choose the ring in your browser’s Bluetooth window.', canReceiveCommands: false };
    case 'connecting':
      return { kind: 'connecting', label: 'Connecting…', description: 'Connecting to the ring.', canReceiveCommands: false };
    case 'reconnecting':
      return { kind: 'reconnecting', label: 'Reconnecting…', description: 'The connection dropped. Trying once more.', canReceiveCommands: false };
    case 'unsupported':
      return {
        kind: 'unsupported',
        label: 'Bluetooth unavailable',
        description: state.error?.message ?? 'This browser cannot connect to a ring. Demo Mode still works.',
        canReceiveCommands: false,
      };
    case 'permission_denied':
      return {
        kind: 'permission_denied',
        label: 'Permission needed',
        description: state.error?.message ?? 'Bluetooth permission was not granted.',
        canReceiveCommands: false,
      };
    case 'error':
      return { kind: 'error', label: 'Error', description: state.error?.message ?? 'Something went wrong with the connection.', canReceiveCommands: false };
    case 'ready':
    case 'disconnected':
    default:
      return {
        kind: 'disconnected',
        label: 'Disconnected',
        description: state.remembered ? `${state.remembered.name} is not connected.` : 'No ring is connected.',
        canReceiveCommands: false,
      };
  }
}
