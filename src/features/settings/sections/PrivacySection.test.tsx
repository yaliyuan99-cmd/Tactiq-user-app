import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import { OnboardingGate } from '@/app/routing/OnboardingGate';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { PREFERENCES_OWNERSHIP_NOTE } from '@/services/preferences/PreferencesProvider';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { TEST_USER, act, profileStorage, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { SIGN_IN_STUB, politeRegion, renderSettings, signInState, storedPreferences } from '../testing/renderSettings';
import { FakeRingAdapter } from '../testing/FakeRingAdapter';
import SettingsPage from '../SettingsPage';
import { USER_DATA_EXPORT_FORMAT, USER_DATA_SECTIONS, type UserDataExport } from '../dataExport';
import { PrivacySection } from './PrivacySection';

/** A second profile on this browser, whose records the download must not touch. */
const OTHER_USER = { ...TEST_USER, id: 'user_other', email: 'sam@example.com', displayName: 'Sam' };

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
    vi.useRealTimers();
  });

  it('says what is stored, who it belongs to, and that nothing is sent anywhere in Demo Mode', async () => {
    await renderSettings({}, <PrivacySection />);
    // Each kind of stored data is named, and the list now says which of it
    // follows the browser and which follows the profile.
    for (const item of [
      'Appearance:',
      'Your preferences:',
      'Profile:',
      'Calibration:',
      'Lessons:',
      'Activity:',
      'Shortcuts:',
      'Ring connection:',
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText(PREFERENCES_OWNERSHIP_NOTE)).toBeInTheDocument();
    expect(
      screen.getByText(
        'All of this stays in this browser on this device. Your profile, settings and activity are never sent to a server.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Each profile on this browser keeps its own calibration, lessons, shortcuts and activity/),
    ).toBeInTheDocument();
    // The type is served from this app, so "nothing is sent anywhere" is now
    // true of the page itself and may be said plainly.
    expect(
      screen.getByText(/Everything this page needs, including its type, comes from Tactiq’s own address/),
    ).toBeInTheDocument();
    expect(screen.getByText(/No font service, analytics service or advertising service is contacted/)).toBeInTheDocument();
  });

  it('downloads this profile’s own data as one JSON file and announces the file name', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 5, 23, 59));
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
    // Seeded where the app keeps it: under the signed-in profile, and under a
    // second profile that this file must not reach into.
    profileStorage(storage).set(STORAGE_KEYS.calibration, { id: 'cal_test' });
    profileStorage(storage, OTHER_USER).set(STORAGE_KEYS.calibration, { id: 'cal_other' });

    await user.click(screen.getByRole('button', { name: 'Download my data' }));

    expect(clicked).toHaveLength(1);
    // The local calendar date, zero-padded.
    expect(clicked[0]?.download).toBe('tactiq-my-data-2026-09-05.json');
    const blob = blobs[0];
    expect(blob).toBeDefined();
    const parsed = JSON.parse(blob ? await readBlob(blob) : '{}') as UserDataExport;
    expect(parsed.format).toBe(USER_DATA_EXPORT_FORMAT);
    expect(parsed.profileId).toBe(TEST_USER.id);
    expect(parsed.data.calibrationProfile).toEqual({ id: 'cal_test' });
    // A fixed list of the signed-in profile's records plus this browser's
    // appearance — never a dump of the namespace, which would hand one person
    // the other profiles' records and the account records.
    expect(Object.keys(parsed.data)).toEqual(USER_DATA_SECTIONS.map((section) => section.name));
    const file = JSON.stringify(parsed);
    expect(file).not.toContain('cal_other');
    expect(file).not.toContain(OTHER_USER.id);
    expect(file).not.toContain(TEST_USER.email);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Download started: tactiq-my-data-2026-09-05.json.'));
  });

  it('resets preferences to their defaults after confirmation, keeping onboarding complete', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({ preferences: { theme: 'dark', hand: 'left', longerInteractionTime: true } });
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset preferences?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(storedPreferences(storage).theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Reset preferences' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset to defaults' }));

    // Read back as the app reads it: appearance from this browser's record,
    // hand and timing from the signed-in profile's.
    expect(storedPreferences(storage)).toMatchObject({
      theme: 'system',
      hand: 'right',
      longerInteractionTime: false,
      onboardingCompleted: true,
    });
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Longer interaction time' })).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Preferences reset to their defaults.'));
  });

  it('keeps onboarding progress when preferences are reset, so a finished user stays on Settings', async () => {
    const user = userEvent.setup();
    const { storage } = renderApp(
      <Routes>
        <Route element={<OnboardingGate />}>
          <Route path={ROUTES.settings} element={<PrivacySection />} />
        </Route>
        <Route path={ROUTES.onboarding} element={<h1>Onboarding stand-in</h1>} />
      </Routes>,
      {
        route: ROUTES.settings,
        preferences: { onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP, textSize: 'larger' },
      },
    );
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Reset preferences' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Reset preferences?' })).getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Preferences reset to their defaults.'));
    expect(storedPreferences(storage)).toMatchObject({
      textSize: 'default',
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_LAST_STEP,
    });
    expect(screen.queryByRole('heading', { name: 'Onboarding stand-in' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset preferences' })).toBeInTheDocument();
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
    expect(signInState()).toEqual({ signedOut: true, dataDeleted: true });
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
