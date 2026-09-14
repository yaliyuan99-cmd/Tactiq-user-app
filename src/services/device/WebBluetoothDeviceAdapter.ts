/**
 * Hardware adapter for the bench firmware over Web Bluetooth (Nordic UART
 * Service, docs/PROTOCOL.md). It reports only what the ring sends: tokens,
 * gate changes and its firmware string. The firmware's battery line is a
 * fixed stub, so the battery is always "not reported" here.
 */
import { BATTERY_UNAVAILABLE_NOTE, DEVICE_NAME, LineAssembler, NUS_SERVICE_UUID, PING_COMMAND } from '@/domain/protocol';
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { detectCapabilities, type WindowLike } from './capabilities';
import { DeviceEventEmitter } from './DeviceEventEmitter';
import { STATUS_FOR_ERROR, deviceError, mapBluetoothError } from './deviceErrors';
import { loadDeviceRecord, saveDeviceRecord } from './deviceStorage';
import { NusConnectError, type NusConnection, openNusConnection, safeGattDisconnect, writeNusLine } from './nusConnection';
import { interpretRingLine } from './ringLineEvents';
import { type Clock, systemClock } from './scheduler';
import type { DeviceAdapter, DeviceCapabilities, DeviceErrorCode, DeviceEventListener, DeviceState } from './types';
import type {
  BluetoothCharacteristicLike,
  BluetoothDeviceLike,
  BluetoothNavigatorLike,
  BluetoothRequestOptions,
} from './webBluetoothTypes';

export interface WebBluetoothDeviceAdapterOptions {
  /** Defaults to the page's navigator. Pass an object without `bluetooth` to simulate an unsupported browser. */
  readonly navigator?: BluetoothNavigatorLike;
  readonly window?: WindowLike;
  readonly now?: Clock;
  readonly commandWindowMs?: number;
  /** One automatic reconnect attempt after an unexpected disconnection. Default true. */
  readonly autoReconnect?: boolean;
}

/** The chooser request: the UART service, or the ring's advertised name. */
export const REQUEST_DEVICE_OPTIONS: BluetoothRequestOptions = {
  filters: [{ services: [NUS_SERVICE_UUID] }, { namePrefix: DEVICE_NAME }],
  // A name-prefix match grants no service access on its own; this lets that path open the UART service.
  optionalServices: [NUS_SERVICE_UUID],
};

const CLOSED_GATE = { armed: false, closesAt: null } as const;

function defaultNavigator(): BluetoothNavigatorLike | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & BluetoothNavigatorLike);
}

export class WebBluetoothDeviceAdapter implements DeviceAdapter {
  readonly kind = 'web_bluetooth' as const;

  private readonly nav: BluetoothNavigatorLike | undefined;
  private readonly win: WindowLike | undefined;
  private readonly now: Clock;
  private readonly autoReconnect: boolean;
  private readonly emitter = new DeviceEventEmitter();
  private readonly assembler = new LineAssembler();
  private decoder = new TextDecoder();
  private state: DeviceState;
  private connection: NusConnection | null = null;
  private bluetoothDevice: BluetoothDeviceLike | null = null;
  private reconnectAttempted = false;
  private busy = false;
  /** A `STA,hello` can arrive while notifications are still starting; kept for the device record. */
  private helloFirmware: string | null = null;
  /** Bumped whenever a connection attempt is started or abandoned, so stale attempts stand down. */
  private attempt = 0;

  constructor(
    private readonly storage: StorageAdapter,
    options: WebBluetoothDeviceAdapterOptions = {},
  ) {
    this.nav = 'navigator' in options ? options.navigator : defaultNavigator();
    this.win = 'window' in options ? options.window : typeof window === 'undefined' ? undefined : window;
    this.now = options.now ?? systemClock;
    this.autoReconnect = options.autoReconnect ?? true;
    const unavailable = this.unavailableCode();
    this.state = {
      mode: 'hardware',
      status: unavailable ? STATUS_FOR_ERROR[unavailable] : 'disconnected',
      device: null,
      remembered: loadDeviceRecord(storage).remembered,
      error: unavailable ? deviceError(unavailable) : null,
      gate: CLOSED_GATE,
      commandWindowMs: options.commandWindowMs ?? COMMAND_WINDOW_MS,
    };
  }

  capabilities(): DeviceCapabilities {
    return detectCapabilities(this.nav, this.win);
  }

  getState(): DeviceState {
    return this.state;
  }

  subscribe(listener: DeviceEventListener): () => void {
    return this.emitter.subscribe(listener);
  }

  /** Must run from a user gesture: it opens the browser's device chooser. */
  async connect(): Promise<void> {
    const unavailable = this.unavailableCode();
    const bluetooth = this.nav?.bluetooth;
    if (unavailable || !bluetooth) {
      this.fail(unavailable ?? 'unsupported');
      return;
    }
    if (this.busy || this.connection) return;
    const attempt = ++this.attempt;
    this.busy = true;
    this.setState({ status: 'scanning', error: null });
    let device: BluetoothDeviceLike;
    try {
      device = await bluetooth.requestDevice(REQUEST_DEVICE_OPTIONS);
    } catch (error) {
      if (attempt !== this.attempt) return;
      this.busy = false;
      this.fail(mapBluetoothError(error, 'request'));
      return;
    }
    if (attempt !== this.attempt) return;
    this.adoptDevice(device);
    this.setState({ status: 'connecting' });
    await this.openSession(device, attempt);
  }

