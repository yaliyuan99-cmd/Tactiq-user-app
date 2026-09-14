import { act, render, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { SPEECH_RATE, useFeedback } from './FeedbackProvider';
import { type FeedbackContextValue } from './types';

const captured: { current: FeedbackContextValue | null } = { current: null };

function Capture() {
  captured.current = useFeedback();
  return null;
}

function api(): FeedbackContextValue {
  if (!captured.current) throw new Error('FeedbackProvider did not render');
  return captured.current;
}

class FakeUtterance {
  rate = 1;
  lang = '';
  constructor(readonly text: string) {}
}

function installSpeech() {
  const synth = { speak: vi.fn(), cancel: vi.fn() };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  return synth;
}

function installVibration(result = true) {
  const vibrate = vi.fn(() => result);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate });
  return vibrate;
}

afterEach(() => {
  captured.current = null;
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('FeedbackProvider', () => {
  it('renders one polite and one assertive live region', () => {
    renderWithProviders(<Capture />);
    const polite = screen.getByRole('status');
    const assertive = screen.getByRole('alert');
    expect(polite).toHaveAttribute('aria-live', 'polite');
    expect(polite).toHaveAttribute('aria-atomic', 'true');
    expect(assertive).toHaveAttribute('aria-live', 'assertive');
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(2);
    expect(polite.closest('[data-live-announcer]')).not.toBeNull();
  });

  it('announce writes to the polite region, or the assertive one when asked', async () => {
    renderWithProviders(<Capture />);
    act(() => api().announce('Next.'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Next.'));
    act(() => api().announce('Emergency hold complete.', { assertive: true }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Emergency hold complete.'));
  });

  it('clears then re-sets an identical message so it is announced again', async () => {
    renderWithProviders(<Capture />);
    const region = screen.getByRole('status');
    act(() => api().announce('Confirm.'));
    await waitFor(() => expect(region).toHaveTextContent('Confirm.'));
    act(() => api().announce('Confirm.'));
    expect(region).toHaveTextContent('');
    await waitFor(() => expect(region).toHaveTextContent('Confirm.'));
  });

  it('speaks only when audio announcements are on', () => {
    const synth = installSpeech();
    const { unmount } = renderWithProviders(<Capture />, { preferences: { audioAnnouncements: false } });
    expect(api().canSpeak).toBe(true);
    act(() => api().speak('Read again.'));
    act(() => api().announce('Read again.'));
    expect(synth.speak).not.toHaveBeenCalled();
    unmount();

    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => api().speak('Previous.'));
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe('Previous.');
    expect(utterance.rate).toBe(SPEECH_RATE);
  });

  it('forceSpeech speaks even when audio announcements are off', () => {
    const synth = installSpeech();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: false } });
    act(() => api().announce('Tap the index fingertip.', { forceSpeech: true }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    act(() => api().stopSpeaking());
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('follows a preference change without remounting', () => {
    const synth = installSpeech();
    const { storage } = renderWithProviders(<Capture />, { preferences: { audioAnnouncements: false } });
    act(() => {
      storage.set<UserPreferences>(STORAGE_KEYS.preferences, { ...DEFAULT_PREFERENCES, audioAnnouncements: true });
    });
    act(() => api().speak('Undo.'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('does nothing when speech is unavailable', () => {
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    expect(api().canSpeak).toBe(false);
    expect(() => act(() => api().speak('Hello.'))).not.toThrow();
  });

  it('vibrates only when available and haptic feedback is on', () => {
    const vibrate = installVibration();
    const { unmount } = renderWithProviders(<Capture />, { preferences: { hapticFeedback: true } });
    expect(api().canVibrate).toBe(true);
    expect(api().vibrate([60])).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([60]);
    expect(api().vibrate([])).toBe(false);
    unmount();

    renderWithProviders(<Capture />, { preferences: { hapticFeedback: false } });
    expect(api().vibrate([60])).toBe(false);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('reports vibration unavailable when the browser lacks it', () => {
    renderWithProviders(<Capture />, { preferences: { hapticFeedback: true } });
    expect(api().canVibrate).toBe(false);
    expect(api().vibrate(30)).toBe(false);
  });

  it('feedback announces assertively for rejects and emergencies, politely otherwise, and vibrates the pattern', async () => {
    const vibrate = installVibration();
    renderWithProviders(<Capture />);
    act(() => api().feedback('reject', 'Not recognised. Try a brief tap.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Not recognised. Try a brief tap.'));
    expect(vibrate).toHaveBeenLastCalledWith([30, 60, 30]);

    act(() => api().feedback('confirm', 'Confirm.'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Confirm.'));
    expect(vibrate).toHaveBeenLastCalledWith([60]);

    act(() => api().feedback('emergency_arming', 'Emergency armed.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Emergency armed.'));

    vibrate.mockClear();
    act(() => api().feedback('window_closed', 'Command window closed.'));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('useFeedback throws outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(/FeedbackProvider/);
    consoleError.mockRestore();
  });
});
