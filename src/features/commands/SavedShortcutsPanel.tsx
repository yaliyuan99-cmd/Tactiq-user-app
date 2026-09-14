import { Pencil, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/components';
import { SHORTCUT_TOKENS, getShortcutAction } from '@/domain/commands';
import type { CommandMapping } from '@/domain/models';
import { formatRelative } from '@/lib/time';
import { SHORTCUT_LEGENDS } from './shortcutDraft';

export interface SavedShortcutsPanelProps {
  readonly saved: CommandMapping;
  readonly dirty: boolean;
  readonly onChangeShortcuts: () => void;
}

/** What the two customisable points do now, with a way straight to the editor. */
export function SavedShortcutsPanel({ saved, dirty, onChangeShortcuts }: SavedShortcutsPanelProps) {
  return (
    <Card as="div" heading="Your saved shortcuts" headingLevel={3}>
      <dl className="grid gap-3">
        {SHORTCUT_TOKENS.map((token) => (
          <div key={token} className="rounded-md border border-border px-3 py-2">
            <dt className="font-mono-label text-muted-foreground">{SHORTCUT_LEGENDS[token]}</dt>
            <dd className="font-medium">{getShortcutAction(saved.shortcuts[token]).label}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {saved.updatedAt
          ? `Last changed ${formatRelative(saved.updatedAt)}.`
          : 'These are the defaults. You have not changed them yet.'}
      </p>
      {dirty && (
        <p className="mt-3 flex items-start gap-2 font-medium">
          <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-status-target" aria-hidden="true" />
          You have unsaved changes in Your shortcuts.
        </p>
      )}
      <Button className="mt-4" variant="secondary" leadingIcon={<Pencil className="h-4 w-4" />} onClick={onChangeShortcuts}>
        Change shortcuts
      </Button>
    </Card>
  );
}
