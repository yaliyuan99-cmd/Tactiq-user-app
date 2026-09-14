/**
 * GATT plumbing for the ring's Nordic UART Service: open the connection,
 * start notifications, write a line, close. No app state lives here.
 */
import {
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
} from '@/domain/protocol';
import type {
  BluetoothCharacteristicLike,
  BluetoothDeviceLike,
  BluetoothGattServerLike,
} from './webBluetoothTypes';

export type NusPhase = 'gatt' | 'service';

/** Carries the step that failed, because `NotFoundError` means different things at each step. */
export class NusConnectError extends Error {
  constructor(
    readonly phase: NusPhase,
    readonly original: unknown,
  ) {
    super(`Ring connection failed during ${phase}`);
    this.name = 'NusConnectError';
  }
}

export interface NusConnection {
  readonly device: BluetoothDeviceLike;
  readonly server: BluetoothGattServerLike;
  readonly tx: BluetoothCharacteristicLike;
  /** Phone → ring. Null when the firmware does not expose it; ping is then unavailable. */
  readonly rx: BluetoothCharacteristicLike | null;
  /** Stops listening and, when asked, drops the GATT link. */
  close(disconnectGatt: boolean): void;
}

export function safeGattDisconnect(gatt: BluetoothGattServerLike | null | undefined): void {
  try {
    if (gatt?.connected) gatt.disconnect();
  } catch {}
}

/**
 * Connects and starts notifications. The listener is attached before
 * notifications start, so the ring's first line (usually `STA,hello`) is not lost.
 * Resolves only once `startNotifications()` has succeeded.
 */
export async function openNusConnection(
  device: BluetoothDeviceLike,
  onNotify: (tx: BluetoothCharacteristicLike) => void,
): Promise<NusConnection> {
  const gatt = device.gatt;
  if (!gatt) throw new NusConnectError('gatt', Object.assign(new Error('No GATT server'), { name: 'NotFoundError' }));
  let server: BluetoothGattServerLike;
  try {
    server = await gatt.connect();
  } catch (error) {
    throw new NusConnectError('gatt', error);
  }
  try {
    const service = await server.getPrimaryService(NUS_SERVICE_UUID);
    const tx = await service.getCharacteristic(NUS_TX_CHARACTERISTIC_UUID);
    const rx = await service.getCharacteristic(NUS_RX_CHARACTERISTIC_UUID).catch(() => null);
    const listener = () => onNotify(tx);
    tx.addEventListener('characteristicvaluechanged', listener);
    try {
      await tx.startNotifications();
    } catch (error) {
      tx.removeEventListener('characteristicvaluechanged', listener);
      throw error;
    }
    return {
      device,
      server,
      tx,
      rx,
      close(disconnectGatt) {
        tx.removeEventListener('characteristicvaluechanged', listener);
        if (disconnectGatt) safeGattDisconnect(device.gatt ?? server);
      },
    };
  } catch (error) {
    safeGattDisconnect(server);
    throw new NusConnectError('service', error);
  }
}

/** Writes one newline-terminated line, letting the browser pick the write type where it can. */
export async function writeNusLine(rx: BluetoothCharacteristicLike, line: string): Promise<void> {
  const data = new TextEncoder().encode(`${line}\n`);
  if (rx.writeValue) await rx.writeValue(data);
  else if (rx.writeValueWithResponse) await rx.writeValueWithResponse(data);
  else if (rx.writeValueWithoutResponse) await rx.writeValueWithoutResponse(data);
  else throw new Error('The ring does not accept writes');
}
