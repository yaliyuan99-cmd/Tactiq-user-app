import { describeDeviceState } from '@/lib/deviceStatus';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from '@/services/device/capabilities';
import type { DeviceCapabilities, DeviceState } from '@/services/device/types';
import { connectionAnnouncement, hardwarePanelFor, isConnecting, modeAnnouncement, unavailableReason } from './deviceChoice';

const SUPPORTED: DeviceCapabilities = { webBluetooth: true, secureContext: true, reason: null };
const NO_BLUETOOTH: DeviceCapabilities = { webBluetooth: false, secureContext: true, reason: WEB_BLUETOOTH_UNAVAILABLE_REASON };
const INSECURE: DeviceCapabilities = { webBluetooth: false, secureContext: false, reason: INSECURE_CONTEXT_REASON };

function hardwareState(patch: Partial<DeviceState> = {}): DeviceState {
  return {
    mode: 'hardware',
    status: 'disconnected',
    device: null,
    remembered: null,
    error: null,
    gate: { armed: false, closesAt: null },
    commandWindowMs: 3000,
    ...patch,
  };
}

describe('deviceChoice', () => {
  it('shows the unavailable panel whenever the browser gives a reason', () => {
    expect(hardwarePanelFor(SUPPORTED)).toBe('connect');
    expect(hardwarePanelFor(NO_BLUETOOTH)).toBe('unavailable');
    expect(hardwarePanelFor(INSECURE)).toBe('unavailable');
    expect(hardwarePanelFor({ webBluetooth: false, secureContext: true, reason: null })).toBe('unavailable');
  });

  it('prefers the browser’s reason, then the device error', () => {
    expect(unavailableReason(INSECURE, hardwareState())).toBe(INSECURE_CONTEXT_REASON);
    const error = { code: 'unsupported' as const, message: 'No Bluetooth here.', hint: 'Use Chrome.' };
    expect(unavailableReason({ webBluetooth: false, secureContext: true, reason: null }, hardwareState({ error }))).toBe(
      'No Bluetooth here.',
    );
  });

  it('words the mode choice', () => {
    expect(modeAnnouncement('demo', SUPPORTED, hardwareState({ mode: 'demo' }))).toBe(
      'Demo Mode chosen. You are using the simulated ring.',
    );
    expect(modeAnnouncement('hardware', NO_BLUETOOTH, hardwareState())).toBe(
      `Bluetooth ring chosen. This browser cannot connect to a ring. ${WEB_BLUETOOTH_UNAVAILABLE_REASON}`,
    );
    expect(modeAnnouncement('hardware', SUPPORTED, hardwareState())).toContain('Choose Connect a ring');
  });

  it('words a status change', () => {
    expect(connectionAnnouncement(describeDeviceState(hardwareState({ status: 'scanning' })))).toBe(
      'Status: Searching… Choose the ring in your browser’s Bluetooth window.',
    );
    expect(connectionAnnouncement(describeDeviceState(hardwareState()))).toBe('Status: Disconnected. No ring is connected.');
  });

  it('treats scanning, connecting and reconnecting as busy', () => {
    expect(isConnecting(hardwareState({ status: 'scanning' }))).toBe(true);
    expect(isConnecting(hardwareState({ status: 'connecting' }))).toBe(true);
    expect(isConnecting(hardwareState({ status: 'reconnecting' }))).toBe(true);
    expect(isConnecting(hardwareState({ status: 'connected' }))).toBe(false);
  });
});
