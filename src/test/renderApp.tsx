/**
 * Renders any screen inside the full provider stack (the same one the app
 * uses), with an optional signed-in Demo Mode profile and preferences seeded
 * into a fresh in-memory storage.
 */
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import type { LocalAccountRecord, LocalSessionRecord } from '@/services/auth/LocalDemoAuthService';
import type { DeviceAdapter, DeviceMode } from '@/services/device/types';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';

export const TEST_USER: LocalAccountRecord = {
  id: 'user_test',
  email: 'alex@example.com',
  displayName: 'Alex',
  createdAt: '2026-09-01T09:00:00.000Z',
};

export interface RenderAppOptions extends Omit<RenderOptions, 'wrapper' | 'queries'> {
  readonly route?: string;
  readonly storage?: StorageAdapter;
  /** Merged over the defaults. Onboarding is marked complete unless you say otherwise. */
  readonly preferences?: Partial<UserPreferences>;
  /** Seeds a Demo Mode profile and session. Defaults to true. */
  readonly signedIn?: boolean;
  readonly deviceAdapter?: DeviceAdapter;
  readonly deviceMode?: DeviceMode;
}

export type RenderAppResult = RenderResult & { readonly storage: StorageAdapter };

export function seedSignedInUser(storage: StorageAdapter, user: LocalAccountRecord = TEST_USER): void {
  storage.set<LocalAccountRecord[]>(STORAGE_KEYS.authAccounts, [user]);
  storage.set<LocalSessionRecord>(STORAGE_KEYS.authSession, { userId: user.id, signedInAt: '2026-09-01T09:00:00.000Z' });
}

export function renderApp(
  ui: ReactElement,
  { route = '/', storage = new MemoryStorageAdapter(), preferences, signedIn = true, deviceAdapter, deviceMode, ...options }: RenderAppOptions = {},
): RenderAppResult {
  storage.set<UserPreferences>(STORAGE_KEYS.preferences, {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: true,
    ...preferences,
    version: 1,
  });
  if (signedIn) seedSignedInUser(storage);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AppProviders
          storage={storage}
          {...(deviceAdapter ? { deviceAdapter } : {})}
          {...(deviceMode ? { initialDeviceMode: deviceMode } : {})}
        >
          {children}
        </AppProviders>
      </MemoryRouter>
    );
  }
  const result = render(ui, { ...options, wrapper: Wrapper });
  return { ...result, storage };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
