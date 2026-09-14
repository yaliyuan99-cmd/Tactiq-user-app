import type { UserPreferences } from '@/domain/models';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { act, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { SIGN_IN_STUB, politeRegion, renderSettings } from '../testing/renderSettings';
import { FakeRingAdapter } from '../testing/FakeRingAdapter';
import SettingsPage from '../SettingsPage';
import { PrivacySection } from './PrivacySection';

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('PrivacySection', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('says what is stored and that nothing is sent anywhere in Demo Mode', async () => {
    await renderSettings({}, <PrivacySection />);
    for (const item of ['Preferences:', 'Profile:', 'Calibration:', 'Lessons:', 'Activity:']) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText('All of this stays in this browser on this device. In Demo Mode nothing is sent anywhere.')).toBeInTheDocument();
  });

  it('downloads every tactiq key as one JSON file and announces the file name', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:settings-test';
    });
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    const { storage } = await renderSettings({}, <PrivacySection />);
    storage.set(STORAGE_KEYS.calibration, { id: 'cal_test' });

    await user.click(screen.getByRole('button', { name: 'Download all my data' }));

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toMatch(/^tactiq-data-\d{4}-\d{2}-\d{2}\.json$/);
    const blob = blobs[0];
    expect(blob).toBeDefined();
    const parsed = JSON.parse(blob ? await readBlob(blob) : '{}') as { format: string; data: Record<string, unknown> };
    expect(parsed.format).toBe('tactiq.local-data');
    expect(Object.keys(parsed.data)).toEqual(
      expect.arrayContaining(['tactiq.prefs', 'tactiq.auth.accounts', 'tactiq.auth.session', 'tactiq.calibration']),
    );
    expect(parsed.data['tactiq.calibration']).toEqual({ id: 'cal_test' });
    await waitFor(() => expect(politeRegion()).toHaveTextContent(`Download started: ${clicked[0]?.download ?? ''}.`));
  });

  it('resets preferences to their defaults after confirmation, keeping onboarding complete', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({ preferences: { theme: 'dark', hand: 'left', longerInteractionTime: true } });
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset preferences?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(storage.get<UserPreferences>(STORAGE_KEYS.preferences)?.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Reset preferences' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset to defaults' }));

    const saved = storage.get<UserPreferences>(STORAGE_KEYS.preferences);
    expect(saved).toMatchObject({ theme: 'system', hand: 'right', longerInteractionTime: false, onboardingCompleted: true });
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Longer interaction time' })).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Preferences reset to their defaults.'));
  });

  it('deletes all local data only once “delete” is typed, then signs out and opens sign-in', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings();
    act(() => {
      storage.set(STORAGE_KEYS.calibration, { id: 'cal_test' });
    });

    await user.click(screen.getByRole('button', { name: 'Delete all local data' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete all local data?' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete everything' });
    expect(confirm).toHaveAttribute('aria-disabled', 'true');

    await user.click(confirm);
    expect(within(dialog).getByText('Type “delete” exactly to continue.')).toBeInTheDocument();
    expect(storage.keys()).toEqual(expect.arrayContaining(['prefs', 'calibration', 'auth.session']));

    await user.type(within(dialog).getByRole('textbox', { name: 'Type “delete” to confirm' }), 'delete');
    expect(confirm).not.toHaveAttribute('aria-disabled');
    await user.click(confirm);

    expect(await screen.findByRole('heading', { level: 1, name: SIGN_IN_STUB })).toBeInTheDocument();
    expect(storage.keys()).toEqual([]);
  });

  it('forgets a remembered hardware ring as part of deleting everything', async () => {
    const user = userEvent.setup();
    const adapter = new FakeRingAdapter({ remembered: { id: 'ring-id', name: 'Tactiq Ring', lastConnectedAt: null } });
    const { storage } = await renderSettings({ deviceAdapter: adapter, deviceMode: 'hardware' }, <SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Delete all local data' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete all local data?' });
    await user.type(within(dialog).getByRole('textbox'), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: 'Delete everything' }));

    expect(await screen.findByRole('heading', { level: 1, name: SIGN_IN_STUB })).toBeInTheDocument();
    expect(adapter.forgetCalls).toBe(1);
    expect(storage.keys()).toEqual([]);
  });
});
