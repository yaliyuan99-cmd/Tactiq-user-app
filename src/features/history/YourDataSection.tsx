import { useState } from 'react';
import { FileJson, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { useHistory } from '@/services/ServicesProvider';
import { EXPORT_CONTENT_TYPES, activityFilename, downloadTextFile, type ActivityExportFormat } from './download';
import { HISTORY_HEADING_IDS } from './historyIds';
import { plural } from './wording';

export interface YourDataSectionProps {
  /** Called after every record has been cleared. */
  readonly onCleared: () => void;
}

/** Download every record as JSON or CSV, or clear it all after typing "clear". */
export function YourDataSection({ onCleared }: YourDataSectionProps) {
  const history = useHistory();
  const { announce } = useFeedback();
  const [confirming, setConfirming] = useState(false);
  const total = history.count();

  const download = (format: ActivityExportFormat) => {
    const content = format === 'json' ? history.exportJson() : history.exportCsv();
    const filename = activityFilename(format);
    downloadTextFile(content, filename, EXPORT_CONTENT_TYPES[format]);
    announce(`Download started: ${filename}.`);
  };

  return (
    <section aria-labelledby={HISTORY_HEADING_IDS.data} className="border-t border-border pt-8">
      <h2 id={HISTORY_HEADING_IDS.data}>Your data</h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Activity is kept in this browser on this device. Downloads contain all {plural(total, 'record')}, whatever the filters,
        including any sample records. Each record keeps its evidence label and sample flag.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" leadingIcon={<FileJson className="h-4 w-4" />} onClick={() => download('json')}>
          Download JSON
        </Button>
        <Button variant="secondary" leadingIcon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => download('csv')}>
          Download CSV
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<Trash2 className="h-4 w-4" />}
          className="sm:ml-auto"
          onClick={() => setConfirming(true)}
        >
          Clear all activity
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Clear all activity?"
        description={`This permanently deletes all ${plural(total, 'activity record')} in this browser, including sample records. Lesson progress, calibration and settings are not affected. Download a copy first if you want to keep it.`}
        confirmLabel="Clear activity"
        destructive
        typeToConfirm="clear"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          history.clear();
          setConfirming(false);
          announce('Activity cleared.');
          onCleared();
        }}
      />
    </section>
  );
}
