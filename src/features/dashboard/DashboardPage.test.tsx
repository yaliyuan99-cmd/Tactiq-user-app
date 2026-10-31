import { ROUTES, lessonRoute } from '@/app/routes';
import { LESSON_IDS } from '@/domain/lessons';
import { act, renderApp, screen, within, type RenderAppOptions } from '@/test/renderApp';
import DashboardPage from './DashboardPage';
import { calibrate, completeLesson, seededStorage, SETUP_FINISHED } from './testing/seed';

async function renderDashboard(options: RenderAppOptions = {}) {
  const result = renderApp(<DashboardPage />, {
    route: ROUTES.dashboard,
    ...options,
    preferences: { ...SETUP_FINISHED, ...options.preferences },
  });
  await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Alex$/ });
  return result;
}

function region(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

describe('DashboardPage greeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [9, 'Good morning, Alex'],
    [15, 'Good afternoon, Alex'],
    [21, 'Good evening, Alex'],
  ])('greets by local time at %i:00', async (hour, title) => {
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 15, hour, 0));
    renderApp(<DashboardPage />, { preferences: SETUP_FINISHED });
    const heading = await screen.findByRole('heading', { level: 1, name: title });
    expect(heading).toHaveAttribute('id', 'page-title');
    // The page is named Home (document title, eyebrow, navigation); the h1 is the greeting.
    const eyebrow = screen.getByText('Home');
    expect(eyebrow.nextElementSibling).toBe(heading);
    expect(document.title).toBe('Home · Tactiq');
  });

  it('falls back to a Home h1 without a repeated eyebrow when nobody is signed in', async () => {
    renderApp(<DashboardPage />, { signedIn: false, preferences: SETUP_FINISHED });
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(screen.getAllByText('Home')).toHaveLength(1);
    expect(document.title).toBe('Home · Tactiq');
  });

  it('has one h1 and the sections as h2 in reading order', async () => {
    await renderDashboard();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'What to do next',
      'Your ring',
      'Training',
      'Calibration',
      'Commands',
      'Recent activity',
    ]);
  });
});

describe('DashboardPage next step', () => {
  it('offers Resume setup while setup stopped early, with practice as the secondary action', async () => {
    await renderDashboard({ preferences: { onboardingCompleted: true, onboardingStep: 2 } });
    const panel = region('What to do next');
    expect(within(panel).getByText(/Setup stopped at step 3 of 4/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Resume setup' })).toHaveAttribute('href', ROUTES.onboarding);
    expect(within(panel).getByRole('link', { name: 'Practise a command' })).toHaveAttribute('href', ROUTES.simulator);
  });

  it('asks a Demo Mode user to calibrate once setup is finished', async () => {
    await renderDashboard();
    const panel = region('What to do next');
    expect(within(panel).getByRole('link', { name: 'Calibrate your ring' })).toHaveAttribute('href', ROUTES.calibrate);
    expect(within(panel).getByText(/record where each one is for your hand, on this device/)).toBeInTheDocument();
  });

  it('continues training with the next lesson after calibration', async () => {
    const storage = seededStorage((services) => {
      calibrate(services);
      completeLesson(services, 'squeeze_to_activate', 3);
    });
    await renderDashboard({ storage });
    const link = within(region('What to do next')).getByRole('link', { name: 'Continue training: Lesson 2, Confirm and Back' });
    expect(link).toHaveAttribute('href', lessonRoute('confirm_and_back'));
  });

  it('makes practice the primary action when everything is done, without repeating it', async () => {
    const storage = seededStorage((services) => {
      calibrate(services);
      LESSON_IDS.forEach((id) => completeLesson(services, id, 1));
    });
    await renderDashboard({ storage });
    const links = within(region('What to do next')).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Practise a command');
    expect(links[0]).toHaveAttribute('href', ROUTES.simulator);
  });
});

describe('DashboardPage ring status in Demo Mode', () => {
  it('shows Demo Mode and says nothing about battery', async () => {
    await renderDashboard();
    const ring = region('Your ring');
    expect(within(ring).getByText('Demo Mode')).toBeInTheDocument();
    expect(within(ring).getByText(/You are using the simulated ring/)).toBeInTheDocument();
    expect(within(ring).getByText('Demo Mode (simulated ring)')).toBeInTheDocument();
    expect(within(ring).getByText('Not needed. The simulated ring is always ready.')).toBeInTheDocument();
    expect(within(ring).queryByRole('heading', { name: 'Things to try' })).not.toBeInTheDocument();
    expect(screen.queryByText(/battery/i)).not.toBeInTheDocument();
    expect(within(ring).getByRole('link', { name: 'Manage connection' })).toHaveAttribute('href', ROUTES.connect);
  });
});

describe('DashboardPage training', () => {
  it('shows no attempts as a dash, labelled Simulated', async () => {
    await renderDashboard();
    const training = region('Training');
    expect(within(training).getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', '0 of 5');
    expect(within(training).getByText('—')).toBeInTheDocument();
    expect(within(training).getByText('Not available until you make an attempt')).toBeInTheDocument();
    expect(within(training).getByText('0 of 9')).toBeInTheDocument();
    expect(within(training).getByText('Simulated')).toBeInTheDocument();
    expect(within(training).getByRole('link', { name: 'All lessons' })).toHaveAttribute('href', ROUTES.train);
  });

  it('reads lessons, attempts, accuracy and commands learnt from the training service', async () => {
    const storage = seededStorage((services) => {
      completeLesson(services, 'squeeze_to_activate', 3);
      completeLesson(services, 'confirm_and_back', 5, 2);
    });
    await renderDashboard({ storage });
    const training = region('Training');
    const progress = within(training).getByRole('progressbar', { name: 'Lessons completed' });
    expect(progress).toHaveAttribute('aria-valuenow', '2');
    expect(progress).toHaveAttribute('aria-valuemax', '5');
    const stats = within(training).getAllByRole('definition').map((dd) => dd.textContent);
    expect(stats).toEqual(['10', '80%', '2 of 9']);
  });
});

describe('DashboardPage calibration', () => {
  it('shows an uncalibrated ring with a Calibrate link', async () => {
    await renderDashboard();
    const section = region('Calibration');
    expect(within(section).getByText('Not calibrated')).toBeInTheDocument();
    expect(within(section).getByText('Never')).toBeInTheDocument();
    expect(within(section).queryByText('Simulated')).not.toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Calibrate' })).toHaveAttribute('href', ROUTES.calibrate);
  });

  it('counts points done while calibration is in progress', async () => {
    const storage = seededStorage((services) => calibrate(services, ['index_tip', 'index_base', 'middle_tip'], false));
    await renderDashboard({ storage });
    const section = region('Calibration');
    expect(within(section).getByText('In progress — 3 of 8 points done')).toBeInTheDocument();
    expect(within(section).getByText('just now')).toBeInTheDocument();
    expect(within(section).getByText('Simulated')).toBeInTheDocument();
  });

  it('names the points that need repeating', async () => {
    const storage = seededStorage((services) =>
      calibrate(services, ['index_tip', 'index_base', 'middle_tip', 'middle_base', 'ring_tip', 'pinky_base']),
    );
    await renderDashboard({ storage });
    expect(within(region('Calibration')).getByText('Needs repeating: Ring finger base and Pinky fingertip')).toBeInTheDocument();
  });

  it('offers Recalibrate once complete', async () => {
    const storage = seededStorage((services) => calibrate(services));
    await renderDashboard({ storage });
    const section = region('Calibration');
    expect(within(section).getByText('Complete')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Recalibrate' })).toHaveAttribute('href', ROUTES.calibrate);
  });
});
