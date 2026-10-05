import { DataTable, SwitchField, type DataTableColumn } from '@/components';
import { EMERGENCY_HOLD_MS, TAP_MAX_MS, TIMING_FACTS, formatMs, type TimingFact } from '@/domain/timing';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { SettingsSection, WRAPPING_SWITCH_ROW } from '../SettingsSection';
import {
  LONGER_TIME_DESCRIPTION,
  TIMING_STATUS_LABELS,
  commandWindowExplanation,
  longerTimeAnnouncement,
} from '../settingsOptions';

const COLUMNS: readonly DataTableColumn<TimingFact>[] = [
  { key: 'label', header: 'Timing', rowHeader: true, cell: (fact) => fact.label },
  { key: 'value', header: 'Value', cell: (fact) => formatMs(fact.valueMs) },
  { key: 'source', header: 'Source', cell: (fact) => fact.source },
  {
    key: 'status',
    header: 'Status',
    cell: (fact) => <span className="font-mono-label whitespace-nowrap">{TIMING_STATUS_LABELS[fact.status]}</span>,
  },
];

export const TIMING_TABLE_CAPTION = 'Where these timings come from';

export function TimingSection() {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();
  // The window the app is actually using, not the one the preference asks for:
  // a bench ring keeps its firmware's window whatever this setting says.
  const { state } = useDevice();

  return (
    <SettingsSection
      id="timing"
      intro="After a deliberate squeeze, the command window opens. Each accepted tap keeps it open, so you can give another command without squeezing again. If the window closes before you touch, nothing happens and you can squeeze again."
    >
      <div className="grid gap-3">
        <SwitchField
          containerClassName={WRAPPING_SWITCH_ROW}
          label="Longer interaction time"
          description={LONGER_TIME_DESCRIPTION}
          checked={preferences.longerInteractionTime}
          onChange={(longerInteractionTime) => {
            update({ longerInteractionTime });
            announce(longerTimeAnnouncement(longerInteractionTime));
          }}
        />
        <div className="max-w-prose rounded-md border border-border bg-background px-4 py-3">
          <p>
            Command window in use now: <strong>{formatMs(state.commandWindowMs)}</strong>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {commandWindowExplanation(state.mode)} The {formatMs(EMERGENCY_HOLD_MS)} Emergency hold and the{' '}
            {formatMs(TAP_MAX_MS)} tap limit stay the same either way.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <DataTable
          caption={TIMING_TABLE_CAPTION}
          columns={COLUMNS}
          rows={TIMING_FACTS}
          rowKey={(fact) => fact.id}
          emptyMessage="No timing values are defined."
          dense
        />
        <p className="text-sm text-muted-foreground">
          None of these values has been measured on a wearable ring. A design value comes from the research material; a
          placeholder is expected to change after bench testing.
        </p>
      </div>
    </SettingsSection>
  );
}
