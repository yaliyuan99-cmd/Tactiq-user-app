import { ROUTES } from '@/app/routes';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { makeGestureEvent } from '@/services/history/testing';
import { renderApp, screen, userEvent, within } from '@/test/renderApp';
import HistoryPage from './HistoryPage';
import { TEST_NOW, manyEvents, standardEvents, storageWith } from './historyTestData';
import { eventTimeParts } from './wording';

function summaryValue(term: string): string | null | undefined {
  const section = screen.getByRole('region', { name: 'Summary' });
  const dt = within(section).getByText(term, { selector: 'dt' });
  return dt.nextElementSibling?.textContent;
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets the title and one h1 with the lede', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
    // The sidebar and the More dialog call this page History, so the h1, the
    // document title and the route announcement say History too.
    expect(await screen.findByRole('heading', { level: 1, name: 'History' })).toHaveAttribute('id', 'page-title');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.title).toBe('History · Tactiq');
    expect(screen.getByText(/Each record is labelled Simulated, or Measured/)).toBeInTheDocument();
    expect(screen.queryByText('Loading activity…')).not.toBeInTheDocument();
  });

  it('shows the no-activity state with links to practise when history is empty', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history });
    expect(await screen.findByRole('heading', { level: 2, name: 'No activity yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise a command' })).toHaveAttribute('href', ROUTES.simulator);
    expect(screen.getByRole('link', { name: 'Start a lesson' })).toHaveAttribute('href', ROUTES.train);
    expect(screen.queryByRole('form', { name: 'Filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all activity' })).not.toBeInTheDocument();
  });

  it('summarises the last 7 days by default, with the emergency notice counted separately', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
    await screen.findByRole('region', { name: 'Summary' });

    expect(screen.getByRole('radio', { name: 'Last 7 days' })).toBeChecked();
    expect(summaryValue('Attempts')).toBe('8');
    expect(summaryValue('Correct attempts')).toBe('4');
    expect(summaryValue('Wrong point or command')).toBe('2');
    expect(summaryValue('Rejected presses')).toBe('2');
    expect(summaryValue('Most-practised command')).toBe('Next');
    expect(summaryValue('Emergency simulations')).toBe('1 completed, 1 cancelled');

    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(within(summary).getByText('You gave the command that was asked for: 4 of 8 (50%).')).toBeInTheDocument();
    expect(within(summary).getByText('Simulated')).toBeInTheDocument();
  });

  it('puts a text summary before the bars, never a rate without its count, and no second table of the same figures', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
    const section = await screen.findByRole('region', { name: 'By command' });

    const sentence =
      'Next was practised most, 6 attempts, 3 recognised. Dismiss / Back was recognised least often, 0 of 1 (0%). ' +
      'Undo, Read / Repeat, Previous, Shortcut 1 and Shortcut 2 have no attempts in this range.';
    const paragraph = within(section).getByText(sentence);
    const list = within(section).getByRole('list', { name: 'Recognised attempts by command, with counts and rate' });
    expect(paragraph.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The bars already carry label, counts and rate in text, so the table that
    // repeated every one of those figures underneath them is gone.
    expect(within(section).queryByRole('table')).not.toBeInTheDocument();

    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    const nextItem = items.find((item) => item.textContent?.startsWith('Next'));
    expect(nextItem).toHaveTextContent('3 of 6 (50%)');
    const undoItem = items.find((item) => item.textContent?.startsWith('Undo'));
    expect(undoItem).toHaveTextContent('No attempts');
    expect(items.some((item) => item.textContent?.startsWith('Emergency'))).toBe(false);
  });

  it('explains emergency holds instead of a per-command rate when Emergency is chosen', async () => {
    renderApp(<HistoryPage />, {
      route: `${ROUTES.history}?range=7d&command=emergency&source=all`,
      storage: storageWith(standardEvents()),
    });
    const section = await screen.findByRole('region', { name: 'By command' });
    expect(within(section).getByText(/Emergency holds are not scored per command/)).toHaveTextContent(
      '1 completed hold, 1 cancelled hold',
    );
    expect(within(section).queryByRole('table')).not.toBeInTheDocument();
    expect(summaryValue('Attempts')).toBe('0');
    expect(summaryValue('Emergency simulations')).toBe('1 completed, 1 cancelled');
  });

  it('lists recent attempts with results and labels in words', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
    const table = await screen.findByRole('table', { name: 'Newest first, showing 10 of 10' });
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    // Target and Detected are one column: they agree on most records, and below
    // sm every column costs its own line.
    expect(headers).toEqual(['Time', 'Source', 'Point', 'Command', 'Result', 'Label']);

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    const first = rows[0];
    expect(first).toBeDefined();
    if (!first) return;
    const { day, time } = eventTimeParts(new Date(TEST_NOW.getTime() - 10 * 60_000).toISOString());
    expect(within(first).getByRole('rowheader')).toHaveTextContent(`${day}, ${time}`);

    const mismatch = rows[3];
    expect(mismatch && within(mismatch).getAllByRole('cell')).toHaveLength(5);
    expect(mismatch).toHaveTextContent('Simulator');
    expect(mismatch).toHaveTextContent('Middle finger base, detected Ring finger base');
    expect(mismatch).toHaveTextContent('Next');
    expect(mismatch).toHaveTextContent('Detected as Previous');
    expect(mismatch).toHaveTextContent('Simulated');
    expect(within(table).getByText('Too long — ignored')).toBeInTheDocument();
    expect(within(table).getByText('Window closed')).toBeInTheDocument();
    expect(within(table).getByText('Emergency hold completed (simulated)')).toBeInTheDocument();
    expect(within(table).getByText('Emergency hold cancelled')).toBeInTheDocument();
    expect(within(table).getAllByText('Lessons')).toHaveLength(4);
  });

  it('labels ring records Measured and says the summary mixes evidence', async () => {
    const ring = makeGestureEvent({
      id: 'ring-1',
      at: new Date(TEST_NOW.getTime() - 5 * 60_000).toISOString(),
      source: 'device',
      mode: 'device',
      targetContact: null,
      evidence: 'measured',
    });
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith([...standardEvents(), ring]) });
    const summary = await screen.findByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Simulated — includes some Measured ring records')).toBeInTheDocument();
    const recent = screen.getByRole('table', { name: 'Newest first, showing 11 of 11' });
    const ringRow = within(recent).getAllByRole('row')[1];
    expect(ringRow && within(ringRow).getAllByRole('cell')).toHaveLength(5);
    expect(ringRow).toHaveTextContent('Ring');
    expect(ringRow).toHaveTextContent('Index fingertip (no point asked for)');
    expect(ringRow).toHaveTextContent('Confirm');
    expect(ringRow).toHaveTextContent('Recognised');
    expect(ringRow).toHaveTextContent('Measured');
  });

  it('says Measured in the banner, Summary, By command and Day by day when every record came from a ring', async () => {
    const measured = [0, 1, 2].map((minutes) =>
      makeGestureEvent({
        source: 'simulator',
        mode: 'device',
        at: new Date(TEST_NOW.getTime() - (minutes + 1) * 60_000).toISOString(),
        targetContact: 'index_tip',
        detectedContact: 'index_tip',
        token: 'confirm',
        evidence: 'measured',
      }),
    );
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(measured) });

    // The page never calls these simulated: the rows below are labelled Measured.
    await screen.findByRole('region', { name: 'Summary' });
    expect(screen.getAllByText('Measured — on an unvalidated bench prototype')).toHaveLength(4);
    expect(screen.queryByText(/Every figure here comes from practice with the simulated ring/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Every figure here was recorded on a connected bench ring, which has not been validated.'),
    ).toBeInTheDocument();
  });

  it('tags a sample-only view Sample rather than Simulated', async () => {
    const samples = [0, 1].map((minutes) =>
      makeGestureEvent({
        at: new Date(TEST_NOW.getTime() - (minutes + 1) * 60_000).toISOString(),
        seeded: true,
        targetContact: 'index_tip',
        detectedContact: 'index_tip',
        token: 'confirm',
      }),
    );
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(samples) });
    const summary = await screen.findByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Sample')).toBeInTheDocument();
    expect(within(summary).queryByText('Simulated')).not.toBeInTheDocument();
    expect(
      screen.getByText('Every figure here comes from sample records added for Demo Mode, not from your own practice.'),
    ).toBeInTheDocument();
  });

  it('names the point, not a command, for a calibration tap', async () => {
    const calibration = makeGestureEvent({
      source: 'calibration',
      mode: 'calibration',
      at: new Date(TEST_NOW.getTime() - 60_000).toISOString(),
      targetContact: 'pinky_base',
      detectedContact: 'pinky_base',
      token: 'quick_action_2',
    });
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith([calibration]) });
    const table = await screen.findByRole('table', { name: 'Newest first, showing 1 of 1' });
    const row = within(table).getAllByRole('row')[1];
    expect(row).toHaveTextContent('Pinky finger base');
    // Calibration asks for a point; it must not read as if Shortcut 2 fired.
    expect(row).not.toHaveTextContent('Shortcut 2');
  });

  it('shows 25 more at a time and moves focus to the first new row', async () => {
    const user = userEvent.setup();
    renderApp(<HistoryPage />, { route: `${ROUTES.history}?range=today`, storage: storageWith(manyEvents(60)) });
    const section = await screen.findByRole('region', { name: 'Recent attempts' });
    expect(within(section).getByRole('table', { name: 'Newest first, showing 25 of 60' })).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Show 25 more' }));
    expect(within(section).getByRole('table', { name: 'Newest first, showing 50 of 60' })).toBeInTheDocument();
    const focused = document.activeElement;
    expect(focused).toHaveAttribute('data-row-focus', '25');
    expect(focused).toHaveAttribute('tabindex', '-1');
    expect(focused?.closest('th')).not.toBeNull();

    await user.click(within(section).getByRole('button', { name: 'Show 10 more' }));
    expect(document.activeElement).toHaveAttribute('data-row-focus', '50');
    expect(within(section).queryByRole('button', { name: /more/ })).not.toBeInTheDocument();
  });
});
