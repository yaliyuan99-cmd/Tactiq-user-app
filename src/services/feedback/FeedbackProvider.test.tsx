import { act, render, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import {
  ANNOUNCE_FALLBACK_MS,
  SPEECH_FINISHED,
  SPEECH_RATE,
  SPEECH_REFUSED,
  useFeedback,
  VOICE_CHECK_MS,
} from './FeedbackProvider';
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
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(readonly text: string) {}
}

function installSpeech() {
  const synth = { speak: vi.fn(), cancel: vi.fn() };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  return synth;
}

/** The last utterance handed to the browser. */
function spoken(synth: { speak: ReturnType<typeof vi.fn> }): FakeUtterance {
  const utterance = synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance | undefined;
  if (!utterance) throw new Error('Nothing was spoken');
  return utterance;
}

/** Speech plus a voice list, as a browser that reports its voices does. */
function installSpeechWithVoices(voices: string[]) {
  const target = new EventTarget();
  let current = voices;
  const synth = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => current.map((name) => ({ name }))),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  return {
    synth,
    load(names: string[]) {
      current = names;
      target.dispatchEvent(new Event('voiceschanged'));
    },
  };
}

function installVibration(result = true) {
  const vibrate = vi.fn(() => result);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate });
  return vibrate;
}

const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame');
const originalCancelAnimationFrame = Object.getOwnPropertyDescriptor(window, 'cancelAnimationFrame');

function restoreProperty(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(window, name, descriptor);
  else Reflect.deleteProperty(window, name);
}

/**
 * Replaces requestAnimationFrame with a queue the test runs by hand (`flush`),
 * or that never runs at all, as in a hidden or background tab.
 */
function stubAnimationFrames() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    callbacks.delete(id);
  });
  Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, writable: true, value: request });
  Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, writable: true, value: cancel });
  return {
    request,
    cancel,
    flush() {
      const due = [...callbacks.values()];
      callbacks.clear();
      due.forEach((callback) => callback(performance.now()));
    },
  };
}

/** Counts writes that put text into a live region (clearing an empty region adds nothing). */
function watchWrites(region: HTMLElement) {
  const observer = new MutationObserver(() => {});
  observer.observe(region, { childList: true, characterData: true, subtree: true });
  return {
    writes: () => observer.takeRecords().filter((record) => record.type === 'characterData' || record.addedNodes.length > 0).length,
    stop: () => observer.disconnect(),
  };
}

