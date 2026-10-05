import { screen, waitFor, within } from '@/test/renderApp';
import {
  ACCESSIBILITY_LEDE,
  CANNOT_SPEAK_NOTE,
  CANNOT_VIBRATE_NOTE,
  VIBRATION_REQUESTED,
  VIBRATION_SWITCHED_OFF,
} from './onboardingCopy';
import { stepIndexOf } from './onboardingFlow';
import { currentPathname, politeRegion, renderOnboarding, storedPreferences } from './testing/renderOnboarding';

vi.mock('@/features/train/LessonRunner', () => import('./testing/MockLessonRunner'));

describe('Step 2: accessibility preferences', () => {
  it('applies larger text at once, saves it and announces it', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('accessibility') } });
    expect(screen.getByText(ACCESSIBILITY_LEDE)).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-text-size');

    const textSize = screen.getByRole('group', { name: 'Text size' });
    expect(within(textSize).getByRole('radio', { name: 'Default' })).toBeChecked();
    await user.click(within(textSize).getByRole('radio', { name: 'Larger' }));

    expect(document.documentElement).toHaveAttribute('data-text-size', 'larger');
    expect(storedPreferences(storage)?.textSize).toBe('larger');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Text size set to Larger.'));
  });

  it('binds every switch live to preferences', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('accessibility') } });
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Text and display', 'Feedback', 'Time']);

    await user.click(screen.getByRole('switch', { name: 'Increased contrast' }));
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    await user.click(screen.getByRole('switch', { name: 'Reduce motion' }));
    expect(document.documentElement).toHaveClass('force-reduced-motion');
    await user.click(screen.getByRole('switch', { name: 'Audio announcements' }));
    await user.click(screen.getByRole('switch', { name: 'Visual confirmation' }));
    await user.click(screen.getByRole('switch', { name: 'Haptic feedback' }));

    const longer = screen.getByRole('switch', { name: 'Longer interaction time' });
    expect(longer).toHaveAccessibleDescription(
      'After a squeeze, the command window stays open for 3 seconds. Switch this on to keep it open for 6 seconds in Demo Mode. A Bluetooth bench ring keeps its own 3-second window.',
    );
    await user.click(longer);
    expect(longer).toHaveAttribute('aria-checked', 'true');
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Longer interaction time on. The command window stays open for 6 seconds.'),
    );

    expect(storedPreferences(storage)).toMatchObject({
      contrast: 'high',
      reducedMotion: true,
      audioAnnouncements: true,
      visualConfirmation: false,
      hapticFeedback: false,
      longerInteractionTime: true,
    });
  });

  it('tells a Bluetooth ring user that the longer window belongs to Demo Mode', async () => {
    const { user } = await renderOnboarding({
      preferences: { onboardingStep: stepIndexOf('accessibility') },
      deviceMode: 'hardware',
    });

    const longer = screen.getByRole('switch', { name: 'Longer interaction time' });
    // The switch names Demo Mode and the bench ring's own window, so the 6 seconds are never promised to a ring.
    expect(longer).toHaveAccessibleDescription(/6 seconds in Demo Mode\. A Bluetooth bench ring keeps its own 3-second window\./);
    await user.click(longer);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Longer interaction time on. It applies to Demo Mode, so the Bluetooth bench ring keeps its own 3-second window.',
      ),
    );
  });
});

describe('Step 3: which hand', () => {
  it('mirrors the preview as the hand changes', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('hand') } });
    const group = screen.getByRole('group', { name: 'Which hand will wear the ring?' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['left', 'right']);
    expect(screen.getByRole('figure', { name: 'Preview: right hand, palm facing you.' })).toHaveAttribute('data-hand', 'right');

    await user.click(within(group).getByRole('radio', { name: 'Left' }));
    expect(screen.getByRole('figure', { name: 'Preview: left hand, palm facing you.' })).toHaveAttribute('data-hand', 'left');
    expect(storedPreferences(storage)?.hand).toBe('left');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Hand set to Left.'));
  });
});

describe('Step 5: calibration', () => {
  it('explains calibration and offers to open it now after saving progress', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('calibration') } });
    expect(screen.getByText('It asks for 3 taps on each point, 24 in all, and takes about a minute.')).toBeInTheDocument();
    expect(screen.getByText('You can calibrate now or later from the dashboard.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calibrate after setup' })).toBeInTheDocument();

    const open = screen.getByRole('link', { name: 'Open calibration now' });
    expect(open).toHaveAttribute('href', '/dashboard/calibrate');
    await user.click(open);
    expect(await screen.findByRole('heading', { name: 'Calibration stub' })).toBeInTheDocument();
    expect(currentPathname()).toBe('/dashboard/calibrate');
    expect(storedPreferences(storage)).toMatchObject({
      onboardingCompleted: true,
      onboardingStep: stepIndexOf('calibration') + 1,
    });
  });
});

describe('Step 6: feedback', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('explains the four patterns as design intent and plays an announcement', async () => {
    const { user } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('feedback') } });
    const patterns = screen.getByRole('region', { name: /four vibration patterns/ });
    expect(within(patterns).getByText('Design intent')).toBeInTheDocument();
    expect(within(patterns).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Window open',
      'Confirm',
      'Reject',
      'Emergency',
    ]);

    expect(screen.queryByRole('button', { name: 'Try a vibration' })).not.toBeInTheDocument();
    expect(screen.getByText(CANNOT_VIBRATE_NOTE)).toBeInTheDocument();
    expect(screen.getByText(CANNOT_SPEAK_NOTE)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hear an announcement' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Next.'));
    expect(screen.getByText('Announced: “Next.”')).toBeInTheDocument();
  });

  it('tries a vibration where the browser allows it, and says so in words', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate });
    const { user } = await renderOnboarding({ preferences: { onboardingStep: stepIndexOf('feedback') } });

    await user.click(screen.getByRole('button', { name: 'Try a vibration' }));
    expect(vibrate).toHaveBeenCalledWith([60]);
    expect(within(screen.getByRole('main')).getByText(VIBRATION_REQUESTED)).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(VIBRATION_REQUESTED));
  });

  it('explains why nothing vibrated when haptic feedback is off', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate });
    const { user } = await renderOnboarding({
      preferences: { onboardingStep: stepIndexOf('feedback'), hapticFeedback: false },
    });
    await user.click(screen.getByRole('button', { name: 'Try a vibration' }));
    expect(vibrate).not.toHaveBeenCalled();
    expect(within(screen.getByRole('main')).getByText(VIBRATION_SWITCHED_OFF)).toBeInTheDocument();
  });
});
