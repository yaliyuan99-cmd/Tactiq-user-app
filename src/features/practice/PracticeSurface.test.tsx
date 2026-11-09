import { useState } from 'react';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { GATE_HOLD_MS } from '@/domain/timing';
import { act, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { PracticeSurface, type PracticeSurfaceProps } from './PracticeSurface';
import { PRACTICE_VIEW_STORAGE_KEY, type PracticeView } from './practiceView';
import { FakeHardwareRing, installSpeechSpy, settleProviders, type SpeechSpy } from './testing/practiceTestUtils';
import { useRing } from './useRing';

type HarnessProps = Omit<PracticeSurfaceProps, 'ring' | 'hand'>;

function Harness(props: HarnessProps) {
  const ring = useRing();
  return <PracticeSurface ring={ring} hand="right" {...props} />;
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

async function setup(props: HarnessProps = {}, options: Parameters<typeof renderApp>[1] = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = renderApp(<Harness {...props} />, {
    ...options,
    preferences: { audioAnnouncements: true, ...options.preferences },
  });
  await settleProviders();
  return { user, ...view };
}

async function openWindow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
  advance(GATE_HOLD_MS);
}

const PINKY_TIP = 'Pinky fingertip, Shortcut 1: Play or pause media, or hold five seconds for Emergency';

describe('PracticeSurface in Demo Mode', () => {
  it('shows the squeeze control, the hand view, the keyboard hint and the emergency hold alternative', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toBeInTheDocument();
    const views = screen.getByRole('group', { name: 'Show the contact points as' });
    expect(within(views).getByRole('radio', { name: 'Hand view' })).toBeChecked();
    expect(within(views).getByRole('radio', { name: 'List view' })).not.toBeChecked();
    expect(screen.getByRole('figure', { name: 'Right hand contact map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index fingertip, Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pinky finger base, Shortcut 2: Announce the time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: PINKY_TIP })).toBeInTheDocument();
    expect(
      screen.getByText('Tab to a point, then press Enter or Space. Hold Enter or Space on the pinky fingertip for the emergency hold.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' })).toBeInTheDocument();
    expect(screen.queryByText('Last:')).not.toBeInTheDocument();
  });

  it('is operable from the keyboard: squeeze, tab to a point, tap with Enter', async () => {
    const { user } = await setup();
    screen.getByRole('button', { name: 'Squeeze the ring' }).focus();
    await user.keyboard('{Enter}');
    advance(GATE_HOLD_MS);

    screen.getByRole('radio', { name: 'Hand view' }).focus();
    await user.tab();
    const confirm = screen.getByRole('button', { name: 'Index fingertip, Confirm' });
    expect(confirm).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Last:').parentElement).toHaveTextContent('Last: Confirm');
    await waitFor(() => expect(speech.messages().at(-1)).toBe('Confirm.'));
    expect(confirm).toHaveClass('contact-flash');
  });

  it('shows the press on the point while Space is held, then the result', async () => {
    const { user } = await setup();
    await openWindow(user);
    const next = screen.getByRole('button', { name: 'Middle finger base, Next' });
    next.focus();
    await user.keyboard('[Space>]');
    expect(next).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('[/Space]');
    expect(next).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Last:').parentElement).toHaveTextContent('Last: Next');
  });

  it('runs the emergency hold from a held Enter key and shows the simulation notice', async () => {
    const { user } = await setup();
    await openWindow(user);
    const pinky = screen.getByRole('button', { name: PINKY_TIP });
    pinky.focus();
    await user.keyboard('{Enter>}');
    advance(2100);
    expect(screen.getAllByRole('progressbar', { name: 'Emergency hold progress' }).length).toBeGreaterThan(0);
    advance(3000);
    await user.keyboard('{/Enter}');

    const notice = screen.getAllByRole('status').find((el) => el.getAttribute('data-kind') === 'warning');
    expect(notice).toBeDefined();
    expect(notice).toHaveTextContent('Simulation only');
    expect(notice).toHaveTextContent(EMERGENCY_SIMULATION_NOTICE);
    expect(screen.getByText('Last:').parentElement).toHaveTextContent('Last: Emergency hold complete (simulation only)');
  });

  it('lets a caller place the emergency notice itself', async () => {
    const { user } = await setup({ showEmergencyNotice: false, showEmergencyHold: false });
    expect(screen.queryByRole('button', { name: 'Start five-second hold on pinky fingertip' })).not.toBeInTheDocument();
    await openWindow(user);
    screen.getByRole('button', { name: PINKY_TIP }).focus();
    await user.keyboard('{Enter>}');
    advance(5100);
    await user.keyboard('{/Enter}');
    expect(screen.queryByText('Simulation only')).not.toBeInTheDocument();
  });

  it('switches to the list view and remembers it for the tab', async () => {
    const { user, unmount } = await setup();
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index fingertip — Confirm' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(PRACTICE_VIEW_STORAGE_KEY)).toBe('list');
    unmount();

    await setup();
    expect(screen.getByRole('radio', { name: 'List view' })).toBeChecked();
  });

  it('taps from the list view with the keyboard', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    await openWindow(user);
    const undo = screen.getByRole('button', { name: 'Middle fingertip — Undo' });
    undo.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Last:').parentElement).toHaveTextContent('Last: Undo');
  });

  it('can be controlled by the caller', async () => {
    const onViewChange = vi.fn();
    function Controlled() {
      const ring = useRing();
      const [view, setView] = useState<PracticeView>('list');
      return (
        <PracticeSurface
          ring={ring}
          hand="left"
          view={view}
          onViewChange={(next) => {
            onViewChange(next);
            setView(next);
          }}
        />
      );
    }
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp(<Controlled />);
    await settleProviders();
    expect(screen.getByRole('radio', { name: 'List view' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Hand view' }));
    expect(onViewChange).toHaveBeenCalledWith('hand');
    expect(screen.getByRole('figure', { name: 'Left hand contact map' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(PRACTICE_VIEW_STORAGE_KEY)).toBeNull();
  });

  it('marks the target and uses caller labels', async () => {
    await setup({ targetContact: 'ring_tip', labelFor: (contact) => `Point ${contact}`, caption: 'Tap the target' });
    expect(screen.getByRole('figure', { name: 'Tap the target' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ring fingertip, Point ring_tip, target' })).toBeInTheDocument();
  });

  it('hides the result line when visual confirmation is off', async () => {
    const { user } = await setup({}, { preferences: { visualConfirmation: false } });
    await openWindow(user);
    const confirm = screen.getByRole('button', { name: 'Index fingertip, Confirm' });
    confirm.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(speech.messages().at(-1)).toBe('Confirm.'));
    expect(screen.queryByText('Last:')).not.toBeInTheDocument();
    expect(confirm).not.toHaveClass('contact-flash');
  });

  it('can be made inoperable', async () => {
    const { user } = await setup({ disabled: true });
    expect(screen.getByRole('button', { name: 'Squeeze the ring' })).toHaveAttribute('aria-disabled', 'true');
    const confirm = screen.getByRole('button', { name: 'Index fingertip, Confirm' });
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    confirm.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByText('Last:')).not.toBeInTheDocument();
  });
});

describe('PracticeSurface with a hardware ring', () => {
  it('is display-only and shows the last detected point', async () => {
    const hardware = new FakeHardwareRing();
    await setup({}, { deviceAdapter: hardware });
    expect(screen.queryByRole('button', { name: /Index fingertip/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Squeeze the ring' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /five-second hold/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Tab to a point/)).not.toBeInTheDocument();
    expect(screen.getByText('No point detected yet.')).toBeInTheDocument();

    act(() => hardware.send({ type: 'gate', armed: true, closesAt: Date.now() + 3000 }));
    act(() => hardware.send({ type: 'token', token: 'next', contact: 'middle_base', durationMs: 150 }));
    expect(screen.getByText('Last detected point: Middle finger base')).toBeInTheDocument();
    expect(screen.getByText('Last:').parentElement).toHaveTextContent('Last: Next');
    const point = screen.getByRole('figure').querySelector('[data-contact="middle_base"]');
    expect(point?.tagName).toBe('SPAN');
    expect(point).toHaveClass('bg-[var(--highlight)]');
  });

  it('still lets the user choose the list view', async () => {
    const hardware = new FakeHardwareRing();
    const { user } = await setup({}, { deviceAdapter: hardware });
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    expect(screen.queryByRole('button', { name: /Index fingertip/ })).not.toBeInTheDocument();
    expect(screen.getByText('Index fingertip — Confirm')).toBeInTheDocument();
  });
});
