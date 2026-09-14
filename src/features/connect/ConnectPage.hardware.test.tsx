import { BATTERY_UNAVAILABLE_NOTE, DEVICE_NAME } from '@/domain/protocol';
import { DEVICE_ERRORS } from '@/services/device/deviceErrors';
import type { DeviceInfo, DeviceState } from '@/services/device/types';
import { act, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import ConnectPage from './ConnectPage';
import { FakeHardwareAdapter } from './testing/FakeHardwareAdapter';

const CONNECTED_AT = '2026-09-15T10:58:00.000Z';

const connectedDevice: DeviceInfo = {
  id: 'browser-assigned-id',
  name: DEVICE_NAME,
  firmwareVersion: null,
  battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
  lastConnectedAt: CONNECTED_AT,
  evidence: 'measured',
};

const remembered = { id: 'browser-assigned-id', name: DEVICE_NAME, lastConnectedAt: CONNECTED_AT };

async function renderWith(initial: Partial<DeviceState>) {
  const adapter = new FakeHardwareAdapter(initial);
  const result = renderApp(<ConnectPage />, { route: '/dashboard/connect', deviceAdapter: adapter, deviceMode: 'hardware' });
  await act(async () => {});
  return { adapter, ...result };
}

function ringSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Bench prototype ring' });
}

function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

