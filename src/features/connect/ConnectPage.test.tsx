import { BATTERY_UNAVAILABLE_NOTE, NUS_RX_CHARACTERISTIC_UUID, NUS_SERVICE_UUID, NUS_TX_CHARACTERISTIC_UUID } from '@/domain/protocol';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from '@/services/device/capabilities';
import { act, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import ConnectPage from './ConnectPage';

function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

/** Renders the page and lets the providers finish their first async read (the stored session). */
async function renderPage() {
  const result = renderApp(<ConnectPage />, { route: '/dashboard/connect' });
  await act(async () => {});
  return result;
}

afterEach(() => {
  Reflect.deleteProperty(window, 'isSecureContext');
});

describe('ConnectPage in Demo Mode', () => {
  it('has one h1, the page title and the lede', async () => {
    await renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Connect your ring' })).toBeInTheDocument();
    expect(
      screen.getByText('Use Demo Mode to practise with a simulated ring, or connect a Tactiq bench prototype over Bluetooth.'),
    ).toBeInTheDocument();
    expect(document.title).toBe('Connect your ring · Tactiq');
  });

  it('shows the simulated ring with its evidence label and no battery number', async () => {
    await renderPage();
    const section = screen.getByRole('region', { name: 'Simulated ring' });
    expect(within(section).getByText('Tactiq Ring (simulated)')).toBeInTheDocument();
    expect(within(section).getByText('fw0.2 (simulated)')).toBeInTheDocument();
    expect(within(section).getByText('Simulated')).toBeInTheDocument();
    const battery = within(section).getByText('Battery').nextElementSibling;
    expect(battery).toHaveTextContent(BATTERY_UNAVAILABLE_NOTE);
    expect(battery?.textContent).not.toMatch(/\d/);
    expect(section.textContent).not.toMatch(/\d+\s*%/);
  });

  it('links to the simulator and calibration', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'Practise in the simulator' })).toHaveAttribute('href', '/dashboard/simulator');
    expect(screen.getByRole('link', { name: 'Calibrate' })).toHaveAttribute('href', '/dashboard/calibrate');
  });

  it('shows the Demo Mode status and does not announce on first render', async () => {
    await renderPage();
    const status = screen.getByRole('region', { name: 'Current status' });
    expect(within(status).getByText('Demo Mode')).toBeInTheDocument();
    expect(politeRegion()).toBeEmptyDOMElement();
  });

  it('offers both modes with their descriptions, Demo Mode selected', async () => {
    await renderPage();
    const group = screen.getByRole('group', { name: 'How do you want to use Tactiq?' });
    const demo = within(group).getByRole('radio', { name: 'Demo Mode (simulated ring)' });
    const hardware = within(group).getByRole('radio', { name: 'Bluetooth ring (bench prototype)' });
    expect(demo).toBeChecked();
    expect(demo).toHaveAccessibleDescription('Works in any browser. Every result is labelled Simulated.');
    expect(hardware).toHaveAccessibleDescription(
      'Needs Chrome or Edge on desktop or Android, and a bench ring running the Tactiq bench firmware.',
    );
    expect(screen.queryByText('Connection log')).not.toBeInTheDocument();
  });

  it('lists the protocol identifiers under Technical details', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByText('Technical details'));
    expect(screen.getByText(NUS_SERVICE_UUID)).toBeVisible();
    expect(screen.getByText(NUS_TX_CHARACTERISTIC_UUID)).toBeInTheDocument();
    expect(screen.getByText(NUS_RX_CHARACTERISTIC_UUID)).toBeInTheDocument();
    expect(screen.getByText('STA,pong')).toBeInTheDocument();
    expect(screen.getAllByText(BATTERY_UNAVAILABLE_NOTE).length).toBeGreaterThan(0);
  });

  it('links the troubleshooting list to Help', async () => {
    await renderPage();
    const section = screen.getByRole('region', { name: 'Troubleshooting' });
    expect(within(section).getByRole('link', { name: 'Read the full troubleshooting guide' })).toHaveAttribute(
      'href',
      '/dashboard/help#troubleshooting',
    );
  });
});

describe('ConnectPage switching to the Bluetooth ring in a browser without Web Bluetooth', () => {
  it('explains the browser cannot connect, announces it, and switches back to Demo Mode', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('radio', { name: 'Bluetooth ring (bench prototype)' }));

    const section = screen.getByRole('region', { name: 'Bench prototype ring' });
    expect(within(section).getByText('This browser cannot connect to a ring')).toBeInTheDocument();
    expect(within(section).getByText(WEB_BLUETOOTH_UNAVAILABLE_REASON)).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Browsers that can connect' })).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Connect a ring' })).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(`Status: Bluetooth unavailable. ${WEB_BLUETOOTH_UNAVAILABLE_REASON}`));
    expect(screen.getByText('Connection log')).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Use Demo Mode instead' }));

    expect(screen.getByRole('radio', { name: 'Demo Mode (simulated ring)' })).toBeChecked();
    const demoSection = screen.getByRole('region', { name: 'Simulated ring' });
    expect(within(demoSection).getByText('Tactiq Ring (simulated)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Simulated ring' })).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Status: Demo Mode.'));
  });

  it('explains that Bluetooth needs a secure page when the page is not https', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('radio', { name: 'Bluetooth ring (bench prototype)' }));

    const section = screen.getByRole('region', { name: 'Bench prototype ring' });
    expect(within(section).getByText('This page is not secure enough for Bluetooth')).toBeInTheDocument();
    expect(within(section).getByText(INSECURE_CONTEXT_REASON)).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'How to fix it' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Use Demo Mode instead' })).toBeInTheDocument();
  });
});
