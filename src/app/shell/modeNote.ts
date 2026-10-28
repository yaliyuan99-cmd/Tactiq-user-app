/**
 * The app's single statement about what is real.
 *
 * No ring has been built, so almost everything on screen is simulated. Saying
 * that inside every card and on every page meant screen reader users heard the
 * same assurance over and over, and it stopped being read at all. It is said
 * once instead, here, in the shell's mode bar, next to the pill that names the
 * current mode — so it is always on screen and never repeated.
 *
 * Kept free of React so the wording is unit tested.
 */
import type { ConnectionStatusKind } from '@/components';
import type { SectionId } from '@/app/routing/sections';

/** What the mode bar says for the section and device state on screen. */
export function modeSentence(section: SectionId, status: ConnectionStatusKind): string {
  if (section === 'demo') {
    return 'A demonstration of the app. Nothing is saved to an account, and every reading on screen is simulated.';
  }
  switch (status) {
    case 'demo':
      return 'Simulated ring. Nothing in the app is a hardware measurement.';
    case 'connected':
      return 'A bench prototype is connected. Its readings come from unvalidated hardware.';
    case 'scanning':
    case 'connecting':
    case 'reconnecting':
      return 'Looking for a ring. Until one answers, everything on screen is simulated.';
    default:
      return 'No ring is connected, so everything on screen is simulated.';
  }
}

/**
 * Whether the device pill earns its place. In the demonstration the
 * "Demonstration" pill and the sentence already say that the ring is
 * simulated, so a second pill repeating it would be noise; a prototype that is
 * connecting, connected or failing is new information and is shown.
 */
export function showsDevicePill(section: SectionId, status: ConnectionStatusKind): boolean {
  return section === 'account' || status !== 'demo';
}
