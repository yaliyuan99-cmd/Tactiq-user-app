/**
 * The one record the device layer keeps under `STORAGE_KEYS.device`:
 *
 *   { version: 1, mode: 'demo' | 'hardware', remembered: { id, name, lastConnectedAt } | null }
 *
 * `mode` is written by DeviceProvider; `remembered` by the Web Bluetooth
 * adapter. Every write merges, so neither clobbers the other. The remembered
 * id is the opaque id the browser assigned in the chooser — never invented.
 */
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import type { DeviceMode, RememberedDevice } from './types';

export interface StoredDeviceRecord {
  readonly version: 1;
  readonly mode: DeviceMode;
  readonly remembered: RememberedDevice | null;
}

export const DEFAULT_DEVICE_RECORD: StoredDeviceRecord = { version: 1, mode: 'demo', remembered: null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseRemembered(value: unknown): RememberedDevice | null {
  if (!isRecord(value)) return null;
  const { id, name, lastConnectedAt } = value;
  if (typeof id !== 'string' || !id || typeof name !== 'string') return null;
  return { id, name, lastConnectedAt: typeof lastConnectedAt === 'string' ? lastConnectedAt : null };
}

export function loadDeviceRecord(storage: StorageAdapter): StoredDeviceRecord {
  const stored = storage.get<unknown>(STORAGE_KEYS.device);
  if (!isRecord(stored)) return DEFAULT_DEVICE_RECORD;
  return {
    version: 1,
    mode: stored.mode === 'hardware' ? 'hardware' : 'demo',
    remembered: parseRemembered(stored.remembered),
  };
}

/** Merges the patch into the stored record. Returns false when the write failed. */
export function saveDeviceRecord(
  storage: StorageAdapter,
  patch: Partial<Pick<StoredDeviceRecord, 'mode' | 'remembered'>>,
): boolean {
  const next: StoredDeviceRecord = { ...loadDeviceRecord(storage), ...patch, version: 1 };
  return storage.set(STORAGE_KEYS.device, next);
}
