/**
 * Resuming setup, through the app's own route composition rather than the
 * test harness's.
 *
 * Every other onboarding test renders the page directly, which hides the order
 * the app really starts in: the session is restored first, and only then is
 * the page allowed to mount. A screen that reads a preference as it mounts
 * depends on that order holding, so it is worth one test of its own — this one
 * caught the page opening at step 1 for a user who had reached step 3.
 */
import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import { ProtectedRoute } from '@/app/routing/ProtectedRoute';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { renderApp, screen } from '@/test/renderApp';
import OnboardingPage from './OnboardingPage';
import { stepIndexOf } from './onboardingFlow';

/** The app's own wiring: nothing renders until the session has been restored. */
function renderAtStep(onboardingStep: number) {
  return renderApp(
    <Routes>
      <Route element={<ProtectedRoute standalone />}>
        <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
      </Route>
    </Routes>,
    {
      route: ROUTES.onboarding,
      storage: new MemoryStorageAdapter(),
      preferences: { onboardingStep, onboardingCompleted: false },
    },
  );
}

describe('OnboardingPage behind the route guard', () => {
  it('opens on the step the signed-in profile reached, not on the first one', async () => {
    renderAtStep(stepIndexOf('first_command'));

    expect(await screen.findByRole('heading', { level: 1, name: 'Your first command' })).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4 — Your first command')).toBeInTheDocument();
  });

  it('opens on the first step for a profile that has not started', async () => {
    renderAtStep(0);

    expect(await screen.findByRole('heading', { level: 1, name: 'Which hand' })).toBeInTheDocument();
  });
});