describe('ConnectPage with a Bluetooth ring', () => {
  it('starts a connection only when Connect a ring is chosen, then follows the states to connected', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'disconnected' });

    expect(adapter.calls.connect).toBe(0);
    expect(screen.getByRole('radio', { name: 'Bluetooth ring (bench prototype)' })).toBeChecked();
    const connectButton = within(ringSection()).getByRole('button', { name: 'Connect a ring' });
    await user.click(connectButton);
    expect(adapter.calls.connect).toBe(1);

    act(() => adapter.setState({ status: 'scanning' }));
    expect(within(ringSection()).getByText(`Choose ${DEVICE_NAME} in your browser’s Bluetooth window.`)).toBeInTheDocument();
    const waiting = within(ringSection()).getByRole('button', { name: 'Waiting for the Bluetooth window…' });
    expect(waiting).toBe(connectButton);
    expect(waiting).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Status: Searching…'));

    act(() => adapter.setState({ status: 'connecting' }));
    const busy = within(ringSection()).getByRole('button', { name: 'Connecting…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Ring replied')).not.toBeInTheDocument();

    act(() => adapter.setState({ status: 'connected', device: connectedDevice, remembered }));
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(`Status: Connected. ${DEVICE_NAME} is connected over Bluetooth.`),
    );
    expect(within(ringSection()).getByRole('button', { name: 'Send a test ping' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Bench prototype ring' })).toHaveFocus();
  });

  it('renders the connecting state with a busy button and a way to cancel', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'connecting', remembered });
    const section = ringSection();
    expect(within(section).getByRole('button', { name: 'Connecting…' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(section).queryByText(/Connected since/)).not.toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Cancel' }));
    expect(adapter.calls.disconnect).toBe(1);
    expect(within(ringSection()).getByRole('button', { name: `Reconnect to ${DEVICE_NAME}` })).toHaveFocus();
  });

  it('shows connected details without a battery number, and answers a test ping', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'connected', device: connectedDevice, remembered });
    const section = ringSection();

    expect(within(section).getByText('Not reported yet')).toBeInTheDocument();
    const battery = within(section).getByText('Battery').nextElementSibling;
    expect(battery).toHaveTextContent(BATTERY_UNAVAILABLE_NOTE);
    expect(section.textContent).not.toMatch(/\d+\s*%/);
    expect(within(section).getByText('Connected since')).toBeInTheDocument();
    expect(within(section).getByText('Measured — bench prototype — not a validated device')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'How do you want to use Tactiq?' })).toHaveAccessibleDescription(
      'Switching to Demo Mode disconnects the ring.',
    );

    act(() => adapter.setState({ device: { ...connectedDevice, firmwareVersion: 'bench-fw' } }));
    expect(within(section).getByText('bench-fw')).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Send a test ping' }));
    expect(adapter.calls.ping).toBe(1);
    expect(within(section).getByText('No reply yet')).toBeInTheDocument();

    act(() => adapter.sendLine('STA,hello,bench-fw'));
    expect(within(section).getByText('No reply yet')).toBeInTheDocument();

    act(() => adapter.sendLine('STA,pong'));
    expect(within(section).getByText('Ring replied')).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Ring replied.'));
  });

  it('asks before forgetting the ring and forgets it on confirm', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'connected', device: connectedDevice, remembered });

    await user.click(within(ringSection()).getByRole('button', { name: 'Forget this ring' }));
    const dialog = screen.getByRole('dialog', { name: `Forget ${DEVICE_NAME}?` });
    expect(dialog).toHaveAccessibleDescription('You will need to choose it again in the Bluetooth window next time.');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Forget ring' }));
    expect(adapter.calls.forget).toBe(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(ringSection()).getByRole('button', { name: 'Connect a ring' })).toHaveFocus();
    expect(screen.queryByText(/Last connected/)).not.toBeInTheDocument();
  });

  it('can forget a remembered ring while disconnected, announcing it and keeping focus on the connect button', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'disconnected', remembered });

    await user.click(within(ringSection()).getByRole('button', { name: 'Forget this ring' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Forget ring' }));

    expect(adapter.calls.forget).toBe(1);
    const connect = within(ringSection()).getByRole('button', { name: 'Connect a ring' });
    await waitFor(() => expect(connect).toHaveFocus());
    await waitFor(() => expect(politeRegion()).toHaveTextContent(`${DEVICE_NAME} forgotten.`));
  });

  it('disconnects from the connected state', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'connected', device: connectedDevice, remembered });
    await user.click(within(ringSection()).getByRole('button', { name: 'Disconnect' }));
    expect(adapter.calls.disconnect).toBe(1);
    expect(screen.queryByRole('button', { name: 'Send a test ping' })).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(`Status: Disconnected. ${DEVICE_NAME} is not connected.`));
  });

  it('offers to reconnect a remembered ring', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-09-15T11:03:00.000Z') });
    try {
      await renderWith({ status: 'disconnected', remembered });
      const section = ringSection();
      expect(within(section).getByText(`Last connected: ${DEVICE_NAME}, 5 minutes ago`)).toBeInTheDocument();
      expect(within(section).getByRole('button', { name: `Reconnect to ${DEVICE_NAME}` })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('explains a dropped link and lets the user stop reconnecting', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'reconnecting', remembered });
    expect(within(ringSection()).getByText(`The connection to ${DEVICE_NAME} dropped. Tactiq is trying to reconnect once.`)).toBeInTheDocument();
    await user.click(within(ringSection()).getByRole('button', { name: 'Stop trying' }));
    expect(adapter.calls.disconnect).toBe(1);
  });

  it('explains how to allow Bluetooth when permission was denied', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'permission_denied', error: DEVICE_ERRORS.permission_denied });
    const section = ringSection();
    expect(within(section).getByText('Bluetooth is blocked for this site')).toBeInTheDocument();
    expect(within(section).getByText(DEVICE_ERRORS.permission_denied.message)).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'How to allow Bluetooth' })).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Try again' }));
    expect(adapter.calls.connect).toBe(0);
    const connect = within(ringSection()).getByRole('button', { name: 'Connect a ring' });
    expect(connect).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(adapter.calls.connect).toBe(1);
  });

  it.each([
    ['error', 'connection_failed'],
    ['error', 'service_missing'],
    ['disconnected', 'not_found'],
  ] as const)('shows the %s state for %s in an alert with next actions', async (status, code) => {
    const user = userEvent.setup();
    const error = DEVICE_ERRORS[code];
    await renderWith({ status, error });
    const section = ringSection();
    const alert = within(section).getByRole('alert');
    expect(alert).toHaveTextContent(error.message);
    expect(alert).toHaveTextContent(error.hint);
    expect(within(section).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText('Ring replied')).not.toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Use Demo Mode instead' }));
    expect(screen.getByRole('radio', { name: 'Demo Mode (simulated ring)' })).toBeChecked();
    expect(screen.getByRole('heading', { level: 2, name: 'Simulated ring' })).toHaveFocus();
  });

  it('keeps a connection log of the last messages from the ring', async () => {
    const user = userEvent.setup();
    const { adapter } = await renderWith({ status: 'connected', device: connectedDevice, remembered });

    await user.click(screen.getByText('Connection log'));
    const table = screen.getByRole('table', { name: 'Messages from the ring' });
    expect(within(table).getByText('No messages yet.')).toBeInTheDocument();

    act(() => {
      adapter.sendLine('GATE,armed,1200');
      adapter.emit({ type: 'gate', armed: true, closesAt: Date.now() + 3000, at: Date.now() });
      adapter.emit({ type: 'battery', percentage: 100, isStub: true, at: Date.now() });
      adapter.sendLine('STA,battery,100');
      adapter.emit({ type: 'token', token: 'next', contact: 'middle_base', durationMs: 90, at: Date.now() });
    });
    const rows = within(screen.getByRole('table', { name: 'Messages from the ring' })).getAllByRole('row');
    // Header row + four logged events (the parsed battery event is left out).
    expect(rows).toHaveLength(5);
    expect(within(rows[1] as HTMLElement).getByText('Next from Middle finger base, 90 ms press')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Messages from the ring' }).textContent).not.toContain('battery,100');

    act(() => {
      for (let i = 0; i < 30; i += 1) adapter.sendLine(`GATE,idle,${i}`);
    });
    expect(within(screen.getByRole('table', { name: 'Messages from the ring' })).getAllByRole('row')).toHaveLength(21);
  });
});
