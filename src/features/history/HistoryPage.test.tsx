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
    expect(await screen.findByRole('heading', { level: 1, name: 'Activity' })).toHaveAttribute('id', 'page-title');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.title).toBe('Activity · Tactiq');
    expect(screen.getByText(/These are simulated results from this app, not measurements of a ring\./)).toBeInTheDocument();
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
    expect(summaryValue('Successful detections')).toBe('4');
    expect(summaryValue('Misclassifications')).toBe('2');
    expect(summaryValue('Rejected presses')).toBe('2');
    expect(summaryValue('Most-practised command')).toBe('Next');
    expect(summaryValue('Emergency simulations')).toBe('1 completed, 1 cancelled');

    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(within(summary).getByText('Recognised as the command you aimed for: 4 of 8 (50%).')).toBeInTheDocument();
    expect(within(summary).getByText('Simulated')).toBeInTheDocument();
  });

  it('puts a text summary before the bars and the performance table, never a rate without its count', async () => {
    renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
    const section = await screen.findByRole('region', { name: 'By command' });

    const sentence =
      'Next was practised most, 6 attempts, 3 recognised. Dismiss / Back was recognised least often, 0 of 1 (0%). ' +
      'Undo, Read / Repeat, Previous, Shortcut 1 and Shortcut 2 have no attempts in this range.';
    const paragraph = within(section).getByText(sentence);
    const list = within(section).getByRole('list', { name: 'Recognition by command' });
    const table = within(section).getByRole('table', { name: 'Performance by command' });
    expect(paragraph.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    const nextItem = items.find((item) => item.textContent?.startsWith('Next'));
    expect(nextItem).toHaveTextContent('3 of 6 (50%)');
    const undoItem = items.find((item) => item.textContent?.startsWith('Undo'));
    expect(undoItem).toHaveTextContent('No attempts');

    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Command', 'Attempts', 'Recognised', 'Rate']);
    const nextRow = within(table).getByRole('row', { name: /^Next/ });
    expect(within(nextRow).getAllByRole('cell').map((td) => td.textContent)).toEqual(['6', '3', '50%']);
    const undoRow = within(table).getByRole('row', { name: /^Undo/ });
    expect(within(undoRow).getAllByRole('cell').map((td) => td.textContent)).toEqual(['0', '0', '—No attempts']);
    expect(within(table).queryByRole('row', { name: /^Emergency/ })).not.toBeInTheDocument();
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
    expect(headers).toEqual(['Time', 'Source', 'Target', 'Detected', 'Command', 'Result', 'Label']);

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    const first = rows[0];
    expect(first).toBeDefined();
    if (!first) return;
    const { day, time } = eventTimeParts(new Date(TEST_NOW.getTime() - 10 * 60_000).toISOString());
    expect(within(first).getByRole('rowheader')).toHaveTextContent(`${day}, ${time}`);

    const mismatch = rows[3];
    expect(mismatch && within(mismatch).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      'Simulator',
      'Middle finger base',
      'Ring finger base',
      'Next',
      'Detected as Previous',
      'Simulated',
    ]);
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
    expect(ringRow && within(ringRow).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      'Ring',
      '—None',
      'Index fingertip',
      'Confirm',
      'Recognised',
      'Measured',
    ]);
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
