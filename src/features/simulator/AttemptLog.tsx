import { useRef } from 'react';
import { Link } from 'react-router';
import { Button, DataTable, EvidenceLabel, type DataTableColumn } from '@/components';
import { ROUTES } from '@/app/routes';
import {
  SESSION_LOG_CAPTION,
  SESSION_LOG_EMPTY,
  detectedCellText,
  formatLogTime,
  targetCellText,
  type SessionLogEntry,
} from './sessionLog';
import { LINK_CLASSES, SIMULATOR_HEADING_IDS } from './simulatorIds';

export interface AttemptLogProps {
  /** Newest first. */
  readonly entries: readonly SessionLogEntry[];
  /** Empties the session log. Focus moves to the section heading, because the button goes away. */
  readonly onClear: () => void;
  readonly className?: string;
}

const COLUMNS: readonly DataTableColumn<SessionLogEntry>[] = [
  {
    key: 'time',
    header: 'Time',
    rowHeader: true,
    cell: (entry) => (
      <time dateTime={entry.at} className="whitespace-nowrap">
        {formatLogTime(entry.at)}
      </time>
    ),
  },
  { key: 'target', header: 'Target', cell: (entry) => targetCellText(entry.target) },
  { key: 'detected', header: 'Detected', cell: (entry) => detectedCellText(entry.detectedContact) },
  { key: 'result', header: 'Result', cell: (entry) => entry.resultWords },
  { key: 'label', header: 'Label', cell: (entry) => <EvidenceLabel kind={entry.evidence} /> },
];

/** The last eight attempts on this page. Not a live region: each result was already announced. */
export function AttemptLog({ entries, onClear, className }: AttemptLogProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  const clear = () => {
    headingRef.current?.focus();
    onClear();
  };

  return (
    <section aria-labelledby={SIMULATOR_HEADING_IDS.log} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={SIMULATOR_HEADING_IDS.log} ref={headingRef} tabIndex={-1}>
          Latest attempts
        </h2>
        {entries.length > 0 && (
          <Button variant="secondary" size="sm" onClick={clear}>
            Clear log
          </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Your activity history keeps every attempt.{' '}
        <Link to={ROUTES.history} className={LINK_CLASSES}>
          Open History
        </Link>
      </p>
      <DataTable
        caption={SESSION_LOG_CAPTION}
        captionHidden
        columns={COLUMNS}
        rows={entries}
        rowKey={(entry) => entry.id}
        emptyMessage={SESSION_LOG_EMPTY}
        dense
        className="mt-3"
      />
    </section>
  );
}
