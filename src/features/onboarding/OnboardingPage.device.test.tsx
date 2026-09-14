import { detectCapabilities } from '@/services/device/capabilities';
import { screen, waitFor, within } from '@/test/renderApp';
import { stepIndexOf } from './onboardingFlow';
import { FakeBluetoothRing } from './testing/FakeBluetoothRing';
import { politeRegion, renderOnboarding, storedPreferences } from './testing/renderOnboarding';

vi.mock('@/features/train/LessonRunner', () => import('./testing/MockLessonRunner'));

const DEVICE_STEP = stepIndexOf('device');

describe('Step 4: Demo Mode or a ring', () => {
  it('recommends Demo Mode and marks it simulated', async () => {
    await renderOnboarding({ preferences: { onboardingStep: DEVICE_STEP } });
    const group = screen.getByRole('group', { name: 'How will you use Tactiq?' });
    expect(within(group).getByRole('radio', { name: 'Demo Mode (recommended while no ring exists)' })).toBeChecked();
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect a ring' })).not.toBeInTheDocument();
  });

  it('explains why this browser cannot connect, and Demo Mode can be chosen again', async () => {
    const { user, storage } = await renderOnboarding({ preferences: { onboardingStep: DEVICE_STEP } });
    const reason = detectCapabilities().reason;
    expect(reason).not.toBeNull();

    await user.click(screen.getByRole('radio', { name: 'Bluetooth ring' }));
    expect(screen.getByRole('radio', { name: 'Bluetooth ring' })).toBeChecked();
    expect(screen.getByText('This browser cannot connect to a ring')).toBeInTheDocument();
    expect(screen.getByText(reason ?? '')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect a ring' })).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Bluetooth ring chosen. This browser cannot connect to a ring.'));
    expect(storage.get<{ mode: string }>('device')?.mode).toBe('hardware');

    await user.click(screen.getByRole('button', { name: 'Use Demo Mode instead' }));
    const demo = screen.getByRole('radio', { name: 'Demo Mode (recommended while no ring exists)' });
    expect(demo).toBeChecked();
    expect(demo).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Demo Mode chosen. You are using the simulated ring.'));
    expect(storage.get<{ mode: string }>('device')?.mode).toBe('demo');

    // Continue is never blocked by the ring choice.
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calibration');
    expect(storedPreferences(storage)?.onboardingStep).toBe(DEVICE_STEP + 1);
  });

  it('connects a ring only when Connect a ring is chosen, and reports the status', async () => {
    const ring = new FakeBluetoothRing();
    const { user } = await renderOnboarding({ preferences: { onboardingStep: DEVICE_STEP }, deviceAdapter: ring });
    expect(screen.getByRole('radio', { name: 'Bluetooth ring' })).toBeChecked();
    expect(screen.getByText('No ring is connected.')).toBeInTheDocument();
    expect(screen.getByText('Your browser asks for Bluetooth permission only when you choose Connect a ring.')).toBeInTheDocument();
    expect(ring.connectCalls).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Connect a ring' }));
    expect(ring.connectCalls).toBe(1);
    expect(await screen.findByText('Tactiq Ring is connected over Bluetooth.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect a ring' })).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Status: Connected. Tactiq Ring is connected over Bluetooth.'));
    expect(screen.getByRole('button', { name: 'Continue' })).not.toHaveAttribute('aria-disabled');
  });

  it('never requires a connection to continue', async () => {
    const ring = new FakeBluetoothRing();
    const { user } = await renderOnboarding({ preferences: { onboardingStep: DEVICE_STEP }, deviceAdapter: ring });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calibration');
    expect(ring.connectCalls).toBe(0);
  });
});
