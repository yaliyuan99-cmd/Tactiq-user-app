/**
 * Renders the real route table (AppRoutes) inside MemoryRouter and the full
 * provider stack, with services the test can spy on and a probe exposing the
 * current location.
 */
import { type ReactNode } from 'react';
import { vi } from 'vitest';
import { configure, render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import type { AuthService } from '@/services/auth/types';
import type { DeviceMode } from '@/services/device/types';
import { type AppServices } from '@/services/ServicesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { profileStorage, seedSignedInUser, TEST_USER } from '@/test/renderApp';

/*
 * Timeouts. Every route here renders through React.lazy, so a test waits for
 * Vite to transform and load a page chunk — seconds, on a cold cache under a
 * busy parallel run. The defaults left no room for that: a findBy* would wait
 * up to asyncUtilTimeout while vitest's own 5 s testTimeout killed the test
 * mid-wait, so a starved run reported "Test timed out in 5000ms" instead of
 * whatever the query could not find.
 *
 * So the chunk is given real time to arrive, and the query timeout is kept
 * below the test timeout, which keeps a genuinely missing element failing with
 * the element it looked for. These are waits, not assertions: nothing here
 * lets a broken screen pass, it only stops the runner killing a test that is
 * still legitimately waiting on a module.
 */
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });

export interface RenderRoutesOptions {
  readonly route?: string;
  readonly signedIn?: boolean;
  /** Merged over the defaults; onboarding is complete unless overridden. */
  readonly preferences?: Partial<UserPreferences>;
  readonly deviceMode?: DeviceMode;
  readonly authService?: AuthService;
  readonly storage?: StorageAdapter;
  /**
   * Ready-made services, e.g. to spy on one before the first render. Passing
   * them opts out of the per-profile scoping, because ServicesProvider uses
   * injected services as they are; leave it out to get the wiring the app runs.
   */
  readonly services?: AppServices;
  /** Extra content rendered after the routes (inside the router and providers). */
  readonly children?: ReactNode;
}

export type RenderRoutesResult = RenderResult & {
  readonly storage: StorageAdapter;
  /** The services the test passed in, if any; otherwise AppProviders built them per profile. */
  readonly services: AppServices | undefined;
  readonly user: ReturnType<typeof userEvent.setup>;
};

function LocationProbe() {
  const location = useLocation();
  return <div hidden data-testid="location" data-location={`${location.pathname}${location.search}${location.hash}`} />;
}

/** The current router location as "pathname+search+hash". */
export function currentLocation(): string {
  return screen.getByTestId('location').getAttribute('data-location') ?? '';
}

export function renderRoutes({
  route = '/',
  signedIn = true,
  preferences,
  deviceMode,
  authService,
  storage = new MemoryStorageAdapter(),
  services,
  children,
}: RenderRoutesOptions = {}): RenderRoutesResult {
  // Seeded the way renderApp seeds it: through the profile's view of storage,
  // so each half of the preferences lands where the app looks for it however
  // the device/profile split is drawn. ('prefs' is device-wide today, so the
  // view passes it through and the app claims the person's half on first read.)
  profileStorage(storage, signedIn ? TEST_USER : null).set<UserPreferences>(STORAGE_KEYS.preferences, {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: true,
    ...preferences,
    version: 1,
  });
  if (signedIn) seedSignedInUser(storage);
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders
        storage={storage}
        {...(services ? { services } : {})}
        {...(authService ? { authService } : {})}
        {...(deviceMode ? { initialDeviceMode: deviceMode } : {})}
      >
        <AppRoutes />
        <LocationProbe />
        {children}
      </AppProviders>
    </MemoryRouter>,
  );
  return { ...result, storage, services, user };
}
