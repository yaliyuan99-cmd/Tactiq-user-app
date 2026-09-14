import { ROUTES } from '@/app/routes';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { installSpeechSpy, type SpeechSpy } from '@/features/practice/testing/practiceTestUtils';
import { screen, waitFor, within } from '@/test/renderApp';
import { SESSION_LOG_CLEARED } from './sessionLog';
import {
  FIRST_CANDIDATE,
  advance,
  assertiveRegion,
  locationSearch,
  politeRegion,
  renderSimulator,
  squeeze,
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

const FREE_ROUTE = `${ROUTES.simulator}?mode=free`;

function renderFree() {
  return renderSimulator({ random: FIRST_CANDIDATE }, { route: FREE_ROUTE });
}

function logTable(): HTMLElement {
  return screen.getByRole('table', { name: 'Latest attempts in this session' });
}

describe('Simulator page, practice mode in the URL', () => {
  it('opens free practice from ?mode=free and writes the choice back to the URL', async () => {
    const { user } = await renderFree();
    expect(screen.getByRole('radio', { name: 'Free practice' })).toBeChecked();
    expect(screen.getByRole('heading', { level: 2, name: 'What would happen' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your target' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /, target$/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Guided practice' }));
    expect(locationSearch()).toBe('');
    expect(screen.getByRole('heading', { level: 2, name: 'Your target' })).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Your target: Confirm, index fingertip.'));

    await user.click(screen.getByRole('radio', { name: 'Free practice' }));
    expect(locationSearch()).toBe('?mode=free');
  });
});

describe('Simulator page, free practice', () => {
  it('announces the command, explains what would happen and records it with no target', async () => {
    const { user, history } = await renderFree();
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Middle finger base, Next' }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Next.'));
    expect(speech.messages().at(-1)).toBe('Next.');

    const panel = screen.getByRole('region', { name: 'What would happen' });
    expect(within(panel).getByRole('heading', { level: 3, name: 'Next' })).toBeInTheDocument();
    expect(within(panel).getByText('Move screen-reader focus to the next item.')).toBeInTheDocument();
    expect(within(panel).getByText('Screen-reader next item')).toBeInTheDocument();

    expect(history()[0]).toMatchObject({
      source: 'simulator',
      mode: 'free',
      targetContact: null,
      detectedContact: 'middle_base',
      token: 'next',
      outcome: 'recognised',
      evidence: 'simulated',
    });
    expect(history()[0]).not.toHaveProperty('targetToken');
    const row = within(logTable()).getAllByRole('row')[1];
    expect(row).toHaveTextContent('None (free practice)');
    expect(row).toHaveTextContent('Middle finger base');
    expect(row).toHaveTextContent('Recognised: Next');
    expect(row).toHaveTextContent('Simulated');
  });

  it('shows a shortcut’s outcome labelled Simulated', async () => {
    const { user } = await renderFree();
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Pinky finger base, Shortcut 2: Announce the time' }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Shortcut 2: Announce the time. It is a quarter past two.'));
    const panel = screen.getByRole('region', { name: 'What would happen' });
    expect(within(panel).getByRole('heading', { level: 3, name: 'Shortcut 2: Announce the time' })).toBeInTheDocument();
    const outcome = within(panel).getByText('It is a quarter past two.');
    expect(outcome.parentElement).toHaveTextContent('It is a quarter past two.Simulated');
    expect(within(panel).getByRole('link', { name: 'Customise your shortcuts' })).toHaveAttribute('href', ROUTES.commands);
  });

  it('completes the emergency hold from the hold button only at five seconds, and says it was a simulation', async () => {
    const { user, history } = await renderFree();
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));

    advance(2100);
    expect(screen.getAllByRole('progressbar', { name: 'Emergency hold progress' }).length).toBeGreaterThan(0);
    advance(2700);
    expect(screen.queryByText(EMERGENCY_SIMULATION_NOTICE)).not.toBeInTheDocument();
    expect(history()).toHaveLength(0);

    advance(300);
    await waitFor(() =>
      expect(assertiveRegion()).toHaveTextContent(`Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`),
    );
    expect(screen.getAllByText(EMERGENCY_SIMULATION_NOTICE).length).toBeGreaterThan(0);
    expect(history()[0]).toMatchObject({ mode: 'free', outcome: 'emergency', token: 'emergency' });
    expect(logTable()).toHaveTextContent('Emergency hold complete (simulation only)');
    expect(document.body.textContent ?? '').not.toMatch(/\b(calling|called|dialling|location shared|help is on the way)\b/i);
  });

  it('cancels the hold when released at three seconds, says so and records it', async () => {
    const { user, history } = await renderFree();
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(3000);
    await user.click(screen.getByRole('button', { name: 'Release pinky fingertip' }));

    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(/Emergency hold cancelled after 3\.\d seconds\. Nothing was sent\./),
    );
    expect(screen.queryByText(EMERGENCY_SIMULATION_NOTICE)).not.toBeInTheDocument();
    expect(history()[0]).toMatchObject({ mode: 'free', outcome: 'emergency_cancelled', token: null });
    expect(logTable()).toHaveTextContent('Emergency hold cancelled');
  });

  it('keeps the last eight attempts, and clearing the log keeps activity history', async () => {
    const { user, history } = await renderFree();
    await squeeze(user);
    const confirm = screen.getByRole('button', { name: 'Index fingertip, Confirm' });
    for (let tap = 0; tap < 9; tap += 1) await user.click(confirm);

    expect(within(logTable()).getAllByRole('row')).toHaveLength(9);
    expect(history()).toHaveLength(9);

    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(within(logTable()).getByText('No attempts yet. Squeeze, then tap a point.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Latest attempts' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear log' })).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(SESSION_LOG_CLEARED));
    expect(history()).toHaveLength(9);
    const logSection = screen.getByRole('region', { name: 'Latest attempts' });
    expect(within(logSection).getByText('Your activity history keeps every attempt.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open History' })).toHaveAttribute('href', ROUTES.history);
  });
});
