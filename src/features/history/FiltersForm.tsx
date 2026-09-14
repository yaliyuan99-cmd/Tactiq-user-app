import { SelectField } from '@/components';
import { HISTORY_HEADING_IDS } from './historyIds';
import {
  COMMAND_OPTIONS,
  RANGE_OPTIONS,
  SOURCE_OPTIONS,
  isCommandFilter,
  isSourceFilter,
  type HistoryFilterState,
} from './historyParams';
import { SegmentedRadioGroup } from './SegmentedRadioGroup';

export interface FiltersFormProps {
  readonly filters: HistoryFilterState;
  readonly onChange: (patch: Partial<HistoryFilterState>) => void;
}

/** Range, command and source. Changes apply straight away; there is no submit step. */
export function FiltersForm({ filters, onChange }: FiltersFormProps) {
  return (
    <form
      aria-labelledby={HISTORY_HEADING_IDS.filters}
      onSubmit={(event) => event.preventDefault()}
      className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={HISTORY_HEADING_IDS.filters} tabIndex={-1} className="text-lg">
          Filters
        </h2>
        <p className="text-sm text-muted-foreground">Changes apply straight away.</p>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <SegmentedRadioGroup
          legend="Range"
          options={RANGE_OPTIONS}
          value={filters.range}
          onChange={(range) => onChange({ range })}
          className="sm:col-span-2 lg:col-span-1"
        />
        <SelectField
          label="Command"
          options={COMMAND_OPTIONS}
          value={filters.command}
          onChange={(event) => {
            const command = event.target.value;
            if (isCommandFilter(command)) onChange({ command });
          }}
        />
        <SelectField
          label="Source"
          options={SOURCE_OPTIONS}
          value={filters.source}
          onChange={(event) => {
            const source = event.target.value;
            if (isSourceFilter(source)) onChange({ source });
          }}
        />
      </div>
    </form>
  );
}
