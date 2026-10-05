import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { screen, within } from '@/test/renderApp';
import { LESSON_DONE, LESSON_LEFT } from './onboardingCopy';
import { stepIndexOf } from './onboardingFlow';
import { currentPathname, renderOnboarding, storedPreferences } from './testing/renderOnboarding';

vi.mock('@/features/train/LessonRunner', () => import('./testing/MockLessonRunner'));

describe('Step 7: first lesson', () => {
  it('embeds the squeeze lesson and shows success when it finishes', async () => {
    const { user } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('first_lesson') } });
    const runner = screen.getByTestId('lesson-runner');
    expect(runner).toHaveAttribute('data-lesson', 'squeeze_to_activate');
    expect(runner).toHaveAttribute('data-embedded', 'true');
    expect(within(runner).getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText('In Demo Mode, a Squeeze button stands in for the ring.')).toBeInTheDocument();
    // The lesson card states the command window; the step does not repeat it with different advice.
    expect(screen.queryByText(/command window stays open/)).toBeNull();
    expect(screen.queryByText(/Need more time/)).toBeNull();
    expect(screen.queryByText(LESSON_DONE)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Finish lesson' }));
    expect(screen.getByText(LESSON_DONE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();

    // The success line is kept when the user steps away and back.
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(LESSON_DONE)).toBeInTheDocument();
  });

  it('keeps only the lesson’s own Start lesson button filled', async () => {
    await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('first_lesson') } });
    // The step asks for the lesson first, so Continue steps back to an outlined button.
    expect(screen.getByRole('button', { name: 'Continue' }).className).not.toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'Continue' }).className).toContain('border-border-strong');
  });

  it('offers a way back into the lesson after leaving it', async () => {
    const { user } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('first_lesson') } });
    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    expect(screen.getByText(LESSON_LEFT)).toBeInTheDocument();
    const restart = screen.getByRole('button', { name: 'Start the lesson again' });
    expect(restart).toHaveFocus();

    await user.click(restart);
    expect(screen.getByRole('heading', { level: 2, name: 'Mock lesson: squeeze_to_activate' })).toHaveFocus();
  });
});

describe('Step 8: all set', () => {
  it('summarises the choices and finishes setup from Go to the dashboard', async () => {
    const { user, storage } = await renderOnboarding({
      preferences: {
        onboardingStep: ONBOARDING_LAST_STEP,
        hand: 'left',
        textSize: 'large',
        audioAnnouncements: true,
        longerInteractionTime: true,
      },
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All set');
    const choices = screen.getByRole('region', { name: 'Your choices' });
    const terms = within(choices).getAllByRole('term').map((term) => term.textContent);
    const values = within(choices).getAllByRole('definition').map((value) => value.textContent);
    expect(terms).toEqual(['Hand', 'Ring', 'Text size', 'Audio announcements', 'Longer interaction time']);
    expect(values).toEqual([
      'Left hand',
      'Demo Mode (simulated ring)',
      'Large',
      'On',
      'On — the command window stays open for 6 seconds',
    ]);

    const next = screen.getByRole('region', { name: 'What to do next' });
    expect(within(next).getByRole('link', { name: 'Continue training' })).toHaveAttribute('href', '/dashboard/train/confirm_and_back');
    expect(within(next).getByRole('link', { name: 'Calibrate' })).toHaveAttribute('href', '/dashboard/calibrate');
    expect(within(next).getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', '/dashboard/simulator');

    await user.click(screen.getByRole('button', { name: 'Go to the dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });

  it('does not promise a six-second window to someone using a Bluetooth ring', async () => {
    await renderOnboarding({
      preferences: { onboardingStep: ONBOARDING_LAST_STEP, longerInteractionTime: true },
      deviceMode: 'hardware',
    });
    const choices = screen.getByRole('region', { name: 'Your choices' });
    const longer = within(choices).getByText(/^Longer interaction time$/).parentElement as HTMLElement;
    expect(longer).toHaveTextContent(
      'On — it applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window',
    );
    expect(longer).not.toHaveTextContent('6 seconds');
  });

  it('finishes setup before a next-step link opens its page', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: 6 } });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('link', { name: 'Open the simulator' }));
    expect(await screen.findByRole('heading', { name: 'Other page stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard/simulator');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP });
  });
});
