import { useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { renderApp, screen, userEvent, within } from '@/test/renderApp';
import HistoryPage from './HistoryPage';
import { TEST_NOW, standardEvents, storageWith } from './historyTestData';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderPage(route: string = ROUTES.history) {
  return renderApp(
    <>
      <HistoryPage />
      <LocationProbe />
    </>,
    { route, storage: storageWith(standardEvents()) },
  );
}

function summaryValue(term: string): string | null | undefined {
  const section = screen.getByRole('region', { name: 'Summary' });
  return within(section).getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;
}

const polite = () => within(screen.getByTestId('live-region-polite'));

describe('HistoryPage filters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers range, command and source in a named form', async () => {
    renderPage();
    const form = await screen.findByRole('form', { name: 'Filters' });
    const range = within(form).getByRole('group', { name: 'Range' });
    expect(within(range).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Today', 'Last 7 days', 'All time']);
    const command = within(form).getByRole('combobox', { name: 'Command' });
    expect(within(command).getAllByRole('option')).toHaveLength(10);
    expect(command).toHaveValue('all');
    const source = within(form).getByRole('combobox', { name: 'Source' });
    // No "Ring" option: nothing records source 'device', so it always came back
    // empty. A bench ring's records are labelled Measured in Recent attempts.
    expect(within(source).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All sources',
      'Simulator',
      'Lessons',
      'Calibration',
    ]);
  });

  it('changes the range immediately, updates the URL and announces the count', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Summary' });
    expect(summaryValue('Attempts')).toBe('8');

    await user.click(screen.getByRole('radio', { name: 'Today' }));
    expect(summaryValue('Attempts')).toBe('6');
    expect(screen.getByTestId('location')).toHaveTextContent('range=today');
    expect(await polite().findByText('Showing 6 attempts and 2 emergency holds.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'All time' }));
    expect(summaryValue('Attempts')).toBe('10');
    expect(summaryValue('Correct attempts')).toBe('6');
    expect(await polite().findByText('Showing 10 attempts and 2 emergency holds.')).toBeInTheDocument();
  });

  it('moves between ranges with the arrow keys', async () => {
    const user = userEvent.setup();
    renderPage();
    const lastWeek = await screen.findByRole('radio', { name: 'Last 7 days' });
    lastWeek.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'All time' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All time' })).toHaveFocus();
    expect(summaryValue('Attempts')).toBe('10');
  });

  it('filters by the command the user aimed for', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Summary' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Command' }), 'Dismiss / Back');
    expect(screen.getByTestId('location')).toHaveTextContent('command=back');
    expect(summaryValue('Attempts')).toBe('1');
    expect(summaryValue('Wrong point or command')).toBe('1');
    expect(await polite().findByText('Showing 1 attempt.')).toBeInTheDocument();
    const byCommand = screen.getByRole('region', { name: 'By command' });
    expect(within(byCommand).getByText('Dismiss / Back: 1 attempt, 0 recognised.')).toBeInTheDocument();
    expect(within(byCommand).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('table', { name: 'Newest first, showing 1 of 1' })).toHaveTextContent('Detected as Confirm');
  });

  it('filters by source', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Summary' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Source' }), 'Lessons');
    expect(screen.getByTestId('location')).toHaveTextContent('source=training');
    expect(summaryValue('Attempts')).toBe('2');
    expect(summaryValue('Emergency simulations')).toBe('1 completed, 1 cancelled');
    expect(await polite().findByText('Showing 2 attempts and 2 emergency holds.')).toBeInTheDocument();
    const recent = screen.getByRole('table', { name: 'Newest first, showing 4 of 4' });
    expect(within(recent).queryByText('Simulator')).not.toBeInTheDocument();
  });

  it('restores filters from the URL, so a view survives a refresh', async () => {
    renderPage(`${ROUTES.history}?range=all&command=read&source=calibration`);
    await screen.findByRole('region', { name: 'Summary' });
    expect(screen.getByRole('radio', { name: 'All time' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Command' })).toHaveValue('read');
    expect(screen.getByRole('combobox', { name: 'Source' })).toHaveValue('calibration');
    expect(summaryValue('Attempts')).toBe('2');
    expect(summaryValue('Most-practised command')).toBe('Read / Repeat');
  });

  it('falls back to defaults for unknown URL values', async () => {
    renderPage(`${ROUTES.history}?range=forever&command=wave&source=cloud`);
    await screen.findByRole('region', { name: 'Summary' });
    expect(screen.getByRole('radio', { name: 'Last 7 days' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Command' })).toHaveValue('all');
    expect(screen.getByRole('combobox', { name: 'Source' })).toHaveValue('all');
  });

  it('shows an empty state for filters with no matches, with links to widen them', async () => {
    const user = userEvent.setup();
    renderPage(`${ROUTES.history}?range=7d&command=all&source=calibration`);
    expect(await screen.findByText('No attempts in this range.')).toBeInTheDocument();
    expect(screen.getByText('Range: last 7 days. Command: all commands. Source: Calibration.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Summary' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', ROUTES.simulator);
    expect(screen.getByRole('link', { name: 'Show all commands and sources' })).toHaveAttribute(
      'href',
      `${ROUTES.history}?range=7d&command=all&source=all`,
    );

    const widen = screen.getByRole('link', { name: 'Show all time' });
    expect(widen).toHaveAttribute('href', `${ROUTES.history}?range=all&command=all&source=calibration`);
    await user.click(widen);

    expect(await screen.findByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(summaryValue('Attempts')).toBe('2');
    expect(screen.getByRole('radio', { name: 'All time' })).toBeChecked();
    expect(await polite().findByText('Showing 2 attempts.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Filters' })).toHaveFocus();
  });

  it('announces when a filter change leaves nothing to show', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Summary' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Command' }), 'Undo');
    expect(await polite().findByText('No attempts in this range.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show all time' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Command' })).toHaveFocus();
  });
});
