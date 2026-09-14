import { DataTable, EvidenceLabel, type DataTableColumn } from '@/components';
import { DESIGN_TARGETS, type DesignTarget } from '@/domain/evidence';
import { HelpSection, HelpSubsection } from './HelpSection';
import { LIMITATIONS } from './limitations';

const DESIGN_TARGET_COLUMNS: readonly DataTableColumn<DesignTarget>[] = [
  { key: 'label', header: 'Measure', rowHeader: true, cell: (target) => target.label },
  { key: 'target', header: 'Target', cell: (target) => target.target },
  { key: 'evidence', header: 'Evidence', cell: () => <EvidenceLabel kind="design_target" /> },
  { key: 'source', header: 'Source', cell: (target) => target.source },
];

export function LimitationsSection() {
  return (
    <HelpSection
      id="limitations"
      lede="Tactiq is a research concept. This is plainly what exists today, and what does not."
    >
      <ul className="grid max-w-prose list-disc gap-4 pl-6 marker:text-muted-foreground">
        {LIMITATIONS.map((limitation) => (
          <li key={limitation.id}>
            <p>
              <span className="font-semibold">{limitation.title}</span> {limitation.detail}
            </p>
            {limitation.quote && (
              <p className="mt-1">
                <q className="font-semibold">{limitation.quote}</q>
              </p>
            )}
            {limitation.after && <p className="mt-1">{limitation.after}</p>}
            {limitation.evidence && (
              <p className="mt-1">
                <EvidenceLabel kind={limitation.evidence} />
              </p>
            )}
          </li>
        ))}
      </ul>

      <HelpSubsection title="Design targets">
        <p className="max-w-prose">
          These thresholds were fixed before testing. They say what a ring would need to reach; none of them is a result.
        </p>
        <DataTable
          caption="Design targets, fixed before testing"
          columns={DESIGN_TARGET_COLUMNS}
          rows={DESIGN_TARGETS}
          rowKey={(target) => target.id}
          emptyMessage="No design targets."
          dense
        />
      </HelpSubsection>
    </HelpSection>
  );
}
