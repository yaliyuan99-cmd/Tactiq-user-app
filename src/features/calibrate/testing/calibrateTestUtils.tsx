/**
 * Helpers for the calibration page tests: render the page on its route (with
 * a dashboard stub for Stop), drive the simulated ring and read what was
 * announced.
 */
import { ROUTES } from '@/app/routes';
import { CONTACT_KEYS, getContact, type ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, CalibrationSample, GestureEvent } from '@/domain/models';
import { GATE_HOLD_MS } from '@/domain/timing';
import { settleProviders } from '@/features/practice/testing/practiceTestUtils';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { act, profileStorage, renderApp, screen, userEvent, within, type RenderAppOptions } from '@/test/renderApp';
import { CalibrateRoutes } from './CalibrateRoutes';

export type TestUser = ReturnType<typeof userEvent.setup>;

export async function renderCalibrate(options: RenderAppOptions = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = renderApp(<CalibrateRoutes />, { route: ROUTES.calibrate, ...options });
  await settleProviders();
  return { user, ...view };
}

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** A contact point button in either view ("Index fingertip, Confirm, target" or "Index fingertip — Confirm, target"). */
export function pointButton(contact: ContactKey): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${getContact(contact).label}(,| —)`) });
}

/**
 * Taps a point. After each tap the page squeezes the simulated ring again, so
 * the squeeze gate is waited out inside act, as a person's pause between taps would.
 */
export async function tap(user: TestUser, contact: ContactKey, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await user.click(pointButton(contact));
    advance(GATE_HOLD_MS);
  }
}

/** Holds a point down with the keyboard for `ms`. */
export async function press(user: TestUser, contact: ContactKey, ms: number): Promise<void> {
  pointButton(contact).focus();
  await user.keyboard('{Enter>}');
  advance(ms);
  await user.keyboard('{/Enter}');
}

/** Clicks a start button and waits out the squeeze gate the page performs. */
export async function clickAndOpenWindow(user: TestUser, name: string): Promise<void> {
  await user.click(screen.getByRole('button', { name }));
  advance(GATE_HOLD_MS);
}

export function promptHeading(): HTMLElement {
  return screen.getByRole('heading', { level: 2, name: /^Tap your / });
}

export function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

export function assertiveRegion(): HTMLElement {
  return screen.getByTestId('live-region-assertive');
}

export async function findPolite(text: string | RegExp): Promise<HTMLElement> {
  return within(politeRegion()).findByText(text);
}

export async function findAssertive(text: string | RegExp): Promise<HTMLElement> {
  return within(assertiveRegion()).findByText(text);
}

export function calibrationProgress(): HTMLElement {
  return screen.getByRole('progressbar', { name: 'Calibration progress' });
}

/**
 * A calibration record and the activity it wrote belong to the signed-in
 * profile, so they are read through that profile's view of the store — the
 * bare key is an address the app no longer reads or writes.
 */
export function storedProfile(storage: StorageAdapter): CalibrationProfile | null {
  return profileStorage(storage).get<CalibrationProfile>(STORAGE_KEYS.calibration);
}

export function storedHistory(storage: StorageAdapter): GestureEvent[] {
  return profileStorage(storage).get<GestureEvent[]>(STORAGE_KEYS.history) ?? [];
}

function sample(contact: ContactKey): CalibrationSample {
  return { contact, recordedAt: '2026-09-14T09:00:00.000Z', durationMs: 180, detectedContact: contact, accepted: true };
}

/** Storage holding an unfinished simulated profile where every point except `short` has its three taps. */
export function storageWithIncompleteProfile(short: readonly ContactKey[]): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  const profile: CalibrationProfile = {
    id: 'cal_seeded',
    hand: 'right',
    status: 'incomplete',
    startedAt: '2026-09-14T09:00:00.000Z',
    completedAt: '2026-09-14T09:01:00.000Z',
    samplesRequiredPerContact: 3,
    samples: CONTACT_KEYS.filter((c) => !short.includes(c)).flatMap((c) => [sample(c), sample(c), sample(c)]),
    evidence: 'simulated',
    deviceId: null,
  };
  profileStorage(storage).set(STORAGE_KEYS.calibration, profile);
  return storage;
}
