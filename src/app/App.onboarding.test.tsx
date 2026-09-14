/**
 * The real onboarding page inside the real route table (App.test.tsx stubs it).
 * Onboarding draws its own frame, so the route must not add a second one.
 * Calibrate and Help are stubbed; the dashboard is the real page.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { stepIndexOf } from '@/features/onboarding/onboardingFlow';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import type { UserPreferences } from '@/domain/models';

vi.mock('@/features/train/LessonRunner', () => import('@/features/onboarding/testing/MockLessonRunner'));
vi.mock('@/features/calibrate/CalibratePage', async () => (await import('./testing/pageStubs')).stubPage('Calibrate'));
vi.mock('@/features/help/HelpPage', async () => (await import('./testing/pageStubs')).stubPage('Help'));

const NOT_STARTED = { onboardingCompleted: false, onboardingStep: 0 } as const;

async function findStepHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('AppRoutes: onboarding frame', () => {
  it('renders exactly one main landmark, one skip link and one banner with Help and Skip setup', async () => {
    renderRoutes({ route: ROUTES.onboarding, preferences: NOT_STARTED });
    await findStepHeading('Welcome');
    expect(document.title).toBe('Set up Tactiq · Tactiq');

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main-content');
    expect(document.querySelectorAll('#main-content')).toHaveLength(1);
    expect(within(mains[0] as HTMLElement).getByRole('heading', { level: 1 })).toBeInTheDocument();

    const skipLinks = screen.getAllByRole('link', { name: 'Skip to main content' });
    expect(skipLinks).toHaveLength(1);
    expect(skipLinks[0]).toHaveAttribute('href', '#main-content');

    const banners = screen.getAllByRole('banner');
    expect(banners).toHaveLength(1);
    const banner = banners[0] as HTMLElement;
    expect(within(banner).getByRole('link', { name: 'Help' })).toHaveAttribute('href', ROUTES.help);
    expect(within(banner).getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('keeps one main landmark when the onboarding gate redirects there', async () => {
    renderRoutes({ route: ROUTES.train, preferences: NOT_STARTED });
    await findStepHeading('Welcome');
    expect(currentLocation()).toBe(ROUTES.onboarding);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Skip to main content' })).toHaveLength(1);
  });

  it('moves focus to the onboarding main from the skip link', async () => {
    const { user } = renderRoutes({ route: ROUTES.onboarding, preferences: NOT_STARTED });
    await findStepHeading('Welcome');
    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('scrolls the onboarding main to the top and focuses the new h1 when the step changes', async () => {
    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this);
    };
    try {
      const { user } = renderRoutes({ route: ROUTES.onboarding, preferences: NOT_STARTED });
      await findStepHeading('Welcome');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      const heading = await findStepHeading('Accessibility preferences');
      expect(heading).toHaveFocus();
      expect(scrolled).toContain(screen.getByRole('main'));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('keeps Help reachable from onboarding before setup is finished', async () => {
    const { user } = renderRoutes({ route: ROUTES.onboarding, preferences: NOT_STARTED });
    await findStepHeading('Welcome');
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Help' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.help);
  });
});

describe('AppRoutes: leaving setup for calibration and resuming it', () => {
  it('opens calibration, then Resume setup on the dashboard returns to the step after calibration', async () => {
    const calibration = stepIndexOf('calibration');
    // The step after calibration is not the last one, so setup still counts as unfinished after the detour.
    expect(calibration + 1).toBeLessThan(ONBOARDING_LAST_STEP);
    const { user, storage } = renderRoutes({
      route: ROUTES.onboarding,
      preferences: { onboardingCompleted: false, onboardingStep: calibration },
    });
    await findStepHeading('Calibration');

    await user.click(screen.getByRole('link', { name: 'Open calibration now' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Calibrate' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.calibrate);
    expect(storage.get<UserPreferences>(STORAGE_KEYS.preferences)).toMatchObject({
      onboardingCompleted: true,
      onboardingStep: calibration + 1,
    });

    await user.click(within(screen.getByTestId('mobile-nav')).getByRole('link', { name: 'Home' }));
    const panel = await screen.findByRole('region', { name: 'What to do next' });
    expect(within(panel).getByText(/Setup stopped at step 6 of 8 \(Feedback\)/)).toBeInTheDocument();
    const resume = within(panel).getByRole('link', { name: 'Resume setup' });
    expect(resume).toHaveAttribute('href', ROUTES.onboarding);

    await user.click(resume);
    const heading = await findStepHeading('Feedback');
    expect(currentLocation()).toBe(ROUTES.onboarding);
    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute(
      'aria-valuetext',
      'Step 6 of 8 — Feedback',
    );
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
