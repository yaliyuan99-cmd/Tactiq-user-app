import { BATTERY_UNAVAILABLE_NOTE, DEVICE_NAME, NUS_SERVICE_UUID } from '@/domain/protocol';
import { COMMAND_WINDOW_MS } from '@/domain/timing';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from './capabilities';
import { loadDeviceRecord, saveDeviceRecord } from './deviceStorage';
import { FakeBluetooth, FakeBluetoothDevice, namedError } from './testing/fakeBluetooth';
import type { DeviceEvent } from './types';
import { WebBluetoothDeviceAdapter } from './WebBluetoothDeviceAdapter';

const NOW = Date.UTC(2026, 8, 15, 10, 0);
const SECURE = { isSecureContext: true };

function setup(options: { bluetooth?: FakeBluetooth; autoReconnect?: boolean } = {}) {
  const storage = new MemoryStorageAdapter();
  const bluetooth = options.bluetooth ?? new FakeBluetooth();
  const adapter = new WebBluetoothDeviceAdapter(storage, {
    navigator: { bluetooth },
    window: SECURE,
    now: () => NOW,
    autoReconnect: options.autoReconnect,
  });
  const events: DeviceEvent[] = [];
  adapter.subscribe((event) => events.push(event));
  const ofType = <T extends DeviceEvent['type']>(type: T) =>
    events.filter((e): e is Extract<DeviceEvent, { type: T }> => e.type === type);
  return { storage, bluetooth, adapter, events, ofType };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

describe('WebBluetoothDeviceAdapter availability', () => {
  it('reports unsupported when the browser has no Web Bluetooth', async () => {
    const storage = new MemoryStorageAdapter();
    const adapter = new WebBluetoothDeviceAdapter(storage, { navigator: {}, window: SECURE });
    expect(adapter.capabilities()).toEqual({
      webBluetooth: false,
      secureContext: true,
      reason: WEB_BLUETOOTH_UNAVAILABLE_REASON,
    });
    expect(adapter.getState()).toMatchObject({ mode: 'hardware', status: 'unsupported', error: { code: 'unsupported' } });
    await adapter.connect();
    expect(adapter.getState().status).toBe('unsupported');
  });

  it('reports an insecure page before anything else', () => {
    const adapter = new WebBluetoothDeviceAdapter(new MemoryStorageAdapter(), {
      navigator: { bluetooth: new FakeBluetooth() },
      window: { isSecureContext: false },
    });
    expect(adapter.capabilities().reason).toBe(INSECURE_CONTEXT_REASON);
    expect(adapter.getState()).toMatchObject({ status: 'unsupported', error: { code: 'insecure_context' } });
  });

  it('starts disconnected, offering a remembered ring', () => {
    const storage = new MemoryStorageAdapter();
    saveDeviceRecord(storage, { remembered: { id: 'abc', name: DEVICE_NAME, lastConnectedAt: null } });
    const adapter = new WebBluetoothDeviceAdapter(storage, { navigator: { bluetooth: new FakeBluetooth() }, window: SECURE });
    expect(adapter.capabilities().reason).toBeNull();
    expect(adapter.getState()).toMatchObject({
      status: 'disconnected',
      error: null,
      device: null,
      remembered: { id: 'abc', name: DEVICE_NAME },
    });
  });
});

describe('WebBluetoothDeviceAdapter connection', () => {
  it('connects, starts notifications and remembers the ring', async () => {
    const { adapter, bluetooth, storage, ofType } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();

    expect(bluetooth.requests[0]?.filters).toEqual([{ services: [NUS_SERVICE_UUID] }, { namePrefix: DEVICE_NAME }]);
    expect(ofType('state').map((e) => e.state.status)).toEqual(['scanning', 'connecting', 'connected']);
    expect(device.tx.notifying).toBe(true);
    const lastConnectedAt = new Date(NOW).toISOString();
    expect(adapter.getState()).toMatchObject({
      status: 'connected',
      error: null,
      device: {
        id: 'browser-assigned-id',
        name: DEVICE_NAME,
        firmwareVersion: null,
        battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
        lastConnectedAt,
      },
      remembered: { id: 'browser-assigned-id', name: DEVICE_NAME, lastConnectedAt },
    });
    expect(loadDeviceRecord(storage).remembered).toEqual({ id: 'browser-assigned-id', name: DEVICE_NAME, lastConnectedAt });
    expect(storage.get(STORAGE_KEYS.device)).toMatchObject({ version: 1, mode: 'demo' });
  });

  it('turns ring lines into events, and never reports the stub battery', async () => {
    const { adapter, bluetooth, events, ofType } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    events.length = 0;

    device.tx.notify('STA,hello,fw0.2\n');
    device.tx.notify('GATE,armed,100\n');
    device.tx.notify('TOK,confirm,index_');
    device.tx.notify('tip,183422,161\nSTA,battery,100\n');
    device.tx.notify('STA,pong\nWHAT,is,this\n');

    expect(ofType('line').map((e) => e.raw)).toEqual([
      'STA,hello,fw0.2',
      'GATE,armed,100',
      'TOK,confirm,index_tip,183422,161',
      'STA,battery,100',
      'STA,pong',
      'WHAT,is,this',
    ]);
    expect(ofType('hello')).toEqual([{ type: 'hello', firmwareVersion: 'fw0.2', at: NOW }]);
    expect(ofType('gate')).toEqual([{ type: 'gate', armed: true, closesAt: NOW + COMMAND_WINDOW_MS, at: NOW }]);
    expect(ofType('token')).toEqual([
      { type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 161, at: NOW },
    ]);
    expect(ofType('battery')).toEqual([{ type: 'battery', percentage: 100, isStub: true, at: NOW }]);

    const state = adapter.getState();
    expect(state.device?.firmwareVersion).toBe('fw0.2');
    expect(state.device?.battery).toEqual({ reported: false, note: BATTERY_UNAVAILABLE_NOTE });
    expect(state.gate).toEqual({ armed: true, closesAt: NOW + COMMAND_WINDOW_MS });

    device.tx.notify('GATE,idle,3100\n');
    expect(adapter.getState().gate).toEqual({ armed: false, closesAt: null });
  });

  it('maps a cancelled chooser to not_found', async () => {
    const { adapter, ofType } = setup({ bluetooth: new FakeBluetooth(namedError('NotFoundError', 'User cancelled')) });
    await adapter.connect();
    expect(adapter.getState()).toMatchObject({
      status: 'disconnected',
      error: {
        code: 'not_found',
        message: 'No ring was chosen.',
        hint: 'Make sure the ring is switched on and visible to Bluetooth, then try again.',
      },
    });
    expect(ofType('error')).toHaveLength(1);
  });

  it('maps a refused permission to permission_denied', async () => {
    const { adapter } = setup({ bluetooth: new FakeBluetooth(namedError('SecurityError')) });
    await adapter.connect();
    expect(adapter.getState()).toMatchObject({ status: 'permission_denied', error: { code: 'permission_denied' } });
  });

  it('maps a device without the UART service to service_missing, without claiming a connection', async () => {
    const device = new FakeBluetoothDevice('other', 'Headphones', { withService: false });
    const { adapter, ofType } = setup({ bluetooth: new FakeBluetooth(device) });
    await adapter.connect();
    expect(adapter.getState()).toMatchObject({ status: 'error', device: null, error: { code: 'service_missing' } });
    expect(ofType('state').map((e) => e.state.status)).not.toContain('connected');
    expect(device.gatt.connected).toBe(false);
  });

  it('does not claim connected when notifications fail to start', async () => {
    const device = new FakeBluetoothDevice();
    device.tx.startNotificationsError = namedError('NetworkError');
    const { adapter, storage } = setup({ bluetooth: new FakeBluetooth(device) });
    await adapter.connect();
    expect(adapter.getState()).toMatchObject({ status: 'error', error: { code: 'connection_failed' } });
    expect(loadDeviceRecord(storage).remembered).toBeNull();
    expect(device.tx.listeners.count('characteristicvaluechanged')).toBe(0);
  });

  it('maps a failed GATT connection to connection_failed', async () => {
    const device = new FakeBluetoothDevice();
    device.gatt.connectError = namedError('NetworkError');
    const { adapter } = setup({ bluetooth: new FakeBluetooth(device) });
    await adapter.connect();
    expect(adapter.getState()).toMatchObject({ status: 'error', error: { code: 'connection_failed' } });
  });
});

describe('WebBluetoothDeviceAdapter after connecting', () => {
  it('on an unexpected disconnect reports it, keeps the remembered ring and reconnects once', async () => {
    const { adapter, bluetooth, ofType } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    const statuses = () => ofType('state').map((e) => e.state.status);

    device.dropConnection();
    expect(ofType('error')).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ code: 'disconnected', hint: 'Move the ring closer, then choose Reconnect.' }),
      }),
    ]);
    expect(statuses().slice(-2)).toEqual(['disconnected', 'reconnecting']);
    expect(adapter.getState().remembered?.id).toBe('browser-assigned-id');

    await flush();
    expect(device.gatt.connectCalls).toBe(2);
    expect(adapter.getState().status).toBe('connected');
    expect(bluetooth.requests).toHaveLength(1);
  });

  it('settles on disconnected when the automatic reconnect fails', async () => {
    const { adapter, bluetooth } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    device.gatt.connectError = namedError('NetworkError');
    device.dropConnection();
    await flush();
    expect(adapter.getState()).toMatchObject({
      status: 'disconnected',
      error: { code: 'disconnected' },
      remembered: { id: 'browser-assigned-id' },
    });
  });

  it('does not reconnect when switched off', async () => {
    const { adapter, bluetooth } = setup({ autoReconnect: false });
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    device.dropConnection();
    await flush();
    expect(adapter.getState().status).toBe('disconnected');
    expect(device.gatt.connectCalls).toBe(1);
  });

  it('disconnect closes the link without an error or a reconnect', async () => {
    const { adapter, bluetooth, ofType } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    await adapter.disconnect();
    await flush();
    expect(device.gatt.connected).toBe(false);
    expect(device.gatt.connectCalls).toBe(1);
    expect(ofType('error')).toEqual([]);
    expect(adapter.getState()).toMatchObject({ status: 'disconnected', device: null, error: null });
    expect(adapter.getState().remembered).not.toBeNull();
  });

  it('forget disconnects, clears the remembered ring and asks the browser to forget it', async () => {
    const { adapter, bluetooth, storage } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    await adapter.forget();
    expect(device.gatt.connected).toBe(false);
    expect(device.forgotten).toBe(true);
    expect(adapter.getState().remembered).toBeNull();
    expect(loadDeviceRecord(storage).remembered).toBeNull();
  });

  it('ping writes PING to the ring only when connected', async () => {
    const { adapter, bluetooth } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.ping();
    expect(device.rx.writes).toEqual([]);
    await adapter.connect();
    await adapter.ping();
    expect(device.rx.writes).toEqual(['PING\n']);
  });

  it('configure changes the window used for gate estimates', async () => {
    const { adapter, bluetooth } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    adapter.configure({ commandWindowMs: 6000 });
    device.tx.notify('GATE,armed,1\n');
    expect(adapter.getState()).toMatchObject({ commandWindowMs: 6000, gate: { armed: true, closesAt: NOW + 6000 } });
  });

  it('ignores notifications after disconnecting', async () => {
    const { adapter, bluetooth, ofType } = setup();
    const device = bluetooth.next as FakeBluetoothDevice;
    await adapter.connect();
    await adapter.disconnect();
    device.tx.notify('TOK,next,middle_base,1,100\n');
    expect(ofType('token')).toEqual([]);
  });
});
