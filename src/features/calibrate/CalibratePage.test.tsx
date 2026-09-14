import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { GATE_HOLD_MS } from '@/domain/timing';
import { screen, within } from '@/test/renderApp';
import {
  advance,
  calibrationProgress,
  clickAndOpenWindow,
  findAssertive,
  findPolite,
  press,
  promptHeading,
  renderCalibrate,
  storedHistory,
  storedProfile,
  tap,
} from './testing/calibrateTestUtils';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalibratePage start screen', () => {
  it('explains the routine, the evidence, the hand and speech before starting', async () => {
    await renderCalibrate();
    expect(screen.getByRole('heading', { level: 1, name: 'Calibrate' })).toBeInTheDocument();
    expect(document.title).toBe('Calibrate · Tactiq');
    expect(
      screen.getByText('Teach Tactiq how you touch each point. It takes about a minute: three taps on each of the eight points.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Simulated — the simulated ring always detects the point you choose, so this practises the routine rather than tuning a sensor',
      ),
    ).toBeInTheDocument();

    const start = screen.getByRole('region', { name: 'Ready to calibrate' });
    expect(within(start).getByRole('heading', { level: 3, name: 'What happens' })).toBeInTheDocument();
    const steps = within(start).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps[1]).toHaveTextContent('You tap it three times.');
    expect(steps[3]).toHaveTextContent('You can pause or stop at any time.');
    expect(within(start).getByText('Right hand')).toBeInTheDocument();
    expect(within(start).getByRole('link', { name: 'Change hand in Settings' })).toHaveAttribute('href', '/dashboard/settings#hand');
    expect(within(start).getByRole('switch', { name: 'Read prompts aloud' })).toHaveAttribute('aria-checked', 'false');
    expect(within(start).getByRole('button', { name: 'Start calibration' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume calibration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Last calibration' })).not.toBeInTheDocument();
  });
});

