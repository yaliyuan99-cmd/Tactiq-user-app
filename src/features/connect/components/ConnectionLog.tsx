import { DataTable, type DataTableColumn } from '@/components';
import type { DeviceEvent } from '@/services/device/types';
import { CONNECTION_LOG_LIMIT, connectionLogRows, formatLogTime, type ConnectionLogRow } from '../connectLogic';
import { Disclosure } from './Disclosure';

const COLUMNS: readonly DataTableColumn<ConnectionLogRow>[] = [
  {
    key: 'time',
    header: 'Time',
    cell: (row) => <time dateTime={new Date(row.at).toISOString()}>{formatLogTime(row.at)}</time>,
  },
  { key: 'type', header: 'Type', cell: (row) => row.type },
  { key: 'detail', header: 'Detail', cell: (row) => <span className="break-all">{row.detail}</span> },
];

/** The last messages from a hardware ring, newest first. Battery lines are left out: their value is a placeholder. */
export function ConnectionLog({ events }: { events: readonly DeviceEvent[] }) {
  const rows = connectionLogRows(events);
  return (
    <Disclosure summary="Connection log">
      <p className="mb-3 text-muted-foreground">
        The last {CONNECTION_LOG_LIMIT} messages from the ring, newest first. Useful when checking the bench prototype.
      </p>
      <DataTable
        caption="Messages from the ring"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No messages yet."
        dense
      />
    </Disclosure>
  );
}
