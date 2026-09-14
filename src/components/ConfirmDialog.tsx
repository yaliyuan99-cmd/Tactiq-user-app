import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { TextField } from './fields/TextField';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /** Styles the confirm action as dangerous and puts initial focus on Cancel. */
  readonly destructive?: boolean;
  /** When set, confirm stays aria-disabled until this phrase is typed (case and outer spaces ignored). */
  readonly typeToConfirm?: string;
  /** Shows the confirm button as pending. */
  readonly busy?: boolean;
  /** Extra content between the description and the actions. */
  readonly children?: ReactNode;
}

function phraseMatches(typed: string, phrase: string): boolean {
  return typed.trim().toLocaleLowerCase() === phrase.trim().toLocaleLowerCase();
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  typeToConfirm,
  busy = false,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialFocusRef: RefObject<HTMLElement | null> = typeToConfirm
    ? inputRef
    : destructive
      ? cancelRef
      : confirmRef;

  return (
    <Dialog open={open} onClose={onCancel} title={title} description={description} initialFocusRef={initialFocusRef} size="sm">
      <ConfirmBody
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        destructive={destructive}
        typeToConfirm={typeToConfirm}
        busy={busy}
        cancelRef={cancelRef}
        confirmRef={confirmRef}
        inputRef={inputRef}
      >
        {children}
      </ConfirmBody>
    </Dialog>
  );
}

interface ConfirmBodyProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive: boolean;
  readonly typeToConfirm: string | undefined;
  readonly busy: boolean;
  readonly cancelRef: RefObject<HTMLButtonElement>;
  readonly confirmRef: RefObject<HTMLButtonElement>;
  readonly inputRef: RefObject<HTMLInputElement>;
  readonly children?: ReactNode;
}

/** Mounted only while the dialog is open, so the typed phrase resets every time. */
function ConfirmBody({
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  destructive,
  typeToConfirm,
  busy,
  cancelRef,
  confirmRef,
  inputRef,
  children,
}: ConfirmBodyProps) {
  const [typed, setTyped] = useState('');
  const [attempted, setAttempted] = useState(false);
  const ready = typeToConfirm === undefined || phraseMatches(typed, typeToConfirm);

  const explainPhrase = () => {
    setAttempted(true);
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!ready) {
      explainPhrase();
      return;
    }
    onConfirm();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {children && <div className="mb-4">{children}</div>}
      {typeToConfirm !== undefined && (
        <TextField
          ref={inputRef}
          label={`Type “${typeToConfirm}” to confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={attempted && !ready ? `Type “${typeToConfirm}” exactly to continue.` : undefined}
          containerClassName="mb-5"
        />
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          ref={confirmRef}
          type="submit"
          variant={destructive ? 'danger' : 'primary'}
          busy={busy}
          aria-disabled={!ready || undefined}
          onClickCapture={() => {
            // Clicking (or pressing Enter in the field) before the phrase matches explains why nothing happened.
            if (!ready && !busy) explainPhrase();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