describe('CalibratePage running', () => {
  it('starts on the index fingertip with the prompt focused and the window opened for the user', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');

    const heading = promptHeading();
    expect(heading).toHaveTextContent('Tap your Index fingertip');
    expect(heading).toHaveFocus();
    expect(screen.getByText('Point 1 of 8')).toBeInTheDocument();
    expect(screen.getByText('The pad at the very end of your index finger, next to the ring.')).toBeInTheDocument();
    expect(screen.getByText('In everyday use this point would carry Confirm.')).toBeInTheDocument();
    expect(screen.getByText('Sample 1 of 3')).toBeInTheDocument();
    expect(calibrationProgress()).toHaveAttribute('aria-valuetext', '0 of 24 taps');
    expect(screen.getByText('During calibration the command window opens for you.')).toBeInTheDocument();
    expect(screen.getByText(/^Command window open ·/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /five-second hold/ })).not.toBeInTheDocument();
    await findPolite('Calibration started.');
  });

  it('counts three taps on the index fingertip in the hand view, then moves to the index finger base', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');

    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));
    await findPolite('Got it. 1 of 3 on the index fingertip.');
    expect(screen.getAllByText('Got it. 1 of 3 on the index fingertip.')).toHaveLength(2);
    expect(screen.getByText('Sample 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));
    await findPolite('Got it. 2 of 3 on the index fingertip.');
    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));
    await findPolite('Index fingertip done.');

    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(promptHeading()).toHaveFocus();
    expect(screen.getByText('Point 2 of 8')).toBeInTheDocument();
    expect(screen.getByText('Sample 1 of 3')).toBeInTheDocument();
    expect(calibrationProgress()).toHaveAttribute('aria-valuetext', '3 of 24 taps');
    expect(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back, target' })).toBeInTheDocument();

    expect(storedProfile(storage)?.samples).toHaveLength(3);
    const history = storedHistory(storage);
    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({
      source: 'calibration',
      mode: 'calibration',
      targetContact: 'index_tip',
      detectedContact: 'index_tip',
      outcome: 'recognised',
      evidence: 'simulated',
      seeded: false,
    });
    // Calibration prompts a point, not a command, so no target command is saved.
    expect(history[0]).not.toHaveProperty('targetToken');
  });

  it('counts taps from the list view too', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await user.click(screen.getByRole('radio', { name: 'List view' }));

    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Index fingertip — Confirm, target' }));
    }
    await findPolite('Index fingertip done.');
    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(screen.getByRole('button', { name: 'Index finger base — Dismiss / Back, target' })).toBeInTheDocument();
  });

  it('corrects a tap on the wrong point without counting it', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'index_base');

    await findAssertive('That was the index finger base. Tap the index fingertip.');
    expect(promptHeading()).toHaveTextContent('Tap your Index fingertip');
    expect(screen.getByText('Sample 1 of 3')).toBeInTheDocument();
    expect(calibrationProgress()).toHaveAttribute('aria-valuetext', '0 of 24 taps');
    expect(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back, detected here' })).toBeInTheDocument();
    expect(screen.getByText(/^One try has not counted on this point\./)).toBeInTheDocument();
    expect(storedProfile(storage)?.samples[0]).toMatchObject({ contact: 'index_tip', detectedContact: 'index_base', reason: 'wrong_contact' });
    expect(storedHistory(storage)[0]).toMatchObject({ targetContact: 'index_tip', detectedContact: 'index_base', outcome: 'mismatch' });
  });

  it('explains a press that was too long and records it as a sample that does not count', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await press(user, 'index_tip', 1200);

    await findAssertive('That press was too long. Tap briefly, under half a second.');
    expect(screen.getByText('Sample 1 of 3')).toBeInTheDocument();
    const recorded = storedProfile(storage)?.samples[0];
    expect(recorded).toMatchObject({ contact: 'index_tip', detectedContact: 'index_tip', accepted: false, reason: 'too_long' });
    expect(recorded?.durationMs).toBeGreaterThan(500);
    expect(storedHistory(storage)[0]).toMatchObject({ outcome: 'rejected_duration' });
  });

  it('moves on after three tries that do not count', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'middle_tip', 2);
    await tap(user, 'middle_tip');
    await findPolite('That was the middle fingertip. After three tries, we will move on and mark the index fingertip to repeat.');
    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(promptHeading()).toHaveFocus();
  });

  it('keeps the command window open while a prompt waits, with no time limit', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    for (let elapsed = 0; elapsed < 7000; elapsed += 100) {
      advance(100);
      expect(screen.queryByText('Command window closed. Squeeze to open it.')).not.toBeInTheDocument();
    }
    await tap(user, 'index_tip');
    await findPolite('Got it. 1 of 3 on the index fingertip.');
  });

  it('repeats the prompt without discarding accepted taps', async () => {
    const { user } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'index_tip');
    await user.click(screen.getByRole('button', { name: 'Repeat this point' }));
    await findPolite('Tap your index fingertip. The pad at the very end of your index finger, next to the ring. Sample 2 of 3.');
    expect(calibrationProgress()).toHaveAttribute('aria-valuetext', '1 of 24 taps');
    expect(screen.getByRole('button', { name: 'Repeat this point' })).toHaveAccessibleDescription(
      'Repeat this point says the prompt again and reopens the command window. Taps already accepted are kept.',
    );
  });

  it('shows and announces the simulation notice if an emergency hold completes, and does not count it', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await press(user, 'pinky_tip', 5100);
    // The hold closes the window; the page reopens it after the squeeze gate.
    advance(GATE_HOLD_MS);

    await findAssertive(`Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`);
    expect(screen.getAllByText(EMERGENCY_SIMULATION_NOTICE).length).toBeGreaterThan(0);
    expect(storedProfile(storage)?.samples).toHaveLength(0);
    expect(storedHistory(storage)[0]).toMatchObject({ outcome: 'emergency', targetContact: 'index_tip' });
    expect(promptHeading()).toHaveTextContent('Tap your Index fingertip');
    expect(screen.getByText(/^Command window open ·/)).toBeInTheDocument();
  });
});
