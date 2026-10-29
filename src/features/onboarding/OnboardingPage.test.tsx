import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { PREFERENCES_UNREADABLE_NOTE } from '@/services/preferences/PreferencesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS, WRITES_BLOCKED_NOTE } from '@/services/storage/StorageAdapter';
import { screen, waitFor, within } from '@/test/renderApp';
import { FIRST_COMMAND_DONE_TITLE, SETUP_HONESTY } from './onboardingCopy';
import { stepIndexOf } from './onboardingFlow';
import { currentPathname, politeRegion, renderOnboarding, storedPreferences, tabTo, tabToRadio } from './testing/renderOnboarding';

/** Keeps something under the preferences key that cannot be read back. */
class UnreadablePreferences extends MemoryStorageAdapter {
  override get<T>(key: string): T | null {
    if (key === STORAGE_KEYS.preferences) return null;
    return super.get<T>(key);
  }
  override has(key: string): boolean {
    return key === STORAGE_KEYS.preferences ? true : super.has(key);
  }
}

/** Refuses every write, as private browsing or a full quota does. */
class NoWrites extends MemoryStorageAdapter {
  override set<T>(_key: string, _value: T): boolean {
    return false;
  }
  override get canPersist(): boolean {
    return false;
  }
}

function heading() {
  return screen.getByRole('heading', { level: 1 });
}

describe('OnboardingPage: storage problems', () => {
  it('says the saved setup could not be read, instead of letting setup look untouched', async () => {
    await renderOnboarding({ storage: new UnreadablePreferences() });

    expect(screen.getByText('Your saved setup could not be read')).toBeInTheDocument();
    expect(screen.getByText(PREFERENCES_UNREADABLE_NOTE)).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Which hand');
  });

  it('says nothing about storage on an ordinary first run', async () => {
    await renderOnboarding();
    expect(screen.queryByText('Your saved setup could not be read')).not.toBeInTheDocument();
    expect(screen.queryByText(WRITES_BLOCKED_NOTE)).not.toBeInTheDocument();
  });

  it('warns that nothing is being saved, because setup is outside the app shell', async () => {
    await renderOnboarding({ storage: new NoWrites() });
    expect(screen.getByText(WRITES_BLOCKED_NOTE)).toBeInTheDocument();
  });
});

describe('OnboardingPage: frame and first step', () => {
  it('opens on a choice, not on an explanation, with its own frame and the honesty note', async () => {
    await renderOnboarding();
    expect(document.title).toBe('Set up Tactiq · Tactiq');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(heading()).toHaveTextContent('Which hand');
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
    expect(progress).toHaveAttribute('aria-valuemax', '4');
    expect(progress).toHaveAttribute('aria-valuetext', 'Step 1 of 4 — Which hand');
    expect(screen.getByText('Step 1 of 4 — Which hand')).toBeInTheDocument();

    expect(screen.getByText(SETUP_HONESTY)).toBeInTheDocument();
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    // The one choice is on screen straight away, and the first step can be skipped like the rest.
    expect(screen.getByRole('group', { name: 'Which hand will wear the ring?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('Continue moves to step 2, focuses the new h1, announces it and saves progress', async () => {
    const { user, storage } = await renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(heading()).toHaveTextContent('A few preferences');
    expect(heading()).toHaveFocus();
    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute(
      'aria-valuetext',
      'Step 2 of 4 — A few preferences',
    );
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Step 2 of 4: A few preferences.'));
    expect(storedPreferences(storage).onboardingStep).toBe(1);
    expect(storedPreferences(storage).onboardingCompleted).toBe(false);
  });

  it('Back returns to the previous step without lowering the saved step', async () => {
    const { user, storage } = await renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(heading()).toHaveTextContent('Your first command');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(heading()).toHaveTextContent('A few preferences');
    expect(heading()).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Step 2 of 4: A few preferences.'));
    expect(storedPreferences(storage).onboardingStep).toBe(2);
  });

  it('Skip this step moves through all three optional steps to the end', async () => {
    const { user, storage } = await renderOnboarding();
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('A few preferences');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('Your first command');
    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(heading()).toHaveTextContent('You are ready');
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /setup$/ })).not.toBeInTheDocument();
    expect(storedPreferences(storage).onboardingStep).toBe(ONBOARDING_LAST_STEP);
  });
});

describe('OnboardingPage: resuming and leaving', () => {
  it('resumes at the saved step', async () => {
    await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('first_command') } });
    expect(heading()).toHaveTextContent('Your first command');
    expect(screen.getByText('Step 3 of 4 — Your first command')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('resumes at the last step and stops there', async () => {
    await renderOnboarding({ preferences: { onboardingStep: ONBOARDING_LAST_STEP, onboardingCompleted: true } });
    expect(heading()).toHaveTextContent('You are ready');
    expect(screen.getByRole('button', { name: 'Go to the dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
  });

  it('Skip setup asks first, then marks setup left, keeps the step and goes to the dashboard', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: 1 } });
    const skip = screen.getByRole('button', { name: 'Skip setup' });

    await user.click(skip);
    let dialog = screen.getByRole('dialog', { name: 'Skip setup?' });
    expect(dialog).toHaveAccessibleDescription('You can finish it later from the dashboard.');
    await user.click(within(dialog).getByRole('button', { name: 'Keep setting up' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(skip).toHaveFocus();
    expect(storedPreferences(storage).onboardingCompleted).toBe(false);

    await user.click(skip);
    dialog = screen.getByRole('dialog', { name: 'Skip setup?' });
    await user.click(within(dialog).getByRole('button', { name: 'Skip setup' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard');
    expect(storedPreferences(storage)).toMatchObject({ onboardingCompleted: true, onboardingStep: 1 });
  });

  it('offers to leave, not to skip, once setup has already been recorded as finished', async () => {
    const { user } = await renderOnboarding({ preferences: { onboardingStep: ONBOARDING_LAST_STEP, onboardingCompleted: true } });
    // Back from the last step: the choices are saved, so there is nothing left to skip.
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Leave setup' }));
    const dialog = screen.getByRole('dialog', { name: 'Leave setup?' });
    expect(dialog).toHaveAccessibleDescription('Your choices are saved. You can come back to setup from the dashboard.');
  });
});

describe('OnboardingPage: keyboard only', () => {
  it('can be completed from start to finish with the keyboard, running the command on the way', async () => {
    const { user, storage } = await renderOnboarding();

    // Step 1: choose the left hand with the arrow keys.
    expect(await tabToRadio(user)).toBe(screen.getByRole('radio', { name: 'Right' }));
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
    await tabTo(user, 'Continue');
    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent('A few preferences');
    expect(heading()).toHaveFocus();

    // Step 2: leave the preferences as they are.
    await tabTo(user, 'Continue');
    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent('Your first command');
    expect(heading()).toHaveFocus();

    // Step 3: squeeze, then tap the index fingertip, both from the keyboard.
    // The squeeze has to be deliberate, so the window opens a gate-hold after
    // the key goes down; tapping before then is correctly rejected.
    await tabTo(user, 'Squeeze the ring');
    await user.keyboard('{Enter}');
    await screen.findByText(/Command window open/);
    await tabTo(user, 'Index fingertip, Confirm, target');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(FIRST_COMMAND_DONE_TITLE)).toBeInTheDocument();

    await tabTo(user, 'Continue');
    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent('You are ready');

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
