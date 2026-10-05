import { render, screen, within } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  readonly command: string;
  readonly attempts: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'command', header: 'Command', cell: (row) => row.command, rowHeader: true },
  { key: 'attempts', header: 'Attempts', cell: (row) => row.attempts, align: 'end' },
  { key: 'actions', header: 'Actions', cell: () => <button type="button">Details</button>, srOnlyHeader: true },
];

describe('DataTable', () => {
  it('renders a captioned table with column and row headers', () => {
    render(
      <DataTable
        caption="Attempts per command (simulated)"
        columns={columns}
        rows={[
          { command: 'Confirm', attempts: 12 },
          { command: 'Next', attempts: 7 },
        ]}
        rowKey={(row) => row.command}
        emptyMessage="No attempts yet."
      />,
    );
    const table = screen.getByRole('table', { name: 'Attempts per command (simulated)' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    headers.forEach((th) => expect(th).toHaveAttribute('scope', 'col'));
    expect(headers[2]?.querySelector('.sr-only')).toHaveTextContent('Actions');
    const rowHeader = within(table).getByRole('rowheader', { name: 'Confirm' });
    expect(rowHeader).toHaveAttribute('scope', 'row');
    const cell = within(table).getByRole('cell', { name: '12' });
    expect(cell).toHaveAttribute('data-label', 'Attempts');
    expect(cell.className).toContain('text-right');
  });

  it('leaves the stacked mobile label to CSS, so it is in no cell name or cell text', () => {
    render(
      <DataTable
        caption="Attempts per command (simulated)"
        columns={columns}
        rows={[{ command: 'Confirm', attempts: 12 }]}
        rowKey={(row) => row.command}
        emptyMessage="No attempts yet."
      />,
    );
    const table = screen.getByRole('table', { name: 'Attempts per command (simulated)' });
    // The label beside each value below sm is drawn by .stacked-label in theme.css from
    // data-label, with empty alt text. In the markup it is nowhere: not in the accessible
    // name (a plain ::before read as "Status, Status Fixed") and not in the cell's text
    // (a real span would make a cell's text the column label plus the value).
    const rowHeader = within(table).getByRole('rowheader', { name: 'Confirm' });
    expect(rowHeader).toHaveAccessibleName('Confirm');
    expect(rowHeader.textContent).toBe('Confirm');
    expect(rowHeader).toHaveAttribute('data-label', 'Command');
    expect(rowHeader).toHaveClass('stacked-label');
    const cell = within(table).getByRole('cell', { name: '12' });
    expect(cell).toHaveAccessibleName('12');
    expect(cell.textContent).toBe('12');
    expect(cell.children).toHaveLength(0);
    // A long unbreakable value wraps instead of widening the page (320px + Larger text).
    expect(cell.className).toContain('max-sm:min-w-0');
    expect(cell.className).toContain('max-sm:[overflow-wrap:anywhere]');
    expect(within(table).getByText('Attempts per command (simulated)').className).toContain(
      'max-sm:[overflow-wrap:anywhere]',
    );
  });

  it('shows the empty message in a full-width cell', () => {
    render(
      <DataTable caption="History" columns={columns} rows={[]} rowKey={(row) => row.command} emptyMessage="No attempts yet." />,
    );
    const cell = screen.getByRole('cell', { name: 'No attempts yet.' });
    expect(cell).toHaveAttribute('colspan', '3');
  });

  it('is not a focusable region when nothing overflows', () => {
    const { container } = render(
      <DataTable caption="History" columns={columns} rows={[]} rowKey={(row) => row.command} emptyMessage="None." dense />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('overflow-x-auto');
    expect(wrapper).not.toHaveAttribute('tabindex');
  });

  it('becomes a focusable, labelled region when it scrolls sideways', () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    render(<DataTable caption="History" columns={columns} rows={[]} rowKey={(row) => row.command} emptyMessage="None." />);
    const region = screen.getByRole('region', { name: 'History (scrolls sideways)' });
    expect(region).toHaveAttribute('tabindex', '0');
    scrollWidth.mockRestore();
    clientWidth.mockRestore();
  });
});
