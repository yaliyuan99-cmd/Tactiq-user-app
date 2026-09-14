/**
 * Renders the real route table (AppRoutes) inside MemoryRouter and the full
 * provider stack, with services the test can spy on and a probe exposing the
 * current location.
 */
import { type ReactNode } from 'react';
import { configure, render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import type { AuthService } from '@/services/auth/types';
import type { DeviceMode } from '@/services/device/types';
import { createServices, type AppServices } from '@/services/ServicesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { seedSignedInUser } from '@/test/renderApp';

// Each route loads a lazy page chunk; under a busy parallel test run that can exceed the 1 s default.
configure({ asyncUtilTimeout: 5000 });

export interface RenderRoutesOptions {
  readonly route?: string;
  readonly signedIn?: boolean;
  /** Merged over the defaults; onboarding is complete unless overridden. */
  readonly preferences?: Partial<UserPreferences>;
  readonly deviceMode?: DeviceMode;
  readonly authService?: AuthService;
  readonly storage?: StorageAdapter;
  /** Services to use (built on `storage` when omitted), e.g. to spy before the first render. */
  readonly services?: AppServices;
  /** Extra content rendered after the routes (inside the router and providers). */
  readonly children?: ReactNode;
}

export type RenderRoutesResult = RenderResult & {
  readonly storage: StorageAdapter;
  readonly services: AppServices;
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
  services = createServices(storage),
  children,
}: RenderRoutesOptions = {}): RenderRoutesResult {
  storage.set<UserPreferences>(STORAGE_KEYS.preferences, {
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
        services={services}
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
