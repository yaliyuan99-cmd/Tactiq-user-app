/**
 * A structural stand-in for the Web Bluetooth API, for tests. It models just
 * enough of a bench ring: a chooser, a GATT server, the UART service and its
 * two characteristics, notifications and a disconnect event.
 */
import { DEVICE_NAME, NUS_RX_CHARACTERISTIC_UUID, NUS_SERVICE_UUID, NUS_TX_CHARACTERISTIC_UUID } from '@/domain/protocol';
import type {
  BluetoothCharacteristicLike,
  BluetoothDeviceLike,
  BluetoothEventHandler,
  BluetoothGattServerLike,
  BluetoothLike,
  BluetoothRequestOptions,
  BluetoothServiceLike,
} from '../webBluetoothTypes';

export function namedError(name: string, message = name): Error {
  return Object.assign(new Error(message), { name });
}

class Listeners {
  private readonly map = new Map<string, Set<BluetoothEventHandler>>();
  add(type: string, listener: BluetoothEventHandler): void {
    const set = this.map.get(type) ?? new Set<BluetoothEventHandler>();
    set.add(listener);
    this.map.set(type, set);
  }
  remove(type: string, listener: BluetoothEventHandler): void {
    this.map.get(type)?.delete(listener);
  }
  count(type: string): number {
    return this.map.get(type)?.size ?? 0;
  }
  fire(type: string, target: unknown): void {
    for (const listener of [...(this.map.get(type) ?? [])]) listener({ type, target } as unknown as Event);
  }
}

export class FakeCharacteristic implements BluetoothCharacteristicLike {
  value: DataView | null = null;
  notifying = false;
  startNotificationsError: Error | null = null;
  readonly writes: string[] = [];
  readonly listeners = new Listeners();

  async startNotifications(): Promise<unknown> {
    if (this.startNotificationsError) throw this.startNotificationsError;
    this.notifying = true;
    return this;
  }
  async writeValue(data: BufferSource): Promise<void> {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.writes.push(new TextDecoder().decode(bytes));
  }
  addEventListener(type: 'characteristicvaluechanged', listener: BluetoothEventHandler): void {
    this.listeners.add(type, listener);
  }
  removeEventListener(type: 'characteristicvaluechanged', listener: BluetoothEventHandler): void {
    this.listeners.remove(type, listener);
  }
  /** Sends a chunk from the ring, exactly as a BLE notification would. */
  notify(text: string): void {
    const bytes = new TextEncoder().encode(text);
    this.value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.listeners.fire('characteristicvaluechanged', this);
  }
}

export class FakeService implements BluetoothServiceLike {
  constructor(readonly characteristics: Map<string, FakeCharacteristic>) {}
  async getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike> {
    const found = this.characteristics.get(uuid);
    if (!found) throw namedError('NotFoundError', `No characteristic ${uuid}`);
    return found;
  }
}

export class FakeGattServer implements BluetoothGattServerLike {
  connected = false;
  connectCalls = 0;
  connectError: Error | null = null;
  readonly services = new Map<string, FakeService>();

  constructor(private readonly device: FakeBluetoothDevice) {}

  async connect(): Promise<BluetoothGattServerLike> {
    this.connectCalls += 1;
    if (this.connectError) throw this.connectError;
    this.connected = true;
    return this;
  }
  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.device.listeners.fire('gattserverdisconnected', this.device);
  }
  async getPrimaryService(uuid: string): Promise<BluetoothServiceLike> {
    const found = this.services.get(uuid);
    if (!found) throw namedError('NotFoundError', `No service ${uuid}`);
    return found;
  }
}

export class FakeBluetoothDevice implements BluetoothDeviceLike {
  readonly listeners = new Listeners();
  readonly gatt: FakeGattServer;
  readonly tx = new FakeCharacteristic();
  readonly rx = new FakeCharacteristic();
  forgotten = false;

  constructor(
    readonly id = 'browser-assigned-id',
    readonly name: string | null = DEVICE_NAME,
    options: { withService?: boolean } = {},
  ) {
    this.gatt = new FakeGattServer(this);
    if (options.withService ?? true) {
      const characteristics = new Map([
        [NUS_TX_CHARACTERISTIC_UUID, this.tx],
        [NUS_RX_CHARACTERISTIC_UUID, this.rx],
      ]);
      this.gatt.services.set(NUS_SERVICE_UUID, new FakeService(characteristics));
    }
  }

  async forget(): Promise<void> {
    this.forgotten = true;
  }
  addEventListener(type: 'gattserverdisconnected', listener: BluetoothEventHandler): void {
    this.listeners.add(type, listener);
  }
  removeEventListener(type: 'gattserverdisconnected', listener: BluetoothEventHandler): void {
    this.listeners.remove(type, listener);
  }
  /** The link drops without the app asking (out of range, powered off). */
  dropConnection(): void {
    this.gatt.connected = false;
    this.listeners.fire('gattserverdisconnected', this);
  }
}

export class FakeBluetooth implements BluetoothLike {
  readonly requests: BluetoothRequestOptions[] = [];
  /** What the next chooser returns: a device, or an error to throw. */
  next: FakeBluetoothDevice | Error;

  constructor(next: FakeBluetoothDevice | Error = new FakeBluetoothDevice()) {
    this.next = next;
  }

  async requestDevice(options: BluetoothRequestOptions): Promise<BluetoothDeviceLike> {
    this.requests.push(options);
    if (this.next instanceof Error) throw this.next;
    return this.next;
  }
}
