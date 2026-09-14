import { ROUTES } from '@/app/routes';
import {
  FakeHardwareRing,
  installSpeechSpy,
  type SpeechSpy,
} from '@/features/practice/testing/practiceTestUtils';
import { act, screen, waitFor, within } from '@/test/renderApp';
import { DEMO_MODE_ANNOUNCEMENT } from './SimulatorPage';
import { FIRST_CANDIDATE, politeRegion, renderSimulator } from './testing/simulatorTestUtils';

let speech: SpeechSpy;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  speech = installSpeechSpy();
});

afterEach(() => {
  speech.restore();
  vi.useRealTimers();
});

describe('Simulator page with a hardware ring', () => {
  it('explains that no ring is connected and can switch to Demo Mode', async () => {
    const { user } = await renderSimulator({ random: FIRST_CANDIDATE }, { deviceAdapter: new FakeHardwareRing('disconnected') });

    expect(screen.getByText('Your ring is not connected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connect your ring' })).toHaveAttribute('href', ROUTES.connect);
    expect(screen.queryByRole('button', { name: 'Squeeze the ring' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /, target$/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to Demo Mode' }));

    expect(screen.queryByText('Your ring is not connected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Squeeze and tap' })).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(DEMO_MODE_ANNOUNCEMENT));
  });

  it('takes attempts from a connected ring and records them as Measured', async () => {
    const hardware = new FakeHardwareRing('connected');
    const { history } = await renderSimulator({ random: FIRST_CANDIDATE }, { deviceAdapter: hardware });

    expect(screen.queryByText('Your ring is not connected')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Squeeze the ring' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Measured').length).toBeGreaterThan(0);

    act(() => hardware.send({ type: 'gate', armed: true, closesAt: Date.now() + 3000 }));
    act(() => hardware.send({ type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 140 }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Correct: Confirm.'));
    expect(history()[0]).toMatchObject({
      source: 'simulator',
      mode: 'guided',
      targetContact: 'index_tip',
      outcome: 'recognised',
      evidence: 'measured',
    });
    const row = within(screen.getByRole('table', { name: 'Latest attempts in this session' })).getAllByRole('row')[1];
    expect(row).toHaveTextContent('Measured');
    expect(within(screen.getByRole('region', { name: 'Your target' })).getByText('This session: 1 of 1 correct')).toBeInTheDocument();
  });
});
