import { CONTACT_KEYS } from '@/domain/contacts';
import { DEVICE_NAME } from '@/domain/protocol';
import { LocalCalibrationService } from '@/services/calibration/LocalCalibrationService';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { profileStorage, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { FakeRingAdapter } from '../testing/FakeRingAdapter';
import { politeRegion, renderSettings } from '../testing/renderSettings';
import { CalibrationSection } from './CalibrationSection';
import { DeviceSection } from './DeviceSection';

const REMEMBERED = { id: 'browser-assigned-id', name: DEVICE_NAME, lastConnectedAt: '2026-09-15T01:00:00.000Z' };

describe('DeviceSection', () => {
  it('shows Demo Mode status with a link to manage the connection and nothing to forget', async () => {
    await renderSettings({}, <DeviceSection />);
    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    expect(screen.getByText(/You are using the simulated ring/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage connection' })).toHaveAttribute('href', '/dashboard/connect');
    expect(screen.queryByRole('button', { name: /^Forget/ })).not.toBeInTheDocument();
  });

  it('forgets a remembered hardware ring only after confirmation', async () => {
    const user = userEvent.setup();
    const adapter = new FakeRingAdapter({ remembered: REMEMBERED });
    await renderSettings({ deviceAdapter: adapter, deviceMode: 'hardware' }, <DeviceSection />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText(`${DEVICE_NAME} is not connected.`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Forget ${DEVICE_NAME}` }));
    const dialog = screen.getByRole('dialog', { name: `Forget ${DEVICE_NAME}?` });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(adapter.forgetCalls).toBe(0);

    await user.click(screen.getByRole('button', { name: `Forget ${DEVICE_NAME}` }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Forget ring' }));
    expect(adapter.forgetCalls).toBe(1);
    await waitFor(() => expect(politeRegion()).toHaveTextContent(`${DEVICE_NAME} forgotten.`));
    expect(screen.queryByRole('button', { name: `Forget ${DEVICE_NAME}` })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Device' })).toHaveFocus());
  });
});

/**
 * A finished calibration for the signed-in profile. A calibration belongs to
 * one person, so it is seeded through that profile's view of the store: the
 * bare key is an address the app no longer reads.
 */
function seedCompleteCalibration(storage: MemoryStorageAdapter, hand: 'left' | 'right'): void {
  const service = new LocalCalibrationService(profileStorage(storage));
  service.start({ hand, samplesPerContact: 1 });
  for (const contact of CONTACT_KEYS) service.recordSample({ contact, detectedContact: contact, durationMs: 200 });
  service.complete();
  service.dispose();
}

describe('CalibrationSection', () => {
  it('offers to calibrate when there is no calibration, with nothing to delete', async () => {
    await renderSettings({}, <CalibrationSection />);
    expect(screen.getByText('Not calibrated yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calibrate now' })).toHaveAttribute('href', '/dashboard/calibrate');
    expect(screen.queryByRole('button', { name: 'Delete calibration' })).not.toBeInTheDocument();
    // The section must say what calibration records and what it does not send.
    expect(screen.getByText(/Nothing is sent to a ring and no sensor is adjusted/)).toBeInTheDocument();
  });

  it('summarises a stored calibration with its evidence label, and deletes it after confirmation', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    seedCompleteCalibration(storage, 'right');
    await renderSettings({ storage, preferences: { hand: 'right' } }, <CalibrationSection />);

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
    expect(screen.getByText('Right hand')).toBeInTheDocument();
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recalibrate' })).toHaveAttribute('href', '/dashboard/calibrate');
    expect(screen.queryByText(/Recalibrate so the points match/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete calibration' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete calibration?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete calibration' }));

    expect(profileStorage(storage).get(STORAGE_KEYS.calibration)).toBeNull();
    expect(screen.getByText('Not calibrated yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calibrate now' })).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Calibration deleted.'));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Calibration' })).toHaveFocus());
  });

  it('warns when the calibration was made for the other hand', async () => {
    const storage = new MemoryStorageAdapter();
    seedCompleteCalibration(storage, 'right');
    await renderSettings({ storage, preferences: { hand: 'left' } }, <CalibrationSection />);
    expect(
      screen.getByText(/This calibration was made for your right hand, but Settings is set to your left hand/),
    ).toBeInTheDocument();
  });
});
