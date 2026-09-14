/**
 * What this browser can do for a hardware ring. Shared by both adapters.
 * Nothing here probes a device — it only reads what the page environment offers.
 */
import type { DeviceCapabilities } from './types';

export const WEB_BLUETOOTH_UNAVAILABLE_REASON =
  'This browser does not offer Web Bluetooth. Chrome or Edge on desktop or Android can connect; Safari and Firefox cannot.';
export const INSECURE_CONTEXT_REASON = 'Web Bluetooth needs a secure (https) page.';

export interface NavigatorLike {
  readonly bluetooth?: unknown;
}

export interface WindowLike {
  readonly isSecureContext?: boolean;
}

function defaultNavigator(): NavigatorLike | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & NavigatorLike);
}

function defaultWindow(): WindowLike | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

/**
 * Browsers hide `navigator.bluetooth` on insecure pages, so an insecure page
 * is reported first: it is the actionable reason there, whatever the browser.
 */
export function detectCapabilities(
  nav: NavigatorLike | undefined = defaultNavigator(),
  win: WindowLike | undefined = defaultWindow(),
): DeviceCapabilities {
  const webBluetooth = nav !== undefined && nav !== null && 'bluetooth' in nav && Boolean(nav.bluetooth);
  const secureContext = win?.isSecureContext === true;
  let reason: string | null = null;
  if (!secureContext) reason = INSECURE_CONTEXT_REASON;
  else if (!webBluetooth) reason = WEB_BLUETOOTH_UNAVAILABLE_REASON;
  return { webBluetooth, secureContext, reason };
}
