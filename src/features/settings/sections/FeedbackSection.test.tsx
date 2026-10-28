import type { UserPreferences } from '@/domain/models';
import { screen, userEvent, waitFor } from '@/test/renderApp';
import {
  installSpeech,
  installVibration,
  politeRegion,
  removeBrowserFeedback,
  renderSettings,
  storedPreferences,
} from '../testing/renderSettings';
import { FeedbackSection } from './FeedbackSection';

async function renderFeedback(preferences: Partial<UserPreferences> = {}) {
  return renderSettings({ preferences }, <FeedbackSection />);
}

afterEach(() => {
  removeBrowserFeedback();
});

describe('FeedbackSection', () => {
  it('explains that feedback is never vibration-only and saves each switch', async () => {
    const user = userEvent.setup();
    const { storage } = await renderFeedback({ audioAnnouncements: false, visualConfirmation: true, hapticFeedback: true });
    expect(screen.getByText(/no feedback is ever vibration-only/)).toBeInTheDocument();

    const audio = screen.getByRole('switch', { name: 'Audio announcements' });
    expect(audio).toHaveAccessibleDescription(
      'Speaks results aloud using your browser’s voice. Your screen reader still announces them either way.',
    );
    await user.click(audio);
    expect(audio).toHaveAttribute('aria-checked', 'true');
    expect(storedPreferences(storage).audioAnnouncements).toBe(true);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Audio announcements on.'));

    const visual = screen.getByRole('switch', { name: 'Visual confirmation' });
    await user.click(visual);
    expect(storedPreferences(storage).visualConfirmation).toBe(false);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Visual confirmation off.'));

    const haptic = screen.getByRole('switch', { name: 'Haptic feedback' });
    expect(haptic).toHaveAccessibleDescription(
      'Vibrates this phone as a stand-in for the ring’s haptics, where the browser allows it.',
    );
    await user.click(haptic);
    expect(storedPreferences(storage).hapticFeedback).toBe(false);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Haptic feedback off.'));
  });

  it('shows notes instead of try-out buttons when the browser cannot speak or vibrate', async () => {
    await renderFeedback();
    expect(screen.getByText('This browser cannot speak aloud.')).toBeInTheDocument();
    expect(
      screen.getByText('This browser or device does not allow vibration (for example, Safari on iPhone).'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play a sample' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try a vibration' })).not.toBeInTheDocument();
  });

  it('plays a spoken sample when the browser can speak and audio announcements are on', async () => {
    const user = userEvent.setup();
    const synth = installSpeech();
    await renderFeedback({ audioAnnouncements: true });
    expect(screen.queryByText('This browser cannot speak aloud.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Play a sample' }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0]?.[0].text).toBe('Next.');
  });

  it('keeps the sample button explained but inactive while audio announcements are off', async () => {
    const user = userEvent.setup();
    const synth = installSpeech();
    await renderFeedback({ audioAnnouncements: false });
    const sample = screen.getByRole('button', { name: 'Play a sample' });
    expect(sample).toHaveAttribute('aria-disabled', 'true');
    expect(sample).toHaveAccessibleDescription('Switch on audio announcements to hear a sample.');
    await user.click(sample);
    expect(synth.speak).not.toHaveBeenCalled();

    await user.click(screen.getByRole('switch', { name: 'Audio announcements' }));
    // Switching speech on confirms aloud in the chosen voice.
    expect(synth.speak.mock.calls.at(-1)?.[0].text).toBe('Audio announcements on.');
    expect(screen.getByRole('button', { name: 'Play a sample' })).not.toHaveAttribute('aria-disabled');
  });

  it('asks the phone to vibrate and says so in words', async () => {
    const user = userEvent.setup();
    const vibrate = installVibration(true);
    await renderFeedback({ hapticFeedback: true });
    await user.click(screen.getByRole('button', { name: 'Try a vibration' }));
    expect(vibrate).toHaveBeenCalledWith([60]);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Asked this phone to vibrate once.'));
  });

  it('reports when the browser refuses to vibrate, and stays inactive while haptics are off', async () => {
    const user = userEvent.setup();
    const vibrate = installVibration(false);
    await renderFeedback({ hapticFeedback: true });
    await user.click(screen.getByRole('button', { name: 'Try a vibration' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('The browser did not vibrate this time.'));

    await user.click(screen.getByRole('switch', { name: 'Haptic feedback' }));
    const tryButton = screen.getByRole('button', { name: 'Try a vibration' });
    expect(tryButton).toHaveAttribute('aria-disabled', 'true');
    expect(tryButton).toHaveAccessibleDescription('Switch on haptic feedback to try a vibration.');
    vibrate.mockClear();
    await user.click(tryButton);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
