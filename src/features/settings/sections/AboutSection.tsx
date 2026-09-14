import { Link } from 'react-router';
import { helpRoute } from '@/app/routes';
import { DataTable, EvidenceLabel, type DataTableColumn } from '@/components';
import { DESIGN_TARGETS, type DesignTarget } from '@/domain/evidence';
import { SettingsSection } from '../SettingsSection';

export const DESIGN_TARGETS_CAPTION = 'Design targets';
export const PROTOTYPE_NOTE = 'Student research prototype from Sydney, Australia. "Tactiq" is a working title.';

const COLUMNS: readonly DataTableColumn<DesignTarget>[] = [
  { key: 'label', header: 'Measure', rowHeader: true, cell: (target) => target.label },
  { key: 'target', header: 'Target', cell: (target) => target.target },
  { key: 'source', header: 'Source', cell: (target) => target.source },
  { key: 'evidence', header: 'Evidence', cell: () => <EvidenceLabel kind="design_target" /> },
];

export function AboutSection() {
  return (
    <SettingsSection id="about">
      <div className="grid max-w-prose gap-3">
        <h3>Where the research stands</h3>
        <p>
          No finished Tactiq ring exists. The project has bench prototype firmware and a simulation pipeline. This app includes
          its own simulated ring and is built to connect to the bench firmware over Bluetooth.
        </p>
        <p>
          The ring’s physical performance has not been validated, and nothing has been measured on a wearable. Results from
          the simulated ring are labelled Simulated.
        </p>
        <p>
          The ring is designed to recognise eight thumb-to-finger contact points and confirm each command with a haptic
          pattern. Testing on real hands would show whether it can do that reliably.
        </p>
      </div>

      <div className="grid gap-2">
        <p className="max-w-prose">
          These acceptance thresholds were fixed before any testing. They are goals the ring would have to meet, not results.
        </p>
        <DataTable
          caption={DESIGN_TARGETS_CAPTION}
          columns={COLUMNS}
          rows={DESIGN_TARGETS}
          rowKey={(target) => target.id}
          emptyMessage="No design targets are defined."
          dense
        />
      </div>

      <div className="grid gap-2">
        <p>
          <Link
            to={helpRoute('limitations')}
            className="target-44 inline-flex items-center font-medium text-primary-strong underline"
          >
            Read about the prototype’s limitations
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">{PROTOTYPE_NOTE}</p>
      </div>
    </SettingsSection>
  );
}
