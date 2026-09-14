import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { GATE_HOLD_MS } from '@/domain/timing';
import { installSpeechSpy, type SpeechSpy } from '@/features/practice/testing/practiceTestUtils';
import { screen, waitFor, within } from '@/test/renderApp';
import { ADVANCE_DELAY_MS } from './guided';
import {
  FIRST_CANDIDATE,
  advance,
  assertiveRegion,
  politeRegion,
  renderSimulator,
  squeeze,
  tabTo,
} from './testing/simulatorTestUtils';

let speech: SpeechSpy;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  speech = installSpeechSpy();
});

afterEach(() => {
  speech.restore();
  vi.useRealTimers();
});

function targetCard(): HTMLElement {
  return screen.getByRole('region', { name: 'Your target' });
}

describe('Simulator page, guided practice', () => {
  it('shows the page, the evidence label, the practice mode and a target', async () => {
    await renderSimulator({ random: FIRST_CANDIDATE });

    expect(screen.getByRole('heading', { level: 1, name: 'Simulator' })).toBeInTheDocument();
    expect(document.title).toBe('Simulator · Tactiq');
    expect(
      screen.getByText('Practise the nine commands with a simulated ring. Squeeze to open the command window, then tap a point.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Simulated').length).toBeGreaterThan(0);

    const modes = screen.getByRole('group', { name: 'Practice mode' });
    expect(within(modes).getByRole('radio', { name: 'Guided practice' })).toBeChecked();
    expect(within(modes).getByRole('radio', { name: 'Free practice' })).not.toBeChecked();

    const card = targetCard();
    expect(within(card).getByText('Confirm — index fingertip')).toBeInTheDocument();
    expect(within(card).getByText('This session: no attempts yet')).toBeInTheDocument();
    expect(within(card).getByRole('checkbox', { name: 'Include the five-second emergency hold' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' })).toBeInTheDocument();

    const log = screen.getByRole('table', { name: 'Latest attempts in this session' });
    expect(within(log).getByText('No attempts yet. Squeeze, then tap a point.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear log' })).not.toBeInTheDocument();
  });

  it('announces Correct for the target point, records it as recognised and moves on after a pause', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));

    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Correct: Confirm. New target: Dismiss / Back, index finger base.'),
    );
    expect(speech.messages().at(-1)).toBe('Correct: Confirm. New target: Dismiss / Back, index finger base.');
    expect(history()).toHaveLength(1);
    expect(history()[0]).toMatchObject({
      source: 'simulator',
      mode: 'guided',
      targetContact: 'index_tip',
      detectedContact: 'index_tip',
      token: 'confirm',
      outcome: 'recognised',
      evidence: 'simulated',
      seeded: false,
    });

    const card = targetCard();
    expect(within(card).getByText('Correct: Confirm.')).toBeInTheDocument();
    expect(within(card).getByText('This session: 1 of 1 correct')).toBeInTheDocument();
    expect(within(card).getByText('Done')).toBeInTheDocument();
    expect(within(card).getByText('Confirm — index fingertip')).toBeInTheDocument();

    advance(ADVANCE_DELAY_MS);
    expect(within(card).getByText('Dismiss / Back — index finger base')).toBeInTheDocument();
    expect(within(card).queryByText('Done')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back, target' })).toBeInTheDocument();

    const row = within(screen.getByRole('table', { name: 'Latest attempts in this session' })).getAllByRole('row')[1];
    expect(row).toBeDefined();
    expect(row).toHaveTextContent('Confirm');
    expect(row).toHaveTextContent('Index fingertip');
    expect(row).toHaveTextContent('Correct');
    expect(row).toHaveTextContent('Simulated');
  });

  it('judges an attempt during the pause against the new target it just announced', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('New target: Dismiss / Back, index finger base.'));

    expect(screen.queryByRole('button', { name: /, target$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back' }));

    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Correct: Dismiss / Back. New target: Confirm, index fingertip.'),
    );
    expect(history()[0]).toMatchObject({ targetContact: 'index_base', outcome: 'recognised' });
    expect(within(targetCard()).getByText('This session: 2 of 2 correct')).toBeInTheDocument();
    advance(ADVANCE_DELAY_MS);
    expect(within(targetCard()).getByText('Confirm — index fingertip')).toBeInTheDocument();
  });

  it('names the detected command for a wrong point, shows it on the map and records a mismatch', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Middle finger base, Next' }));

    const message = 'That was Next, on the middle finger base. Try again: Confirm, index fingertip.';
    await waitFor(() => expect(politeRegion()).toHaveTextContent(message));
    expect(speech.messages().at(-1)).toBe(message);
    expect(within(targetCard()).getByText(message)).toBeInTheDocument();
    expect(within(targetCard()).getByText('This session: 0 of 1 correct')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Middle finger base, Next, detected here' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' })).toBeInTheDocument();
    expect(history()[0]).toMatchObject({
      mode: 'guided',
      targetContact: 'index_tip',
      detectedContact: 'middle_base',
      token: 'next',
      outcome: 'mismatch',
    });
    expect(screen.getByRole('table', { name: 'Latest attempts in this session' })).toHaveTextContent('Not the target: Next');
  });

  it('shows the ring’s own words for a press while the ring is asleep', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });
    await user.click(screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));

    await waitFor(() => expect(assertiveRegion()).toHaveTextContent('The ring is asleep. Squeeze first, then tap.'));
    expect(
      within(targetCard()).getByText('The ring is asleep. Squeeze first, then tap. Try again: Confirm, index fingertip.'),
    ).toBeInTheDocument();
    expect(history()[0]).toMatchObject({ outcome: 'window_closed', targetContact: 'index_tip' });
  });

  it('repeats the prompt and skips to a different target', async () => {
    const { user } = await renderSimulator({ random: FIRST_CANDIDATE });

    await user.click(screen.getByRole('button', { name: 'Repeat the prompt' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Your target: Confirm, index fingertip.'));
    expect(speech.messages().at(-1)).toBe('Your target: Confirm, index fingertip.');

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(politeRegion()).toHaveTextContent('New target: Dismiss / Back, index finger base.'));
    expect(within(targetCard()).getByText('Dismiss / Back — index finger base')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back, target' })).toBeInTheDocument();
  });

  it('works the same from the list view', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Index fingertip — Confirm, target' }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Correct: Confirm.'));
    expect(history()[0]).toMatchObject({ outcome: 'recognised', targetContact: 'index_tip' });
  });

  it('can be used with the keyboard alone', async () => {
    const { user, history } = await renderSimulator({ random: FIRST_CANDIDATE });

    await tabTo(user, screen.getByRole('button', { name: 'Squeeze the ring' }));
    await user.keyboard('{Enter}');
    advance(GATE_HOLD_MS);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Command window open for 3 seconds.'));

    await tabTo(user, screen.getByRole('button', { name: 'Index fingertip, Confirm, target' }));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Correct: Confirm.'));
    expect(history()[0]).toMatchObject({ outcome: 'recognised' });
  });

  it('adds the emergency hold as a target when asked, and completes it only at five seconds', async () => {
    const { user, history } = await renderSimulator({ random: () => 0.999 });
    expect(within(targetCard()).getByText('Shortcut 2 — pinky finger base')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Include the five-second emergency hold' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(within(targetCard()).getByText('Emergency — hold the pinky fingertip for five seconds')).toBeInTheDocument();

    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(4800);
    expect(screen.queryByText(EMERGENCY_SIMULATION_NOTICE)).not.toBeInTheDocument();
    advance(300);

    const message = `Correct: Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`;
    await waitFor(() => expect(assertiveRegion()).toHaveTextContent(message));
    expect(screen.getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(within(targetCard()).getByText(message)).toBeInTheDocument();
    expect(history()[0]).toMatchObject({ outcome: 'emergency', token: 'emergency', targetContact: 'pinky_tip' });
  });

  it('replaces an Emergency target when the emergency hold is switched off', async () => {
    const { user } = await renderSimulator({ random: () => 0.999 });
    const checkbox = screen.getByRole('checkbox', { name: 'Include the five-second emergency hold' });
    await user.click(checkbox);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(within(targetCard()).getByText('Emergency — hold the pinky fingertip for five seconds')).toBeInTheDocument();

    await user.click(checkbox);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Emergency hold removed from the targets. New target: Shortcut 2, pinky finger base.',
      ),
    );
    expect(within(targetCard()).getByText('Shortcut 2 — pinky finger base')).toBeInTheDocument();
  });
});
