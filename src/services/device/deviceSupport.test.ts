import { DEVICE_NAME } from '@/domain/protocol';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON, detectCapabilities } from './capabilities';
import { DEVICE_ERRORS, STATUS_FOR_ERROR, mapBluetoothError } from './deviceErrors';
import { DEFAULT_DEVICE_RECORD, loadDeviceRecord, saveDeviceRecord } from './deviceStorage';
import { namedError } from './testing/fakeBluetooth';

describe('detectCapabilities', () => {
  it('allows hardware when Web Bluetooth exists on a secure page', () => {
    expect(detectCapabilities({ bluetooth: {} }, { isSecureContext: true })).toEqual({
      webBluetooth: true,
      secureContext: true,
      reason: null,
    });
  });

  it('explains a browser without Web Bluetooth', () => {
    expect(detectCapabilities({}, { isSecureContext: true }).reason).toBe(WEB_BLUETOOTH_UNAVAILABLE_REASON);
  });

  it('explains an insecure page first, because browsers hide the API there', () => {
    expect(detectCapabilities({}, { isSecureContext: false }).reason).toBe(INSECURE_CONTEXT_REASON);
    expect(detectCapabilities({ bluetooth: {} }, {})).toEqual({
      webBluetooth: true,
      secureContext: false,
      reason: INSECURE_CONTEXT_REASON,
    });
  });

  it('reads the page environment by default', () => {
    expect(detectCapabilities().webBluetooth).toBe('bluetooth' in navigator);
  });
});

describe('mapBluetoothError', () => {
  it('reads NotFoundError by phase', () => {
    expect(mapBluetoothError(namedError('NotFoundError'), 'request')).toBe('not_found');
    expect(mapBluetoothError(namedError('NotFoundError'), 'service')).toBe('service_missing');
  });

  it('maps permission and other failures', () => {
    expect(mapBluetoothError(namedError('SecurityError'), 'request')).toBe('permission_denied');
    expect(mapBluetoothError(namedError('NotAllowedError'), 'gatt')).toBe('permission_denied');
    expect(mapBluetoothError(namedError('NetworkError'), 'gatt')).toBe('connection_failed');
    expect(mapBluetoothError('not an error', 'request')).toBe('connection_failed');
  });

  it('gives every error a message, a hint and a status', () => {
    for (const [code, error] of Object.entries(DEVICE_ERRORS)) {
      expect(error.code).toBe(code);
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.hint.length).toBeGreaterThan(0);
      expect(STATUS_FOR_ERROR[error.code]).toBeDefined();
    }
  });
});

describe('device storage record', () => {
  it('defaults to Demo Mode with nothing remembered', () => {
    expect(loadDeviceRecord(new MemoryStorageAdapter())).toEqual(DEFAULT_DEVICE_RECORD);
  });

  it('merges mode and remembered ring without clobbering either', () => {
    const storage = new MemoryStorageAdapter();
    const remembered = { id: 'abc', name: DEVICE_NAME, lastConnectedAt: '2026-09-15T10:00:00.000Z' };
    saveDeviceRecord(storage, { remembered });
    saveDeviceRecord(storage, { mode: 'hardware' });
    expect(loadDeviceRecord(storage)).toEqual({ version: 1, mode: 'hardware', remembered });
    saveDeviceRecord(storage, { remembered: null });
    expect(loadDeviceRecord(storage)).toEqual({ version: 1, mode: 'hardware', remembered: null });
  });

  it('ignores malformed stored data', () => {
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.device, { mode: 'party', remembered: { id: 42 } });
    expect(loadDeviceRecord(storage)).toEqual(DEFAULT_DEVICE_RECORD);
    storage.set(STORAGE_KEYS.device, 'hardware');
    expect(loadDeviceRecord(storage)).toEqual(DEFAULT_DEVICE_RECORD);
  });
});
