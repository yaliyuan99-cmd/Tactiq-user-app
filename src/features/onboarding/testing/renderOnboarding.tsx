/**
 * Renders the onboarding page at /onboarding inside the full provider stack,
 * with stubs for the pages it can leave to and a probe for the location.
 * Onboarding starts incomplete at step 0 unless the options say otherwise.
 */
import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { LessonId } from '@/domain/lessons';
import type { UserPreferences } from '@/domain/models';
import { readStoredPreferences } from '@/services/preferences/storedPreferences';
import { createServices } from '@/services/ServicesProvider';
import { scopedStorage } from '@/services/storage/scopedStorage';
import { MemoryStorageAdapter, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { renderApp, screen, userEvent, TEST_USER, type RenderAppOptions, type RenderAppResult } from '@/test/renderApp';
import OnboardingPage from '../OnboardingPage';
import { LocationProbe } from './LocationProbe';

export function currentPathname(): string {
  return screen.getByTestId('location').getAttribute('data-pathname') ?? '';
}

/** The signed-in test profile's view of a store, which is what the app's services read. */
export function profileView(storage: StorageAdapter): StorageAdapter {
  return scopedStorage(storage, TEST_USER.id);
}

/**
 * The preferences in force, read the way the app reads them: appearance from
 * the device-wide record and the rest from the signed-in profile's.
 */
export function storedPreferences(storage: StorageAdapter): UserPreferences {
  return readStoredPreferences(profileView(storage)).preferences;
}

/** A store whose signed-in profile has already finished `done`, in order. */
export function storageWithLessons(done: readonly LessonId[]): MemoryStorageAdapter {
  const storage = new MemoryStorageAdapter();
  const { training } = createServices(profileView(storage));
  for (const lessonId of done) {
    training.startRun(lessonId);
    training.recordAttempt(lessonId, { correct: true });
    training.completeRun(lessonId);
  }
  return storage;
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
        <Route path={ROUTES.settings} element={<h1>Settings stub</h1>} />
        <Route path="*" element={<h1>Other page stub</h1>} />
      </Routes>
      <LocationProbe />
    </>,
    { route: ROUTES.onboarding, ...rest, preferences: { onboardingCompleted: false, onboardingStep: 0, ...preferences } },
  );
  // Nothing is rendered until the session lands, so waiting for the heading
  // waits for the profile whose setup progress the page is about to read.
  await screen.findByRole('heading', { level: 1 });
  return { ...result, user };
}

/** Presses Tab until a radio button has focus; fails if none is reachable. */
export async function tabToRadio(
  user: ReturnType<typeof userEvent.setup>,
  maxTabs = 40,
): Promise<HTMLInputElement> {
  for (let i = 0; i < maxTabs; i += 1) {
    await user.tab();
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === 'radio') return active;
  }
  throw new Error('Could not reach a radio button with the Tab key.');
}

/** The words a control is reached by: its own text, or its aria-label when the content is a drawing. */
function controlName(element: HTMLElement): string {
  return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
}

/** Presses Tab until the named button or link has focus; fails if it is not reachable. */
export async function tabTo(user: ReturnType<typeof userEvent.setup>, name: string, maxTabs = 60): Promise<HTMLElement> {
  for (let i = 0; i < maxTabs; i += 1) {
    await user.tab();
    const active = document.activeElement;
    if (active instanceof HTMLElement && (active.tagName === 'BUTTON' || active.tagName === 'A') && controlName(active) === name) {
      return active;
    }
  }
  throw new Error(`Could not reach "${name}" with the Tab key.`);
}
