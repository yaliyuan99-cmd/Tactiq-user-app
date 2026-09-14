/**
 * Minimal structural typings for the parts of the Web Bluetooth API the
 * adapter uses. Deliberately not `@types/web-bluetooth`: structural types let
 * tests pass plain fake objects, and the app carries no extra dependency.
 */

export type BluetoothEventHandler = (event: Event) => void;

export interface BluetoothCharacteristicLike {
  readonly value?: DataView | null;
  startNotifications(): Promise<unknown>;
  stopNotifications?(): Promise<unknown>;
  writeValue?(data: BufferSource): Promise<void>;
  writeValueWithResponse?(data: BufferSource): Promise<void>;
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
  addEventListener(type: 'characteristicvaluechanged', listener: BluetoothEventHandler): void;
  removeEventListener(type: 'characteristicvaluechanged', listener: BluetoothEventHandler): void;
}

export interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

export interface BluetoothGattServerLike {
  readonly connected: boolean;
  connect(): Promise<BluetoothGattServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
}

export interface BluetoothDeviceLike {
  readonly id: string;
  readonly name?: string | null;
  readonly gatt?: BluetoothGattServerLike | null;
  /** Chrome 114+; revokes the site's permission for this device. */
  forget?(): Promise<void>;
  addEventListener(type: 'gattserverdisconnected', listener: BluetoothEventHandler): void;
  removeEventListener(type: 'gattserverdisconnected', listener: BluetoothEventHandler): void;
}

export interface BluetoothRequestFilter {
  readonly services?: readonly string[];
  readonly name?: string;
  readonly namePrefix?: string;
}

export interface BluetoothRequestOptions {
  readonly filters: readonly BluetoothRequestFilter[];
  readonly optionalServices?: readonly string[];
}

export interface BluetoothLike {
  requestDevice(options: BluetoothRequestOptions): Promise<BluetoothDeviceLike>;
}

export interface BluetoothNavigatorLike {
  readonly bluetooth?: BluetoothLike;
}
