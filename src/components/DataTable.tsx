import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  readonly align?: 'start' | 'center' | 'end';
  /** Keeps the header for screen readers but hides it visually (e.g. an actions column). */
  readonly srOnlyHeader?: boolean;
  /** Renders this column's cells as row headers (th scope="row"). */
  readonly rowHeader?: boolean;
  /** Label shown beside the value in the stacked mobile layout. Defaults to the header text. */
  readonly mobileLabel?: string;
}

export interface DataTableProps<T> {
  readonly caption: string;
  /** Visually hides the caption; it still names the table. */
  readonly captionHidden?: boolean;
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T, index: number) => string;
  readonly emptyMessage: ReactNode;
  readonly dense?: boolean;
  readonly className?: string;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

function labelFor<T>(column: DataTableColumn<T>): string {
  if (column.mobileLabel !== undefined) return column.mobileLabel;
  return typeof column.header === 'string' || typeof column.header === 'number' ? String(column.header) : '';
}

/** Detects horizontal overflow so the scroll container is only focusable when it needs to be. */
function useHorizontalOverflow(ref: RefObject<HTMLDivElement>): boolean {
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      const table = el.firstElementChild;
      if (table) observer.observe(table);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref]);
  return overflowing;
}

/**
 * A real table: caption, column headers with scope, optional row headers.
 * Below 640px rows stack into labelled blocks (explicit ARIA roles keep the
 * table semantics when CSS changes the display type).
 */
export function DataTable<T>({
  caption,
  captionHidden,
  columns,
  rows,
  rowKey,
  emptyMessage,
  dense,
  className,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const overflowing = useHorizontalOverflow(scrollRef);
  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div
      ref={scrollRef}
      className={cn('w-full overflow-x-auto rounded-lg border border-border bg-card', className)}
      tabIndex={overflowing ? 0 : undefined}
      role={overflowing ? 'region' : undefined}
      aria-label={overflowing ? `${caption} (scrolls sideways)` : undefined}
    >
      <table role="table" className="w-full border-collapse text-left max-sm:block">
        <caption className={cn('px-4 pt-3 text-left font-medium', captionHidden && 'sr-only', 'max-sm:block')}>
          {caption}
        </caption>
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row" className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                role="columnheader"
                scope="col"
                className={cn(
                  cellPad,
                  'font-mono-label whitespace-nowrap font-medium text-muted-foreground',
                  ALIGN[column.align ?? 'start'],
                )}
              >
                {column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block">
          {rows.length === 0 ? (
            <tr role="row" className="max-sm:block">
              <td role="cell" colSpan={columns.length} className={cn(cellPad, 'text-muted-foreground max-sm:block')}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                role="row"
                className="border-b border-border last:border-b-0 max-sm:block max-sm:py-2"
              >
                {columns.map((column) => {
                  const Cell = column.rowHeader ? 'th' : 'td';
                  const mobileLabel = labelFor(column);
                  return (
                    <Cell
                      key={column.key}
                      role={column.rowHeader ? 'rowheader' : 'cell'}
                      scope={column.rowHeader ? 'row' : undefined}
                      data-label={mobileLabel || undefined}
                      className={cn(
                        cellPad,
                        'align-top',
                        column.rowHeader && 'font-medium',
                        ALIGN[column.align ?? 'start'],
                        'max-sm:flex max-sm:justify-between max-sm:gap-4 max-sm:py-1.5 max-sm:text-right',
                        mobileLabel &&
                          'max-sm:before:content-[attr(data-label)] max-sm:before:text-left max-sm:before:font-medium max-sm:before:text-muted-foreground',
                      )}
                    >
                      {column.cell(row)}
                    </Cell>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
