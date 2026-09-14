/**
 * Plain words for what this browser reports. These read the page
 * environment only; nothing probes a device.
 */
import type { DeviceCapabilities } from '@/services/device/types';

export function bluetoothCheckText(capabilities: DeviceCapabilities): string {
  if (capabilities.reason) return capabilities.reason;
  return 'Web Bluetooth is available on this secure page.';
}

export function speechCheckText(canSpeak: boolean): string {
  return canSpeak
    ? 'This browser offers speech, so Audio announcements can speak aloud.'
    : 'This browser does not offer speech, so Audio announcements cannot speak aloud here. Your screen reader still reads every announcement.';
}

export function vibrationCheckText(canVibrate: boolean): string {
  return canVibrate
    ? 'This browser offers vibration. The device also needs a vibration motor, which most computers do not have.'
    : 'This browser does not offer vibration, so feedback here is shown on screen and announced instead.';
}
