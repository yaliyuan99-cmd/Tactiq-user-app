/**
 * Renders the onboarding page at /onboarding inside the full provider stack,
 * with stubs for the pages it can leave to and a probe for the location.
 * Onboarding starts incomplete at step 0 unless the options say otherwise.
 */
import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { UserPreferences } from '@/domain/models';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { act, renderApp, screen, userEvent, type RenderAppOptions, type RenderAppResult } from '@/test/renderApp';
import OnboardingPage from '../OnboardingPage';
import { LocationProbe } from './LocationProbe';

export function currentPathname(): string {
  return screen.getByTestId('location').getAttribute('data-pathname') ?? '';
}

export function storedPreferences(storage: StorageAdapter): UserPreferences | null {
  return storage.get<UserPreferences>(STORAGE_KEYS.preferences);
}

export function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

export type RenderOnboardingResult = RenderAppResult & { readonly user: ReturnType<typeof userEvent.setup> };

export async function renderOnboarding(options: RenderAppOptions = {}): Promise<RenderOnboardingResult> {
  const user = userEvent.setup();
  const { preferences, ...rest } = options;
  const result = renderApp(
    <>
      <Routes>
        <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        <Route path={ROUTES.dashboard} element={<h1>Dashboard stub</h1>} />
        <Route path={ROUTES.calibrate} element={<h1>Calibration stub</h1>} />
        <Route path="*" element={<h1>Other page stub</h1>} />
      </Routes>
      <LocationProbe />
    </>,
    { route: ROUTES.onboarding, ...rest, preferences: { onboardingCompleted: false, onboardingStep: 0, ...preferences } },
  );
  // Let the auth session check finish inside act.
  await act(async () => {
    await Promise.resolve();
  });
  return { ...result, user };
}

/** Presses Tab until the named button or link has focus; fails if it is not reachable. */
export async function tabTo(user: ReturnType<typeof userEvent.setup>, name: string, maxTabs = 60): Promise<HTMLElement> {
  for (let i = 0; i < maxTabs; i += 1) {
    await user.tab();
    const active = document.activeElement;
    if (active instanceof HTMLElement && (active.tagName === 'BUTTON' || active.tagName === 'A') && active.textContent?.trim() === name) {
      return active;
    }
  }
  throw new Error(`Could not reach "${name}" with the Tab key.`);
}
