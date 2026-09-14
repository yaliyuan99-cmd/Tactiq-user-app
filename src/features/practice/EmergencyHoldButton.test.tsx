import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { GATE_HOLD_MS } from '@/domain/timing';
import { act, renderApp, screen, userEvent, waitFor } from '@/test/renderApp';
import { EmergencyHoldButton } from './EmergencyHoldButton';
import { FakeHardwareRing, installSpeechSpy, settleProviders, type SpeechSpy } from './testing/practiceTestUtils';
import { useRing } from './useRing';

const START = 'Start five-second hold on pinky fingertip';
const RELEASE = 'Release pinky fingertip';

function Harness({ disabled = false }: { disabled?: boolean }) {
  const ring = useRing();
  return (
    <>
      <button type="button" onClick={ring.squeeze}>
        Squeeze
      </button>
      <EmergencyHoldButton ring={ring} disabled={disabled} />
      <p>Last result: {ring.lastResult?.kind ?? 'none'}</p>
    </>
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

let speech: SpeechSpy;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  speech = installSpeechSpy();
});

afterEach(() => {
  speech.restore();
  vi.useRealTimers();
});

async function openWindow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Squeeze' }));
  advance(GATE_HOLD_MS);
}

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp(<Harness />, { preferences: { audioAnnouncements: true } });
  return user;
}

describe('EmergencyHoldButton', () => {
  it('asks for a squeeze first while the window is closed, and does nothing when pressed', async () => {
    const user = setup();
    const button = screen.getByRole('button', { name: START });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Squeeze first.');
    await user.click(button);
    expect(screen.getByRole('button', { name: START })).toBeInTheDocument();
    expect(screen.getByText('Last result: none')).toBeInTheDocument();
  });

  it('starts a hold, shows progress and the arming cue, and cancels when pressed again', async () => {
    const user = setup();
    await openWindow(user);
    const start = screen.getByRole('button', { name: START });
    expect(start).not.toHaveAttribute('aria-disabled');
    await user.click(start);

    const release = screen.getByRole('button', { name: RELEASE });
    expect(release).toHaveFocus();
    expect(screen.getByRole('progressbar', { name: 'Emergency hold progress' })).toBeInTheDocument();
    expect(screen.queryByText('Armed')).not.toBeInTheDocument();

    advance(2100);
    expect(screen.getByText('Armed')).toBeInTheDocument();

    await user.click(release);
    expect(screen.getByRole('button', { name: START })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Emergency hold progress' })).not.toBeInTheDocument();
    expect(screen.getByText('Last result: emergency_cancelled')).toBeInTheDocument();
    await waitFor(() => expect(speech.messages().at(-1)).toMatch(/^Emergency hold cancelled after 2\.\d seconds\. Nothing was sent\.$/));
  });

  it('completes the hold after five seconds, lets go by itself and can start again', async () => {
    const user = setup();
    await openWindow(user);
    await user.click(screen.getByRole('button', { name: START }));
    advance(5100);

    expect(screen.getByText('Last result: emergency')).toBeInTheDocument();
    expect(await screen.findByText(`Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`)).toBeInTheDocument();
    const start = screen.getByRole('button', { name: START });
    expect(start).toHaveAttribute('aria-disabled', 'true');

    // The simulated finger was lifted, so a new window accepts a new hold.
    await openWindow(user);
    await user.click(screen.getByRole('button', { name: START }));
    expect(screen.getByRole('button', { name: RELEASE })).toBeInTheDocument();
  });

  it('lets go when Escape is pressed', async () => {
    const user = setup();
    await openWindow(user);
    await user.click(screen.getByRole('button', { name: START }));
    advance(800);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: START })).toBeInTheDocument();
    expect(screen.getByText('Last result: emergency_cancelled')).toBeInTheDocument();
  });

  it('works with Enter and Space', async () => {
    const user = setup();
    await openWindow(user);
    screen.getByRole('button', { name: START }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: RELEASE })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: START })).toBeInTheDocument();
  });

  it('can be unavailable to start, but never stops the user letting go', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = renderApp(<Harness />);
    await openWindow(user);
    await user.click(screen.getByRole('button', { name: START }));
    rerender(<Harness disabled />);
    const release = screen.getByRole('button', { name: RELEASE });
    expect(release).not.toHaveAttribute('aria-disabled');
    await user.click(release);
    const start = screen.getByRole('button', { name: START });
    expect(start).toHaveAttribute('aria-disabled', 'true');
    expect(start).toHaveAccessibleDescription('Not available right now.');
  });

  it('renders nothing with a hardware ring', async () => {
    renderApp(<Harness />, { deviceAdapter: new FakeHardwareRing() });
    await settleProviders();
    expect(screen.queryByRole('button', { name: START })).not.toBeInTheDocument();
  });
});
