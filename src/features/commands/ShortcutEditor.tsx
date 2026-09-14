import { forwardRef, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, Callout, EvidenceLabel, RadioGroupField, type RadioOption } from '@/components';
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_TOKENS,
  type ShortcutActionId,
  type ShortcutToken,
} from '@/domain/commands';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { RestoreDefaultsDialog } from './RestoreDefaultsDialog';
import { ShortcutPreview } from './ShortcutPreview';
import { NOT_PERSISTED_NOTE, ShortcutResult, type ShortcutResultState } from './ShortcutResult';
import {
  DISCARDED_ANNOUNCEMENT,
  RESTORED_ANNOUNCEMENT,
  SAVED_ANNOUNCEMENT,
  SHORTCUT_LEGENDS,
  mappingSummary,
} from './shortcutDraft';
import type { SaveOutcome, ShortcutDraftState } from './useShortcutDraft';

export const EDITOR_HEADING_ID = 'your-shortcuts-heading';

export const EMERGENCY_REMINDER =
  'Emergency is a five-second hold on the pinky fingertip and can never be changed. A brief tap on the same point is Shortcut 1.';
export const SIMULATOR_ONLY_NOTE =
  'In this app, shortcuts run in the simulator only. On a phone they would depend on platform automation, which the research does not promise.';

const OPTIONS: readonly RadioOption<ShortcutActionId>[] = SHORTCUT_ACTIONS.map((action) => ({
  value: action.id,
  label: action.label,
  description: action.description,
}));

const HINTS: Readonly<Record<ShortcutToken, string>> = {
  quick_action_1: 'A brief tap on the tip of your smallest finger.',
  quick_action_2: 'A brief tap on the base of your smallest finger.',
};

export interface ShortcutEditorProps {
  readonly draft: ShortcutDraftState;
}

/** Radio choices for the two shortcut slots, a preview of what would change, and save / discard / restore. */
export const ShortcutEditor = forwardRef<HTMLHeadingElement, ShortcutEditorProps>(function ShortcutEditor({ draft }, headingRef) {
  const { announce } = useFeedback();
  const previewBodyId = `shortcut-preview-${useId().replace(/:/g, '')}`;
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusPreviewNext = useRef(false);
  const [result, setResult] = useState<ShortcutResultState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The button that was pressed can disappear (Discard, Restore); keep keyboard focus nearby.
  useEffect(() => {
    if (!focusPreviewNext.current) return;
    focusPreviewNext.current = false;
    previewHeadingRef.current?.focus();
  });

  const settle = (kind: 'saved' | 'restored', outcome: SaveOutcome, message: string) => {
    setResult({ kind, summary: mappingSummary(outcome.mapping.shortcuts), persisted: outcome.persisted });
    announce(outcome.persisted ? message : `${message} ${NOT_PERSISTED_NOTE}`);
  };

  const handleChoose = (token: ShortcutToken, action: ShortcutActionId) => {
    setResult(null);
    draft.choose(token, action);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.dirty) return;
    try {
      settle('saved', draft.save(), SAVED_ANNOUNCEMENT);
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
    }
  };

  const handleDiscard = () => {
    draft.discard();
    setResult(null);
    focusPreviewNext.current = true;
    announce(DISCARDED_ANNOUNCEMENT);
  };

  const handleRestore = () => {
    setConfirmOpen(false);
    focusPreviewNext.current = true;
    settle('restored', draft.restoreDefaults(), RESTORED_ANNOUNCEMENT);
  };

  return (
    <section aria-labelledby={EDITOR_HEADING_ID} className="scroll-mt-24">
      <h2 ref={headingRef} id={EDITOR_HEADING_ID} tabIndex={-1} className="scroll-mt-24">
        Your shortcuts
      </h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Choose what each shortcut does. Nothing changes until you save.
      </p>
      <p className="mt-3 max-w-3xl">
        <EvidenceLabel kind="design_intent" className="mr-2" />
        <span>{SIMULATOR_ONLY_NOTE}</span>
      </p>
      <Callout kind="info" className="mt-4 max-w-3xl">
        {EMERGENCY_REMINDER}
      </Callout>

      <form className="mt-6 grid grid-cols-1 gap-6" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SHORTCUT_TOKENS.map((token) => (
            <RadioGroupField<ShortcutActionId>
              key={token}
              name={`shortcut-${token}`}
              label={SHORTCUT_LEGENDS[token]}
              hint={HINTS[token]}
              options={OPTIONS}
              value={draft.current[token]}
              onChange={(action) => handleChoose(token, action)}
            />
          ))}
        </div>

        <ShortcutPreview ref={previewHeadingRef} changes={draft.changes} bodyId={previewBodyId} />

        {draft.dirty && (
          <Callout kind="warning" title="Not saved yet">
            Leaving this page before you save will lose these changes.
          </Callout>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" aria-disabled={!draft.dirty || undefined} aria-describedby={previewBodyId}>
            Save shortcuts
          </Button>
          {draft.dirty && (
            <Button variant="secondary" onClick={handleDiscard}>
              Discard changes
            </Button>
          )}
          {draft.canRestore ? (
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              Restore defaults
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Both shortcuts use the defaults.</p>
          )}
        </div>

        {result && <ShortcutResult result={result} />}
      </form>

      <RestoreDefaultsDialog
        open={confirmOpen}
        dirty={draft.dirty}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleRestore}
      />
    </section>
  );
});
