/**
 * Pure wording and decisions for the "Demo Mode or a ring" step.
 */
import type { DeviceStatusView } from '@/lib/deviceStatus';
import type { DeviceCapabilities, DeviceMode, DeviceState } from '@/services/device/types';
import { UNSUPPORTED_TITLE } from '../onboardingCopy';
import { sentence } from '../onboardingFlow';

export type HardwarePanelKind = 'unavailable' | 'connect';

/** A reason from the browser means a ring cannot connect here, whatever the device state says. */
export function hardwarePanelFor(capabilities: DeviceCapabilities): HardwarePanelKind {
  return capabilities.reason !== null || !capabilities.webBluetooth ? 'unavailable' : 'connect';
}

/** The reason shown when a ring cannot connect from this browser. */
export function unavailableReason(capabilities: DeviceCapabilities, state: DeviceState): string {
  return capabilities.reason ?? state.error?.message ?? 'This browser cannot connect to a ring. Demo Mode still works.';
}

/** Announced once after the user picks a mode. */
export function modeAnnouncement(mode: DeviceMode, capabilities: DeviceCapabilities, state: DeviceState): string {
  if (mode === 'demo') return 'Demo Mode chosen. You are using the simulated ring.';
  if (hardwarePanelFor(capabilities) === 'unavailable') {
    return `Bluetooth ring chosen. ${UNSUPPORTED_TITLE}. ${sentence(unavailableReason(capabilities, state))}`;
  }
  return 'Bluetooth ring chosen. Choose Connect a ring when the bench ring is switched on and close by.';
}

/** Announced when the connection status changes while a Bluetooth ring is chosen. */
export function connectionAnnouncement(view: DeviceStatusView): string {
  return `Status: ${sentence(view.label)} ${sentence(view.description)}`;
}

/** Scanning and connecting show the connect button as busy. */
export function isConnecting(state: DeviceState): boolean {
  return state.status === 'scanning' || state.status === 'connecting' || state.status === 'reconnecting';
}
