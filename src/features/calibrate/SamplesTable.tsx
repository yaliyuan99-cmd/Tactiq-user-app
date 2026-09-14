import { CircleAlert, CircleCheck } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components';
import { getContact } from '@/domain/contacts';
import type { CalibrationCoverage } from '@/domain/models';

const COLUMNS: readonly DataTableColumn<CalibrationCoverage>[] = [
  { key: 'point', header: 'Point', rowHeader: true, cell: (row) => getContact(row.contact).label },
  { key: 'accepted', header: 'Accepted', align: 'end', cell: (row) => row.accepted },
  { key: 'needed', header: 'Needed', align: 'end', cell: (row) => row.required },
  {
    key: 'status',
    header: 'Status',
    cell: (row) =>
      row.needsRepeat ? (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CircleAlert className="h-4 w-4 shrink-0 text-status-target" aria-hidden="true" />
          Repeat
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CircleCheck className="h-4 w-4 shrink-0 text-status-confirmed" aria-hidden="true" />
          Done
        </span>
      ),
  },
];

/** Accepted taps against the number needed, for all eight points. */
export function SamplesTable({ coverage }: { coverage: readonly CalibrationCoverage[] }) {
  return (
    <DataTable
      caption="Samples per point"
      columns={COLUMNS}
      rows={coverage}
      rowKey={(row) => row.contact}
      emptyMessage="No points to show."
    />
  );
}
