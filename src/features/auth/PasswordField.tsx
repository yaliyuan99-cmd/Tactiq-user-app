import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FieldError, FieldHint, FieldLabel } from '@/components/fields/FieldParts';
import { CONTROL_CLASSES, hasContent, useFieldIds } from '@/components/fields/fieldIds';
import { cn } from '@/lib/cn';

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'autoComplete'> {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** When set, the input is aria-invalid and the message is announced. */
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly autoComplete: 'current-password' | 'new-password';
  /** Visible text and accessible name of the reveal toggle. Keep it unique on the page. */
  readonly toggleLabel?: string;
  readonly containerClassName?: string;
}

/**
 * A password input with a reveal toggle. The toggle keeps one label and
 * reports its state with aria-pressed; the eye icon and a pressed background
 * repeat that state visually, and the characters themselves become visible.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  {
    label,
    hint,
    error,
    required,
    autoComplete,
    toggleLabel = 'Show password',
    id: explicitId,
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const { id, hintId, errorId, describedBy } = useFieldIds(explicitId, hint, error);
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className={cn('w-full', containerClassName)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <input
        ref={ref}
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={hasContent(error) || undefined}
        className={cn(CONTROL_CLASSES, 'mt-1.5', className)}
        {...rest}
      />
      <FieldError id={errorId}>{error}</FieldError>
      <button
        type="button"
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((shown) => !shown)}
        className="target-44 -ml-2 mt-1 inline-flex items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground hover:bg-secondary aria-pressed:bg-secondary"
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {toggleLabel}
      </button>
    </div>
  );
});
