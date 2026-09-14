import { ROUTES, helpRoute } from '@/app/routes';
import { BATTERY_UNAVAILABLE_NOTE, DEVICE_NAME } from '@/domain/protocol';
import { DEVICE_ERRORS } from '@/services/device/deviceErrors';
import type { DeviceInfo, DeviceState } from '@/services/device/types';
import { act, renderApp, screen, waitFor, within } from '@/test/renderApp';
import DashboardPage from './DashboardPage';
import { FakeRingAdapter } from './testing/FakeRingAdapter';
import { SETUP_FINISHED } from './testing/seed';

const device: DeviceInfo = {
  id: 'browser-assigned-id',
  name: DEVICE_NAME,
  firmwareVersion: null,
  battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
  lastConnectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  evidence: 'measured',
};

async function renderWithRing(initial: Partial<DeviceState>) {
  const adapter = new FakeRingAdapter(initial);
  const result = renderApp(<DashboardPage />, {
    route: ROUTES.dashboard,
    preferences: SETUP_FINISHED,
    deviceAdapter: adapter,
    deviceMode: 'hardware',
  });
  await screen.findByRole('heading', { level: 1, name: /Alex$/ });
  await act(async () => {});
  return { adapter, ...result };
}

function ringRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Your ring' });
}

describe('DashboardPage with a Bluetooth ring', () => {
  it('asks to reconnect a disconnected ring and shows troubleshooting', async () => {
    await renderWithRing({ status: 'disconnected' });

    const next = screen.getByRole('region', { name: 'What to do next' });
    expect(within(next).getByRole('link', { name: 'Reconnect your ring' })).toHaveAttribute('href', ROUTES.connect);

    const ring = ringRegion();
    expect(within(ring).getByText('Disconnected')).toBeInTheDocument();
    expect(within(ring).getByText('No ring is connected.')).toBeInTheDocument();
    expect(within(ring).getByText('Bluetooth ring (bench prototype)')).toBeInTheDocument();
    expect(within(ring).getByText('Never in this browser')).toBeInTheDocument();
    expect(within(ring).getByRole('heading', { level: 3, name: 'Things to try' })).toBeInTheDocument();
    expect(within(ring).getAllByRole('listitem')).toHaveLength(3);
    expect(within(ring).getByRole('link', { name: 'Read the troubleshooting guide' })).toHaveAttribute(
      'href',
      helpRoute('troubleshooting'),
    );
    expect(within(ring).getByRole('link', { name: 'Manage connection' })).toHaveAttribute('href', ROUTES.connect);
  });

  it('shows the last connection of a remembered ring', async () => {
    await renderWithRing({
      status: 'disconnected',
      remembered: { id: 'browser-assigned-id', name: DEVICE_NAME, lastConnectedAt: device.lastConnectedAt },
    });
    const ring = ringRegion();
    expect(within(ring).getByText(`${DEVICE_NAME} is not connected.`)).toBeInTheDocument();
    expect(within(ring).getByText('2 hours ago')).toBeInTheDocument();
  });

  it.each([
    ['unsupported', DEVICE_ERRORS.unsupported],
    ['permission_denied', DEVICE_ERRORS.permission_denied],
    ['error', DEVICE_ERRORS.connection_failed],
  ] as const)('shows troubleshooting when the ring status is %s', async (status, error) => {
    await renderWithRing({ status, error });
    const ring = ringRegion();
    expect(within(ring).getByText(error.message)).toBeInTheDocument();
    expect(within(ring).getAllByRole('listitem')).toHaveLength(3);
    expect(within(ring).getByRole('link', { name: 'Read the troubleshooting guide' })).toHaveAttribute(
      'href',
      helpRoute('troubleshooting'),
    );
  });

  it('shows a connected ring without troubleshooting or battery, and moves the next step on', async () => {
    await renderWithRing({ status: 'connected', device });
    const ring = ringRegion();
    expect(within(ring).getByText('Connected')).toBeInTheDocument();
    expect(within(ring).getByText(`${DEVICE_NAME} is connected over Bluetooth.`)).toBeInTheDocument();
    expect(within(ring).getByText('2 hours ago')).toBeInTheDocument();
    expect(within(ring).queryByRole('heading', { name: 'Things to try' })).not.toBeInTheDocument();
    expect(screen.queryByText(/battery/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
    const next = screen.getByRole('region', { name: 'What to do next' });
    expect(within(next).getByRole('link', { name: 'Calibrate your ring' })).toBeInTheDocument();
  });

  it('shows a battery level only when the ring reports one', async () => {
    await renderWithRing({ status: 'connected', device: { ...device, battery: { reported: true, percentage: 64 } } });
    const ring = ringRegion();
    expect(within(ring).getByText('Battery')).toBeInTheDocument();
    expect(within(ring).getByText('64%')).toBeInTheDocument();
    expect(within(ring).getByText('Measured')).toBeInTheDocument();
  });

  it('announces a status change while the dashboard is open, and updates the next step', async () => {
    const { adapter } = await renderWithRing({ status: 'connected', device });
    const polite = screen.getByTestId('live-region-polite');
    expect(polite).not.toHaveTextContent('Ring status');

    act(() => adapter.setState({ status: 'disconnected', device: null }));
    await waitFor(() => expect(polite).toHaveTextContent('Ring status: Disconnected.'));
    const next = screen.getByRole('region', { name: 'What to do next' });
    expect(within(next).getByRole('link', { name: 'Reconnect your ring' })).toBeInTheDocument();
    expect(within(ringRegion()).getByRole('heading', { name: 'Things to try' })).toBeInTheDocument();
  });
});