afterEach(() => {
  vi.useRealTimers();
  captured.current = null;
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
  Reflect.deleteProperty(navigator, 'vibrate');
  restoreProperty('requestAnimationFrame', originalRequestAnimationFrame);
  restoreProperty('cancelAnimationFrame', originalCancelAnimationFrame);
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

  it('merges two announcements made in the same tick into one live-region update', () => {
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />);
    const region = screen.getByRole('status');
    const watcher = watchWrites(region);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    act(() => {
      api().announce('Shortcut saved.');
      api().announce('Commands');
    });
    expect(region).toBeEmptyDOMElement();
    expect(frames.request).toHaveBeenCalledTimes(1);

    act(() => frames.flush());
    expect(region.textContent).toBe('Shortcut saved. Commands');
    expect(watcher.writes()).toBe(1);

    // The frame won, so the fallback timeout was cancelled and nothing is written again.
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(500));
    expect(region.textContent).toBe('Shortcut saved. Commands');
    expect(watcher.writes()).toBe(0);
    watcher.stop();
  });

  it('keeps the polite and assertive regions separate when both announce in the same tick', () => {
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />);
    act(() => {
      api().announce('Emergency simulation started. No message is sent.', { assertive: true });
      api().announce('Practice');
    });
    act(() => frames.flush());
    expect(screen.getByRole('alert').textContent).toBe('Emergency simulation started. No message is sent.');
    expect(screen.getByRole('status').textContent).toBe('Practice');
  });

  it('does not double an identical message announced twice in the same tick', () => {
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />);
    const region = screen.getByRole('status');
    const watcher = watchWrites(region);
    act(() => {
      api().announce('Saved.');
      api().announce('Saved.');
      api().announce('Settings');
      api().announce('Saved.');
    });
    act(() => frames.flush());
    expect(region.textContent).toBe('Saved. Settings');
    expect(watcher.writes()).toBe(1);
    watcher.stop();
  });

  it('still lands the message via the timeout when animation frames never run (hidden tab)', () => {
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />);
    const region = screen.getByRole('status');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    act(() => {
      api().announce('Ring disconnected.');
      api().announce('Reconnecting…');
    });
    act(() => vi.advanceTimersByTime(ANNOUNCE_FALLBACK_MS - 1));
    expect(region).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(1));
    expect(region.textContent).toBe('Ring disconnected. Reconnecting…');
    // The timeout won, so the frame request was withdrawn.
    expect(frames.cancel).toHaveBeenCalledWith(frames.request.mock.results[0]?.value);

    // A later announcement starts a fresh batch: cleared, then written.
    act(() => api().announce('Connected.'));
    expect(region).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(ANNOUNCE_FALLBACK_MS));
    expect(region.textContent).toBe('Connected.');
  });

  it('speaks each message once when several announce in the same tick, queued rather than cut off', () => {
    const synth = installSpeech();
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => {
      api().announce('Shortcut saved.');
      api().announce('Commands');
      api().announce('Commands');
    });
    expect(synth.speak.mock.calls.map(([utterance]) => (utterance as FakeUtterance).text)).toEqual([
      'Shortcut saved.',
      'Commands',
    ]);
    // Only the first message interrupts earlier speech; the second queues behind it.
    expect(synth.cancel).toHaveBeenCalledTimes(1);

    act(() => frames.flush());
    expect(screen.getByRole('status').textContent).toBe('Shortcut saved. Commands');

    act(() => api().announce('Next.'));
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.speak).toHaveBeenCalledTimes(3);
  });

  it('lets feedback of the same kind in the same tick replace the earlier words, while other messages still merge', () => {
    const synth = installSpeech();
    const frames = stubAnimationFrames();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    const region = screen.getByRole('status');
    act(() => {
      api().announce('Lesson 2: Confirm and Back');
      // The ring's own words, then a lesson rewording the same outcome.
      api().feedback('confirm', 'Confirm.');
      api().feedback('confirm', 'Correct. Confirm, on the index fingertip.');
    });
    act(() => frames.flush());
    expect(region.textContent).toBe('Lesson 2: Confirm and Back Correct. Confirm, on the index fingertip.');
    const spoken = synth.speak.mock.calls.map(([utterance]) => (utterance as FakeUtterance).text);
    expect(spoken).toEqual(['Lesson 2: Confirm and Back', 'Confirm.', 'Correct. Confirm, on the index fingertip.']);
    // The replacement cuts off the superseded "Confirm." instead of queueing behind it.
    expect(synth.cancel).toHaveBeenCalledTimes(2);

    // Different kinds are different events: both are kept.
    act(() => {
      api().feedback('armed', 'Command window open.');
      api().feedback('confirm', 'Confirm.');
    });
    act(() => frames.flush());
    expect(region.textContent).toBe('Command window open. Confirm.');
  });

  it('drops a pending announcement on unmount and writes nothing afterwards', () => {
    const frames = stubAnimationFrames();
    const { unmount } = renderWithProviders(<Capture />);
    act(() => api().announce('Leaving.'));
    unmount();
    expect(frames.cancel).toHaveBeenCalled();
    expect(() => frames.flush()).not.toThrow();
    expect(document.querySelector('[data-live-announcer]')).toBeNull();
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

  it('announces that the browser finished speaking what the user asked to hear', async () => {
    const synth = installSpeech();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => api().speak('Next.'));
    expect(spoken(synth).text).toBe('Next.');
    // Nothing is claimed until the browser says it is done.
    expect(screen.getByRole('status')).toHaveTextContent('');
    act(() => spoken(synth).onend?.());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SPEECH_FINISHED));
  });

  it('announces a failure when the browser cannot produce the speech', async () => {
    const synth = installSpeech();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => api().speak('Next.'));
    act(() => spoken(synth).onerror?.({ error: 'synthesis-failed' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SPEECH_REFUSED));
  });

  it('says nothing when speech is cancelled on purpose, and reports a browser that throws', async () => {
    const synth = installSpeech();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => api().speak('Read again.'));
    act(() => spoken(synth).onerror?.({ error: 'interrupted' }));
    act(() => spoken(synth).onerror?.({ error: 'canceled' }));
    expect(screen.getByRole('status')).toHaveTextContent('');

    synth.speak.mockImplementationOnce(() => {
      throw new Error('speech is blocked here');
    });
    act(() => api().speak('Read again.'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SPEECH_REFUSED));
  });

  it('treats a browser that lists no voice as unable to speak', async () => {
    vi.useFakeTimers();
    installSpeechWithVoices([]);
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    // The list is often empty until the voices load, so it is given a moment first.
    expect(api().canSpeak).toBe(true);
    act(() => vi.advanceTimersByTime(VOICE_CHECK_MS));
    expect(api().canSpeak).toBe(false);
    vi.useRealTimers();
    // speak() still reports rather than failing silently.
    act(() => api().speak('Next.'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SPEECH_REFUSED));
  });

  it('keeps speech available when the voices arrive late, or are never listed', () => {
    vi.useFakeTimers();
    const voices = installSpeechWithVoices([]);
    const { unmount } = renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => voices.load(['Daniel']));
    act(() => vi.advanceTimersByTime(VOICE_CHECK_MS * 2));
    expect(api().canSpeak).toBe(true);
    unmount();

    // Voices that arrive after the wait turn speech back on: headless Chromium
    // lists its first voice about 1.2 s in, and a slow machine can be slower still.
    const late = installSpeechWithVoices([]);
    const slow = renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => vi.advanceTimersByTime(VOICE_CHECK_MS));
    expect(api().canSpeak).toBe(false);
    act(() => late.load(['Daniel']));
    expect(api().canSpeak).toBe(true);
    slow.unmount();

    // A browser with no getVoices() tells us nothing, so speech stays available.
    installSpeech();
    renderWithProviders(<Capture />, { preferences: { audioAnnouncements: true } });
    act(() => vi.advanceTimersByTime(VOICE_CHECK_MS * 2));
    expect(api().canSpeak).toBe(true);
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
