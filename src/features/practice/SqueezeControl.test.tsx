import { GATE_HOLD_MS } from '@/domain/timing';
import { act, renderApp, screen, userEvent } from '@/test/renderApp';
import { ROUTES } from '@/app/routes';
import { SqueezeControl } from './SqueezeControl';
import { FakeHardwareRing, settleProviders } from './testing/practiceTestUtils';
import { useRing } from './useRing';

function Harness({ disabled }: { disabled?: boolean }) {
  const ring = useRing();
  return <SqueezeControl ring={ring} disabled={disabled} />;
}

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SqueezeControl in Demo Mode', () => {
  it('opens the command window from the squeeze button and shows the time left', async () => {
    const user = setup();
    renderApp(<Harness />);
    await settleProviders();
    expect(screen.getByText('Command window closed. Squeeze to open it.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
    advance(GATE_HOLD_MS);

    const status = screen.getByText(/^Command window open · \d\.\d s left$/);
    // Progress text is not a live region: useRing makes the announcements.
    expect(status.closest('[aria-live]')).toBeNull();
    const bar = screen.getByRole('progressbar', { name: 'Command window time left' });
    expect(bar).toHaveAttribute('aria-valuemax', '3000');
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^\d\.\d seconds left$/);
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toBeInTheDocument();

    advance(3100);
    expect(screen.getByText('Command window closed. Squeeze to open it.')).toBeInTheDocument();
  });

  it('works from the keyboard', async () => {
    const user = setup();
    renderApp(<Harness />);
    await settleProviders();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toHaveFocus();
    await user.keyboard('{Enter}');
    advance(GATE_HOLD_MS);
    expect(screen.getByRole('progressbar', { name: 'Command window time left' })).toBeInTheDocument();
  });

  it('says the window is held open while a point is pressed', async () => {
    let press: (() => void) | null = null;
    function PressHarness() {
      const ring = useRing();
      press = () => ring.pressStart('pinky_tip');
      return (
        <>
          <SqueezeControl ring={ring} />
          <button type="button" onClick={ring.squeeze}>
            Squeeze
          </button>
        </>
      );
    }
    const user = setup();
    renderApp(<PressHarness />);
    await user.click(screen.getByRole('button', { name: 'Squeeze' }));
    advance(GATE_HOLD_MS);
    act(() => press?.());
    expect(screen.getByText('Command window open · held open while a point is pressed')).toBeInTheDocument();
  });

  it('points to Longer interaction time in Settings', async () => {
    renderApp(<Harness />);
    await settleProviders();
    expect(screen.getByRole('link', { name: 'Longer interaction time in Settings' })).toHaveAttribute('href', ROUTES.settings);
  });

  it('confirms when Longer interaction time is already on', async () => {
    const user = setup();
    renderApp(<Harness />, { preferences: { longerInteractionTime: true } });
    expect(screen.getByText(/Longer interaction time is on, so the window stays open for 6 seconds\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change this in Settings' })).toHaveAttribute('href', ROUTES.settings);
    await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
    advance(GATE_HOLD_MS);
    expect(screen.getByRole('progressbar', { name: 'Command window time left' })).toHaveAttribute('aria-valuemax', '6000');
  });

  it('counts whole seconds when reduced motion is on', async () => {
    const user = setup();
    renderApp(<Harness />, { preferences: { reducedMotion: true } });
    await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
    advance(GATE_HOLD_MS + 500);
    expect(screen.getByText(/^Command window open · [1-3] s left$/)).toBeInTheDocument();
  });

  it('can be shown as unavailable', async () => {
    const user = setup();
    renderApp(<Harness disabled />);
    const button = screen.getByRole('button', { name: 'Squeeze the ring' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    advance(GATE_HOLD_MS);
    expect(screen.getByText('Command window closed. Squeeze to open it.')).toBeInTheDocument();
  });
});

describe('SqueezeControl with a hardware ring', () => {
  it('explains the physical squeeze and offers to connect when no ring is connected', async () => {
    renderApp(<Harness />, { deviceMode: 'hardware' });
    await settleProviders();
    expect(screen.queryByRole('button', { name: 'Squeeze the ring' })).not.toBeInTheDocument();
    expect(screen.getByText('Squeeze the physical ring to open the command window.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connect a ring' })).toHaveAttribute('href', ROUTES.connect);
    expect(screen.getByText('Command window closed. Squeeze the ring to open it.')).toBeInTheDocument();
  });

  it('shows the window a connected ring reports, and that its length is the ring’s own', async () => {
    const hardware = new FakeHardwareRing();
    renderApp(<Harness />, { deviceAdapter: hardware });
    await settleProviders();
    expect(screen.queryByRole('link', { name: 'Connect a ring' })).not.toBeInTheDocument();
    expect(screen.getByText(/Time left is the app’s estimate\. The bench ring keeps its own 3-second window/)).toBeInTheDocument();
    act(() => hardware.send({ type: 'gate', armed: true, closesAt: Date.now() + 3000 }));
    expect(screen.getByText(/^Command window open · \d\.\d s left$/)).toBeInTheDocument();
    act(() => hardware.send({ type: 'gate', armed: false, closesAt: null }));
    expect(screen.getByText('Command window closed. Squeeze the ring to open it.')).toBeInTheDocument();
  });
});