  async disconnect(): Promise<void> {
    this.abandon();
    if (this.unavailableCode()) return;
    this.setState({ status: 'disconnected', device: null, error: null, gate: CLOSED_GATE });
  }

  async forget(): Promise<void> {
    const device = this.bluetoothDevice;
    await this.disconnect();
    this.adoptDevice(null);
    saveDeviceRecord(this.storage, { remembered: null });
    if (device?.forget) {
      try {
        await device.forget();
      } catch {}
    }
    this.setState({ remembered: null });
  }

  /** Writes `PING` to the ring; its `STA,pong` reply arrives as a line. Does nothing when not connected. */
  async ping(): Promise<void> {
    const rx = this.connection?.rx;
    if (!rx) return;
    try {
      await writeNusLine(rx, PING_COMMAND);
    } catch {
      const error = deviceError('connection_failed');
      this.setState({ error });
      this.emitter.emit({ type: 'error', error, at: this.now() });
    }
  }

  configure(options: { commandWindowMs?: number }): void {
    const ms = options.commandWindowMs;
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0 || ms === this.state.commandWindowMs) return;
    this.setState({ commandWindowMs: ms });
  }

  /** Drops the connection and every listener. The adapter can still connect again afterwards. */
  destroy(): void {
    this.abandon();
    this.adoptDevice(null);
    this.emitter.clear();
  }

  /* ---------------------------------------------------------------- */

  private unavailableCode(): DeviceErrorCode | null {
    const caps = this.capabilities();
    if (!caps.secureContext) return 'insecure_context';
    if (!caps.webBluetooth) return 'unsupported';
    return null;
  }

  /** Abandons any in-flight attempt and closes the current connection. */
  private abandon(): void {
    this.attempt += 1;
    this.busy = false;
    const connection = this.connection;
    this.connection = null;
    if (connection) connection.close(true);
    else safeGattDisconnect(this.bluetoothDevice?.gatt);
    this.assembler.reset();
  }

  private adoptDevice(device: BluetoothDeviceLike | null): void {
    if (this.bluetoothDevice === device) return;
    this.bluetoothDevice?.removeEventListener('gattserverdisconnected', this.handleGattDisconnected);
    this.bluetoothDevice = device;
    this.reconnectAttempted = false;
    device?.addEventListener('gattserverdisconnected', this.handleGattDisconnected);
  }

  /** Claims "connected" only after notifications have started. */
  private async openSession(device: BluetoothDeviceLike, attempt: number, failureCode?: DeviceErrorCode): Promise<void> {
    this.assembler.reset();
    this.decoder = new TextDecoder();
    this.helloFirmware = null;
    let connection: NusConnection;
    try {
      connection = await openNusConnection(device, (tx) => this.handleNotification(tx, attempt));
    } catch (error) {
      if (attempt !== this.attempt) return;
      this.busy = false;
      const code = error instanceof NusConnectError ? mapBluetoothError(error.original, error.phase) : 'connection_failed';
      this.fail(failureCode ?? code);
      return;
    }
    if (attempt !== this.attempt) {
      connection.close(true);
      return;
    }
    this.connection = connection;
    this.busy = false;
    this.reconnectAttempted = false;
    const lastConnectedAt = new Date(this.now()).toISOString();
    const name = device.name || DEVICE_NAME;
    const remembered = { id: device.id, name, lastConnectedAt };
    saveDeviceRecord(this.storage, { remembered });
    this.setState({
      status: 'connected',
      error: null,
      remembered,
      gate: CLOSED_GATE,
      device: {
        id: device.id,
        name,
        firmwareVersion: this.helloFirmware,
        battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
        lastConnectedAt,
        evidence: 'measured',
      },
    });
  }

  private readonly handleGattDisconnected = (): void => {
    const connection = this.connection;
    if (!connection) return;
    this.connection = null;
    connection.close(false);
    this.assembler.reset();
    this.fail('disconnected');
    const { device } = connection;
    if (this.autoReconnect && !this.reconnectAttempted && this.bluetoothDevice === device && device.gatt) {
      this.reconnectAttempted = true;
      const attempt = ++this.attempt;
      this.busy = true;
      this.setState({ status: 'reconnecting' });
      void this.openSession(device, attempt, 'disconnected');
    }
  };

  private handleNotification(tx: BluetoothCharacteristicLike, attempt: number): void {
    if (attempt !== this.attempt || !tx.value) return;
    const text = this.decoder.decode(tx.value, { stream: true });
    for (const line of this.assembler.push(text)) {
      const { state, events } = interpretRingLine(line, this.state, this.now());
      this.state = state;
      for (const event of events) {
        if (event.type === 'hello') this.helloFirmware = event.firmwareVersion;
        this.emitter.emit(event);
      }
    }
  }

  private fail(code: DeviceErrorCode): void {
    const error = deviceError(code);
    this.setState({ status: STATUS_FOR_ERROR[code], error, device: null, gate: CLOSED_GATE });
    this.emitter.emit({ type: 'error', error, at: this.now() });
  }

  private setState(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    this.emitter.emit({ type: 'state', state: this.state, at: this.now() });
  }
}
