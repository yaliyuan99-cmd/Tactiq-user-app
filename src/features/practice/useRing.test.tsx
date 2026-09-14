import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { COMMAND_WINDOW_MS, GATE_HOLD_MS } from '@/domain/timing';
import { act, renderApp, screen, waitFor } from '@/test/renderApp';
import { EMERGENCY_ARMING_MESSAGE } from './ringResults';
import { FakeHardwareRing, installSpeechSpy, settleProviders, type SpeechSpy } from './testing/practiceTestUtils';
import { FLASH_MS, useRing, type RingController, type UseRingOptions } from './useRing';

let current: RingController | null = null;

function Probe(props: UseRingOptions) {
  current = useRing(props);
  return null;
}

function ring(): RingController {
  if (!current) throw new Error('Probe did not render');
  return current;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function squeeze() {
  act(() => ring().squeeze());
  advance(GATE_HOLD_MS);
}

function hold(contact: Parameters<RingController['pressStart']>[0], ms: number) {
  act(() => ring().pressStart(contact));
  advance(ms);
  act(() => ring().pressEnd(contact));
}

let speech: SpeechSpy;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  speech = installSpeechSpy();
});

afterEach(() => {
  current = null;
  speech.restore();
  vi.useRealTimers();
});

async function renderProbe(options: UseRingOptions = {}, preferences: Parameters<typeof renderApp>[1] = {}) {
  const view = renderApp(<Probe {...options} />, { ...preferences, preferences: { audioAnnouncements: true, ...preferences.preferences } });
  await settleProviders();
  return view;
}

