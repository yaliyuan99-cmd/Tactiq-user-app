import { ConfirmDialog } from '@/components';
import { defaultsSummary } from './shortcutDraft';

export interface RestoreDefaultsDialogProps {
  readonly open: boolean;
  readonly dirty: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function RestoreDefaultsDialog({ open, dirty, onCancel, onConfirm }: RestoreDefaultsDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Restore default shortcuts?"
      description="Both shortcuts go back to these defaults and are saved straight away."
      confirmLabel="Restore defaults"
    >
      <ul className="grid gap-1 rounded-md border border-border bg-card px-4 py-3">
        {defaultsSummary().map((line) => (
          <li key={line} className="font-medium">
            {line}
          </li>
        ))}
      </ul>
      {dirty && <p className="mt-3">Your unsaved changes will be discarded too.</p>}
    </ConfirmDialog>
  );
}
