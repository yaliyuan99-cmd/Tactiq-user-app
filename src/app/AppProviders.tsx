/**
 * The provider stack, shared by the real app and by tests so both run the
 * same wiring. Order matters:
 *   Auth → Services (built on the signed-in profile's storage) → Preferences
 *   (reads that profile's half) → Feedback (reads preferences) → Device (reads
 *   preferences, and the device-wide store).
 *
 * Auth comes first because who is signed in decides whose data the services
 * may read: activity, calibration, lessons, shortcuts and the person's own
 * preferences all live under that profile. Device and auth keep the
 * device-wide store: one browser has one ring and one list of profiles.
 *
 * The router is supplied by the caller (BrowserRouter in the app,
 * MemoryRouter in tests).
 */
import { type ReactNode } from 'react';
import { PreferencesProvider } from '@/services/preferences/PreferencesProvider';
import { FeedbackProvider } from '@/services/feedback/FeedbackProvider';
import { ServicesProvider, useServices, type AppServices } from '@/services/ServicesProvider';
import { AuthProvider, useAuth } from '@/services/auth/AuthProvider';
import type { AuthService } from '@/services/auth/types';
import { DeviceProvider } from '@/services/device/DeviceProvider';
import type { DeviceAdapter, DeviceMode } from '@/services/device/types';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { rootStorage } from '@/services/storage/scopedStorage';

export interface AppProvidersProps {
  readonly storage: StorageAdapter;
  readonly children: ReactNode;
  readonly services?: AppServices;
  readonly authService?: AuthService;
  readonly deviceAdapter?: DeviceAdapter;
  readonly initialDeviceMode?: DeviceMode;
}

/**
 * Builds the services on the signed-in profile's storage. Nobody signed in
 * gets a scope of its own, so a signed-out session reads no profile's records.
 * Ready-made services are passed straight through, unscoped, for tests that
 * seed one store.
 */
function IdentityServices({
  storage,
  services,
  children,
}: {
  storage: StorageAdapter;
  services?: AppServices;
  children: ReactNode;
}) {
  const { user } = useAuth();
  return (
    <ServicesProvider storage={storage} scopeId={user?.id ?? null} {...(services ? { services } : {})}>
      {children}
    </ServicesProvider>
  );
}

/**
 * Preferences on the same storage view the services use, so the person's half
 * follows the profile. The scope passed on is the signed-in account, not the
 * storage's: the preferences a pre-profiles build left device-wide are claimed
 * by a person, never by a signed-out session.
 */
function ScopedPreferences({ children }: { children: ReactNode }) {
  const { storage } = useServices();
  const { user } = useAuth();
  return (
    <PreferencesProvider storage={storage} scopeId={user?.id ?? null}>
      {children}
    </PreferencesProvider>
  );
}

export function AppProviders({ storage, children, services, authService, deviceAdapter, initialDeviceMode }: AppProvidersProps) {
  const device = rootStorage(storage);
  return (
    <AuthProvider storage={device} {...(authService ? { service: authService } : {})}>
      <IdentityServices storage={storage} {...(services ? { services } : {})}>
        <ScopedPreferences>
          <FeedbackProvider>
            <DeviceProvider
              storage={device}
              {...(deviceAdapter ? { adapter: deviceAdapter } : {})}
              {...(initialDeviceMode ? { initialMode: initialDeviceMode } : {})}
            >
              {children}
            </DeviceProvider>
          </FeedbackProvider>
        </ScopedPreferences>
      </IdentityServices>
    </AuthProvider>
  );
}
