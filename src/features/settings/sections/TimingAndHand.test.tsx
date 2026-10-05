import { TIMING_FACTS } from '@/domain/timing';
import type { UserPreferences } from '@/domain/models';
import { useDevice } from '@/services/device/DeviceProvider';
import { STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { screen, userEvent, waitFor, within } from '@/test/renderApp';
import { FakeRingAdapter } from '../testing/FakeRingAdapter';
import { politeRegion, renderSettings } from '../testing/renderSettings';
import { HandSection } from './HandSection';
import { TimingSection } from './TimingSection';

function WindowProbe() {
  const { state } = useDevice();
  return <p data-testid="window-ms">{state.commandWindowMs}</p>;
}

describe('TimingSection', () => {
  it('shows the window for the mode in use, so a connected ring is never reported as 6 s', async () => {
    const { unmount } = await renderSettings(
      {
        preferences: { longerInteractionTime: true },
        deviceMode: 'hardware',
        deviceAdapter: new FakeRingAdapter({ status: 'connected' }),
      },
      <TimingSection />,
    );
    const section = screen.getByRole('region', { name: 'Interaction timing' });
    expect(within(section).getByText('Command window in use now:')).toBeInTheDocument();
    expect(section).toHaveTextContent('Command window in use now: 3 s');
    expect(section).toHaveTextContent('its firmware fixes the window at 3 s');
    expect(section).not.toHaveTextContent('Command window in use now: 6 s');
    unmount();
  });

  it('toggles longer interaction time, persists it and widens the simulated ring’s window', async () => {
    const user = userEvent.setup();
    const { storage, unmount } = await renderSettings(
      { preferences: { longerInteractionTime: false } },
      <>
        <TimingSection />
        <WindowProbe />
      </>,
    );
    const toggle = screen.getByRole('switch', { name: 'Longer interaction time' });
    expect(toggle).toHaveAccessibleDescription('Keeps the simulated ring’s command window open for 6 seconds instead of 3.');
    expect(screen.getByText('3 s', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('window-ms')).toHaveTextContent('3000');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(storage.get<UserPreferences>(STORAGE_KEYS.preferences)?.longerInteractionTime).toBe(true);
    expect(screen.getByText('6 s', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('window-ms')).toHaveTextContent('6000');
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Longer interaction time on. The simulated ring’s command window stays open for 6 seconds.'),
    );

    // A fresh page on the same storage keeps the choice.
    unmount();
    await renderSettings({ storage, preferences: storage.get<UserPreferences>(STORAGE_KEYS.preferences) ?? {} }, <TimingSection />);
    expect(screen.getByRole('switch', { name: 'Longer interaction time' })).toHaveAttribute('aria-checked', 'true');
  });

  it('lists every timing value with its source and a Design value or Placeholder status', async () => {
    await renderSettings({}, <TimingSection />);
    const table = screen.getByRole('table', { name: 'Where these timings come from' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(TIMING_FACTS.length);
    const gate = within(table).getByRole('rowheader', { name: 'Squeeze hold before the window opens' }).closest('tr');
    expect(gate).not.toBeNull();
    if (gate) {
      expect(within(gate).getByText('150 ms')).toBeInTheDocument();
      expect(within(gate).getByText('Placeholder')).toBeInTheDocument();
    }
    expect(within(table).getAllByText('Design value')).toHaveLength(TIMING_FACTS.filter((f) => f.status === 'design_value').length);
    expect(screen.getByText(/None of these values has been measured on a wearable ring/)).toBeInTheDocument();
  });
});

describe('HandSection', () => {
  it('mirrors the non-interactive hand preview as soon as the hand changes', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({ preferences: { hand: 'right' } }, <HandSection />);
    const preview = screen.getByRole('figure', { name: 'Preview: right hand, palm facing you.' });
    expect(preview).toHaveAttribute('data-hand', 'right');
    expect(within(preview).queryAllByRole('button')).toHaveLength(0);

    await user.click(screen.getByRole('radio', { name: 'Left' }));
    expect(screen.getByRole('figure', { name: 'Preview: left hand, palm facing you.' })).toHaveAttribute('data-hand', 'left');
    expect(storage.get<UserPreferences>(STORAGE_KEYS.preferences)?.hand).toBe('left');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Hand set to Left.'));
  });
});
