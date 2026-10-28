import { FakeHardwareRing, installSpeechSpy, type SpeechSpy } from '@/features/practice/testing/practiceTestUtils';
import { act, screen, waitFor, within } from '@/test/renderApp';
import { MEASURED_EVIDENCE_DETAIL, RESTART_DESCRIPTION_LEAD, RUN_RING_SENTENCES } from './calibrationCopy';
import {
  clickAndOpenWindow,
  findPolite,
  promptHeading,
  renderCalibrate,
  storageWithIncompleteProfile,
  storedProfile,
  tap,
} from './testing/calibrateTestUtils';

let speech: SpeechSpy;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  speech = installSpeechSpy();
});

afterEach(() => {
  speech.restore();
  vi.useRealTimers();
});

describe('Read prompts aloud', () => {
  it('speaks prompts and results when switched on, including the next prompt', async () => {
    const { user } = await renderCalibrate();
    const toggle = screen.getByRole('switch', { name: 'Read prompts aloud' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await clickAndOpenWindow(user, 'Start calibration');
    await waitFor(() => expect(speech.messages()).toEqual(['Calibration started. Tap your index fingertip.']));

    await tap(user, 'index_tip', 3);
    await waitFor(() =>
      expect(speech.messages().slice(1)).toEqual([
        'Got it. 1 of 3 on the index fingertip.',
        'Got it. 2 of 3 on the index fingertip.',
        'Index fingertip done. Tap your index finger base.',
      ]),
    );
    // Forced speech speaks what the live region shows, so both carry the next prompt while reading aloud.
    await findPolite('Index fingertip done. Tap your index finger base.');
    expect(promptHeading()).toHaveFocus();
  });

  it('stays silent when switched off', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'index_tip');
    await findPolite('Got it. 1 of 3 on the index fingertip.');
    expect(speech.messages()).toEqual([]);
  });

  it('starts on when audio announcements are on in Settings, and can be switched off for this page', async () => {
    const { user } = await renderCalibrate({ preferences: { audioAnnouncements: true } });
    const toggle = screen.getByRole('switch', { name: 'Read prompts aloud' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await clickAndOpenWindow(user, 'Start calibration');
    await findPolite('Calibration started.');
    // The global setting still starts the utterance; the page stops it straight away.
    const speak = vi.mocked(window.speechSynthesis.speak);
    const cancel = vi.mocked(window.speechSynthesis.cancel);
    expect(speech.messages()).toEqual(['Calibration started.']);
    expect(cancel.mock.invocationCallOrder.at(-1)).toBeGreaterThan(speak.mock.invocationCallOrder.at(-1) ?? Infinity);
  });
});

describe('With a hardware ring', () => {
  it('labels the evidence as measured, tells the user to squeeze, and records measured taps', async () => {
    const hardware = new FakeHardwareRing();
    const { user, storage } = await renderCalibrate({ deviceAdapter: hardware });
    // A bench ring may be called Measured, but never without saying it is unvalidated.
    expect(screen.getByText(`Measured — ${MEASURED_EVIDENCE_DETAIL}`)).toBeInTheDocument();
    expect(MEASURED_EVIDENCE_DETAIL).toMatch(/unvalidated/);

    await user.click(screen.getByRole('button', { name: 'Start calibration' }));
    expect(promptHeading()).toHaveTextContent('Tap your Index fingertip');
    // With a ring connected the user opens the window themselves, so the page says so.
    expect(screen.getByText(RUN_RING_SENTENCES.ring_ready)).toBeInTheDocument();
    expect(RUN_RING_SENTENCES.ring_ready).toMatch(/^Squeeze, then tap\./);
    expect(screen.queryByRole('button', { name: /Index fingertip/ })).not.toBeInTheDocument();

    act(() => hardware.send({ type: 'gate', armed: true, closesAt: Date.now() + 3000 }));
    await findPolite('Command window open.');
    act(() => hardware.send({ type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 140 }));
    await findPolite('Got it. 1 of 3 on the index fingertip.');
    act(() => hardware.send({ type: 'token', token: 'undo', contact: 'middle_tip', durationMs: 150 }));
    await within(screen.getByTestId('live-region-assertive')).findByText('That was the middle fingertip. Tap the index fingertip.');

    expect(storedProfile(storage)).toMatchObject({ evidence: 'measured', deviceId: 'bench-ring' });
    expect(storedProfile(storage)?.samples).toHaveLength(2);
  });

  it('offers to connect a ring instead of starting when none is connected', async () => {
    await renderCalibrate({ deviceAdapter: new FakeHardwareRing('disconnected') });
    expect(screen.getByText('No ring is connected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connect a ring' })).toHaveAttribute('href', '/dashboard/connect');
    expect(screen.queryByRole('button', { name: 'Start calibration' })).not.toBeInTheDocument();
  });

  it('will not resume a simulated calibration with a connected ring', async () => {
    const { user } = await renderCalibrate({
      deviceAdapter: new FakeHardwareRing(),
      storage: storageWithIncompleteProfile(['ring_tip']),
    });
    // Simulated taps cannot be pooled with taps from a ring, and the screen says
    // both why this run cannot continue and what starting again costs.
    const explanation = screen.getByText(
      /Your unfinished calibration used the simulated ring, so its taps cannot be added to taps from the connected ring\./,
    );
    expect(explanation).toHaveTextContent(RESTART_DESCRIPTION_LEAD);
    expect(screen.queryByRole('button', { name: 'Resume calibration' })).not.toBeInTheDocument();
    // The stored taps would be replaced, so the only way on says 'Start again'.
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    expect(screen.getByRole('dialog', { name: 'Start calibration again?' })).toBeInTheDocument();
  });
});
