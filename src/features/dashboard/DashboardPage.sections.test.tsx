import { ROUTES } from '@/app/routes';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { createServices } from '@/services/ServicesProvider';
import { act, renderApp, screen, within, type RenderAppOptions } from '@/test/renderApp';
import DashboardPage from './DashboardPage';
import { seededStorage, SETUP_FINISHED } from './testing/seed';

async function renderDashboard(options: RenderAppOptions = {}) {
  const result = renderApp(<DashboardPage />, { route: ROUTES.dashboard, preferences: SETUP_FINISHED, ...options });
  await screen.findByRole('heading', { level: 1, name: /Alex$/ });
  return result;
}

function region(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

describe('DashboardPage commands', () => {
  it('lists the nine interactions with the saved shortcut actions', async () => {
    const storage = seededStorage((services) =>
      services.commands.set({ quick_action_1: 'toggle_flashlight', quick_action_2: 'read_notifications' }),
    );
    await renderDashboard({ storage });
    const section = region('Commands');
    const list = within(section).getByRole('list', { name: 'Contact points and their commands' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(9);
    expect(items[0]).toHaveTextContent('Index fingertip:Confirm');
    expect(items[6]).toHaveTextContent('Pinky fingertip, brief tap:Shortcut 1: Toggle the flashlight');
    expect(items[7]).toHaveTextContent('Pinky finger base:Shortcut 2: Read recent notifications');
    expect(items[8]).toHaveTextContent('Pinky fingertip, held 5 seconds:Emergency');
    expect(within(section).getByRole('link', { name: 'Change shortcuts' })).toHaveAttribute('href', ROUTES.commands);
  });

  it('draws the hand for the chosen hand, hidden from assistive technology', async () => {
    const { container } = await renderDashboard({ preferences: { ...SETUP_FINISHED, hand: 'left' } });
    const figure = container.querySelector('figure[data-hand="left"]');
    expect(figure).not.toBeNull();
    expect(figure?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(within(region('Commands')).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('DashboardPage recent activity', () => {
  it('shows an empty state with a way to the simulator', async () => {
    await renderDashboard();
    const section = region('Recent activity');
    expect(within(section).getByText('No activity yet.')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', ROUTES.simulator);
    expect(within(section).getByRole('link', { name: 'View all activity' })).toHaveAttribute('href', ROUTES.history);
  });

  it('lists the newest five records and labels seeded ones Sample', async () => {
    const storage = seededStorage((services) => services.history.seedDemo(new Date(Date.now() - 60 * 60 * 1000)));
    await renderDashboard({ storage });
    const section = region('Recent activity');
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    items.forEach((item) => expect(within(item).getByText('Sample')).toBeInTheDocument());
    expect(within(section).getByText(/Records labelled Sample are simulated examples/)).toBeInTheDocument();
    expect(within(section).queryByText('Simulated')).not.toBeInTheDocument();
  });

  it('puts a new simulated record first, labelled Simulated, with its time and source', async () => {
    const storage = seededStorage((services) => {
      services.history.seedDemo(new Date(Date.now() - 60 * 60 * 1000));
      services.history.append({
        source: 'simulator',
        mode: 'guided',
        targetContact: 'middle_base',
        detectedContact: 'ring_base',
        token: 'previous',
        durationMs: 180,
        outcome: 'mismatch',
        evidence: 'simulated',
      });
    });
    await renderDashboard({ storage });
    const items = within(region('Recent activity')).getAllByRole('listitem');
    const first = items[0];
    if (!first) throw new Error('Expected a first activity item.');
    expect(within(first).getByText('Aimed for Next, detected Previous')).toBeInTheDocument();
    expect(within(first).getByText('just now')).toBeInTheDocument();
    expect(first).toHaveTextContent('Simulator, guided practice');
    expect(within(first).getByText('Simulated')).toBeInTheDocument();
    expect(within(first).queryByText('Sample')).not.toBeInTheDocument();
  });

  it('carries the simulation notice on a completed emergency hold', async () => {
    const storage = seededStorage((services) =>
      services.history.append({
        source: 'simulator',
        mode: 'free',
        targetContact: 'pinky_tip',
        detectedContact: 'pinky_tip',
        token: 'emergency',
        durationMs: 5000,
        outcome: 'emergency',
        evidence: 'simulated',
      }),
    );
    await renderDashboard({ storage });
    expect(within(region('Recent activity')).getByText(`Emergency hold completed. ${EMERGENCY_SIMULATION_NOTICE}`)).toBeInTheDocument();
  });

  it('updates when a record is added while the dashboard is open', async () => {
    const storage = seededStorage(() => undefined);
    await renderDashboard({ storage });
    expect(within(region('Recent activity')).getByText('No activity yet.')).toBeInTheDocument();
    const other = createServices(storage);
    act(() => {
      other.history.append({
        source: 'training',
        mode: 'lesson',
        lessonId: 'confirm_and_back',
        targetContact: 'index_tip',
        detectedContact: 'index_tip',
        token: 'confirm',
        durationMs: 150,
        outcome: 'recognised',
        evidence: 'simulated',
      });
    });
    const section = region('Recent activity');
    expect(await within(section).findByText('Confirm recognised')).toBeInTheDocument();
    expect(within(section).getByText(/Lesson 2/)).toBeInTheDocument();
  });
});

describe('DashboardPage links', () => {
  it('sends every section link to its route', async () => {
    await renderDashboard();
    const expected: Array<[string, string]> = [
      ['Calibrate your ring', ROUTES.calibrate],
      ['Practise a command', ROUTES.simulator],
      ['Manage connection', ROUTES.connect],
      ['All lessons', ROUTES.train],
      ['Calibrate', ROUTES.calibrate],
      ['Change shortcuts', ROUTES.commands],
      ['View all activity', ROUTES.history],
      ['Open the simulator', ROUTES.simulator],
    ];
    const links = screen.getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(expected);
  });
});
