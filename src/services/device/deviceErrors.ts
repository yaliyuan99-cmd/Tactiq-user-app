/**
 * Plain-language device errors: what happened, and what to try next.
 */
import { DEVICE_NAME } from '@/domain/protocol';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from './capabilities';
import type { DeviceConnectionStatus, DeviceError, DeviceErrorCode } from './types';

export const DEVICE_ERRORS: Readonly<Record<DeviceErrorCode, DeviceError>> = {
  unsupported: {
    code: 'unsupported',
    message: WEB_BLUETOOTH_UNAVAILABLE_REASON,
    hint: 'Keep practising in Demo Mode, or open the app in Chrome or Edge to connect a bench ring.',
  },
  insecure_context: {
    code: 'insecure_context',
    message: INSECURE_CONTEXT_REASON,
    hint: 'Open the app from its https address (or localhost) to connect a ring.',
  },
  permission_denied: {
    code: 'permission_denied',
    message: 'The browser did not allow this page to use Bluetooth.',
    hint: 'Allow Bluetooth for this site in your browser settings, then try again.',
  },
  not_found: {
    code: 'not_found',
    message: 'No ring was chosen.',
    hint: 'Make sure the ring is switched on and visible to Bluetooth, then try again.',
  },
  connection_failed: {
    code: 'connection_failed',
    message: 'The ring could not be connected.',
    hint: 'Move the ring closer and check it is powered, then try again.',
  },
  disconnected: {
    code: 'disconnected',
    message: 'The ring disconnected.',
    hint: 'Move the ring closer, then choose Reconnect.',
  },
  service_missing: {
    code: 'service_missing',
    message: `That device does not offer the ${DEVICE_NAME} data service.`,
    hint: `Choose a device named “${DEVICE_NAME}” running the bench firmware, then try again.`,
  },
  unknown: {
    code: 'unknown',
    message: 'Something went wrong with the ring connection.',
    hint: 'Try again. If it keeps happening, switch the ring off and on.',
  },
};

/** The connection status that accompanies each error. */
export const STATUS_FOR_ERROR: Readonly<Record<DeviceErrorCode, DeviceConnectionStatus>> = {
  unsupported: 'unsupported',
  insecure_context: 'unsupported',
  permission_denied: 'permission_denied',
  not_found: 'disconnected',
  connection_failed: 'error',
  disconnected: 'disconnected',
  service_missing: 'error',
  unknown: 'error',
};

export function deviceError(code: DeviceErrorCode): DeviceError {
  return DEVICE_ERRORS[code];
}

function errorName(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name: unknown }).name;
    return typeof name === 'string' ? name : null;
  }
  return null;
}

/**
 * Maps a Web Bluetooth exception to a device error. `NotFoundError` means
 * "nothing chosen" during the chooser, but "service or characteristic
 * missing" once a device is connected — hence the phase.
 */
export function mapBluetoothError(error: unknown, phase: 'request' | 'gatt' | 'service'): DeviceErrorCode {
  const name = errorName(error);
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'permission_denied';
  if (name === 'NotFoundError') return phase === 'request' ? 'not_found' : 'service_missing';
  return 'connection_failed';
}
