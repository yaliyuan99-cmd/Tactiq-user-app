import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { screen, waitFor, within } from '@/test/renderApp';
import { LESSON_DONE, WELCOME_HONESTY } from './onboardingCopy';
import { currentPathname, politeRegion, renderOnboarding, storedPreferences, tabTo } from './testing/renderOnboarding';

vi.mock('@/features/train/LessonRunner', () => import('./testing/MockLessonRunner'));

function heading() {
  return screen.getByRole('heading', { level: 1 });
}

describe('OnboardingPage: frame and first step', () => {
  it('starts a new user at step 1 with its own frame, progress and the honesty line', async () => {
    await renderOnboarding();
    expect(document.title).toBe('Set up Tactiq · Tactiq');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(heading()).toHaveTextContent('Welcome');
    expect(heading()).toHaveAttribute('id', 'page-title');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Help' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    const progress = screen.getByRole('progressbar', { name: 'Setup progress' });
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '8');
    expect(progress).toHaveAttribute('aria-valuetext', 'Step 1 of 8 — Welcome');
    expect(screen.getByText('Step 1 of 8 — Welcome')).toBeInTheDocument();

    expect(screen.getByText(WELCOME_HONESTY)).toBeInTheDocument();
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /eight contact points on a right hand/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
  });

  it('Continue moves to step 2, focuses the new h1, announces it and saves progress', async () => {
    const { user, storage } = await renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(heading()).toHaveTextContent('Accessibility preferences');
    expect(heading()).toHaveFocus();
    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute(
      'aria-valuetext',
      'Step 2 of 8 — Accessibility preferences',
    );
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Step 2 of 8: Accessibility preferences.'));
    expect(storedPreferences(storage)?.onboardingStep).toBe(1);
    expect(storedPreferences(storage)?.onboardingCompleted).toBe(false);
  });

  it('Back returns to the previous step without lowering the saved step', async () => {
    const { user, storage } = await renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(heading()).toHaveTextContent('Which hand');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(heading()).toHaveTextContent('Accessibility preferences');
    expect(heading()).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Step 2 of 8: Accessibility preferences.'));
    expect(storedPreferences(storage)?.onboardingStep).toBe(2);
  });

  it('Skip this step moves past optional steps and saves progress', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: 1 } });
    expect(heading()).toHaveTextContent('Accessibility preferences');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('Which hand');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('Demo Mode or a ring');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('Calibration');
    // Calibration's own primary action already means "not now".
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Calibrate after setup' }));
    expect(heading()).toHaveTextContent('Feedback');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('First lesson');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('All set');
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
    expect(storedPreferences(storage)?.onboardingStep).toBe(ONBOARDING_LAST_STEP);
  });
});

describe('OnboardingPage: resuming and leaving', () => {
  it('resumes at the saved step', async () => {
    await renderOnboarding({ preferences: { onboardingStep: 3 } });
    expect(heading()).toHaveTextContent('Demo Mode or a ring');
    expect(screen.getByText('Step 4 of 8 — Demo Mode or a ring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('never resumes beyond the last step', async () => {
    await renderOnboarding({ preferences: { onboardingStep: 42, onboardingCompleted: true } });
    expect(heading()).toHaveTextContent('All set');
  });

  it('Skip setup asks first, then marks setup left, keeps the step and goes to the dashboard', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: 2 } });
    const skip = screen.getByRole('button', { name: 'Skip setup' });

    await user.click(skip);
    let dialog = screen.getByRole('dialog', { name: 'Skip setup?' });
    expect(dialog).toHaveAccessibleDescription('You can finish it later from the dashboard.');
    await user.click(within(dialog).getByRole('button', { name: 'Keep setting up' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(skip).toHaveFocus();
    expect(storedPreferences(storage)?.onboardingCompleted).toBe(false);

    await user.click(skip);
    dialog = screen.getByRole('dialog', { name: 'Skip setup?' });
    await user.click(within(dialog).getByRole('button', { name: 'Skip setup' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: 2 });
  });
});

describe('OnboardingPage: keyboard only', () => {
  it('can be completed from start to finish with the keyboard', async () => {
    const { user, storage } = await renderOnboarding();
    const titles = [
      'Accessibility preferences',
      'Which hand',
      'Demo Mode or a ring',
      'Calibration',
      'Feedback',
      'First lesson',
      'All set',
    ];

    for (const title of titles) {
      const continueName = heading().textContent === 'Calibration' ? 'Calibrate after setup' : 'Continue';
      await tabTo(user, continueName);
      await user.keyboard('{Enter}');
      expect(heading()).toHaveTextContent(title);
      expect(heading()).toHaveFocus();

      if (title === 'Which hand') {
        await user.tab();
        expect(screen.getByRole('radio', { name: 'Right' })).toHaveFocus();
        await user.keyboard('{ArrowUp}');
        expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
      }
      if (title === 'First lesson') {
        await tabTo(user, 'Finish lesson');
        await user.keyboard('{Enter}');
        expect(screen.getByText(LESSON_DONE)).toBeInTheDocument();
      }
    }

    await tabTo(user, 'Go to the dashboard');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'Dashboard stub' })).toBeInTheDocument();
    expect(storedPreferences(storage)).toMatchObject({
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_LAST_STEP,
      hand: 'left',
    });
  });
});
