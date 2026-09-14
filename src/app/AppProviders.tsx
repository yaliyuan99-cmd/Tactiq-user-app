/**
 * The provider stack, shared by the real app and by tests so both run the
 * same wiring. Order matters:
 *   Preferences → Feedback (reads preferences) → Services → Auth → Device (reads preferences).
 * The router is supplied by the caller (BrowserRouter in the app, MemoryRouter in tests).
 */
import { type ReactNode } from 'react';
import { PreferencesProvider } from '@/services/preferences/PreferencesProvider';
import { FeedbackProvider } from '@/services/feedback/FeedbackProvider';
import { ServicesProvider, type AppServices } from '@/services/ServicesProvider';
import { AuthProvider } from '@/services/auth/AuthProvider';
import type { AuthService } from '@/services/auth/types';
import { DeviceProvider } from '@/services/device/DeviceProvider';
import type { DeviceAdapter, DeviceMode } from '@/services/device/types';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface AppProvidersProps {
  readonly storage: StorageAdapter;
  readonly children: ReactNode;
  readonly services?: AppServices;
  readonly authService?: AuthService;
  readonly deviceAdapter?: DeviceAdapter;
  readonly initialDeviceMode?: DeviceMode;
}

export function AppProviders({ storage, children, services, authService, deviceAdapter, initialDeviceMode }: AppProvidersProps) {
  return (
    <PreferencesProvider storage={storage}>
      <FeedbackProvider>
        <ServicesProvider storage={storage} {...(services ? { services } : {})}>
          <AuthProvider storage={storage} {...(authService ? { service: authService } : {})}>
            <DeviceProvider
              storage={storage}
              {...(deviceAdapter ? { adapter: deviceAdapter } : {})}
              {...(initialDeviceMode ? { initialMode: initialDeviceMode } : {})}
            >
              {children}
            </DeviceProvider>
          </AuthProvider>
        </ServicesProvider>
      </FeedbackProvider>
    </PreferencesProvider>
  );
}
