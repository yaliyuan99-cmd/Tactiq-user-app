import { forwardRef } from 'react';
import { NO_CHANGES_MESSAGE, describeChange, describeChangeSpoken, type ShortcutChange } from './shortcutDraft';

export interface ShortcutPreviewProps {
  readonly changes: readonly ShortcutChange[];
  /** Id of the body, so the Save button can be described by it. */
  readonly bodyId: string;
}

/**
 * Lists only what saving would change. Deliberately not a live region: the
 * radio buttons already say what was chosen, and this panel is read on demand.
 * The forwarded ref is the heading, which takes focus after Discard or Restore.
 */
export const ShortcutPreview = forwardRef<HTMLHeadingElement, ShortcutPreviewProps>(function ShortcutPreview(
  { changes, bodyId },
  ref,
) {
  return (
    <div className="rounded-lg border border-border bg-muted p-4" data-testid="shortcut-preview">
      <h3 ref={ref} tabIndex={-1} className="text-base">
        Changes to save
      </h3>
      <div id={bodyId} className="mt-1">
        {changes.length === 0 ? (
          <p className="text-muted-foreground">{NO_CHANGES_MESSAGE}</p>
        ) : (
          <ul className="grid gap-1">
            {changes.map((change) => (
              <li key={change.token}>
                <span aria-hidden="true">{describeChange(change)}</span>
                <span className="sr-only">{describeChangeSpoken(change)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