describe('useRing in Demo Mode', () => {
  it('starts closed and operable', async () => {
    await renderProbe();
    expect(ring()).toMatchObject({
      mode: 'demo',
      isDemo: true,
      canOperate: true,
      canReceive: true,
      armed: false,
      closesAt: null,
      windowMs: COMMAND_WINDOW_MS,
      remainingMs: null,
      pressingContact: null,
      holdProgress: null,
      holdArmed: false,
      lastResult: null,
      flashContact: null,
    });
  });

  it('opens the window on a squeeze, announces it once and counts down', async () => {
    const onGate = vi.fn();
    await renderProbe({ onGate });
    squeeze();
    expect(ring().armed).toBe(true);
    expect(ring().remainingMs).toBeLessThanOrEqual(COMMAND_WINDOW_MS);
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 3 seconds.']));
    expect(await screen.findByText('Command window open for 3 seconds.')).toBeInTheDocument();
    expect(onGate).toHaveBeenCalledTimes(1);
    expect(onGate).toHaveBeenCalledWith(true);

    advance(1000);
    const remaining = ring().remainingMs ?? 0;
    expect(remaining).toBeGreaterThan(1500);
    expect(remaining).toBeLessThanOrEqual(2000);
  });

  it('announces the window closing on its own', async () => {
    const onGate = vi.fn();
    await renderProbe({ onGate });
    squeeze();
    advance(COMMAND_WINDOW_MS + 50);
    expect(ring().armed).toBe(false);
    expect(ring().remainingMs).toBeNull();
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 3 seconds.', 'Command window closed.']));
    expect(onGate).toHaveBeenLastCalledWith(false);
  });

  it('turns a brief tap into a command result, announces it and flashes the point', async () => {
    const onResult = vi.fn();
    await renderProbe({ onResult });
    squeeze();
    act(() => ring().pressStart('index_tip'));
    expect(ring().pressingContact).toBe('index_tip');
    advance(120);
    act(() => ring().pressEnd('index_tip'));

    expect(ring().lastResult).toMatchObject({ kind: 'command', token: 'confirm', contact: 'index_tip' });
    expect(ring().pressingContact).toBeNull();
    expect(ring().flashContact).toBe('index_tip');
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ kind: 'command', token: 'confirm' }));
    // The window refresh after a tap is not announced again.
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 3 seconds.', 'Confirm.']));
    expect(await screen.findByText('Confirm.')).toBeInTheDocument();
    expect(ring().armed).toBe(true);

    advance(FLASH_MS);
    expect(ring().flashContact).toBeNull();
  });

  it('never flashes when visual confirmation is off', async () => {
    await renderProbe({}, { preferences: { visualConfirmation: false } });
    squeeze();
    hold('middle_base', 100);
    expect(ring().lastResult).toMatchObject({ kind: 'command', token: 'next' });
    expect(ring().flashContact).toBeNull();
  });

  it('drops a press that is longer than a tap and says so', async () => {
    await renderProbe();
    squeeze();
    hold('ring_tip', 1200);
    expect(ring().lastResult).toMatchObject({ kind: 'rejected', reason: 'indeterminate_duration', contact: 'ring_tip' });
    expect(ring().flashContact).toBeNull();
    const message =
      /^Not recognised\. That press lasted 1\.\d seconds — longer than a tap and shorter than the emergency hold, so nothing happened\.$/;
    await waitFor(() => expect(speech.messages().at(-1)).toMatch(message));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('explains a tap while the ring is asleep', async () => {
    await renderProbe();
    act(() => ring().pressStart('index_tip'));
    act(() => ring().pressEnd('index_tip'));
    expect(ring().lastResult).toMatchObject({ kind: 'rejected', reason: 'not_armed' });
    await waitFor(() => expect(speech.messages()).toEqual(['The ring is asleep. Squeeze first, then tap.']));
  });

  it('tracks a pinky hold, announces the arming cue once and completes the emergency with the notice', async () => {
    const onResult = vi.fn();
    await renderProbe({ onResult });
    squeeze();
    act(() => ring().pressStart('pinky_tip'));
    advance(1000);
    expect(ring().pressingContact).toBe('pinky_tip');
    expect(ring().holdProgress).toBeGreaterThan(0.1);
    expect(ring().holdArmed).toBe(false);

    advance(1100);
    expect(ring().holdArmed).toBe(true);
    await waitFor(() => expect(speech.messages()).toContain(EMERGENCY_ARMING_MESSAGE));
    advance(1500);
    expect(speech.messages().filter((m) => m === EMERGENCY_ARMING_MESSAGE)).toHaveLength(1);

    advance(1500);
    expect(ring().lastResult).toMatchObject({ kind: 'emergency', contact: 'pinky_tip' });
    expect(ring().pressingContact).toBeNull();
    expect(ring().holdProgress).toBeNull();
    expect(ring().armed).toBe(false);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ kind: 'emergency' }));
    const complete = `Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`;
    await waitFor(() => expect(speech.messages()).toContain(complete));
    expect(await screen.findByText(complete)).toBeInTheDocument();
    // The window closing with the emergency is not announced on top of it.
    expect(speech.messages()).not.toContain('Command window closed.');
    act(() => ring().pressEnd('pinky_tip'));
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('cancels the hold when the pinky is released early', async () => {
    await renderProbe();
    squeeze();
    hold('pinky_tip', 1000);
    expect(ring().lastResult).toMatchObject({ kind: 'emergency_cancelled', contact: 'pinky_tip' });
    const result = ring().lastResult;
    expect(result?.kind === 'emergency_cancelled' ? result.elapsedMs : null).toBeGreaterThanOrEqual(1000);
    expect(ring().pressingContact).toBeNull();
    await waitFor(() =>
      expect(speech.messages().at(-1)).toMatch(/^Emergency hold cancelled after 1\.\d seconds\. Nothing was sent\.$/),
    );
    expect(speech.messages()).not.toContain(EMERGENCY_ARMING_MESSAGE);
  });

  it('says the window closed in the same announcement when time ran out during the hold', async () => {
    await renderProbe();
    squeeze();
    hold('pinky_tip', COMMAND_WINDOW_MS + 200);
    expect(ring().armed).toBe(false);
    await waitFor(() =>
      expect(speech.messages().at(-1)).toMatch(/^Emergency hold cancelled after 3\.\d seconds\. Nothing was sent\. Command window closed\.$/),
    );
    expect(speech.messages()).not.toContain('Command window closed.');
  });

  it('clears a press on cancel and closes the window on request', async () => {
    await renderProbe();
    squeeze();
    act(() => ring().pressStart('middle_tip'));
    expect(ring().pressingContact).toBe('middle_tip');
    act(() => ring().cancel());
    expect(ring().pressingContact).toBeNull();
    expect(ring().lastResult).toBeNull();
    act(() => ring().closeWindow());
    expect(ring().armed).toBe(false);
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 3 seconds.', 'Command window closed.']));
  });

  it('stays silent when announce is false but still reports results', async () => {
    const onResult = vi.fn();
    await renderProbe({ announce: false, onResult });
    squeeze();
    hold('index_base', 100);
    expect(onResult).toHaveBeenCalledTimes(1);
    advance(50);
    await act(async () => {
      await Promise.resolve();
    });
    expect(speech.messages()).toEqual([]);
  });

  it('uses the longer window when Longer interaction time is on', async () => {
    await renderProbe({}, { preferences: { longerInteractionTime: true } });
    squeeze();
    expect(ring().windowMs).toBe(6000);
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 6 seconds.']));
  });

  it('cleans up its timers on unmount', async () => {
    const errors = vi.spyOn(console, 'error');
    const { unmount } = await renderProbe();
    squeeze();
    hold('index_tip', 100);
    unmount();
    advance(FLASH_MS + 200);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('useRing with a hardware ring', () => {
  it('ignores inputs when there is no simulated ring', async () => {
    renderApp(<Probe />, { deviceMode: 'hardware' });
    await settleProviders();
    expect(ring()).toMatchObject({ mode: 'hardware', isDemo: false, canOperate: false, canReceive: false });
    act(() => {
      ring().squeeze();
      ring().pressStart('index_tip');
      ring().pressEnd('index_tip');
      ring().cancel();
      ring().closeWindow();
    });
    advance(GATE_HOLD_MS);
    expect(ring().armed).toBe(false);
    expect(ring().lastResult).toBeNull();
  });

  it('announces what a connected ring reports', async () => {
    const hardware = new FakeHardwareRing();
    const onResult = vi.fn();
    renderApp(<Probe onResult={onResult} />, { deviceAdapter: hardware, preferences: { audioAnnouncements: true } });
    await settleProviders();
    expect(ring()).toMatchObject({ canOperate: false, canReceive: true });

    act(() => hardware.send({ type: 'gate', armed: true, closesAt: Date.now() + 3000 }));
    expect(ring().armed).toBe(true);
    act(() => hardware.send({ type: 'token', token: 'next', contact: 'middle_base', durationMs: 140 }));
    expect(ring().lastResult).toMatchObject({ kind: 'command', token: 'next', contact: 'middle_base' });
    expect(ring().flashContact).toBe('middle_base');
    await waitFor(() => expect(speech.messages()).toEqual(['Command window open for 3 seconds.', 'Next.']));
    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
